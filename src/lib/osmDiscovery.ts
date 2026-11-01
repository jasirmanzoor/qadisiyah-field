// Discovers real, sourced candidate car dealerships from OpenStreetMap —
// used to grow the roster beyond what any survey has covered yet, without
// fabricating names or locations. Every result is a real mapped point;
// business details still have to be collected in the field.

export interface OsmCandidate {
  name: string;
  lat: number;
  lng: number;
  osmType: string;
  osmId: number;
  osmPhone: string;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

export async function queryOsmCarDealers(
  center: { lat: number; lng: number },
  radiusMeters: number
): Promise<OsmCandidate[]> {
  const query = `[out:json][timeout:25];
(
  node["shop"="car"](around:${radiusMeters},${center.lat},${center.lng});
  way["shop"="car"](around:${radiusMeters},${center.lat},${center.lng});
);
out center tags;`;

  const res = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(query),
  });
  if (!res.ok) {
    throw new Error(`Overpass request failed (HTTP ${res.status}). Try again with a better connection.`);
  }
  const data: OverpassResponse = await res.json();

  return data.elements
    .map((el): OsmCandidate | null => {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (typeof lat !== 'number' || typeof lng !== 'number') return null;
      const name = el.tags?.name || el.tags?.['name:en'] || el.tags?.['name:ar'] || '';
      if (!name) return null;
      return {
        name,
        lat,
        lng,
        osmType: el.type,
        osmId: el.id,
        osmPhone: el.tags?.phone || el.tags?.['contact:phone'] || '',
      };
    })
    .filter((c): c is OsmCandidate => c !== null);
}
