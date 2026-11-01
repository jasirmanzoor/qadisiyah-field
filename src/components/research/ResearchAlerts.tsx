'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  dismissFindingAlert,
  getAllDealerships,
  getAllDuplicateFlags,
  getAllFindings,
  mergeDealerships,
  saveDuplicateScan,
  updateDuplicateFlagStatus,
} from '@/lib/db';
import { findSuspectedDuplicates } from '@/lib/duplicate-detection';
import type { AgentFinding, DuplicateFlag } from '@/lib/research-types';
import type { Dealership } from '@/lib/types';
import { VISIT_STATUS_LABEL } from '@/lib/types';

function filledFieldCount(d: Dealership): number {
  const values: unknown[] = [
    d.crNumber, d.listedPhone, d.pocName, d.pocMobile, d.decisionMaker, d.numSalesmen, d.showroomSizeSqm,
    d.vehicleType, d.authorised, d.inventorySellableUnits?.value, d.avgSellingPriceSar?.value,
    d.avgMonthlySold?.value, d.avgMonthlyFinanced?.value, d.financingLostPerMonth?.value, d.buyerMix,
    d.openToPilot, d.notes, ...(d.mainBrands ?? []), ...(d.photoIds ?? []),
  ];
  return values.filter((v) => v !== null && v !== undefined && v !== '').length;
}

export default function ResearchAlerts({ onChanged }: { onChanged?: () => void }) {
  const [changed, setChanged] = useState<AgentFinding[]>([]);
  const [dupes, setDupes] = useState<DuplicateFlag[]>([]);
  const [byId, setById] = useState<Record<string, Dealership>>({});
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState<string | null>(null);
  const [mergingFlag, setMergingFlag] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [findings, flags, dealerships] = await Promise.all([
      getAllFindings(),
      getAllDuplicateFlags(),
      getAllDealerships(),
    ]);
    const map = Object.fromEntries(dealerships.map((d) => [d.id, d]));
    setChanged(
      findings
        .filter((f) => f.changedFromPrevious && f.status === 'pending' && !f.alertDismissed && map[f.dealershipId])
        .sort((a, b) => (a.retrievedAt < b.retrievedAt ? 1 : -1))
    );
    setDupes(flags.filter((f) => f.status === 'pending' && map[f.dealershipIdA] && map[f.dealershipIdB]));
    setById(map);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async IndexedDB load
    load();
  }, []);

  const scanForDuplicates = async () => {
    setScanning(true);
    setScanNote(null);
    const dealerships = await getAllDealerships();
    const found = findSuspectedDuplicates(dealerships);
    const before = new Set((await getAllDuplicateFlags()).map((f) => f.id));
    await saveDuplicateScan(found);
    const fresh = found.filter((f) => !before.has(f.id)).length;
    setScanNote(`Scanned ${dealerships.length} records · ${found.length} name matches · ${fresh} new`);
    setScanning(false);
    await load();
  };

  const dismissDupe = async (id: string) => {
    await updateDuplicateFlagStatus(id, 'dismissed');
    await load();
  };

  const merge = async (flag: DuplicateFlag, keepId: string) => {
    const removeId = keepId === flag.dealershipIdA ? flag.dealershipIdB : flag.dealershipIdA;
    setBusy(true);
    setError(null);
    try {
      await mergeDealerships(keepId, removeId, flag.id);
      setMergingFlag(null);
      await load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Merge failed');
    } finally {
      setBusy(false);
    }
  };

  const dismissChange = async (id: string) => {
    await dismissFindingAlert(id);
    await load();
  };

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</p>}

      <div>
        <div className="mb-1.5 text-xs font-semibold text-purple-500">Changed since last check</div>
        {changed.length === 0 ? (
          <p className="text-xs text-muted">No research values have changed.</p>
        ) : (
          <div className="space-y-1.5">
            {changed.map((f) => (
              <div key={f.id} className="rounded-lg bg-purple-500/5 px-3 py-2 text-xs">
                <div>
                  <span className="font-medium text-foreground">{byId[f.dealershipId]?.nameEn}</span>
                  <span className="text-muted"> — {f.taskName}</span>
                </div>
                <div className="mt-0.5 break-words text-purple-500">
                  &quot;{f.previousValue}&quot; → &quot;{f.value}&quot;
                </div>
                <div className="mt-1.5 flex gap-3">
                  <Link href={`/survey/${f.dealershipId}?research=1`} className="font-medium text-accent underline">
                    Review
                  </Link>
                  <button onClick={() => dismissChange(f.id)} className="text-muted underline">
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-500">Suspected duplicates</span>
          <button onClick={scanForDuplicates} disabled={scanning} className="text-[11px] text-accent underline">
            {scanning ? 'Scanning…' : dupes.length ? 'Re-scan' : 'Scan roster'}
          </button>
        </div>
        {scanNote && <p className="mb-1.5 text-[11px] text-muted">{scanNote}</p>}
        {dupes.length === 0 ? (
          <p className="text-xs text-muted">None pending. Scan to check the current roster — dismissed pairs stay dismissed.</p>
        ) : (
          <div className="space-y-1.5">
            {dupes.map((flag) => {
              const a = byId[flag.dealershipIdA];
              const b = byId[flag.dealershipIdB];
              const open = mergingFlag === flag.id;
              return (
                <div key={flag.id} className="rounded-lg bg-amber-500/5 px-3 py-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-foreground">
                        {a.nameEn} <span className="text-muted">↔</span> {b.nameEn}
                      </div>
                      <div className="text-muted">
                        {flag.reason}
                        {flag.distanceMeters !== null ? ` · ${flag.distanceMeters}m apart` : ''}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-3">
                      <button onClick={() => setMergingFlag(open ? null : flag.id)} className="text-[11px] font-medium text-accent underline">
                        {open ? 'Cancel' : 'Merge…'}
                      </button>
                      <button onClick={() => dismissDupe(flag.id)} className="text-[11px] text-muted underline">
                        Not a duplicate
                      </button>
                    </div>
                  </div>
                  {open && (
                    <div className="mt-2 space-y-1.5 border-t border-amber-500/20 pt-2">
                      <p className="text-[11px] text-muted">
                        Keep which record? Its values win; the other only fills empty fields. Photos, notes and research
                        move across, then the other record is deleted.
                      </p>
                      {[a, b].map((d) => (
                        <button
                          key={d.id}
                          disabled={busy}
                          onClick={() => merge(flag, d.id)}
                          className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left disabled:opacity-40"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-foreground">Keep {d.nameEn}</span>
                            <span className="block text-[10px] text-muted">
                              {VISIT_STATUS_LABEL[d.visitStatus]} · {filledFieldCount(d)} {filledFieldCount(d) === 1 ? "field" : "fields"} filled
                              {d.isSeed ? ' · roster' : ' · added in field'}
                            </span>
                          </span>
                          <span className="text-accent">→</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
