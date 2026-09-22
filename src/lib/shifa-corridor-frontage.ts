import type { CensusRow } from "./types";

/**
 * Field GPS captured 22 Sep 2026 for the Al Nukhba → Ramz Al Riyadh
 * dummy ruler. Exact pins from the surveyor — not interpolated.
 *
 * Still missing (leave as needsGps): S0073, S0078, S0112.
 */
export const FIELD_GPS: Record<string, { lat: number; lng: number }> = {
  S0068: { lat: 24.5429108, lng: 46.6856661 },
  S0069: { lat: 24.5426687, lng: 46.6857255 },
  S0070: { lat: 24.5424262, lng: 46.6855638 },
  S0071: { lat: 24.5423137, lng: 46.6849329 },
  S0072: { lat: 24.5429157, lng: 46.6844866 },
  S0074: { lat: 24.5463501, lng: 46.6844782 },
  S0075: { lat: 24.5469192, lng: 46.6845004 },
  S0076: { lat: 24.5462171, lng: 46.6854458 },
  S0077: { lat: 24.5441768, lng: 46.6848681 },
  S0079: { lat: 24.5462156, lng: 46.6861781 },
  S0080: { lat: 24.5460292, lng: 46.6866847 },
  S0081: { lat: 24.5462442, lng: 46.6872634 },
  S0082: { lat: 24.5472083, lng: 46.6855273 },
  S0083: { lat: 24.5472790, lng: 46.6859752 },
  S0084: { lat: 24.5475687, lng: 46.6858626 },
  S0092: { lat: 24.548709, lng: 46.6777295 },
};

export const CORRIDOR_FRONTAGE = FIELD_GPS;

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function applyCorridorFrontage(rows: CensusRow[]): CensusRow[] {
  return rows.map((r) => {
    const hit = FIELD_GPS[r.sdId];
    if (!hit) return r;
    return {
      ...r,
      lat: hit.lat,
      lng: hit.lng,
      flags: {
        ...r.flags,
        mapsUrl: mapsUrl(hit.lat, hit.lng),
        gpsSource: "survey",
        gpsStatus: "confirmed",
        needsGps: false,
      },
      note: r.note.replace(/GPS still needs a tap[^.]*\./gi, "Field GPS locked 22 Sep 2026.").replace(
        /NO GPS — coordinate is the surveyor's nearby placeholder, not a real pin\. Needs a tap on site\./gi,
        "Field GPS locked 22 Sep 2026.",
      ),
    };
  });
}
