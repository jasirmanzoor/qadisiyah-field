import { v4 as uuid } from 'uuid';
import {
  getAllDealerships,
  getAllFindings,
  getAllResearchRuns,
  getAllResearchTasks,
  getFindingsForDealership,
  getRunsToday,
  getSettings,
  logResearchRun,
  saveFinding,
  touchResearchTask,
} from './db';
import type { AgentFinding, ResearchRunLogEntry, ResearchScope, ResearchTask } from './research-types';
import type { Dealership } from './types';
import { marketOf, type MarketId } from './markets';

// Fallback per-run estimate used before any real runs have been logged. Real
// runs (Opus tokens + up to 5 searches at $10/1,000, with search results fed
// back as input tokens) typically land well above the search fee alone.
export const DEFAULT_COST_PER_RUN_USD = 0.15;

export interface RunOutcome {
  ok: boolean;
  finding?: AgentFinding;
  error?: string;
  capReached?: boolean;
  /** A configuration problem (missing key/access code) — retrying won't help. */
  fatal?: boolean;
}

const FATAL_CODES = new Set(['no_api_key', 'no_access_token_configured', 'bad_access_token', 'bad_api_key']);

export async function checkDailyCapRemaining(): Promise<{ used: number; cap: number; remaining: number }> {
  const settings = await getSettings();
  const runsToday = await getRunsToday();
  const used = runsToday.length;
  return { used, cap: settings.dailyResearchCap, remaining: Math.max(0, settings.dailyResearchCap - used) };
}

export async function getSpendSummary(): Promise<{ todayUsd: number; last30Usd: number; avgPerRunUsd: number; runs30: number }> {
  const runs = await getAllResearchRuns();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const since30 = Date.now() - 30 * 24 * 3600 * 1000;
  let todayUsd = 0;
  let last30Usd = 0;
  let runs30 = 0;
  let paidRuns = 0;
  let paidTotal = 0;
  for (const r of runs) {
    const t = new Date(r.ranAt).getTime();
    if (t >= todayStart.getTime()) todayUsd += r.estimatedCostUsd;
    if (t >= since30) {
      last30Usd += r.estimatedCostUsd;
      runs30 += 1;
    }
    if (r.ok && r.estimatedCostUsd > 0) {
      paidRuns += 1;
      paidTotal += r.estimatedCostUsd;
    }
  }
  return {
    todayUsd,
    last30Usd,
    runs30,
    avgPerRunUsd: paidRuns >= 3 ? paidTotal / paidRuns : DEFAULT_COST_PER_RUN_USD,
  };
}

export async function scopedDealerships(scope: ResearchScope, market?: MarketId): Promise<Dealership[]> {
  const all = (await getAllDealerships()).filter((d) => !market || marketOf(d) === market);
  const surveyable = all.filter((d) => d.visitStatus !== 'competitor' && d.visitStatus !== 'closed_moved');
  if (scope === 'not_visited') return surveyable.filter((d) => d.visitStatus === 'not_visited');
  if (scope === 'missing_cr') return surveyable.filter((d) => !d.crNumber);
  return surveyable;
}

function normaliseValue(v: string | null): string {
  return (v ?? '').toLowerCase().replace(/[\s\-_.،,]+/g, ' ').trim();
}

/**
 * Change detection compares against the most recent prior finding that
 * actually found something. A search that simply comes back empty is not a
 * "change" — only a different found value is.
 */
export function detectChange(
  prior: AgentFinding[],
  targetField: AgentFinding['targetField'],
  found: boolean,
  value: string | null
): { changedFromPrevious: boolean; previousValue: string | null } {
  const lastFound = prior
    .filter((f) => f.targetField === targetField && f.found && f.value)
    .sort((a, b) => (a.retrievedAt < b.retrievedAt ? 1 : -1))[0];
  if (!lastFound) return { changedFromPrevious: false, previousValue: null };
  const changed = found && Boolean(value) && normaliseValue(lastFound.value) !== normaliseValue(value);
  return { changedFromPrevious: changed, previousValue: lastFound.value };
}

