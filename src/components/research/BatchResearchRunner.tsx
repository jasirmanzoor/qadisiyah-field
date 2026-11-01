'use client';

import { useEffect, useRef, useState } from 'react';
import { getAllResearchTasks } from '@/lib/db';
import { checkDailyCapRemaining, getSpendSummary, runResearchTask, scopedDealerships } from '@/lib/research-run';
import { useSettings } from '@/lib/settings-context';
import { MARKETS } from '@/lib/markets';
import { RESEARCH_TASKS_CHANGED, type ResearchScope, type ResearchTask } from '@/lib/research-types';

export default function BatchResearchRunner() {
  const { activeMarket } = useSettings();
  const [tasks, setTasks] = useState<ResearchTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [scope, setScope] = useState<ResearchScope>('missing_cr');
  const [cap, setCap] = useState({ used: 0, cap: 0, remaining: 0 });
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<string | null>(null);
  const [avgCost, setAvgCost] = useState(0);
  const stopRequested = useRef(false);

  useEffect(() => {
    const refresh = async () => {
      const enabled = (await getAllResearchTasks()).filter((x) => x.enabled);
      setTasks(enabled);
      setSelectedTaskId((prev) => (enabled.some((t) => t.id === prev) ? prev : (enabled[0]?.id ?? '')));
      setCap(await checkDailyCapRemaining());
      setAvgCost((await getSpendSummary()).avgPerRunUsd);
    };
    refresh();
    window.addEventListener(RESEARCH_TASKS_CHANGED, refresh);
    return () => window.removeEventListener(RESEARCH_TASKS_CHANGED, refresh);
  }, []);

  const [previewCount, setPreviewCount] = useState<number | null>(null);
  useEffect(() => {
    scopedDealerships(scope, activeMarket).then((d) => setPreviewCount(Math.min(d.length, cap.remaining)));
  }, [scope, cap.remaining, activeMarket]);

  const runBatch = async () => {
    const task = tasks.find((t) => t.id === selectedTaskId);
    if (!task) return;
    setConfirming(false);
    setRunning(true);
    setResult(null);
    const dealerships = (await scopedDealerships(scope, activeMarket)).slice(0, cap.remaining);
    setProgress({ done: 0, total: dealerships.length });

    let succeeded = 0;
    let failed = 0;
    let spent = 0;
    let stopNote = '';
    stopRequested.current = false;
    for (const d of dealerships) {
      if (stopRequested.current) {
        stopNote = ' Stopped by you.';
        break;
      }
      const outcome = await runResearchTask(d, task);
      if (outcome.capReached) {
        stopNote = ' Daily cap reached.';
        break;
      }
      if (outcome.fatal) {
        failed += 1;
        stopNote = ` Stopped: ${outcome.error}`;
        break;
      }
      if (outcome.ok) {
        succeeded += 1;
        spent += outcome.finding?.costUsd ?? 0;
      } else failed += 1;
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setRunning(false);
    setResult(
      `Done — ${succeeded} succeeded, ${failed} failed, $${spent.toFixed(2)} spent.${stopNote} Review results per dealership from Survey → Research, or changed values on the Dashboard.`
    );
    setCap(await checkDailyCapRemaining());
    setAvgCost((await getSpendSummary()).avgPerRunUsd);
  };

  if (tasks.length === 0) {
    return <p className="text-xs text-muted">Add and enable at least one research task first.</p>;
  }

  const estimatedCost = previewCount !== null ? previewCount * avgCost : 0;

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-foreground">Task to run</label>
        <select
          value={selectedTaskId}
          onChange={(e) => setSelectedTaskId(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
        >
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-foreground">
          Which dealerships <span className="font-normal text-muted">in {MARKETS[activeMarket].label}</span>
        </label>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as ResearchScope)}
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
        >
          <option value="missing_cr">Missing CR number</option>
          <option value="not_visited">Not yet visited</option>
          <option value="all">All surveyable dealerships</option>
        </select>
      </div>

      <div className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
        {cap.remaining} of {cap.cap} daily runs remaining · will process up to{' '}
        <b className="text-foreground">{previewCount ?? '…'}</b> dealerships · estimated cost{' '}
        <b className="text-foreground">${estimatedCost.toFixed(2)}</b> (at ~${avgCost.toFixed(2)}/run, from your past runs once there are a few; actual cost is logged per run)
      </div>

      {running ? (
        <div className="flex items-center justify-between rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent">
          <span>
            Running {progress.done} / {progress.total}…
          </span>
          <button onClick={() => (stopRequested.current = true)} className="font-medium underline">
            Stop
          </button>
        </div>
      ) : !confirming ? (
        <button
          onClick={() => setConfirming(true)}
          disabled={!previewCount}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-contrast disabled:opacity-40"
        >
          Run batch
        </button>
      ) : (
        <div className="flex gap-2">
          <button onClick={runBatch} className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-contrast">
            Confirm — spend ~${estimatedCost.toFixed(2)}
          </button>
          <button onClick={() => setConfirming(false)} className="rounded-lg bg-surface-2 px-4 py-2.5 text-sm font-medium text-foreground">
            Cancel
          </button>
        </div>
      )}

      {result && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500">{result}</p>}
    </div>
  );
}
