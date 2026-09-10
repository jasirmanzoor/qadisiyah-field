import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  DEFAULT_RESEARCH_TASKS,
  SEED_DEALERS,
  CENSUS_STATS,
  CENSUS_VERSION,
  seedId,
  pipelineFromTraining,
  followupFromTraining,
} from "@/lib/seed";
import {
  matchHitToDealer,
  matchQueryToDealer,
  parseLookupLines,
  type MatchableDealer,
} from "@/lib/bulk-match";
import type {
  AgentFinding,
  AppNotification,
  BulkSearchHit,
  Dealership,
  DealershipFlags,
  Followup,
  PhotoRecord,
  PipelineRow,
  PipelineStage,
  ResearchSettings,
  ResearchTask,
  Snapshot,
  SurveyPayload,
  SurveyRecord,
  VisitStatus,
} from "@/lib/types";
import { parseJson, toBool, uid } from "@/lib/utils";
import { ensureWorkspace, joinWorkspace, loadTeam, rotateJoinCode as rotateWorkspaceCode } from "@/lib/workspace";

type DealerRow = {
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

function mapDealer(r: DealerRow): Dealership {
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

async function scoped(userId: string) {
  const sql = await getSql();
  const scope = await ensureWorkspace(sql, userId);
  return { sql, scope, userId };
}

const GPS_REFRESH_TITLE = `Census v${CENSUS_VERSION} roster sync`;

function isEmptyVal(v: unknown): boolean {
  if (v == null) return true;
  if (v === "") return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

function mergeSurvey(existing: SurveyPayload, census: SurveyPayload, censusWins: boolean): SurveyPayload {
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

function mergeStatus(existing: string | undefined, census: VisitStatus): VisitStatus {
  if (census === "closed" || census === "competitor") return census;
  if (existing === "completed" || existing === "refused") return existing as VisitStatus;
  return census || (existing as VisitStatus) || "partial";
}

async function refreshCensusPins(sql: Awaited<ReturnType<typeof getSql>>, userId: string) {
  const already = await sql<{ n: number }>`
    select count(*)::int as n from notifications
    where user_id = ${userId} and title = ${GPS_REFRESH_TITLE}
  `;
  const doRefresh = (already[0]?.n ?? 0) === 0;

  const existing = await sql<{
    id: string;
    flags: string;
    status: string;
    listed_phone: string;
    name_en: string;
    name_ar: string;
  }>`
    select id, flags, status, listed_phone, name_en, name_ar from dealerships
    where user_id = ${userId}
  `;
  const byId = new Map(existing.map((r) => [r.id, r]));

  const existingSurveys = await sql<{ dealership_id: string; payload: string; step: number }>`
    select dealership_id, payload, step from surveys where user_id = ${userId}
  `;
  const surveyById = new Map(existingSurveys.map((r) => [r.dealership_id, r]));

  const existingPipeline = await sql<{ dealership_id: string }>`
    select dealership_id from pipeline where user_id = ${userId}
  `;
  const pipelineIds = new Set(existingPipeline.map((r) => r.dealership_id));

  const existingFollow = await sql<{ dealership_id: string; title: string }>`
    select dealership_id, title from followups where user_id = ${userId}
  `;
  const followTitles = new Set(existingFollow.map((r) => `${r.dealership_id}::${r.title}`));

  let inserted = 0;
  let updated = 0;
  let pipelineSeeded = 0;
  let followSeeded = 0;

  for (const row of SEED_DEALERS) {
    const id = `${userId}::${seedId(row)}`;
    const prev = byId.get(id);
    const prevFlags = prev ? parseJson<DealershipFlags>(prev.flags, {}) : {};
    const flags: DealershipFlags = {
      ...prevFlags,
      ...row.flags,
      mapsUrl: row.flags.mapsUrl || prevFlags.mapsUrl,
      street: row.flags.street || prevFlags.street,
      censusVersion: CENSUS_VERSION,
    };
    if (!row.flags.needsGps) delete flags.needsGps;

    const phone = row.phone || prev?.listed_phone || "";
    const status = mergeStatus(prev?.status, row.status);

    if (!prev) {
      await sql`
        insert into dealerships (id, user_id, name_en, name_ar, lat, lng, listed_phone, seed_note, status, flags)
        values (
          ${id}, ${userId}, ${row.nameEn}, ${row.nameAr}, ${row.lat}, ${row.lng},
          ${phone}, ${row.note}, ${status}, ${JSON.stringify(flags)}
        )
        on conflict (id) do nothing
      `;
      inserted += 1;
    } else if (doRefresh) {
      await sql`
        update dealerships
        set name_en = ${row.nameEn},
            name_ar = ${row.nameAr},
            lat = ${row.lat},
            lng = ${row.lng},
            listed_phone = ${phone},
            seed_note = ${row.note},
            status = ${status},
            flags = ${JSON.stringify(flags)},
            updated_at = now()
        where id = ${id} and user_id = ${userId}
      `;
      updated += 1;
    }

    const censusSurvey = row.survey && Object.keys(row.survey).length ? row.survey : null;
    if (censusSurvey) {
      const prevSv = surveyById.get(id);
      if (!prevSv) {
        await sql`
          insert into surveys (id, user_id, dealership_id, payload, step, updated_at)
          values (
            ${`${id}::sv`}, ${userId}, ${id}, ${JSON.stringify(censusSurvey)}, ${row.step ?? 0}, now()
          )
          on conflict (user_id, dealership_id) do nothing
        `;
      } else if (doRefresh) {
        const existingPayload = parseJson<SurveyPayload>(prevSv.payload, {});
        const censusWins = prev?.status !== "completed" && prev?.status !== "refused";
        const merged = mergeSurvey(existingPayload, censusSurvey, censusWins);
        const step = Math.max(Number(prevSv.step) || 0, row.step ?? 0);
        await sql`
          update surveys
          set payload = ${JSON.stringify(merged)},
              step = ${step},
              updated_at = now()
          where user_id = ${userId} and dealership_id = ${id}
        `;
      }
    }

    const pipe = pipelineFromTraining(flags);
    if (pipe && !pipelineIds.has(id)) {
      await sql`
        insert into pipeline (user_id, dealership_id, stage)
        values (${userId}, ${id}, ${pipe})
        on conflict (user_id, dealership_id) do nothing
      `;
      pipelineIds.add(id);
      pipelineSeeded += 1;
    }

    const followTitle = followupFromTraining(flags, row.nameEn);
    if (doRefresh && followTitle && !followTitles.has(`${id}::${followTitle}`)) {
      await sql`
        insert into followups (id, user_id, dealership_id, title, due_date, done)
        values (${uid()}, ${userId}, ${id}, ${followTitle}, ${null}, false)
      `;
      followTitles.add(`${id}::${followTitle}`);
      followSeeded += 1;
    }
  }

  const ghostId = `${userId}::D0310`;
  const canonicalSaleh = `${userId}::D0309`;
  if (byId.has(ghostId) && !SEED_DEALERS.some((r) => r.sdId === "D0310") && byId.has(canonicalSaleh)) {
    await sql`
      update dealerships
      set status = ${"closed"},
          seed_note = ${"Duplicate of D0309 Saleh Group — GIS pin and training live on the census row."},
          flags = ${JSON.stringify({ sdId: "D0310", relatedSdId: "D0309", census: true, gpsSource: "related" })},
          updated_at = now()
      where id = ${ghostId} and user_id = ${userId}
    `;
  }

  if (!doRefresh) return;
  if (inserted === 0 && updated === 0) return;

  const surveyed = CENSUS_STATS.gpsSources.survey ?? 0;
  const interpolated = CENSUS_STATS.interpolated;
  const trained = CENSUS_STATS.trained ?? 0;
  const priority = CENSUS_STATS.priority ?? 0;
  await sql`
    insert into notifications (id, user_id, kind, title, body, dealership_id, read)
    values (
      ${uid()}, ${userId}, 'info',
      ${GPS_REFRESH_TITLE},
      ${`${CENSUS_STATS.census} showrooms synced from the GIS survey layer (v${CENSUS_VERSION}). ${inserted} new pins · ${updated} refreshed. ${surveyed} captured GPS · ${interpolated} still need an on-site tap. Induction: ${trained} trained desks, ${priority} active-priority users.`},
      ${null}, false
    )
  `;
  if (pipelineSeeded || followSeeded) {
    await sql`
      insert into notifications (id, user_id, kind, title, body, dealership_id, read)
      values (
        ${uid()}, ${userId}, 'info',
        ${"Induction overlay"},
        ${`${pipelineSeeded} pipeline stages seeded from training (active → onboarded, trained → pitched, hold/scheduled → contacted). ${followSeeded} revisit / scheduled follow-ups queued.`},
        ${null}, false
      )
    `;
  }
}

async function ensureSeeded(userId: string) {
  const sql = await getSql();
  await refreshCensusPins(sql, userId);

  const noteCount = await sql<{ n: number }>`
    select count(*)::int as n from notifications
    where user_id = ${userId} and title = ${"August 2026 walking census loaded"}
  `;
  if ((noteCount[0]?.n ?? 0) === 0) {
    const walked = CENSUS_STATS.census;
    const interpolated = CENSUS_STATS.interpolated;
    await sql`
      insert into notifications (id, user_id, kind, title, body, dealership_id, read)
      values (
        ${uid()}, ${userId}, 'info',
        ${"August 2026 walking census loaded"},
        ${`${walked} showrooms from the field sheet are on the map. Surface-survey fields (size, brands, inventory, ASP) are pre-filled. Deep financing questions still need a sit-down visit. ${interpolated} pins have interpolated GPS — confirm while walking.`},
        ${null}, false
      )
    `;
    await sql`
      insert into notifications (id, user_id, kind, title, body, dealership_id, read)
      values (
        ${uid()}, ${userId}, 'info',
        ${"GPS to confirm"},
        ${`${interpolated} showrooms had no captured coordinates. Pins were placed along the walking-order corridor. Filter the map to “Needs GPS” and tap Update position when you are on site.`},
        ${null}, false
      )
    `;
    const closed = SEED_DEALERS.filter((d) => d.status === "closed");
    for (const c of closed) {
      await sql`
        insert into notifications (id, user_id, kind, title, body, dealership_id, read)
        values (
          ${uid()}, ${userId}, 'change',
          ${"Closed showroom"},
          ${`${c.nameEn} (${c.sdId || ""}) was recorded as CLOSED on the walking census.`},
          ${`${userId}::${seedId(c)}`}, false
        )
      `;
    }
    const competitors = SEED_DEALERS.filter((d) => d.flags?.competitor);
    for (const c of competitors) {
      await sql`
        insert into notifications (id, user_id, kind, title, body, dealership_id, read)
        values (
          ${uid()}, ${userId}, 'info',
          ${"Competitor on roster"},
          ${`${c.nameEn}: do not survey as a prospect.`},
          ${`${userId}::${seedId(c)}`}, false
        )
      `;
    }
    const authorised = SEED_DEALERS.filter((d) => d.flags?.authorised && d.flags?.mappingOnly);
    for (const c of authorised) {
      await sql`
        insert into notifications (id, user_id, kind, title, body, dealership_id, read)
        values (
          ${uid()}, ${userId}, 'info',
          ${"Authorised contrast case"},
          ${`${c.nameEn} is an authorised dealer kept as a contrast case, not an independent prospect.`},
          ${`${userId}::${seedId(c)}`}, false
        )
      `;
    }
  }

  const taskCount = await sql<{ n: number }>`select count(*)::int as n from research_tasks where user_id = ${userId}`;
  if ((taskCount[0]?.n ?? 0) === 0) {
    for (const t of DEFAULT_RESEARCH_TASKS) {
      await sql`
        insert into research_tasks (id, user_id, name, instruction, target_field, sources, schedule, enabled)
        values (
          ${uid()}, ${userId}, ${t.name}, ${t.instruction}, ${t.targetField},
          ${JSON.stringify(t.sources)}, ${t.schedule}, true
        )
      `;
    }
  }

  await sql`
    insert into research_settings (user_id, daily_cap, runs_today, runs_date)
    values (${userId}, 20, 0, null)
    on conflict (user_id) do nothing
  `;
}

async function loadSnapshot(userId: string): Promise<Snapshot> {
  const sql = await getSql();
  const dealers = await sql<DealerRow>`
    select * from dealerships where user_id = ${userId} order by name_en
  `;
  const surveys = await sql<{
    id: string;
    dealership_id: string;
    payload: string;
    step: number;
    updated_at: string;
  }>`select * from surveys where user_id = ${userId}`;
  const photos = await sql<{
    id: string;
    dealership_id: string;
    data_url: string;
    lat: number | string | null;
    lng: number | string | null;
    captured_at: string;
  }>`select id, dealership_id, data_url, lat, lng, captured_at from photos where user_id = ${userId} order by captured_at`;
  const followups = await sql<{
    id: string;
    dealership_id: string;
    title: string;
    due_date: string | null;
    done: boolean | string;
    created_at: string;
  }>`select * from followups where user_id = ${userId} order by created_at desc`;
  const tasks = await sql<{
    id: string;
    name: string;
    instruction: string;
    target_field: string;
    sources: string;
    schedule: string;
    enabled: boolean | string;
  }>`select * from research_tasks where user_id = ${userId} order by created_at`;
  const findings = await sql<{
    id: string;
    dealership_id: string;
    task_id: string | null;
    field_key: string;
    value: string;
    source_url: string | null;
    confidence: string;
    retrieved_at: string;
    accepted: boolean | string | null;
  }>`select * from agent_findings where user_id = ${userId} order by retrieved_at desc`;
  const notifications = await sql<{
    id: string;
    kind: string;
    title: string;
    body: string;
    dealership_id: string | null;
    read: boolean | string;
    created_at: string;
  }>`select * from notifications where user_id = ${userId} order by created_at desc`;
  const settingsRows = await sql<{
    daily_cap: number;
    runs_today: number;
    runs_date: string | null;
  }>`select daily_cap, runs_today, runs_date from research_settings where user_id = ${userId}`;
  const pipeline = await sql<{ dealership_id: string; stage: string }>`
    select dealership_id, stage from pipeline where user_id = ${userId}
  `;

  const settings: ResearchSettings = settingsRows[0]
    ? {
        dailyCap: Number(settingsRows[0].daily_cap),
        runsToday: Number(settingsRows[0].runs_today),
        runsDate: settingsRows[0].runs_date,
      }
    : { dailyCap: 20, runsToday: 0, runsDate: null };

  return {
    dealerships: dealers.map(mapDealer),
    surveys: surveys.map(
      (s): SurveyRecord => ({
        id: s.id,
        dealershipId: s.dealership_id,
        payload: parseJson<SurveyPayload>(s.payload, {}),
        step: Number(s.step) || 0,
        updatedAt: String(s.updated_at),
      }),
    ),
    photos: photos.map(
      (p): PhotoRecord => ({
        id: p.id,
        dealershipId: p.dealership_id,
        dataUrl: p.data_url,
        lat: p.lat == null ? null : Number(p.lat),
        lng: p.lng == null ? null : Number(p.lng),
        capturedAt: String(p.captured_at),
      }),
    ),
    followups: followups.map(
      (f): Followup => ({
        id: f.id,
        dealershipId: f.dealership_id,
        title: f.title,
        dueDate: f.due_date,
        done: toBool(f.done),
        createdAt: String(f.created_at),
      }),
    ),
    tasks: tasks.map(
      (t): ResearchTask => ({
        id: t.id,
        name: t.name,
        instruction: t.instruction,
        targetField: t.target_field,
        sources: parseJson<string[]>(t.sources, []),
        schedule: (t.schedule as ResearchTask["schedule"]) || "on_demand",
        enabled: toBool(t.enabled),
      }),
    ),
    findings: findings.map(
      (f): AgentFinding => ({
        id: f.id,
        dealershipId: f.dealership_id,
        taskId: f.task_id,
        fieldKey: f.field_key,
        value: f.value,
        sourceUrl: f.source_url,
        confidence: (f.confidence as AgentFinding["confidence"]) || "medium",
        retrievedAt: String(f.retrieved_at),
        accepted: f.accepted == null ? null : toBool(f.accepted),
      }),
    ),
    notifications: notifications.map(
      (n): AppNotification => ({
        id: n.id,
        kind: n.kind as AppNotification["kind"],
        title: n.title,
        body: n.body,
        dealershipId: n.dealership_id,
        read: toBool(n.read),
        createdAt: String(n.created_at),
      }),
    ),
    settings,
    pipeline: pipeline.map(
      (p): PipelineRow => ({
        dealershipId: p.dealership_id,
        stage: p.stage as PipelineStage,
      }),
    ),
  };
}

export const pullSnapshot = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql, scope, userId } = await scoped(context.userId);
    await ensureSeeded(scope);
    const snapshot = await loadSnapshot(scope);
    snapshot.team = await loadTeam(sql, userId, scope);
    return snapshot;
  });

export const upsertDealership = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Dealership) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    await sql`
      insert into dealerships (
        id, user_id, name_en, name_ar, lat, lng, listed_phone, seed_note, status, flags, updated_at
      ) values (
        ${data.id}, ${scope}, ${data.nameEn}, ${data.nameAr}, ${data.lat}, ${data.lng},
        ${data.listedPhone}, ${data.seedNote}, ${data.status}, ${JSON.stringify(data.flags)}, now()
      )
      on conflict (id) do update set
        name_en = excluded.name_en,
        name_ar = excluded.name_ar,
        lat = excluded.lat,
        lng = excluded.lng,
        listed_phone = excluded.listed_phone,
        seed_note = excluded.seed_note,
        status = excluded.status,
        flags = excluded.flags,
        updated_at = now()
      where dealerships.user_id = ${scope}
    `;
    return { ok: true as const };
  });

