import { getSql } from "@/lib/db";
import {
  DEFAULT_RESEARCH_TASKS,
  SEED_DEALERS,
  CENSUS_STATS,
  CENSUS_VERSION,
  seedId,
} from "@/lib/seed";
import { SHIFA_PINS } from "@/lib/census";
import type { CensusRow, DealershipFlags } from "@/lib/types";

function isProtectedGps(flags: DealershipFlags | undefined): boolean {
  const src = flags?.gpsSource;
  return src === "field_device_gps" || src === "manual_pin" || src === "survey";
}

function parseFlags(raw: unknown): DealershipFlags {
  if (!raw) return {};
  if (typeof raw === "object") return raw as DealershipFlags;
  try {
    return JSON.parse(String(raw) || "{}") as DealershipFlags;
  } catch {
    return {};
  }
}

export async function ensureSeeded(workspaceId: string) {
  const sql = await getSql();
  const [{ count }] = (await sql`
    select count(*)::int as count from dealerships where user_id = ${workspaceId}
  `) as { count: number }[];
  if (count > 0) return;
  for (const d of SEED_DEALERS) {
    const id = seedId(d);
    await sql`
      insert into dealerships (id, user_id, name_en, name_ar, lat, lng, listed_phone, seed_note, status, flags)
      values (${id}, ${workspaceId}, ${d.nameEn}, ${d.nameAr ?? ""}, ${d.lat}, ${d.lng}, ${""}, ${d.note ?? ""}, ${d.status ?? "not_visited"}, ${JSON.stringify(d.flags ?? {})})
      on conflict (id) do nothing
    `;
  }
}

export async function applyShifaCensus(workspaceId: string) {
  const sql = await getSql();
  const rows = SHIFA_PINS as CensusRow[];
  let inserted = 0;
  let repinned = 0;

  for (const d of rows) {
    const id = seedId(d);
    const flags = JSON.stringify(d.flags ?? {});
    let existing = (await sql`
      select id, lat, lng, name_ar, seed_note, flags
      from dealerships where id = ${id} and user_id = ${workspaceId}
    `) as { id: string; lat: number; lng: number; name_ar: string; seed_note: string; flags: unknown }[];

    if (existing.length === 0 && d.sdId) {
      existing = (await sql`
        select id, lat, lng, name_ar, seed_note, flags
        from dealerships
        where user_id = ${workspaceId} and flags->>'sdId' = ${d.sdId}
        limit 1
      `) as typeof existing;
    }

    if (existing.length === 0) {
      await sql`
        insert into dealerships (id, user_id, name_en, name_ar, lat, lng, listed_phone, seed_note, status, flags)
        values (${id}, ${workspaceId}, ${d.nameEn}, ${d.nameAr ?? ""}, ${d.lat}, ${d.lng}, ${""}, ${d.note ?? ""}, ${d.status ?? "not_visited"}, ${flags})
        on conflict (id) do nothing
      `;
      inserted++;
      continue;
    }

    const cur = existing[0];
    const prevFlags = parseFlags(cur.flags);
    const keepFieldGps = isProtectedGps(prevFlags);
    if (keepFieldGps) continue;

    const merged: DealershipFlags = {
      ...prevFlags,
      ...d.flags,
      mapsUrl: d.flags.mapsUrl || prevFlags.mapsUrl,
      gpsSource: d.flags.gpsSource ?? prevFlags.gpsSource,
      gpsStatus: d.flags.gpsStatus ?? prevFlags.gpsStatus,
      needsGps: d.flags.needsGps ?? prevFlags.needsGps,
      censusVersion: CENSUS_VERSION,
      street: d.flags.street || prevFlags.street,
      trainingPriority: prevFlags.trainingPriority,
      trainingStage: prevFlags.trainingStage,
      trainingNote: prevFlags.trainingNote,
      failedSession: prevFlags.failedSession,
    };
    if (d.flags.needsGps === false) merged.needsGps = false;

    const moved = Number(cur.lat) !== d.lat || Number(cur.lng) !== d.lng;
    await sql`
      update dealerships set
        lat = ${d.lat},
        lng = ${d.lng},
        name_ar   = case when coalesce(name_ar, '')   = '' then ${d.nameAr ?? ""} else name_ar   end,
        seed_note = case when coalesce(seed_note, '') = '' then ${d.note ?? ""}   else seed_note end,
        flags     = ${JSON.stringify(merged)},
        updated_at = now()
      where id = ${cur.id} and user_id = ${workspaceId}
    `;
    if (moved) repinned++;
  }

  return { inserted, repinned, total: rows.length };
}

export async function applyCensus(workspaceId: string) {
  await ensureSeeded(workspaceId);
  const shifa = await applyShifaCensus(workspaceId);
  await sqlMarkApplied(workspaceId);
  return { ok: true as const, version: CENSUS_VERSION, stats: CENSUS_STATS, shifa };
}

async function sqlMarkApplied(workspaceId: string) {
  const sql = await getSql();
  await sql`
    insert into census_state (user_id, version, applied_at)
    values (${workspaceId}, ${CENSUS_VERSION}, now())
    on conflict (user_id) do update set version = ${CENSUS_VERSION}, applied_at = now()
  `;
}

export async function ensureCensusCurrent(workspaceId: string) {
  try {
    const sql = await getSql();
    const rows = (await sql`
      select version from census_state where user_id = ${workspaceId}
    `) as { version: number }[];
    if ((rows[0]?.version ?? 0) >= CENSUS_VERSION) return null;
    const shifa = await applyShifaCensus(workspaceId);
    await sqlMarkApplied(workspaceId);
    return shifa;
  } catch {
    return null;
  }
}

export { DEFAULT_RESEARCH_TASKS };
