import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import type {
  AgentFinding,
  AppNotification,
  Dealership,
  Followup,
  PhotoRecord,
  PipelineRow,
  PipelineStage,
  ResearchTask,
  Snapshot,
  SurveyPayload,
  SurveyRecord,
  VisitStatus,
} from "@/lib/types";
import { parseJson, uid } from "@/lib/utils";
import { loadTeam } from "@/lib/workspace";
import { type DealerRow, mapDealer, scoped } from "@/lib/api-shared";
import { ensureSeeded, ensureCensusCurrent } from "@/lib/api-census";

export async function loadSnapshot(workspaceId: string): Promise<Snapshot> {
  const sql = await getSql();
  await ensureSeeded(workspaceId);
  await ensureCensusCurrent(workspaceId);
  const dealers = (await sql`select * from dealerships where user_id = ${workspaceId} order by name_en`) as DealerRow[];
  const surveys = await sql`select * from surveys where user_id = ${workspaceId}`;
  const photos = await sql`select * from photos where user_id = ${workspaceId}`;
  const followups = await sql`select * from followups where user_id = ${workspaceId}`;
  const tasks = await sql`select * from research_tasks where user_id = ${workspaceId}`;
  const findings = await sql`select * from agent_findings where user_id = ${workspaceId}`;
  const notifications = await sql`select * from notifications where user_id = ${workspaceId} order by created_at desc limit 50`;
  const pipeline = await sql`select * from pipeline where user_id = ${workspaceId}`;
  const settingsRows = await sql`select * from research_settings where user_id = ${workspaceId} limit 1`;

  const surveyList: SurveyRecord[] = [];
  for (const s of surveys as any[]) {
    surveyList.push({
      id: String(s.id ?? s.dealership_id),
      dealershipId: s.dealership_id,
      payload: parseJson<SurveyPayload>(s.payload, {}),
      step: Number(s.step ?? 0) || 0,
      updatedAt: String(s.updated_at),
    });
  }

  const settingsRow = (settingsRows[0] as any) || {};
  return {
    dealerships: dealers.map(mapDealer),
    surveys: surveyList,
    photos: (photos as any[]).map((p) => ({
      id: p.id,
      dealershipId: p.dealership_id,
      dataUrl: p.url ?? p.data_url ?? "",
      lat: p.lat ?? null,
      lng: p.lng ?? null,
      capturedAt: String(p.created_at ?? p.captured_at ?? ""),
    })) as PhotoRecord[],
    followups: (followups as any[]) as Followup[],
    tasks: (tasks as any[]) as ResearchTask[],
    findings: (findings as any[]) as AgentFinding[],
    notifications: (notifications as any[]) as AppNotification[],
    pipeline: (pipeline as any[]) as PipelineRow[],
    settings: {
      dailyCap: Number(settingsRow.cap ?? settingsRow.daily_cap ?? 20) || 20,
      runsToday: Number(settingsRow.runs_today ?? settingsRow.runsToday ?? 0) || 0,
      runsDate: settingsRow.runs_date ?? settingsRow.runsDate ?? null,
    },
    team: undefined,
  };
}

export const pullSnapshot = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { scope } = await scoped(context.userId);
    const snapshot = await loadSnapshot(scope);
    snapshot.team = await loadTeam(await getSql(), context.userId, scope);
    return { ok: true as const, snapshot };
  });

export const upsertDealership = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { dealer: Partial<Dealership> & { id?: string } }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    const d = data.dealer;
    const id = d.id || uid();
    await sql`
      insert into dealerships (id, user_id, name_en, name_ar, lat, lng, listed_phone, seed_note, status, flags, updated_at)
      values (${id}, ${scope}, ${d.nameEn ?? ""}, ${d.nameAr ?? ""}, ${d.lat ?? 0}, ${d.lng ?? 0}, ${d.listedPhone ?? ""}, ${d.seedNote ?? ""}, ${d.status ?? "not_visited"}, ${JSON.stringify(d.flags ?? {})}, now())
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
    `;
    return { ok: true as const, snapshot: await loadSnapshot(scope) };
  });

export const upsertSurvey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { dealershipId: string; payload: SurveyPayload }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    await sql`
      insert into surveys (dealership_id, user_id, payload, updated_at)
      values (${data.dealershipId}, ${scope}, ${JSON.stringify(data.payload)}, now())
      on conflict (dealership_id) do update set payload = excluded.payload, updated_at = now()
    `;
    return { ok: true as const, snapshot: await loadSnapshot(scope) };
  });

export const addPhoto = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { dealershipId: string; url: string; kind?: string }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    const id = uid();
    await sql`insert into photos (id, user_id, dealership_id, url, kind) values (${id}, ${scope}, ${data.dealershipId}, ${data.url}, ${data.kind ?? "exterior"})`;
    return { ok: true as const, snapshot: await loadSnapshot(scope) };
  });

export const deletePhoto = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    await sql`delete from photos where id = ${data.id} and user_id = ${scope}`;
    return { ok: true as const, snapshot: await loadSnapshot(scope) };
  });

export const upsertFollowup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { followup: Followup }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    const f = data.followup;
    await sql`
      insert into followups (id, user_id, dealership_id, kind, note, due_at, done)
      values (${f.id || uid()}, ${scope}, ${f.dealershipId}, ${f.kind}, ${f.note ?? ""}, ${f.dueAt ?? null}, ${!!f.done})
      on conflict (id) do update set kind = excluded.kind, note = excluded.note, due_at = excluded.due_at, done = excluded.done
    `;
    return { ok: true as const, snapshot: await loadSnapshot(scope) };
  });

export const upsertTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { task: ResearchTask }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    const t = data.task;
    await sql`
      insert into research_tasks (id, user_id, title, status, dealership_id)
      values (${t.id || uid()}, ${scope}, ${t.title}, ${t.status ?? "open"}, ${t.dealershipId ?? null})
      on conflict (id) do update set title = excluded.title, status = excluded.status
    `;
    return { ok: true as const, snapshot: await loadSnapshot(scope) };
  });

export const setFindingAccepted = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; accepted: boolean }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    await sql`update agent_findings set accepted = ${data.accepted} where id = ${data.id} and user_id = ${scope}`;
    return { ok: true as const, snapshot: await loadSnapshot(scope) };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    await sql`update notifications set read = true where id = ${data.id} and user_id = ${scope}`;
    return { ok: true as const, snapshot: await loadSnapshot(scope) };
  });

export const setPipelineStage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { dealershipId: string; stage: PipelineStage }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    await sql`
      insert into pipeline (user_id, dealership_id, stage) values (${scope}, ${data.dealershipId}, ${data.stage})
      on conflict (user_id, dealership_id) do update set stage = excluded.stage
    `;
    return { ok: true as const, snapshot: await loadSnapshot(scope) };
  });

export const updateResearchCap = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { cap: number }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    await sql`
      insert into research_settings (user_id, cap, runs_today, runs_date)
      values (${scope}, ${data.cap}, 0, current_date::text)
      on conflict (user_id) do update set cap = excluded.cap
    `;
    return { ok: true as const, snapshot: await loadSnapshot(scope) };
  });