export const upsertSurvey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { survey: SurveyRecord; status: VisitStatus }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    await sql`
      insert into surveys (id, user_id, dealership_id, payload, step, updated_at)
      values (
        ${data.survey.id}, ${scope}, ${data.survey.dealershipId},
        ${JSON.stringify(data.survey.payload)}, ${data.survey.step}, now()
      )
      on conflict (user_id, dealership_id) do update set
        payload = excluded.payload,
        step = excluded.step,
        updated_at = now()
    `;
    await sql`
      update dealerships set status = ${data.status}, updated_at = now()
      where id = ${data.survey.dealershipId} and user_id = ${scope}
    `;
    return { ok: true as const };
  });

export const addPhoto = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: PhotoRecord) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    await sql`
      insert into photos (id, user_id, dealership_id, data_url, lat, lng, captured_at)
      values (
        ${data.id}, ${scope}, ${data.dealershipId}, ${data.dataUrl},
        ${data.lat}, ${data.lng}, ${data.capturedAt}
      )
      on conflict (id) do nothing
    `;
    return { ok: true as const };
  });

export const deletePhoto = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    await sql`delete from photos where id = ${data.id} and user_id = ${scope}`;
    return { ok: true as const };
  });

export const upsertFollowup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Followup) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    await sql`
      insert into followups (id, user_id, dealership_id, title, due_date, done)
      values (${data.id}, ${scope}, ${data.dealershipId}, ${data.title}, ${data.dueDate}, ${data.done})
      on conflict (id) do update set
        title = excluded.title,
        due_date = excluded.due_date,
        done = excluded.done
      where followups.user_id = ${scope}
    `;
    return { ok: true as const };
  });

