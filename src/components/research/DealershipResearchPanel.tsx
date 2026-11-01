'use client';

import { useEffect, useState } from 'react';
import { getAllResearchTasks, getDealership, getFindingsForDealership, saveDealership, updateFindingStatus } from '@/lib/db';
import { checkDailyCapRemaining, runResearchTask } from '@/lib/research-run';
import type { AgentFinding, ResearchTask } from '@/lib/research-types';
import type { Dealership } from '@/lib/types';

const CONFIDENCE_STYLE: Record<AgentFinding['confidence'], string> = {
  high: 'bg-emerald-500/15 text-emerald-500',
  medium: 'bg-amber-500/15 text-amber-500',
  low: 'bg-red-500/15 text-red-500',
};

function currentValueFor(d: Dealership, f: AgentFinding): string {
  switch (f.targetField) {
    case 'crNumber':
      return d.crNumber;
    case 'listedPhone':
      return d.listedPhone;
    case 'authorised':
      return d.authorisedBrand;
    default:
      return '';
  }
}

/**
 * Accepting writes the value into the record AND leaves a provenance line in
 * the notes, so an agent-sourced CR number or phone can always be told apart
 * from one collected in the field.
 */
function applyFindingToDealership(d: Dealership, f: AgentFinding): Dealership {
  const date = new Date(f.retrievedAt).toISOString().slice(0, 10);
  const provenance = `[Agent-sourced, ${date}, ${f.taskName}, ${f.confidence} confidence${f.sourceUrl ? `, ${f.sourceUrl}` : ''}]`;
  const withNote = (rec: Dealership, text: string) => ({
    ...rec,
    notes: [rec.notes, `${provenance} ${text}`].filter((x) => x && x.trim()).join('\n'),
  });
  const value = f.value ?? '';
  switch (f.targetField) {
    case 'crNumber':
      return withNote({ ...d, crNumber: value || d.crNumber }, `CR number: ${value}`);
    case 'listedPhone':
      return withNote({ ...d, listedPhone: value || d.listedPhone }, `Listed phone: ${value}`);
    case 'authorised':
      return withNote({ ...d, authorisedBrand: value || d.authorisedBrand }, `Authorised: ${value}`);
    case 'mainBrands': {
      const brands = value.split(/[,،;/]|\s+and\s+/).map((b) => b.trim()).filter(Boolean);
      return withNote({ ...d, mainBrands: Array.from(new Set([...d.mainBrands, ...brands])) }, `Brands: ${value}`);
    }
    case 'socialPresence':
    case 'reviewsNote':
    case 'noteAppend':
    default:
      return withNote(d, value || f.summary);
  }
}

export default function DealershipResearchPanel({ dealershipId, onClose }: { dealershipId: string; onClose: () => void }) {
  const [dealership, setDealership] = useState<Dealership | null>(null);
  const [tasks, setTasks] = useState<ResearchTask[]>([]);
  const [findings, setFindings] = useState<AgentFinding[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [cap, setCap] = useState({ used: 0, cap: 0, remaining: 0 });
  const [error, setError] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState<string | null>(null);

  const load = async () => {
    const [d, t, f, c] = await Promise.all([
      getDealership(dealershipId),
      getAllResearchTasks(),
      getFindingsForDealership(dealershipId),
      checkDailyCapRemaining(),
    ]);
    setDealership(d ?? null);
    setTasks(t.filter((task) => task.enabled));
    setFindings(f.sort((a, b) => (a.retrievedAt < b.retrievedAt ? 1 : -1)));
    setCap(c);
  };

  useEffect(() => {
    (async () => {
      const [d, t, f, c] = await Promise.all([
        getDealership(dealershipId),
        getAllResearchTasks(),
        getFindingsForDealership(dealershipId),
        checkDailyCapRemaining(),
      ]);
      setDealership(d ?? null);
      setTasks(t.filter((task) => task.enabled));
      setFindings(f.sort((a, b) => (a.retrievedAt < b.retrievedAt ? 1 : -1)));
      setCap(c);
    })();
  }, [dealershipId]);

  const run = async (task: ResearchTask) => {
    if (!dealership) return;
    setError(null);
    setRunning(task.id);
    const outcome = await runResearchTask(dealership, task);
    if (!outcome.ok) {
      setError(
        outcome.fatal
          ? `${outcome.error ?? 'Research is not configured.'} (Settings → Research access code)`
          : (outcome.error ?? 'Research run failed.')
      );
    }
    setRunning(null);
    await load();
  };

  const accept = async (f: AgentFinding) => {
    if (!dealership) return;
    const current = currentValueFor(dealership, f).trim();
    if (current && f.value && current !== f.value.trim() && confirmReplace !== f.id) {
      setConfirmReplace(f.id);
      return;
    }
    setConfirmReplace(null);
    const updated = applyFindingToDealership(dealership, f);
    await saveDealership(updated);
    await updateFindingStatus(f.id, 'applied');
    await load();
  };

  const reject = async (f: AgentFinding) => {
    await updateFindingStatus(f.id, 'rejected');
    await load();
  };

  return (
    <div className="absolute inset-0 z-[60] flex flex-col bg-background">
      <div className="safe-top border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm font-medium text-muted">
            ← Back
          </button>
          <span className="text-xs text-muted">
            {cap.used}/{cap.cap} runs used today
          </span>
        </div>
        <h1 className="mt-1 text-base font-semibold text-foreground">Research{dealership ? ` — ${dealership.nameEn}` : ''}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</p>}

        {tasks.length === 0 ? (
          <p className="text-sm text-muted">
            No research tasks configured yet. Add some in Settings → Research tasks.
          </p>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{t.name}</div>
                  <div className="truncate text-xs text-muted">{t.instruction}</div>
                </div>
                <button
                  onClick={() => run(t)}
                  disabled={running !== null || cap.remaining <= 0}
                  className="shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-contrast disabled:opacity-40"
                >
                  {running === t.id ? 'Running…' : 'Run'}
                </button>
              </div>
            ))}
          </div>
        )}

        {findings.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Findings</h2>
            <div className="space-y-3">
              {findings.map((f) => (
                <div key={f.id} className="rounded-xl border border-border bg-surface p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground">{f.taskName}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${CONFIDENCE_STYLE[f.confidence]}`}>
                          {f.confidence}
                        </span>
                        {f.changedFromPrevious && (
                          <span className="rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-purple-500">
                            changed
                          </span>
                        )}
                        {f.status !== 'pending' && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                              f.status === 'applied' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-surface-2 text-muted'
                            }`}
                          >
                            {f.status}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-foreground">
                        {f.found ? f.value || f.summary : 'Not found'}
                      </p>
                      {f.summary && <p className="mt-0.5 text-xs text-muted">{f.summary}</p>}
                      {f.changedFromPrevious && (
                        <p className="mt-0.5 text-xs text-purple-500">Previously: {f.previousValue || '(nothing)'}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted">
                        <span>{new Date(f.retrievedAt).toLocaleString()}</span>
                        {typeof f.costUsd === 'number' && f.costUsd > 0 && <span>${f.costUsd.toFixed(3)}</span>}
                        {f.sourceUrl && (
                          <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                            source
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  {f.status === 'pending' && f.found && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => accept(f)}
                        className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        {confirmReplace === f.id && dealership
                          ? `Replace "${currentValueFor(dealership, f)}"?`
                          : 'Accept into record'}
                      </button>
                      <button onClick={() => reject(f)} className="rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground">
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
