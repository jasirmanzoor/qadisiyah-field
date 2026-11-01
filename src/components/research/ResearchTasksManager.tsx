'use client';

import { useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { deleteResearchTask, getAllResearchTasks, saveResearchTask } from '@/lib/db';
import {
  RESEARCH_SOURCES,
  RESEARCH_TASKS_CHANGED,
  type ResearchSchedule,
  type ResearchScope,
  type ResearchSource,
  type ResearchTargetField,
  type ResearchTask,
} from '@/lib/research-types';

const TARGET_FIELD_LABELS: Record<ResearchTargetField, string> = {
  crNumber: 'CR number',
  listedPhone: 'Listed phone',
  mainBrands: 'Main brands',
  authorised: 'Authorised dealer status',
  socialPresence: 'Social / online presence (notes)',
  reviewsNote: 'Customer reviews (notes)',
  noteAppend: 'General notes',
};

const SCHEDULE_LABELS: Record<ResearchSchedule, string> = {
  on_demand: 'On-demand only',
  daily: 'Daily (when app is open)',
  weekly: 'Weekly (when app is open)',
};

const SCOPE_LABELS: Record<ResearchScope, string> = {
  all: 'All surveyable dealerships',
  not_visited: 'Not yet visited',
  missing_cr: 'Missing CR number',
};

const STARTER_TEMPLATES: Array<Pick<ResearchTask, 'name' | 'instruction' | 'targetField' | 'sources'>> = [
  {
    name: 'Find CR number',
    instruction: "Find this dealership's commercial registration (CR) number.",
    targetField: 'crNumber',
    sources: ['Saudi Ministry of Commerce registry', 'Google Maps / Google Business'],
  },
  {
    name: 'Listing count & price',
    instruction: 'Find how many vehicles they currently list for sale online and at what average price.',
    targetField: 'noteAppend',
    sources: ['Saudi marketplaces (Haraj, Motory, OpenSooq, Syarah, YallaMotor, Soum)'],
  },
  {
    name: 'Financing advertised?',
    instruction: 'Check whether they advertise financing or instalment options anywhere online.',
    targetField: 'noteAppend',
    sources: ['Instagram', 'X (Twitter)', 'Google Maps / Google Business'],
  },
  {
    name: 'Financing complaints in reviews',
    instruction:
      'Find recent customer reviews mentioning financing, instalments, tamweel, or bank problems.',
    targetField: 'reviewsNote',
    sources: ['Google Maps / Google Business'],
  },
  {
    name: 'Social handles',
    instruction: 'Find their Instagram, X, and WhatsApp Business account handles or links, if any.',
    targetField: 'socialPresence',
    sources: ['Instagram', 'X (Twitter)', 'WhatsApp Business'],
  },
];

export default function ResearchTasksManager() {
  const [tasks, setTasks] = useState<ResearchTask[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [instruction, setInstruction] = useState('');
  const [targetField, setTargetField] = useState<ResearchTargetField>('noteAppend');
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [schedule, setSchedule] = useState<ResearchSchedule>('on_demand');
  const [scope, setScope] = useState<ResearchScope>('all');

  const load = async () => {
    setTasks(await getAllResearchTasks());
    window.dispatchEvent(new Event(RESEARCH_TASKS_CHANGED));
  };
  useEffect(() => {
    (async () => {
      setTasks(await getAllResearchTasks());
    })();
  }, []);

  const resetForm = () => {
    setName('');
    setInstruction('');
    setTargetField('noteAppend');
    setSources([]);
    setSchedule('on_demand');
    setScope('all');
    setShowForm(false);
  };

  const applyTemplate = (t: (typeof STARTER_TEMPLATES)[number]) => {
    setName(t.name);
    setInstruction(t.instruction);
    setTargetField(t.targetField);
    setSources(t.sources);
    setShowForm(true);
  };

  const toggleSource = (s: ResearchSource) => {
    setSources((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const save = async () => {
    if (!name.trim() || !instruction.trim()) return;
    const task: ResearchTask = {
      id: uuid(),
      name: name.trim(),
      instruction: instruction.trim(),
      targetField,
      sources,
      schedule,
      scope,
      enabled: true,
      createdAt: new Date().toISOString(),
      lastRunAt: null,
    };
    await saveResearchTask(task);
    resetForm();
    await load();
  };

  const toggleEnabled = async (t: ResearchTask) => {
    await saveResearchTask({ ...t, enabled: !t.enabled });
    await load();
  };

  const updateTask = async (t: ResearchTask, patch: Partial<ResearchTask>) => {
    await saveResearchTask({ ...t, ...patch });
    await load();
  };

  const remove = async (id: string) => {
    await deleteResearchTask(id);
    await load();
  };

  return (
    <div>
      {tasks.length > 0 && (
        <div className="mb-3 space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="rounded-xl border border-border bg-surface-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{t.name}</div>
                  <div className="mt-0.5 text-xs text-muted line-clamp-2">{t.instruction}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
                    <span className="rounded-full bg-surface px-2 py-0.5">{TARGET_FIELD_LABELS[t.targetField]}</span>
                    <select
                      aria-label="Schedule"
                      value={t.schedule}
                      onChange={(e) => updateTask(t, { schedule: e.target.value as ResearchSchedule })}
                      className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] text-foreground"
                    >
                      {(Object.keys(SCHEDULE_LABELS) as ResearchSchedule[]).map((s) => (
                        <option key={s} value={s}>
                          {SCHEDULE_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    {t.schedule !== 'on_demand' && (
                      <select
                        aria-label="Scheduled scope"
                        value={t.scope ?? 'all'}
                        onChange={(e) => updateTask(t, { scope: e.target.value as ResearchScope })}
                        className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] text-foreground"
                      >
                        {(Object.keys(SCOPE_LABELS) as ResearchScope[]).map((s) => (
                          <option key={s} value={s}>
                            {SCOPE_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="mt-1 text-[10px] text-muted">
                    {t.lastRunAt ? `Last run ${new Date(t.lastRunAt).toLocaleString()}` : 'Never run'}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <button
                    onClick={() => toggleEnabled(t)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      t.enabled ? 'bg-emerald-500/15 text-emerald-500' : 'bg-surface text-muted'
                    }`}
                  >
                    {t.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button onClick={() => remove(t.id)} className="text-[10px] text-red-500 underline">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!showForm ? (
        <>
          <p className="mb-2 text-xs text-muted">Start from a template or write your own:</p>
          <div className="flex flex-wrap gap-1.5">
            {STARTER_TEMPLATES.map((t) => (
              <button
                key={t.name}
                onClick={() => applyTemplate(t)}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground"
              >
                + {t.name}
              </button>
            ))}
            <button
              onClick={() => setShowForm(true)}
              className="rounded-full border border-accent px-3 py-1.5 text-xs font-medium text-accent"
            >
              + Custom task
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Task name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              placeholder="e.g. Find CR number"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Instruction (natural language)</label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              placeholder="e.g. Find this dealership's commercial registration number"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Writes to</label>
            <select
              value={targetField}
              onChange={(e) => setTargetField(e.target.value as ResearchTargetField)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
            >
              {(Object.keys(TARGET_FIELD_LABELS) as ResearchTargetField[]).map((f) => (
                <option key={f} value={f}>
                  {TARGET_FIELD_LABELS[f]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Sources to search</label>
            <div className="flex flex-wrap gap-1.5">
              {RESEARCH_SOURCES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSource(s)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    sources.includes(s) ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Schedule</label>
            <select
              value={schedule}
              onChange={(e) => setSchedule(e.target.value as ResearchSchedule)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
            >
              {(Object.keys(SCHEDULE_LABELS) as ResearchSchedule[]).map((s) => (
                <option key={s} value={s}>
                  {SCHEDULE_LABELS[s]}
                </option>
              ))}
            </select>
            {schedule !== 'on_demand' && (
              <>
                <label className="mb-1 mt-3 block text-xs font-medium text-foreground">Scheduled runs cover</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as ResearchScope)}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
                >
                  {(Object.keys(SCOPE_LABELS) as ResearchScope[]).map((s) => (
                    <option key={s} value={s}>
                      {SCOPE_LABELS[s]}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-amber-500">
                  Runs while the app is open and online: each dealership is re-checked once per{' '}
                  {schedule === 'daily' ? 'day' : 'week'}, oldest first, using up to 80% of the daily run cap (the rest
                  stays free for manual runs). A large roster is worked through over several days.
                </p>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="flex-1 rounded-lg bg-accent py-2 text-sm font-semibold text-accent-contrast">
              Save task
            </button>
            <button onClick={resetForm} className="rounded-lg bg-surface-2 px-4 py-2 text-sm font-medium text-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
