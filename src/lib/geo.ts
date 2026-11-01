export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6371000;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_M * c;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Nearest-neighbour walking order starting from `start`. Good enough for
 * ~10-15 stops in a compact district; not a true TSP solver.
 */
export function nearestNeighbourOrder<T extends LatLng>(start: LatLng, stops: T[]): T[] {
  const remaining = [...stops];
  const ordered: T[] = [];
  let current = start;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineMeters(current, remaining[i]);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    const [next] = remaining.splice(bestIdx, 1);
    ordered.push(next);
    current = next;
  }

  return ordered;
}

export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function whatsappUrl(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  return `https://wa.me/${digits}`;
}

export function telUrl(phone: string): string {
  return `tel:${phone}`;
}
