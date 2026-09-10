export const MARKET_CENTER = { lat: 24.826, lng: 46.823 } as const;
export const DEFAULT_ZOOM = 15;

export function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h =
    s1 * s1 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

export function optimizeWalkOrder<T extends { lat: number; lng: number }>(
  start: { lat: number; lng: number },
  points: T[],
): T[] {
  const remaining = [...points];
  const ordered: T[] = [];
  let cur = start;
  while (remaining.length) {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineM(cur, remaining[i]);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    const next = remaining.splice(best, 1)[0];
    ordered.push(next);
    cur = next;
  }
  return ordered;
}

export function bearingDeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export type DealerCluster<T extends { id: string; lat: number; lng: number }> = {
  id: string;
  lat: number;
  lng: number;
  items: T[];
};

/** Grid size in degrees. 0 = do not cluster (individual pins). */
export function clusterCellDeg(zoom: number): number {
  if (zoom >= 18) return 0;
  if (zoom >= 17) return 0.00016;
  if (zoom >= 16) return 0.00038;
  if (zoom >= 15) return 0.0008;
  if (zoom >= 14) return 0.0016;
  return 0.0032;
}

export function clusterByZoom<T extends { id: string; lat: number; lng: number }>(
  items: T[],
  zoom: number,
): DealerCluster<T>[] {
  const cell = clusterCellDeg(zoom);
  if (cell <= 0 || items.length === 0) {
    return items.map((d) => ({ id: d.id, lat: d.lat, lng: d.lng, items: [d] }));
  }
  const buckets = new Map<string, T[]>();
  for (const d of items) {
    const key = `${Math.round(d.lat / cell)}:${Math.round(d.lng / cell)}`;
    const arr = buckets.get(key);
    if (arr) arr.push(d);
    else buckets.set(key, [d]);
  }
  const out: DealerCluster<T>[] = [];
  for (const [key, ds] of buckets) {
    let lat = 0;
    let lng = 0;
    for (const d of ds) {
      lat += d.lat;
      lng += d.lng;
    }
    const n = ds.length;
    out.push({
      id: n === 1 ? ds[0].id : `c:${key}`,
      lat: lat / n,
      lng: lng / n,
      items: ds,
    });
  }
  return out;
}