export const upsertTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: ResearchTask) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    await sql`
      insert into research_tasks (id, user_id, name, instruction, target_field, sources, schedule, enabled)
      values (
        ${data.id}, ${scope}, ${data.name}, ${data.instruction}, ${data.targetField},
        ${JSON.stringify(data.sources)}, ${data.schedule}, ${data.enabled}
      )
      on conflict (id) do update set
        name = excluded.name,
        instruction = excluded.instruction,
        target_field = excluded.target_field,
        sources = excluded.sources,
        schedule = excluded.schedule,
        enabled = excluded.enabled
      where research_tasks.user_id = ${scope}
    `;
    return { ok: true as const };
  });

export const setFindingAccepted = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; accepted: boolean }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    await sql`
      update agent_findings set accepted = ${data.accepted}
      where id = ${data.id} and user_id = ${scope}
    `;
    return { ok: true as const };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    await sql`
      update notifications set read = true where id = ${data.id} and user_id = ${scope}
    `;
    return { ok: true as const };
  });

export const setPipelineStage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { dealershipId: string; stage: PipelineStage }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    await sql`
      insert into pipeline (user_id, dealership_id, stage)
      values (${scope}, ${data.dealershipId}, ${data.stage})
      on conflict (user_id, dealership_id) do update set stage = excluded.stage
    `;
    return { ok: true as const };
  });

