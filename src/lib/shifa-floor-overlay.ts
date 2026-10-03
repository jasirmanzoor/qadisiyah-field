import { SHIFA_FLOOR_NEW } from "./shifa-floor-sep27";
import type { Dealership, SurveyPayload, SurveyRecord } from "./types";

const NOW = "2026-10-01T09:00:00.000Z";

function surveyPayload(note: string | undefined, survey: Partial<SurveyPayload>, status: Dealership["status"]): SurveyPayload {
  return {
    visitDate: status === "partial" ? "2026-10-01" : "",
    visitStatus: status,
    mainBrands: survey.mainBrands ?? [],
    banksPartnered: [],
    leadOnlinePct: 0,
    notes: note ?? "",
    vehicleType: survey.vehicleType ?? "",
    inventoryUnits: survey.inventoryUnits ?? null,
    inventoryInside: survey.inventoryInside ?? null,
    inventoryOutside: survey.inventoryOutside ?? null,
    inventoryAgePctOver5: survey.inventoryAgePctOver5 ?? null,
    showroomSizeSqm: survey.showroomSizeSqm ?? null,
    avgSellingPriceSar: survey.avgSellingPriceSar ?? null,
    financeAvailable: survey.financeAvailable ?? "",
    financeEvidence: survey.financeEvidence ?? "",
    salesmenCount: survey.salesmenCount ?? null,
    monthlySoldExact: survey.monthlySoldExact ?? null,
    monthlyFinancedExact: survey.monthlyFinancedExact ?? null,
    fpr: survey.fpr ?? null,
  };
}

export function shifaFloorDealers(): Dealership[] {
  return SHIFA_FLOOR_NEW.map((n) => {
    const status = n.status ?? "partial";
    return {
      id: n.sdId,
      nameEn: n.nameEn,
      nameAr: n.nameAr,
      lat: n.lat,
      lng: n.lng,
      listedPhone: n.phone ?? "",
      seedNote: n.note ?? "",
      status,
      createdAt: NOW,
      updatedAt: NOW,
      flags: {
        sdId: n.sdId,
        market: "shifa",
        mapsUrl: n.mapsUrl || `https://www.google.com/maps?q=${n.lat},${n.lng}`,
        needsGps: n.needsGps ?? false,
        floor27: true,
        gpsSource: n.mapsUrl ? "maps_link" : "mapping_seed",
        censusVersion: 21,
      },
    };
  });
}

export function shifaFloorSurvey(sdId: string): SurveyRecord | undefined {
  const n = SHIFA_FLOOR_NEW.find((d) => d.sdId === sdId);
  if (!n) return undefined;
  const status = n.status ?? "partial";
  return {
    id: n.sdId,
    dealershipId: n.sdId,
    payload: surveyPayload(n.note, n.survey, status),
    step: 4,
    updatedAt: NOW,
  };
}

function normName(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

/** Paint walked doors the server roster has not inserted yet. Never replaces an existing sdId or the same name. */
export function overlayMissingShifa(dealers: Dealership[]): Dealership[] {
  const have = new Set<string>();
  for (const d of dealers) {
    if (d.id) have.add(d.id);
    if (d.flags?.sdId) have.add(d.flags.sdId);
    const en = normName(d.nameEn || "");
    const ar = normName(d.nameAr || "");
    if (en) have.add(en);
    if (ar) have.add(ar);
  }
  const extra = shifaFloorDealers().filter((d) => {
    const en = normName(d.nameEn);
    const ar = normName(d.nameAr);
    return !have.has(d.id) && !have.has(d.flags.sdId || "") && !have.has(en) && !have.has(ar);
  });
  return extra.length ? [...dealers, ...extra] : dealers;
}
