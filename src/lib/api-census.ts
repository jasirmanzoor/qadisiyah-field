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

/** First-run seed. Inserts the full census only when the roster is empty. */
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

/**
 * Re-apply the Al Shifa census over an already-seeded roster.
 *
 * Scope and rules are deliberate and narrow:
 *   - Al Shifa ONLY. Qadisiyah rows are never read or written here.
 *   - Existing dealer  -> overwrite lat/lng ONLY. Name, status, notes and every
 *                         survey row are left exactly as the field team left them.
 *   - Blank fields     -> filled from the census (name_ar, seed_note, flags) only
 *                         where the stored value is empty. Never overwrites content.
 *   - Missing dealer   -> inserted in full.
 *
 * Surveys are not touched under any branch.
 */
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
    `) as { id: string; lat: number; lng: number; name_ar: string; seed_note: string; flags: string }[];

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
    const moved = cur.lat !== d.lat || cur.lng !== d.lng;
    // Coordinates always win from the census. Text fields only fill blanks.
    await sql`
      update dealerships set
        lat = ${d.lat},
        lng = ${d.lng},
        name_ar   = case when coalesce(name_ar, '')   = '' then ${d.nameAr ?? ""} else name_ar   end,
        seed_note = case when coalesce(seed_note, '') = '' then ${d.note ?? ""}   else seed_note end,
        flags     = case when coalesce(flags, '') in ('', '{}') then ${flags}     else flags     end,
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

/**
 * Runs the Al Shifa re-apply once per census version, per workspace.
 * Called on snapshot load, so an existing roster picks up new pins with no
 * user action. Failures are swallowed: a census hiccup must never block the
 * map from rendering the data already on hand.
 */
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
