import { getSql } from "@/lib/db";
import {
  DEFAULT_RESEARCH_TASKS,
  SEED_DEALERS,
  CENSUS_STATS,
  CENSUS_VERSION,
  seedId,
} from "@/lib/seed";
import { SHIFA_PINS } from "@/lib/census";
import type { CensusRow } from "@/lib/types";

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
    const existing = (await sql`
      select id, lat, lng, name_ar, seed_note, flags
      from dealerships where id = ${id} and user_id = ${workspaceId}
    `) as { id: string; lat: number; lng: number; name_ar: string; seed_note: string; flags: unknown }[];

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
    const raw = typeof cur.flags === "string" ? cur.flags : JSON.stringify(cur.flags ?? {});
    const keepFieldGps =
      raw.includes("field_device_gps") || raw.includes("manual_pin") || raw.includes("\"gpsSource\":\"survey\"") || raw.includes('"gpsSource":"survey"');
    const nextLat = keepFieldGps ? Number(cur.lat) : d.lat;
    const nextLng = keepFieldGps ? Number(cur.lng) : d.lng;
    const moved = !keepFieldGps && (Number(cur.lat) !== d.lat || Number(cur.lng) !== d.lng);
    await sql`
      update dealerships set
        lat = ${nextLat},
        lng = ${nextLng},
        name_ar   = case when coalesce(name_ar, '')   = '' then ${d.nameAr ?? ""} else name_ar   end,
        seed_note = case when coalesce(seed_note, '') = '' then ${d.note ?? ""}   else seed_note end,
        flags     = case when coalesce(flags::text, '') in ('', '{}') then ${flags}     else flags     end,
        updated_at = now()
      where id = ${id} and user_id = ${workspaceId}
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
