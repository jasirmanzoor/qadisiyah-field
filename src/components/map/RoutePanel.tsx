'use client';

import type { Dealership } from '@/lib/types';
import { formatDistance, haversineMeters, nearestNeighbourOrder } from '@/lib/geo';

interface RoutePanelProps {
  selected: Dealership[];
  userLocation: { lat: number; lng: number } | null;
  planned: Dealership[] | null;
  onPlan: (ordered: Dealership[]) => void;
  onClear: () => void;
  onExitRouteMode: () => void;
}

export default function RoutePanel({
  selected,
  userLocation,
  planned,
  onPlan,
  onClear,
  onExitRouteMode,
}: RoutePanelProps) {
  const plan = () => {
    const start = userLocation ?? (selected[0] ? { lat: selected[0].lat, lng: selected[0].lng } : null);
    if (!start) return;
    onPlan(nearestNeighbourOrder(start, selected));
  };

  const googleDirectionsUrl = () => {
    if (!planned || planned.length === 0) return '#';
    const origin = userLocation
      ? `${userLocation.lat},${userLocation.lng}`
      : `${planned[0].lat},${planned[0].lng}`;
    const stops = userLocation ? planned : planned.slice(1);
    const destination = stops[stops.length - 1];
    const waypoints = stops.slice(0, -1).map((d) => `${d.lat},${d.lng}`).join('|');
    const params = new URLSearchParams({
      api: '1',
      origin,
      destination: destination ? `${destination.lat},${destination.lng}` : origin,
      travelmode: 'walking',
    });
    if (waypoints) params.set('waypoints', waypoints);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  };

  let totalDistance = 0;
  if (planned && planned.length > 0) {
    let cursor = userLocation ?? planned[0];
    for (const stop of planned) {
      totalDistance += haversineMeters(cursor, stop);
      cursor = stop;
    }
  }

  return (
    <div className="safe-bottom absolute inset-x-0 bottom-0 z-[1100] max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface shadow-2xl">
      <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-border" />
      <div className="px-4 pb-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Route planner</h2>
          <button onClick={onExitRouteMode} className="text-sm font-medium text-accent">
            Done
          </button>
        </div>

        {!planned ? (
          <>
            <p className="mt-1 text-sm text-muted">
              Tap pins on the map to add them, then plan an optimised walking order.
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">{selected.length} stop(s) selected</p>
            <button
              onClick={plan}
              disabled={selected.length === 0}
              className="mt-3 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accent-contrast disabled:opacity-40"
            >
              Plan walking order
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              {planned.length} stops · ~{formatDistance(totalDistance)} total
            </p>
            <ol className="mt-3 space-y-2">
              {planned.map((d, i) => (
                <li key={d.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-contrast">
                    {i + 1}
                  </span>
                  <span className="truncate text-sm text-foreground">{d.nameEn || 'Unnamed'}</span>
                </li>
              ))}
            </ol>
            <div className="mt-3 flex gap-2">
              <a
                href={googleDirectionsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-xl bg-accent py-3 text-center text-sm font-semibold text-accent-contrast"
              >
                Open in Google Maps
              </a>
              <button onClick={onClear} className="rounded-xl bg-surface-2 px-4 py-3 text-sm font-medium text-foreground">
                Clear
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
