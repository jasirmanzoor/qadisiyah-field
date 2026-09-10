import raw from "./census-data.json";
import type { DealershipFlags, SurveyPayload, VisitStatus } from "./types";

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
 */
export type CensusRow = {
  sdId: string;
  nameEn: string;
  nameAr: string;
  lat: number;
  lng: number;
  phone: string;
  note: string;
  status: VisitStatus;
  flags: DealershipFlags;
  survey: SurveyPayload;
  step: number;
};

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

export const CENSUS_VERSION = data.version;
export const CENSUS_STATS = data.stats;
export const CENSUS_ROWS: CensusRow[] = data.rows;
export const EXTRA_PINS: CensusRow[] = data.extra;
export const ALL_CENSUS: CensusRow[] = [...CENSUS_ROWS, ...EXTRA_PINS];
