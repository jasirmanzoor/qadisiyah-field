'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAllDealerships, getAllFindings } from '@/lib/db';
import type { Dealership, PilotInterest, VisitStatus } from '@/lib/types';
import { VISIT_STATUS_COLOR, VISIT_STATUS_LABEL } from '@/lib/types';
import { downloadFile, toCsv, toXlsxBuffer } from '@/lib/export';
import ResearchAlerts from '@/components/research/ResearchAlerts';
import MarketSwitcher from '@/components/MarketSwitcher';
import { useSettings } from '@/lib/settings-context';
import { MARKETS, marketOf, type MarketId } from '@/lib/markets';

function bandMidpoint(band: string | null): number | null {
  switch (band) {
    case '0_20': return 10;
    case '21_50': return 35;
    case '51_100': return 75;
    case '100_plus': return 120;
    case '0_5': return 2.5;
    case '6_15': return 10;
    case '16_40': return 28;
    case '40_plus': return 50;
    default: return null;
  }
}

export default function DashboardPage() {
  const { activeMarket, setActiveMarket } = useSettings();
  const [allDealerships, setDealerships] = useState<Dealership[]>([]);
  const [observedOnly, setObservedOnly] = useState(true);
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null);

  const reload = async () => setDealerships(await getAllDealerships());

  useEffect(() => {
    (async () => {
      setDealerships(await getAllDealerships());
    })();
  }, []);

  const dealerships = useMemo(
    () => allDealerships.filter((d) => marketOf(d) === activeMarket),
    [allDealerships, activeMarket]
  );
  const marketCounts = useMemo(() => {
    const c: Record<MarketId, number> = { qadisiyah: 0, shifa: 0 };
    for (const d of allDealerships) c[marketOf(d)] += 1;
    return c;
  }, [allDealerships]);

  const surveyable = useMemo(() => dealerships.filter((d) => d.visitStatus !== 'competitor'), [dealerships]);

  const total = surveyable.length;
  const visited = surveyable.filter((d) => d.visitStatus === 'completed' || d.visitStatus === 'partial').length;
  const remaining = total - surveyable.filter((d) => d.visitStatus !== 'not_visited').length;
  const pct = total > 0 ? Math.round((visited / total) * 100) : 0;

  const statusCounts = useMemo(() => {
    const counts: Record<VisitStatus, number> = {
      not_visited: 0,
      partial: 0,
      completed: 0,
      refused: 0,
      closed_moved: 0,
      competitor: 0,
    };
    for (const d of dealerships) counts[d.visitStatus]++;
    return counts;
  }, [dealerships]);

  const visitedRecords = useMemo(
    () => surveyable.filter((d) => d.visitStatus === 'completed' || d.visitStatus === 'partial'),
    [surveyable]
  );

  const missingCr = visitedRecords.filter((d) => !d.crNumber.trim()).length;
  const missingPocMobile = visitedRecords.filter((d) => !d.pocMobile.trim()).length;
  const missingFinancingLoss = visitedRecords.filter((d) => d.financingLostPerMonth.value === null).length;

  const agg = useMemo(() => {
    const includeVal = <T,>(f: { value: T | null; basis: 'observed' | 'self_reported' | null }): T | null => {
      if (f.value === null) return null;
      if (observedOnly && f.basis !== 'observed') return null;
      return f.value;
    };

    const inv = visitedRecords.map((d) => includeVal(d.inventorySellableUnits)).filter((v): v is number => v !== null);
    const price = visitedRecords.map((d) => includeVal(d.avgSellingPriceSar)).filter((v): v is number => v !== null);
    const lost = visitedRecords.map((d) => includeVal(d.financingLostPerMonth)).filter((v): v is number => v !== null);
    const salesmen = visitedRecords.map((d) => d.numSalesmen).filter((v): v is number => v !== null);
    const soldBand = visitedRecords
      .map((d) => (observedOnly && d.avgMonthlySold.basis !== 'observed' ? null : bandMidpoint(d.avgMonthlySold.value)))
      .filter((v): v is number => v !== null);

    const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

    return {
      totalInventory: sum(inv),
      inventoryCount: inv.length,
      avgPrice: avg(price),
      avgSalesmen: avg(salesmen),
      totalFinancingLost: sum(lost),
      financingLostCount: lost.length,
      avgMonthlySold: avg(soldBand),
    };
  }, [visitedRecords, observedOnly]);

  const pilotCounts = useMemo(() => {
    const counts: Record<PilotInterest, number> = { yes: 0, maybe: 0, no: 0, too_early: 0 };
    for (const d of visitedRecords) {
      if (d.openToPilot) counts[d.openToPilot]++;
    }
    return counts;
  }, [visitedRecords]);

  const leads = useMemo(
    () =>
      [...visitedRecords]
        .filter((d) => d.openToPilot === 'yes' || d.openToPilot === 'maybe')
        .sort((a, b) => (b.financingLostPerMonth.value ?? 0) - (a.financingLostPerMonth.value ?? 0))
        .slice(0, 8),
    [visitedRecords]
  );

  const partnered = useMemo(() => dealerships.filter((d) => d.banksPartnered.length > 0), [dealerships]);
  const competitors = useMemo(() => dealerships.filter((d) => d.visitStatus === 'competitor'), [dealerships]);

  const network = useMemo(() => {
    const hubs = surveyable.filter((d) => d.networkRole === 'supplies_sub_dealers' || d.networkRole === 'both');
    const subDealers = surveyable.filter((d) => d.networkRole === 'sub_dealer_of_another' || d.networkRole === 'both');
    const sellThroughUnits = surveyable
      .map((d) => (observedOnly && d.sellThroughUnitsPerMonth.basis !== 'observed' ? null : d.sellThroughUnitsPerMonth.value))
      .filter((v): v is number => v !== null)
      .reduce((a, b) => a + b, 0);
    return { hubs, subDealers, sellThroughUnits };
  }, [surveyable, observedOnly]);

  const doExport = async (format: 'csv' | 'xlsx') => {
    setExporting(format);
    const today = new Date().toISOString().slice(0, 10);
    const slug = activeMarket === 'shifa' ? 'al-shifa' : 'al-qadisiyah';
    if (format === 'csv') {
      downloadFile(`${slug}-survey-${today}.csv`, toCsv(dealerships), 'text/csv');
    } else {
      const ids = new Set(dealerships.map((d) => d.id));
      const buf = await toXlsxBuffer(dealerships, (await getAllFindings()).filter((f) => ids.has(f.dealershipId)));
      downloadFile(
        `${slug}-survey-${today}.xlsx`,
        buf,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    }
    setExporting(null);
  };

  return (
    <div className="safe-top h-full overflow-y-auto pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 px-4 py-4 backdrop-blur">
        <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
        <MarketSwitcher value={activeMarket} onChange={setActiveMarket} counts={marketCounts} className="mt-3 shadow-none" />
      </header>

      <div className="space-y-6 px-4 py-5">
        {/* Research alerts */}
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-foreground">Research alerts</h2>
          <p className="mt-0.5 text-xs text-muted">Changed findings and suspected duplicate dealerships.</p>
          <div className="mt-3">
            <ResearchAlerts onChanged={reload} />
          </div>
        </section>

        {/* Progress */}
        <section className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-foreground">
              {visited} / {total}
            </div>
            <div className="text-sm font-medium text-accent">{pct}% complete</div>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">{remaining} dealerships not yet visited</p>
        </section>

        {/* Coverage by status */}
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-foreground">Coverage by status</h2>
          <div className="mt-3 space-y-2">
            {(Object.keys(statusCounts) as VisitStatus[]).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: VISIT_STATUS_COLOR[s] }} />
                <span className="w-28 shrink-0 text-xs text-muted">{VISIT_STATUS_LABEL[s]}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${dealerships.length ? (statusCounts[s] / dealerships.length) * 100 : 0}%`,
                      background: VISIT_STATUS_COLOR[s],
                    }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-xs font-medium text-foreground">{statusCounts[s]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Field completeness */}
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-foreground">Field completeness (visited records)</h2>
          <div className="mt-3 space-y-1.5 text-sm">
            <CompletenessRow label="Missing CR number" count={missingCr} total={visitedRecords.length} />
            <CompletenessRow label="Missing POC mobile" count={missingPocMobile} total={visitedRecords.length} />
            <CompletenessRow label="Missing financing-loss data" count={missingFinancingLoss} total={visitedRecords.length} />
          </div>
        </section>

        {/* Aggregates */}
        <section className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Market aggregates</h2>
            <button
              onClick={() => setObservedOnly((v) => !v)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                observedOnly ? 'bg-emerald-500 text-white' : 'bg-surface-2 text-muted'
              }`}
            >
              {observedOnly ? '👁 Observed-only' : 'All figures (incl. self-reported)'}
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">
            {observedOnly
              ? 'Only figures tagged Observed are included — self-reported volumes are excluded to avoid inflated averages.'
              : 'Includes self-reported figures. Dealers tend to inflate volumes — treat with caution.'}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Sellable inventory surveyed" value={agg.totalInventory.toLocaleString()} sub={`${agg.inventoryCount} records`} />
            <Stat label="Avg salesmen / showroom" value={agg.avgSalesmen !== null ? agg.avgSalesmen.toFixed(1) : '—'} />
            <Stat label="Avg selling price" value={agg.avgPrice !== null ? `SAR ${Math.round(agg.avgPrice).toLocaleString()}` : '—'} />
            <Stat label="Avg monthly units sold" value={agg.avgMonthlySold !== null ? Math.round(agg.avgMonthlySold).toLocaleString() : '—'} />
          </div>
          <div className="mt-3 rounded-xl bg-accent/10 p-3">
            <div className="text-xs font-medium text-accent">Total financing enquiries lost / month (market)</div>
            <div className="mt-1 text-2xl font-bold text-accent">
              {agg.totalFinancingLost.toLocaleString()}
              <span className="ml-1 text-xs font-normal text-muted">from {agg.financingLostCount} records</span>
            </div>
          </div>
        </section>

        {/* Pipeline */}
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-foreground">Pilot pipeline</h2>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <PipelineStat label="Yes" value={pilotCounts.yes} color="#22c55e" />
            <PipelineStat label="Maybe" value={pilotCounts.maybe} color="#f59e0b" />
            <PipelineStat label="No" value={pilotCounts.no} color="#ef4444" />
            <PipelineStat label="Too early" value={pilotCounts.too_early} color="#9ca3af" />
          </div>
        </section>

        {/* Leads */}
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-foreground">Top leads</h2>
          <p className="mt-0.5 text-xs text-muted">Open to pilot, ranked by financing enquiries lost per month</p>
          <div className="mt-3 divide-y divide-border">
            {leads.length === 0 && <p className="py-3 text-xs text-muted">No qualifying leads yet.</p>}
            {leads.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{d.nameEn}</div>
                  <div className="text-xs text-muted">
                    {d.openToPilot === 'yes' ? 'Open to pilot' : 'Maybe open to pilot'}
                  </div>
                </div>
                <div className="shrink-0 text-sm font-semibold text-accent">
                  {d.financingLostPerMonth.value ?? '—'}/mo
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Dealer network: sell-through to sub-dealers, not end customers */}
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-foreground">Dealer network</h2>
          <p className="mt-0.5 text-xs text-muted">
            The wholesale layer — dealerships moving cars to sub-dealers, not to end customers.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat label="Hub suppliers" value={String(network.hubs.length)} sub="Supply sub-dealers" />
            <Stat label="Known sub-dealers" value={String(network.subDealers.length)} sub="Source from a hub" />
          </div>
          <div className="mt-3 rounded-xl bg-accent/10 p-3">
            <div className="text-xs font-medium text-accent">Sell-through to sub-dealers / month</div>
            <div className="mt-1 text-2xl font-bold text-accent">{network.sellThroughUnits.toLocaleString()}</div>
          </div>
          {network.hubs.length > 0 && (
            <div className="mt-3 divide-y divide-border">
              {network.hubs.map((d) => (
                <div key={d.id} className="py-2 text-sm">
                  <div className="font-medium text-foreground">{d.nameEn}</div>
                  {d.suppliesSubDealerNames.length > 0 && (
                    <div className="text-xs text-muted">supplies: {d.suppliesSubDealerNames.join(', ')}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Partnered & competitors */}
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-foreground">Already partnered (banks on record)</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {partnered.length === 0 && <p className="text-xs text-muted">None recorded yet.</p>}
            {partnered.map((d) => (
              <span key={d.id} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-foreground">
                {d.nameEn} · {d.banksPartnered.length} bank(s)
              </span>
            ))}
          </div>
          <h2 className="mt-4 text-sm font-semibold text-foreground">Competitors in market</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {competitors.length === 0 && <p className="text-xs text-muted">None flagged.</p>}
            {competitors.map((d) => (
              <span key={d.id} className="rounded-full bg-purple-500/10 px-2.5 py-1 text-xs text-purple-500">
                {d.nameEn}
              </span>
            ))}
          </div>
        </section>

        {/* Export */}
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-foreground">Export</h2>
          <p className="mt-0.5 text-xs text-muted">
            {MARKETS[activeMarket].label} only — switch market above to export the other. Preserves observed/self-reported flags and all metadata.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => doExport('csv')}
              disabled={exporting !== null}
              className="flex-1 rounded-xl bg-surface-2 py-3 text-sm font-semibold text-foreground disabled:opacity-40"
            >
              {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
            </button>
            <button
              onClick={() => doExport('xlsx')}
              disabled={exporting !== null}
              className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-accent-contrast disabled:opacity-40"
            >
              {exporting === 'xlsx' ? 'Exporting…' : 'Export Excel'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function CompletenessRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={`font-medium ${pct > 30 ? 'text-red-500' : 'text-foreground'}`}>
        {count} ({pct}%)
      </span>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-foreground">{value}</div>
      {sub && <div className="text-[10px] text-muted">{sub}</div>}
    </div>
  );
}

function PipelineStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-surface-2 py-3">
      <div className="text-lg font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  );
}
