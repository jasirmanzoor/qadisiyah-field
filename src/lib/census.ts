import raw from "./census-data.json";
import { SHIFA_ROWS } from "./shifa-seed";
import { SHIFA_WALK_SEP15 } from "./shifa-walk-sep15";
import type { CensusRow, DealershipFlags, SurveyPayload, VisitStatus } from "./types";

/** August 2026 walking census (D0001–D0309) plus leftover mapping-only pins.
 *
 * v14: Al Shifa (الشفا) used-car mapping seed (S0001+) is merged from shifa-seed.ts.
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

const CLUSTER = { lat: 24.5479261, lng: 46.6818955 };

function around(eastM: number, northM: number) {
  const latM = 111_320;
  const lngM = 111_320 * Math.cos((CLUSTER.lat * Math.PI) / 180);
  return {
    lat: +(CLUSTER.lat + northM / latM).toFixed(7),
    lng: +(CLUSTER.lng + eastM / lngM).toFixed(7),
  };
}

function walkToRow(s: (typeof SHIFA_WALK_SEP15)[number]): CensusRow {
  const pos = around(s.pos.eastM, s.pos.northM);
  const w = s.walked;
  const flags: DealershipFlags = {
    sdId: s.sdId,
    market: "shifa",
    mappingOnly: true,
    census: false,
    gpsSource: "mapping_seed",
    street: s.street,
    mapsUrl: `https://www.google.com/maps?q=${pos.lat},${pos.lng}`,
    censusVersion: CENSUS_VERSION,
    needsGps: true,
  };
  const survey: SurveyPayload = {
    visitDate: w?.visitDate ?? "",
    surveyorName: w ? "visual census" : "",
    visitStatus: w ? "partial" : "not_visited",
    mainBrands: w?.mainBrands ?? [],
    banksPartnered: [],
    leadOnlinePct: 0,
    authorisedDealer: "",
    authorisedBrand: "",
    vehicleType: "used_only",
    street: s.street,
    notes: s.note,
    inventoryUnits: w?.inventoryUnits ?? null,
    inventoryInside: w?.inventoryInside ?? null,
    inventoryOutside: w?.inventoryOutside ?? null,
    inventoryAgePctOver5: w?.inventoryAgePctOver5 ?? null,
    inventoryBasis: w ? "estimated" : "",
    inventorySource: w ? "observed" : "",
    showroomSizeSqm: w?.showroomSizeSqm ?? null,
    sizeBasis: w ? "estimated" : "",
    showroomSizeSource: w ? "observed" : "",
    avgSellingPriceSar: w?.avgSellingPriceSar ?? null,
    avgPriceSource: w?.avgSellingPriceSar != null ? "self_reported" : "",
    salesmenCount: w?.salesmenCount ?? null,
    salesmenSource: w?.salesmenCount != null ? "observed" : "",
    financeAvailable: w?.financeAvailable ?? "",
    volumeFiguresAre: w ? "mixed" : "",
  };
  const status: VisitStatus = w ? "partial" : "not_visited";
  return {
    sdId: s.sdId,
    nameEn: s.nameEn,
    nameAr: s.nameAr,
    lat: pos.lat,
    lng: pos.lng,
    phone: "",
    note: s.note,
    status,
    flags,
    survey,
    step: 0,
  };
}

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
export const SHIFA_PINS: CensusRow[] = [...SHIFA_ROWS, ...SHIFA_WALK_SEP15.map(walkToRow)].map((r) =>
  tagMarket(r, "shifa"),
);
export const ALL_CENSUS: CensusRow[] = [...CENSUS_ROWS, ...EXTRA_PINS, ...SHIFA_PINS];

export const CENSUS_STATS = {
  ...data.stats,
  extraMapping: (data.stats.extraMapping ?? 0) + SHIFA_PINS.length,
  shifa: SHIFA_PINS.length,
  qadisiyah: CENSUS_ROWS.length + EXTRA_PINS.length,
};