export const updateResearchCap = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { dailyCap: number }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    const cap = Math.max(1, Math.min(200, Math.round(data.dailyCap)));
    await sql`
      insert into research_settings (user_id, daily_cap)
      values (${scope}, ${cap})
      on conflict (user_id) do update set daily_cap = excluded.daily_cap
    `;
    return { ok: true as const, dailyCap: cap };
  });

export const runResearch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { dealershipIds: string[]; taskIds: string[] }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    const today = new Date().toISOString().slice(0, 10);
    await sql`
      insert into research_settings (user_id, daily_cap, runs_today, runs_date)
      values (${scope}, 20, 0, ${today})
      on conflict (user_id) do nothing
    `;
    const settings = await sql<{ daily_cap: number; runs_today: number; runs_date: string | null }>`
      select daily_cap, runs_today, runs_date from research_settings where user_id = ${scope}
    `;
    let runsToday = Number(settings[0]?.runs_today ?? 0);
    const cap = Number(settings[0]?.daily_cap ?? 20);
    if (settings[0]?.runs_date !== today) runsToday = 0;

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI research is not available in this environment." };
    }

    const dealers = await sql<DealerRow>`
      select * from dealerships where user_id = ${scope}
    `;
    const tasks = await sql<{
      id: string;
      name: string;
      instruction: string;
      target_field: string;
      sources: string;
    }>`select * from research_tasks where user_id = ${scope}`;

    const dealerMap = new Map(dealers.map((d) => [d.id, d]));
    const taskList = tasks.filter((t) => data.taskIds.includes(t.id));
    const wanted = data.dealershipIds
      .map((id) => dealerMap.get(id))
      .filter((d): d is DealerRow => Boolean(d));

    const planned = wanted.length * taskList.length;
    if (runsToday + planned > cap) {
      return {
        ok: false as const,
        error: `This batch needs ${planned} runs. ${runsToday}/${cap} already used today.`,
      };
    }

    const findings: AgentFinding[] = [];
    for (const dealer of wanted) {
      for (const task of taskList) {
        const prompt = [
          `You are a research agent for a Riyadh auto-finance field team covering Al Qadisiyah (East Riyadh, Exit 8).`,
          `Task: ${task.name}`,
          `Instruction: ${task.instruction}`,
          `Write the result for field: ${task.target_field}`,
          `Dealership English name: ${dealer.name_en}`,
          `Dealership Arabic name: ${dealer.name_ar || "(none)"}`,
          `Phone: ${dealer.listed_phone || "(none)"}`,
          `Coordinates: ${dealer.lat}, ${dealer.lng}`,
          `Notes: ${dealer.seed_note || "(none)"}`,
          `Preferred sources: ${task.sources}`,
          `Search in BOTH Arabic and English. Saudi marketplaces: Haraj, Motory, OpenSooq, Syarah, YallaMotor, Soum.`,
          `Return STRICT JSON: {"value": string, "sourceUrl": string | null, "confidence": "high"|"medium"|"low", "changeFlags": string[] }`,
          `value should be a concise finding (1-6 sentences or a number/CR). Never invent a CR number.`,
        ].join("\n");

        try {
          const res = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "grok-4.5",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.2,
              max_tokens: 700,
            }),
          });
          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            findings.push({
              id: uid(),
              dealershipId: dealer.id,
              taskId: task.id,
              fieldKey: task.target_field,
              value: `Research failed (${res.status}). ${errText.slice(0, 180)}`,
              sourceUrl: null,
              confidence: "low",
              retrievedAt: new Date().toISOString(),
              accepted: null,
            });
            continue;
          }
          const body = (await res.json()) as {
            choices: { message: { content: string } }[];
          };
          const text = body.choices[0]?.message.content ?? "";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          let parsed: {
            value?: string;
            sourceUrl?: string | null;
            confidence?: string;
            changeFlags?: string[];
          } = {};
          if (jsonMatch) {
            try {
              parsed = JSON.parse(jsonMatch[0]) as typeof parsed;
            } catch {
              parsed = { value: text };
            }
          } else {
            parsed = { value: text };
          }
          const finding: AgentFinding = {
            id: uid(),
            dealershipId: dealer.id,
            taskId: task.id,
            fieldKey: task.target_field,
            value: String(parsed.value ?? text).slice(0, 4000),
            sourceUrl: parsed.sourceUrl ? String(parsed.sourceUrl).slice(0, 500) : null,
            confidence:
              parsed.confidence === "high" || parsed.confidence === "low"
                ? parsed.confidence
                : "medium",
            retrievedAt: new Date().toISOString(),
            accepted: null,
          };
          await sql`
            insert into agent_findings (
              id, user_id, dealership_id, task_id, field_key, value, source_url, confidence, retrieved_at
            ) values (
              ${finding.id}, ${scope}, ${finding.dealershipId}, ${finding.taskId},
              ${finding.fieldKey}, ${finding.value}, ${finding.sourceUrl}, ${finding.confidence}, now()
            )
          `;
          if (parsed.changeFlags && parsed.changeFlags.length) {
            await sql`
              insert into notifications (id, user_id, kind, title, body, dealership_id, read)
              values (
                ${uid()}, ${scope}, 'change',
                ${`Change: ${dealer.name_en}`},
                ${parsed.changeFlags.join("; ").slice(0, 500)},
                ${dealer.id}, false
              )
            `;
          }
          findings.push(finding);
        } catch (err) {
          findings.push({
            id: uid(),
            dealershipId: dealer.id,
            taskId: task.id,
            fieldKey: task.target_field,
            value: `Research error: ${err instanceof Error ? err.message : "unknown"}`,
            sourceUrl: null,
            confidence: "low",
            retrievedAt: new Date().toISOString(),
            accepted: null,
          });
        }
        runsToday += 1;
      }
    }

    await sql`
      update research_settings set runs_today = ${runsToday}, runs_date = ${today}
      where user_id = ${scope}
    `;

    return { ok: true as const, findings, runsToday, cap };
  });

