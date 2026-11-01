'use client';

import { useMemo, useState } from 'react';
import type { Dealership, VisitStatus } from '@/lib/types';
import { VISIT_STATUS_COLOR, VISIT_STATUS_LABEL } from '@/lib/types';
import { formatDistance, haversineMeters } from '@/lib/geo';

const STATUS_FILTERS: VisitStatus[] = [
  'not_visited',
  'partial',
  'completed',
  'refused',
  'closed_moved',
  'competitor',
];

interface ListDrawerProps {
  dealerships: Dealership[];
  userLocation: { lat: number; lng: number } | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export default function ListDrawer({ dealerships, userLocation, onSelect, onClose }: ListDrawerProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Set<VisitStatus>>(new Set());
  const [needsGpsOnly, setNeedsGpsOnly] = useState(false);
  const needsGpsCount = useMemo(() => dealerships.filter((d) => d.needsGps).length, [dealerships]);

  const rows = useMemo(() => {
    let list = dealerships.map((d) => ({
      d,
      distance: userLocation ? haversineMeters(userLocation, d) : null,
    }));
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        ({ d }) =>
          d.nameEn.toLowerCase().includes(q) ||
          d.nameAr.includes(query.trim()) ||
          (d.sdId ?? '').toLowerCase().includes(q) ||
          (d.street ?? '').toLowerCase().includes(q)
      );
    }
    if (needsGpsOnly) list = list.filter(({ d }) => d.needsGps);
    if (statusFilter.size > 0) {
      list = list.filter(({ d }) => statusFilter.has(d.visitStatus));
    }
    if (userLocation) {
      list.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    } else {
      list.sort((a, b) => a.d.nameEn.localeCompare(b.d.nameEn));
    }
    return list;
  }, [dealerships, query, statusFilter, needsGpsOnly, userLocation]);

  const toggleStatus = (s: VisitStatus) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  return (
    <div className="safe-bottom absolute inset-0 z-[1100] flex flex-col bg-background">
      <div className="safe-top flex items-center gap-2 border-b border-border px-4 py-3">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, SD ID or street…"
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
        />
        <button onClick={onClose} className="shrink-0 rounded-xl bg-surface-2 px-3 py-2.5 text-sm font-medium text-foreground">
          Close
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => toggleStatus(s)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
              statusFilter.has(s) ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted'
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: VISIT_STATUS_COLOR[s] }} />
            {VISIT_STATUS_LABEL[s]}
          </button>
        ))}
        {needsGpsCount > 0 && (
          <button
            onClick={() => setNeedsGpsOnly((v) => !v)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
              needsGpsOnly ? 'border-accent bg-accent/10 text-accent' : 'border-dashed border-border text-muted'
            }`}
          >
            Needs GPS · {needsGpsCount}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {rows.length === 0 && (
          <p className="px-2 py-8 text-center text-sm text-muted">No dealerships match.</p>
        )}
        {rows.map(({ d, distance }) => (
          <button
            key={d.id}
            onClick={() => onSelect(d.id)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left active:bg-surface-2"
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: VISIT_STATUS_COLOR[d.visitStatus] }} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">{d.nameEn || 'Unnamed'}</div>
              <div className="truncate text-xs text-muted">
                {VISIT_STATUS_LABEL[d.visitStatus]}
                {d.street ? ` · ${d.street}` : ''}
                {d.needsGps ? ' · needs GPS' : ''}
              </div>
            </div>
            {distance !== null && <div className="shrink-0 text-xs font-medium text-muted">{formatDistance(distance)}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}
