import raw from "./census-data.json";
import { SHIFA_ROWS } from "./shifa-seed";
import { SHIFA_WALK_SEP15 } from "./shifa-walk-sep15";
import { SHIFA_WALK_SEP20, SHIFA_WALK_PATCHES } from "./shifa-walk-sep20";
import type { CensusRow, DealershipFlags, SurveyPayload, VisitStatus } from "./types";

/** v16: 20 Sep 2026 Al Shifa walk. Patch existing pins + add S0085–S0108. */
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
export const CENSUS_VERSION = 16;
const CLUSTER = { lat: 24.5479261, lng: 46.6818955 };

function around(eastM: number, northM: number) {
  const latM = 111_320;
  const lngM = 111_320 * Math.cos((CLUSTER.lat * Math.PI) / 180);
  return { lat: +(CLUSTER.lat + northM / latM).toFixed(7), lng: +(CLUSTER.lng + eastM / lngM).toFixed(7) };
}

type WalkSeed = {
  sdId: string; nameEn: string; nameAr: string;
  pos: { eastM: number; northM: number }; street: string; note: string;
  mapsUrl?: string; status?: VisitStatus;
  walked?: {
    visitDate: string; inventoryUnits?: number | null; inventoryInside?: number | null;
    inventoryOutside?: number | null; inventoryAgePctOver5?: number | null;
    showroomSizeSqm?: number | null; mainBrands: string[]; avgSellingPriceSar?: number | null;
    salesmenCount?: number | null; financeAvailable?: SurveyPayload["financeAvailable"];
    financeEvidence?: string; vehicleType?: SurveyPayload["vehicleType"];
  };
};

function walkToRow(s: WalkSeed): CensusRow {
  const pos = around(s.pos.eastM, s.pos.northM);
  const w = s.walked;
  const flags: DealershipFlags = {
    sdId: s.sdId, market: "shifa", mappingOnly: true, census: false,
    gpsSource: "mapping_seed", street: s.street,
    mapsUrl: s.mapsUrl || `https://www.google.com/maps?q=${pos.lat},${pos.lng}`,
    censusVersion: CENSUS_VERSION, needsGps: true,
  };
  const survey: SurveyPayload = {
    visitDate: w?.visitDate ?? "", surveyorName: w ? "visual census" : "",
    visitStatus: s.status ?? (w ? "partial" : "not_visited"),
    mainBrands: w?.mainBrands ?? [], banksPartnered: [], leadOnlinePct: 0,
    authorisedDealer: "", authorisedBrand: "",
    vehicleType: w?.vehicleType ?? "used_only", street: s.street, notes: s.note,
    inventoryUnits: w?.inventoryUnits ?? null, inventoryInside: w?.inventoryInside ?? null,
    inventoryOutside: w?.inventoryOutside ?? null, inventoryAgePctOver5: w?.inventoryAgePctOver5 ?? null,
    inventoryBasis: w ? "estimated" : "", inventorySource: w ? "observed" : "",
    showroomSizeSqm: w?.showroomSizeSqm ?? null, sizeBasis: w ? "estimated" : "",
    showroomSizeSource: w ? "observed" : "",
    avgSellingPriceSar: w?.avgSellingPriceSar ?? null,
    avgPriceSource: w?.avgSellingPriceSar != null ? "self_reported" : "",
    salesmenCount: w?.salesmenCount ?? null,
    salesmenSource: w?.salesmenCount != null ? "observed" : "",
    financeAvailable: w?.financeAvailable ?? "",
    financeEvidence: w?.financeEvidence ?? "",
    volumeFiguresAre: w ? "mixed" : "",
  };
  return {
    sdId: s.sdId, nameEn: s.nameEn, nameAr: s.nameAr, lat: pos.lat, lng: pos.lng,
    phone: "", note: s.note, status: s.status ?? (w ? "partial" : "not_visited"),
    flags, survey, step: 0,
  };
}

function tagMarket(row: CensusRow, market: "qadisiyah" | "shifa"): CensusRow {
  return { ...row, flags: { ...row.flags, market, censusVersion: CENSUS_VERSION } };
}

function applyPatches(rows: CensusRow[]): CensusRow[] {
  const byId = new Map(SHIFA_WALK_PATCHES.map((p) => [p.sdId, p]));
  return rows.map((r) => {
    const p = byId.get(r.sdId);
    if (!p) return r;
    const w = p.walked;
    const survey: SurveyPayload = {
      ...(r.survey ?? {}),
      visitDate: w?.visitDate ?? r.survey?.visitDate ?? "",
      surveyorName: "visual census",
      visitStatus: p.status ?? "partial",
      mainBrands: w?.mainBrands?.length ? w.mainBrands : r.survey?.mainBrands ?? [],
      vehicleType: w?.vehicleType ?? r.survey?.vehicleType ?? "",
      notes: p.note,
      inventoryUnits: w?.inventoryUnits ?? r.survey?.inventoryUnits ?? null,
      inventoryInside: w?.inventoryInside ?? r.survey?.inventoryInside ?? null,
      inventoryOutside: w?.inventoryOutside ?? r.survey?.inventoryOutside ?? null,
      inventoryAgePctOver5: w?.inventoryAgePctOver5 ?? r.survey?.inventoryAgePctOver5 ?? null,
      inventoryBasis: "estimated", inventorySource: "observed",
      showroomSizeSqm: w?.showroomSizeSqm ?? r.survey?.showroomSizeSqm ?? null,
      avgSellingPriceSar: w?.avgSellingPriceSar ?? r.survey?.avgSellingPriceSar ?? null,
      avgPriceSource: w?.avgSellingPriceSar != null ? "self_reported" : r.survey?.avgPriceSource ?? "",
      financeAvailable: w?.financeAvailable ?? r.survey?.financeAvailable ?? "",
      financeEvidence: w?.financeEvidence ?? r.survey?.financeEvidence ?? "",
      volumeFiguresAre: "mixed",
    };
    return {
      ...r, nameEn: p.nameEn || r.nameEn, nameAr: p.nameAr || r.nameAr, note: p.note,
      status: p.status ?? "partial",
      flags: { ...r.flags, mapsUrl: p.mapsUrl || r.flags.mapsUrl, censusVersion: CENSUS_VERSION, street: p.street || r.flags.street },
      survey,
    };
  });
}

export const CENSUS_ROWS: CensusRow[] = data.rows.map((r) => tagMarket(r, "qadisiyah"));
export const EXTRA_PINS: CensusRow[] = data.extra.map((r) => tagMarket(r, "qadisiyah"));
export const SHIFA_PINS: CensusRow[] = applyPatches([
  ...SHIFA_ROWS, ...SHIFA_WALK_SEP15.map(walkToRow), ...SHIFA_WALK_SEP20.map(walkToRow),
]).map((r) => tagMarket(r, "shifa"));
export const ALL_CENSUS: CensusRow[] = [...CENSUS_ROWS, ...EXTRA_PINS, ...SHIFA_PINS];
export const CENSUS_STATS = {
  ...data.stats,
  extraMapping: (data.stats.extraMapping ?? 0) + SHIFA_PINS.length,
  shifa: SHIFA_PINS.length,
  qadisiyah: CENSUS_ROWS.length + EXTRA_PINS.length,
};
