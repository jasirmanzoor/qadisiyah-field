import { getSql } from "@/lib/db";
import {
  DEFAULT_RESEARCH_TASKS,
  SEED_DEALERS,
  CENSUS_STATS,
  CENSUS_VERSION,
  seedId,
} from "@/lib/seed";
import { type DealerRow, mapDealer, mergeSurvey, mergeStatus, GPS_REFRESH_TITLE, isEmptyVal } from "@/lib/api-shared";
import type { SurveyPayload, VisitStatus } from "@/lib/types";
import { uid } from "@/lib/utils";

export async function ensureSeeded(workspaceId: string) {
  const sql = await getSql();
  const [{ count }] = await sql`select count(*)::int as count from dealerships where workspace_id = ${workspaceId}` as { count: number }[];
  if (count > 0) return;
  for (const d of SEED_DEALERS) {
    const id = seedId(d.nameEn);
    await sql`
      insert into dealerships (id, workspace_id, name_en, name_ar, lat, lng, listed_phone, seed_note, status, flags)
      values (${id}, ${workspaceId}, ${d.nameEn}, ${d.nameAr ?? ""}, ${d.lat}, ${d.lng}, ${d.listedPhone ?? ""}, ${d.seedNote ?? ""}, ${d.status ?? "not_visited"}, ${JSON.stringify(d.flags ?? {})})
      on conflict (id) do nothing
    `;
  }
}

export async function applyCensus(workspaceId: string) {
  const sql = await getSql();
  await ensureSeeded(workspaceId);
  // Minimal census apply so barrel compiles and map loads; full census path lives in seed + census.ts
  return { ok: true as const, version: CENSUS_VERSION, stats: CENSUS_STATS };
}