function asMatchable(d: DealerRow): MatchableDealer {
  return {
    id: d.id,
    nameEn: d.name_en,
    nameAr: d.name_ar ?? "",
    phone: d.listed_phone ?? "",
  };
}

function extractModelText(body: unknown): string {
  const b = body as Record<string, unknown>;
  if (typeof b.output_text === "string" && b.output_text.trim()) return b.output_text;
  const choices = b.choices as { message?: { content?: unknown } }[] | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) return String((part as { text: string }).text ?? "");
        return "";
      })
      .join("\n");
  }
  const output = b.output as { content?: { text?: string; type?: string }[] }[] | undefined;
  if (Array.isArray(output)) {
    const parts: string[] = [];
    for (const item of output) {
      if (!item?.content) continue;
      for (const c of item.content) {
        if (typeof c.text === "string") parts.push(c.text);
      }
    }
    return parts.join("\n");
  }
  return "";
}

function parseHitsJson(text: string): Array<Record<string, unknown>> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? text;
  const objMatch = raw.match(/\{[\s\S]*\}/);
  const arrMatch = raw.match(/\[[\s\S]*\]/);
  let parsed: unknown = null;
  const candidate = objMatch?.[0] ?? arrMatch?.[0];
  if (candidate) {
    try {
      parsed = JSON.parse(candidate);
    } catch {
      parsed = null;
    }
  }
  if (Array.isArray(parsed)) return parsed as Array<Record<string, unknown>>;
  if (parsed && typeof parsed === "object") {
    const hits = (parsed as { hits?: unknown }).hits;
    if (Array.isArray(hits)) return hits as Array<Record<string, unknown>>;
  }
  return [];
}