export async function runResearchTask(dealership: Dealership, task: ResearchTask): Promise<RunOutcome> {
  const { remaining } = await checkDailyCapRemaining();
  if (remaining <= 0) {
    return { ok: false, capReached: true, error: 'Daily research run cap reached. Raise it in Settings or wait for tomorrow.' };
  }
  const settings = await getSettings();

  let res: Response;
  try {
    res = await fetch('/api/research/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-research-token': settings.researchAccessToken ?? '' },
      body: JSON.stringify({
        dealership: { id: dealership.id, nameEn: dealership.nameEn, nameAr: dealership.nameAr, lat: dealership.lat, lng: dealership.lng, market: marketOf(dealership) },
        task: { instruction: task.instruction, targetField: task.targetField, sources: task.sources },
      }),
    });
  } catch {
    return { ok: false, error: 'Network error reaching the research endpoint.' };
  }

  // A platform timeout returns an HTML error page, not JSON.
  let data: { ok?: boolean; error?: string; code?: string; finding?: Record<string, unknown> } = {};
  try {
    data = await res.json();
  } catch {
    data = {
      ok: false,
      error: res.status === 504 ? 'The research run timed out on the server. Try again, or raise maxDuration.' : `HTTP ${res.status}`,
    };
  }

  const ok = res.ok && data.ok === true && Boolean(data.finding);
  const fatal = Boolean(data.code && FATAL_CODES.has(data.code));
  const costUsd = typeof data.finding?.costUsd === 'number' ? data.finding.costUsd : 0;

  // Configuration errors never reached the model, so they are not logged
  // as runs and don't eat into the daily cap.
  if (!fatal) {
    const entry: ResearchRunLogEntry = {
      id: uuid(),
      ranAt: new Date().toISOString(),
      taskId: task.id,
      dealershipId: dealership.id,
      ok,
      error: ok ? null : (data.error ?? `HTTP ${res.status}`),
      estimatedCostUsd: costUsd,
    };
    await logResearchRun(entry);
    await touchResearchTask(task.id, entry.ranAt);
  }

  if (!ok || !data.finding) {
    return { ok: false, fatal, error: data.error ?? `HTTP ${res.status}` };
  }

  const f = data.finding as {
    found: boolean;
    value: string | null;
    summary: string;
    sourceUrl: string | null;
    confidence: AgentFinding['confidence'];
    model: string;
  };
  const prior = await getFindingsForDealership(dealership.id);
  const change = detectChange(prior, task.targetField, f.found, f.value);

  const finding: AgentFinding = {
    id: uuid(),
    dealershipId: dealership.id,
    taskId: task.id,
    taskName: task.name,
    targetField: task.targetField,
    found: f.found,
    value: f.value,
    summary: f.summary,
    sourceUrl: f.sourceUrl,
    confidence: f.confidence,
    model: f.model,
    retrievedAt: new Date().toISOString(),
    status: 'pending',
    ...change,
    costUsd,
  };

  await saveFinding(finding);
  return { ok: true, finding };
}

// ---------- Scheduled runs ----------

export const SCHEDULE_RESERVE_SHARE = 0.2;

const INTERVAL_MS: Record<'daily' | 'weekly', number> = {
  daily: 24 * 3600 * 1000,
  weekly: 7 * 24 * 3600 * 1000,
};

export interface DueRun {
  task: ResearchTask;
  dealership: Dealership;
  lastAttemptAt: number; // 0 = never
}

/**
 * Every (scheduled task, in-scope dealership) pair whose last attempt is
 * older than the task's interval, never-attempted and oldest first. The
 * daily cap then decides how many actually run, so a 300-dealership roster
 * works through over several days rather than all at once.
 */
