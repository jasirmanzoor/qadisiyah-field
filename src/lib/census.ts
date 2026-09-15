import raw from "./census-data.json";
import { SHIFA_ROWS } from "./shifa-seed";
import type { CensusRow } from "./types";

/** August 2026 walking census (D0001–D0309) plus leftover mapping-only pins.
 *
 * Missing fields were filled only from observed patterns — financials were never invented:
 * GPS: GIS WKT POINT (lng lat) from the Autolink survey layer (v13) → latest sheet coords / maps links
 *      → mapping-roster name match → related/deep-survey copy → walking-order interpolation
 *      (flagged needsGps). Out-of-market GIS pins keep the Qadisiyah branch (D0065 Al Wadi).
 *      GIS live pins reopen a mind-map "closed" flag (D0069 Al Khiyar Al Badil).
 * Size: GIS showroom m² when 100–5000 and the row is not name-only; else modal 1,000 m².
 *      D0187 14,000 m² left at 1,400 (GIS itself flags a typo). D0228 trained desk keeps 1,500
 *      (GIS row is name-only).
 * Phone: sheet number, else mapping-roster match.
 * FPR: financed ÷ monthly sales when both exist.
 * ASP 10,000 on mixed/new stock (D0305, D0307) treated as a missing-zero typo → 100,000.
 * Visual fields (inventory, brands, size, salesmen) tagged observed; monthly volume tagged self-reported.
 * Training: Induction Sheet overlay (trained / hold / declined / unavailable / scheduled).
 * GIS identity: D0309 is Saleh Group (induction pin); D0151 is Swapcar closed (no WKT).
 * GIS reopen: D0069 Al Khiyar Al Badil has a live WKT pin (mind-map latlng was blank/closed).
 *
 * v14: Al Shifa (الشفا) used-car mapping seed (S0001+) is merged from shifa-seed.ts.
 *      Qadisiyah rows are tagged market=qadisiyah. Shifa has no invented financials.
 *      S0068–S0073 are 10 Sep 2026 visual walk (estimated floor counts, not VIN).
 *      Public listing counts stay in notes only (Ramz 59 on YallaMotor).
 * v15: S0074–S0084 Al Shifa floor notes 15 Sep 2026. Pins continue east of S0073.
 *      ASP / finance / salesmen filled only where the walk recorded them.
 */
export type { CensusRow };


type CensusFile = {
  version: number;
  stats: {
    census: number;
    extraMapping: number;
    gpsSources: Record<string, number>;
    status: Record<string, number>;
    missingPhone: number;
    withInventory: number;
    withMonthly: number;
    interpolated: number;
    closed: number;
    authorised: number;
    trained?: number;
    priority?: number;
    withPoc?: number;
  };
  rows: CensusRow[];
  extra: CensusRow[];
};

const data = raw as CensusFile;

/** Roster sync version. Bump to force existing workspaces to insert new pins. */
export const CENSUS_VERSION = 15;

function tagMarket(row: CensusRow, market: "qadisiyah" | "shifa"): CensusRow {
  return {
    ...row,
    flags: {
      ...row.flags,
      market,
      censusVersion: CENSUS_VERSION,
    },
  };
}

export const CENSUS_ROWS: CensusRow[] = data.rows.map((r) => tagMarket(r, "qadisiyah"));
export const EXTRA_PINS: CensusRow[] = data.extra.map((r) => tagMarket(r, "qadisiyah"));
export const SHIFA_PINS: CensusRow[] = SHIFA_ROWS.map((r) => tagMarket(r, "shifa"));
export const ALL_CENSUS: CensusRow[] = [...CENSUS_ROWS, ...EXTRA_PINS, ...SHIFA_PINS];

export const CENSUS_STATS = {
  ...data.stats,
  extraMapping: (data.stats.extraMapping ?? 0) + SHIFA_PINS.length,
  shifa: SHIFA_PINS.length,
  qadisiyah: CENSUS_ROWS.length + EXTRA_PINS.length,
};
