'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/lib/settings-context';
import { resetAllData } from '@/lib/db';
import ImportDealerships from '@/components/ImportDealerships';
import DiscoverDealerships from '@/components/DiscoverDealerships';
import ResearchTasksManager from '@/components/research/ResearchTasksManager';
import BatchResearchRunner from '@/components/research/BatchResearchRunner';
import { getSettings, saveSettings } from '@/lib/db';
import { getSpendSummary } from '@/lib/research-run';
import { MARKETS } from '@/lib/markets';

export default function SettingsPage() {
  const { surveyorName, darkMode, remoteEndpoint, logout, toggleDarkMode, setRemoteEndpoint, activeMarket } =
    useSettings();
  const router = useRouter();
  const [endpointInput, setEndpointInput] = useState(remoteEndpoint ?? '');
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [dailyCap, setDailyCap] = useState(50);
  const [accessCode, setAccessCode] = useState('');
  const [accessCodeSaved, setAccessCodeSaved] = useState(false);
  const [schedulePaused, setSchedulePaused] = useState(false);
  const [spend, setSpend] = useState<{ todayUsd: number; last30Usd: number; runs30: number } | null>(null);

  useEffect(() => {
    getSettings().then((s) => {
      setDailyCap(s.dailyResearchCap);
      setAccessCode(s.researchAccessToken ?? '');
      setSchedulePaused(s.scheduledResearchPaused);
    });
    getSpendSummary().then(setSpend);
  }, []);

  const saveAccessCode = async () => {
    const s = await getSettings();
    await saveSettings({ ...s, researchAccessToken: accessCode.trim() || null });
    setAccessCodeSaved(true);
    setTimeout(() => setAccessCodeSaved(false), 2000);
  };

  const toggleSchedulePaused = async () => {
    const s = await getSettings();
    const next = !s.scheduledResearchPaused;
    await saveSettings({ ...s, scheduledResearchPaused: next });
    setSchedulePaused(next);
  };

  const saveDailyCap = async (n: number) => {
    setDailyCap(n);
    const s = await getSettings();
    await saveSettings({ ...s, dailyResearchCap: n });
  };

  return (
    <div className="safe-top h-full overflow-y-auto pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 px-4 py-4 backdrop-blur">
        <h1 className="text-lg font-semibold text-foreground">Settings</h1>
      </header>

      <div className="space-y-6 px-4 py-5">
        <section className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">Surveyor</div>
          <div className="mt-1 text-base font-medium text-foreground">{surveyorName}</div>
          <button
            onClick={async () => {
              await logout();
              router.replace('/login');
            }}
            className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm font-medium text-foreground"
          >
            Switch surveyor
          </button>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">Dark mode</div>
              <div className="text-xs text-muted">Easier on the eyes for evening visits</div>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative h-7 w-12 rounded-full transition-colors ${darkMode ? 'bg-accent' : 'bg-surface-2'}`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-sm font-medium text-foreground">Cloud sync endpoint</div>
          <p className="mt-1 text-xs text-muted">
            Optional. All data already lives safely on this device and works fully offline.
            Set this only if you&apos;ve stood up a backend to receive pushed records — leave
            blank for local-only, single-device use.
          </p>
          <input
            value={endpointInput}
            onChange={(e) => setEndpointInput(e.target.value)}
            placeholder="https://your-backend.example.com/sync"
            className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setRemoteEndpoint(endpointInput.trim() || null)}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-contrast"
            >
              Save
            </button>
            {remoteEndpoint && (
              <button
                onClick={() => {
                  setEndpointInput('');
                  setRemoteEndpoint(null);
                }}
                className="rounded-lg bg-surface-2 px-3 py-2 text-sm font-medium text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-sm font-medium text-foreground">Discover more dealerships</div>
          <p className="mt-1 text-xs text-muted">
            Search OpenStreetMap for car dealerships near {MARKETS[activeMarket].label} (the market selected on the Map) that aren&apos;t on your
            roster yet. This is how you grow toward the market&apos;s real size — real, sourced
            names and coordinates, never invented ones. Each result still needs a field visit.
          </p>
          <div className="mt-3">
            <DiscoverDealerships market={activeMarket} onImported={() => {}} />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-sm font-medium text-foreground">Import dealerships</div>
          <p className="mt-1 text-xs text-muted">
            Load a manually-surveyed CSV or Excel sheet — map its columns to fields and merge
            it into the {MARKETS[activeMarket].label} roster without overwriting existing records.
          </p>
          <div className="mt-3">
            <ImportDealerships market={activeMarket} onImported={() => {}} />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-sm font-medium text-foreground">Research tasks</div>
          <p className="mt-1 text-xs text-muted">
            Define what the research agent should look up, in your own words — no code. It
            searches in English and Arabic and writes findings into a separate agent-sourced
            layer that never overwrites what you collected in the field.
          </p>
          <div className="mt-3">
            <ResearchTasksManager />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <div>
              <div className="text-xs font-medium text-foreground">Pause scheduled research</div>
              <div className="text-[11px] text-muted">Stops daily/weekly tasks from running automatically</div>
            </div>
            <button
              onClick={toggleSchedulePaused}
              aria-pressed={schedulePaused}
              aria-label="Pause scheduled research"
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${schedulePaused ? 'bg-accent' : 'bg-surface-2'}`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${schedulePaused ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-sm font-medium text-foreground">Research cost control</div>
          <p className="mt-1 text-xs text-muted">
            Every run costs real money (Claude API tokens + web search). Cap how many runs can
            happen per day.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <label className="text-xs text-muted">Max runs / day</label>
            <input
              type="number"
              min={1}
              value={dailyCap}
              onChange={(e) => saveDailyCap(Math.max(1, Number(e.target.value) || 1))}
              className="w-24 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
          {spend && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-surface-2 px-2 py-2">
                <div className="text-sm font-semibold text-foreground">${spend.todayUsd.toFixed(2)}</div>
                <div className="text-[10px] text-muted">spent today</div>
              </div>
              <div className="rounded-lg bg-surface-2 px-2 py-2">
                <div className="text-sm font-semibold text-foreground">${spend.last30Usd.toFixed(2)}</div>
                <div className="text-[10px] text-muted">last 30 days</div>
              </div>
              <div className="rounded-lg bg-surface-2 px-2 py-2">
                <div className="text-sm font-semibold text-foreground">{spend.runs30}</div>
                <div className="text-[10px] text-muted">runs, 30 days</div>
              </div>
            </div>
          )}
          <div className="mt-4 border-t border-border pt-4">
            <label htmlFor="research-access-code" className="text-xs font-medium text-foreground">
              Research access code
            </label>
            <p className="mt-0.5 text-[11px] text-muted">
              Must match <code className="rounded bg-surface-2 px-1 py-0.5">RESEARCH_ACCESS_TOKEN</code> on your
              deployment, alongside <code className="rounded bg-surface-2 px-1 py-0.5">ANTHROPIC_API_KEY</code>. It stops
              anyone who finds the app&apos;s URL from spending your API credit. Stored on this device only.
            </p>
            <div className="mt-2 flex gap-2">
              <input
                id="research-access-code"
                type="password"
                autoComplete="off"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Paste the access code"
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent"
              />
              <button onClick={saveAccessCode} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-contrast">
                {accessCodeSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-2 text-xs font-medium text-foreground">Run a task across many dealerships</div>
            <BatchResearchRunner />
          </div>
        </section>

        <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="text-sm font-medium text-red-500">Reset all data</div>
          <p className="mt-1 text-xs text-muted">
            Wipes every survey record, photo, note and research finding on this device and reloads
            the built-in roster. Research tasks and settings are kept. Cannot be undone — export first
            if unsure.
          </p>
          {!confirmingReset ? (
            <button
              onClick={() => setConfirmingReset(true)}
              className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500"
            >
              Reset all data…
            </button>
          ) : (
            <div className="mt-3 flex gap-2">
              <button
                onClick={async () => {
                  await resetAllData();
                  setConfirmingReset(false);
                  router.replace('/');
                }}
                className="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white"
              >
                Yes, wipe everything
              </button>
              <button
                onClick={() => setConfirmingReset(false)}
                className="rounded-lg bg-surface-2 px-3 py-2 text-sm font-medium text-foreground"
              >
                Cancel
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