function saneCoord(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (la < 24.3 || la > 25.1 || ln < 46.3 || ln > 47.3) return null;
  return { lat: la, lng: ln };
}

async function grokLiveSearch(apiKey: string, prompt: string): Promise<{ text: string } | { error: string }> {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const tryOnce = async (url: string, body: unknown) => {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    const raw = await res.text();
    if (!res.ok) return { error: `Search failed (${res.status}). ${raw.slice(0, 180)}` };
    let json: unknown = {};
    try {
      json = JSON.parse(raw);
    } catch {
      return { error: "Search returned unreadable data." };
    }
    const text = extractModelText(json);
    if (!text.trim()) return { error: "Search returned an empty result." };
    return { text };
  };

  const first = await tryOnce("https://api.x.ai/v1/responses", {
    model: "grok-4.5",
    input: prompt,
    tools: [{ type: "web_search" }],
    temperature: 0.2,
  });
  if ("text" in first) return first;

  const retry = await tryOnce("https://api.x.ai/v1/chat/completions", {
    model: "grok-4.5",
    messages: [{ role: "user", content: prompt }],
    tools: [{ type: "web_search" }],
    temperature: 0.2,
    max_tokens: 4000,
  });
  if ("text" in retry) return retry;
  return { error: first.error };
}

export const bulkSearch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { mode: "discover" | "lookup"; query: string }) => input)
  .handler(async ({ context, data }) => {
    const query = data.query.trim().slice(0, 4000);
    if (!query) return { ok: false as const, error: "Enter a query or paste a list." };

    const { sql, scope } = await scoped(context.userId);
    const today = new Date().toISOString().slice(0, 10);
    await sql`
      insert into research_settings (user_id, daily_cap, runs_today, runs_date)
      values (${scope}, 20, 0, ${today})
      on conflict (user_id) do nothing
    `;
    const settings = await sql<{ daily_cap: number; runs_today: number; runs_date: string | null }>`
      select daily_cap, runs_today, runs_date from research_settings where user_id = ${scope}
    `;
    let runsToday = Number(settings[0]?.runs_today ?? 0);
    const cap = Number(settings[0]?.daily_cap ?? 20);
    if (settings[0]?.runs_date !== today) runsToday = 0;

    const dealers = await sql<DealerRow>`
      select * from dealerships where user_id = ${scope}
    `;
    const roster = dealers.map(asMatchable);

    const hits: BulkSearchHit[] = [];
    let pendingQueries: string[] = [];

    if (data.mode === "lookup") {
      const lines = parseLookupLines(query);
      if (!lines.length) return { ok: false as const, error: "Paste at least one name, phone, or CR." };
      for (const line of lines) {
        const existing = matchQueryToDealer(line, roster);
        const row = existing ? dealers.find((d) => d.id === existing.id) : undefined;
        if (existing && row) {
          hits.push({
            id: uid(),
            query: line,
            nameEn: existing.nameEn,
            nameAr: existing.nameAr,
            phone: existing.phone,
            lat: Number(row.lat),
            lng: Number(row.lng),
            sourceUrl: null,
            note: "Matched your roster.",
            matchDealershipId: existing.id,
          });
        } else {
          pendingQueries.push(line);
        }
      }
    } else {
      pendingQueries = [query];
    }

    let charged = 0;
    if (pendingQueries.length) {
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) {
        if (hits.length) {
          return { ok: true as const, hits, runsToday, cap, charged: 0 };
        }
        return { ok: false as const, error: "AI research is not available in this environment." };
      }
      if (runsToday + 1 > cap) {
        if (hits.length) {
          return {
            ok: true as const,
            hits,
            runsToday,
            cap,
            charged: 0,
            warning: `Roster matches shown. Web search needs 1 credit — ${runsToday}/${cap} used today.`,
          };
        }
        return {
          ok: false as const,
          error: `Bulk search needs 1 credit. ${runsToday}/${cap} already used today.`,
        };
      }

      const rosterHint = dealers
        .slice(0, 80)
        .map((d) => `${d.name_en}${d.name_ar ? ` / ${d.name_ar}` : ""}${d.listed_phone ? ` · ${d.listed_phone}` : ""}`)
        .join("\n");

      const prompt =
        data.mode === "lookup"
          ? [
              `You are a research agent for a Riyadh auto-finance field team covering Al Qadisiyah (East Riyadh, Exit 8).`,
              `Look up EACH of these showrooms/dealers on the live web (Google Maps, Haraj, Motory, OpenSooq, Syarah, YallaMotor, Soum, Ministry of Commerce). Search Arabic AND English.`,
              `Queries:`,
              pendingQueries.map((q, i) => `${i + 1}. ${q}`).join("\n"),
              `Already on our roster (do not invent duplicates — still return a hit if the query is a real showroom):`,
              rosterHint || "(empty)",
              `Return STRICT JSON: {"hits":[{"query":string,"nameEn":string,"nameAr":string,"phone":string,"lat":number|null,"lng":number|null,"sourceUrl":string|null,"note":string}]}`,
              `phone in +966 format when found. lat/lng only if a real map pin in Riyadh. Skip workshops-only, spare-parts shops, and banks. One hit per query when found.`,
            ].join("\n")
          : [
              `You are a research agent for a Riyadh auto-finance field team covering Al Qadisiyah (East Riyadh, Exit 8).`,
              `Use live web search (Google Maps and Saudi auto listings) to find physical car showrooms matching:`,
              query,
              `Focus on Al Qadisiyah / Exit 8 / East Riyadh independent used-car dealers. Search Arabic AND English.`,
              `Already on our roster:`,
              rosterHint || "(empty)",
              `Return STRICT JSON: {"hits":[{"nameEn":string,"nameAr":string,"phone":string,"lat":number|null,"lng":number|null,"sourceUrl":string|null,"note":string}]}`,
              `Max 20 showrooms. Prefer ones NOT obviously already listed. Skip authorised brand complexes unless they are contrast cases, skip banks, skip mobile mechanics. phone in +966. lat/lng only for real Riyadh map pins.`,
            ].join("\n");

      const result = await grokLiveSearch(apiKey, prompt);
      if ("error" in result) {
        if (hits.length) {
          return { ok: true as const, hits, runsToday, cap, charged: 0, warning: result.error };
        }
        return { ok: false as const, error: result.error };
      }

      const parsed = parseHitsJson(result.text);
      for (const raw of parsed.slice(0, 20)) {
        const nameEn = String(raw.nameEn ?? raw.name ?? "").trim();
        const nameAr = String(raw.nameAr ?? "").trim();
        if (!nameEn && !nameAr) continue;
        const phone = String(raw.phone ?? "").trim();
        const coord = saneCoord(raw.lat, raw.lng);
        const hitBase = {
          nameEn: nameEn || nameAr,
          nameAr,
          phone,
        };
        hits.push({
          id: uid(),
          query: String(raw.query ?? query).trim().slice(0, 200),
          ...hitBase,
          lat: coord?.lat ?? null,
          lng: coord?.lng ?? null,
          sourceUrl: raw.sourceUrl ? String(raw.sourceUrl).slice(0, 500) : null,
          note: String(raw.note ?? "").slice(0, 400),
          matchDealershipId: matchHitToDealer(hitBase, roster),
        });
      }

      charged = 1;
      runsToday += 1;
      await sql`
        update research_settings set runs_today = ${runsToday}, runs_date = ${today}
        where user_id = ${scope}
      `;
      await sql`
        insert into notifications (id, user_id, kind, title, body, dealership_id, read)
        values (
          ${uid()}, ${scope}, 'info',
          ${"Bulk search"},
          ${`${hits.length} result${hits.length === 1 ? "" : "s"} · ${hits.filter((h) => !h.matchDealershipId).length} new`},
          ${null}, false
        )
      `;
    }

    return { ok: true as const, hits, runsToday, cap, charged };
  });

export const joinTeam = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const result = await joinWorkspace(sql, context.userId, data.code);
    if (!result.ok) return result;
    await ensureSeeded(result.workspaceId);
    const snapshot = await loadSnapshot(result.workspaceId);
    snapshot.team = await loadTeam(sql, context.userId, result.workspaceId);
    return { ok: true as const, snapshot };
  });

export const rotateJoinCode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql, scope, userId } = await scoped(context.userId);
    const result = await rotateWorkspaceCode(sql, userId, scope);
    if (!result.ok) return result;
    const snapshot = await loadSnapshot(scope);
    snapshot.team = await loadTeam(sql, userId, scope);
    return { ok: true as const, joinCode: result.joinCode, snapshot };
  });