export async function getDueScheduledRuns(now = Date.now()): Promise<DueRun[]> {
  const tasks = (await getAllResearchTasks()).filter((t) => t.enabled && t.schedule !== 'on_demand');
  if (tasks.length === 0) return [];
  const [runs, findings] = await Promise.all([getAllResearchRuns(), getAllFindings()]);

  const lastAttempt = new Map<string, number>();
  const bump = (key: string, iso: string) => {
    const t = new Date(iso).getTime();
    if (t > (lastAttempt.get(key) ?? 0)) lastAttempt.set(key, t);
  };
  for (const r of runs) bump(`${r.taskId}|${r.dealershipId}`, r.ranAt);
  for (const f of findings) bump(`${f.taskId}|${f.dealershipId}`, f.retrievedAt);

  const due: DueRun[] = [];
  for (const task of tasks) {
    const interval = INTERVAL_MS[task.schedule as 'daily' | 'weekly'];
    for (const dealership of await scopedDealerships(task.scope ?? 'all')) {
      const last = lastAttempt.get(`${task.id}|${dealership.id}`) ?? 0;
      if (now - last >= interval) due.push({ task, dealership, lastAttemptAt: last });
    }
  }
  return due.sort((a, b) => a.lastAttemptAt - b.lastAttemptAt);
}

export interface ScheduledPassResult {
  attempted: number;
  succeeded: number;
  failed: number;
  stoppedReason: 'done' | 'cap' | 'fatal' | 'offline' | 'paused' | 'aborted';
  error?: string;
}

export async function runScheduledPass(opts: {
  onProgress?: (done: number, total: number) => void;
  shouldStop?: () => boolean;
} = {}): Promise<ScheduledPassResult> {
  const settings = await getSettings();
  const result: ScheduledPassResult = { attempted: 0, succeeded: 0, failed: 0, stoppedReason: 'done' };
  if (settings.scheduledResearchPaused) return { ...result, stoppedReason: 'paused' };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { ...result, stoppedReason: 'offline' };

  // Scheduled runs leave 20% of the daily cap free for on-demand runs.
  const { remaining, cap } = await checkDailyCapRemaining();
  const allowance = Math.max(0, remaining - Math.floor(cap * SCHEDULE_RESERVE_SHARE));
  const due = await getDueScheduledRuns();
  if (due.length === 0) return result;
  if (allowance <= 0) return { ...result, stoppedReason: 'cap' };

  const batch = due.slice(0, allowance);
  opts.onProgress?.(0, batch.length);
  let consecutiveFailures = 0;
  for (const item of batch) {
    if (opts.shouldStop?.()) return { ...result, stoppedReason: 'aborted' };
    if (typeof navigator !== 'undefined' && !navigator.onLine) return { ...result, stoppedReason: 'offline' };
    // Re-read the task so a pause/disable made mid-pass takes effect.
    const current = (await getAllResearchTasks()).find((t) => t.id === item.task.id);
    if (!current?.enabled || current.schedule === 'on_demand') continue;

    const outcome = await runResearchTask(item.dealership, current);
    result.attempted += 1;
    if (outcome.capReached) return { ...result, stoppedReason: 'cap' };
    if (outcome.fatal) return { ...result, failed: result.failed + 1, stoppedReason: 'fatal', error: outcome.error };
    if (outcome.ok) {
      result.succeeded += 1;
      consecutiveFailures = 0;
    } else {
      result.failed += 1;
      consecutiveFailures += 1;
      // Something systemic (rate limits, outage) — back off until next pass.
      if (consecutiveFailures >= 3) return { ...result, stoppedReason: 'aborted', error: outcome.error };
    }
    opts.onProgress?.(result.attempted, batch.length);
  }
  // More was due than today's allowance covered — the rest waits for tomorrow.
  return due.length > batch.length ? { ...result, stoppedReason: 'cap' } : result;
}
