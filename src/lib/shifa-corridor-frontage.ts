import type { CensusRow } from "./types";

/**
 * Ahmad Al Basri north-curb frontage for the dummy 24.5480608 ruler
 * from Al Nukhba Cruise (S0068) to Ramz Al Riyadh (S0112).
 * Longitude kept from the 122 sheet. Latitude dropped ~30m south onto
 * the street (Sultan Al Rudayyan reference 24.5477464).
 */
const STREET = 24.54776;

export const CORRIDOR_FRONTAGE: Record<string, { lat: number; lng: number }> = {
  S0068: { lat: STREET, lng: 46.6822905 },
  S0069: { lat: 24.5478, lng: 46.6825868 },
  S0070: { lat: STREET, lng: 46.6828831 },
  S0071: { lat: 24.5478, lng: 46.6831793 },
  S0072: { lat: STREET, lng: 46.6834756 },
  S0073: { lat: 24.5478, lng: 46.6837719 },
  S0074: { lat: STREET, lng: 46.6840682 },
  S0075: { lat: 24.5478, lng: 46.6843644 },
  S0076: { lat: STREET, lng: 46.6846607 },
  S0077: { lat: 24.5478, lng: 46.684957 },
  S0078: { lat: STREET, lng: 46.6852533 },
  S0079: { lat: 24.5478, lng: 46.6855495 },
  S0080: { lat: STREET, lng: 46.6858458 },
  S0081: { lat: 24.5478, lng: 46.6861421 },
  S0082: { lat: STREET, lng: 46.6864383 },
  S0083: { lat: 24.5478, lng: 46.6867346 },
  S0084: { lat: STREET, lng: 46.6870309 },
  S0118: { lat: 24.5478, lng: 46.6876234 },
  S0092: { lat: STREET, lng: 46.691475 },
  S0112: { lat: 24.5478, lng: 46.6920675 },
};

export function applyCorridorFrontage(rows: CensusRow[]): CensusRow[] {
  return rows.map((r) => {
    const hit = CORRIDOR_FRONTAGE[r.sdId];
    if (!hit) return r;
    const kept = r.flags.gpsSource === "field_device_gps" || r.flags.gpsSource === "manual_pin";
    if (kept) return r;
    return {
      ...r,
      lat: hit.lat,
      lng: hit.lng,
      flags: {
        ...r.flags,
        mapsUrl: `https://www.google.com/maps?q=${hit.lat},${hit.lng}`,
        gpsSource: "corridor_frontage",
        needsGps: true,
      },
    };
  });
}
