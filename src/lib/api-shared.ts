import type {
  Dealership,
  DealershipFlags,
  SurveyPayload,
  VisitStatus,
} from "@/lib/types";
import { parseJson } from "@/lib/utils";
import { ensureWorkspace } from "@/lib/workspace";
import { getSql } from "@/lib/db";
import { CENSUS_VERSION } from "@/lib/seed";

export type DealerRow = {
  id: string;
  name_en: string;
  name_ar: string;
  lat: number | string;
  lng: number | string;
  listed_phone: string;
  seed_note: string;
  status: string;
  flags: string;
  created_at: string;
  updated_at: string;
};

export function mapDealer(r: DealerRow): Dealership {
  return {
    id: r.id,
    nameEn: r.name_en,
    nameAr: r.name_ar ?? "",
    lat: Number(r.lat),
    lng: Number(r.lng),
    listedPhone: r.listed_phone ?? "",
    seedNote: r.seed_note ?? "",
    status: (r.status as VisitStatus) || "not_visited",
    flags: parseJson<DealershipFlags>(r.flags, {}),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export async function scoped(userId: string) {
  const sql = await getSql();
  const scope = await ensureWorkspace(sql, userId);
  return { sql, scope, userId };
}

export const GPS_REFRESH_TITLE = `Census v${CENSUS_VERSION} roster sync`;

export function isEmptyVal(v: unknown): boolean {
  if (v == null) return true;
  if (v === "") return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

export function mergeSurvey(existing: SurveyPayload, census: SurveyPayload, censusWins: boolean): SurveyPayload {
  if (censusWins) {
    const out: SurveyPayload = { ...existing };
    for (const [k, v] of Object.entries(census) as [keyof SurveyPayload, SurveyPayload[keyof SurveyPayload]][]) {
      if (!isEmptyVal(v)) (out as Record<string, unknown>)[k] = v;
    }
    return out;
  }
  const out: SurveyPayload = { ...census, ...existing };
  for (const [k, v] of Object.entries(census) as [keyof SurveyPayload, SurveyPayload[keyof SurveyPayload]][]) {
    if (isEmptyVal(existing[k]) && !isEmptyVal(v)) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

export function mergeStatus(existing: string | undefined, census: VisitStatus): VisitStatus {
  if (census === "closed" || census === "competitor") return census;
  if (existing === "completed" || existing === "refused") return existing as VisitStatus;
  return census || (existing as VisitStatus) || "partial";
}
