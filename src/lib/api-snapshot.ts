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
  ResearchSettings,
  ResearchTask,
  Snapshot,
  SurveyPayload,
  SurveyRecord,
  VisitStatus,
} from "@/lib/types";
import { parseJson, toBool, uid } from "@/lib/utils";
import { loadTeam } from "@/lib/workspace";
import { type DealerRow, mapDealer, scoped } from "@/lib/api-shared";
import { ensureSeeded } from "@/lib/api-census";

export async function loadSnapshot(workspaceId: string): Promise<Snapshot> {
  const sql = await getSql();
  await ensureSeeded(workspaceId);
  const dealers = (await sql`select * from dealerships where workspace_id = ${workspaceId} order by name_en`) as DealerRow[];
  const surveys = await sql`select * from surveys where workspace_id = ${workspaceId}`;
  const photos = await sql`select * from photos where workspace_id = ${workspaceId}`;
  const followups = await sql`select * from followups where workspace_id = ${workspaceId}`;
  const tasks = await sql`select * from research_tasks where workspace_id = ${workspaceId}`;
  const findings = await sql`select * from agent_findings where workspace_id = ${workspaceId}`;
  const notifications = await sql`select * from notifications where user_id = ${workspaceId} order by created_at desc limit 50`;
  const pipeline = await sql`select * from pipeline where workspace_id = ${workspaceId}`;
  const settingsRows = await sql`select * from research_settings where user_id = ${workspaceId} limit 1`;

  const surveyByDealer: Record<string, SurveyRecord> = {};
  for (const s of surveys as any[]) {
    surveyByDealer[s.dealership_id] = {
      dealershipId: s.dealership_id,
      payload: parseJson<SurveyPayload>(s.payload, {}),
      updatedAt: String(s.updated_at),
    };
  }

  return {
    dealerships: dealers.map(mapDealer),
    surveys: surveyByDealer,
    photos: (photos as any[]).map((p) => ({
      id: p.id,
      dealershipId: p.dealership_id,
      url: p.url,
      kind: p.kind,
      createdAt: String(p.created_at),
    })) as PhotoRecord[],
    followups: (followups as any[]) as Followup[],
    tasks: (tasks as any[]) as ResearchTask[],
    findings: (findings as any[]) as AgentFinding[],
    notifications: (notifications as any[]) as AppNotification[],
    pipeline: (pipeline as any[]) as PipelineRow[],
    research: (settingsRows[0] as any) || { runsToday: 0, cap: 20, runsDate: "" },
    team: null,
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
      insert into dealerships (id, workspace_id, name_en, name_ar, lat, lng, listed_phone, seed_note, status, flags, updated_at)
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
      insert into surveys (dealership_id, workspace_id, payload, updated_at)
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
    await sql`insert into photos (id, workspace_id, dealership_id, url, kind) values (${id}, ${scope}, ${data.dealershipId}, ${data.url}, ${data.kind ?? "exterior"})`;
    return { ok: true as const, snapshot: await loadSnapshot(scope) };
  });

export const deletePhoto = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    await sql`delete from photos where id = ${data.id} and workspace_id = ${scope}`;
    return { ok: true as const, snapshot: await loadSnapshot(scope) };
  });

export const upsertFollowup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { followup: Followup }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    const f = data.followup;
    await sql`
      insert into followups (id, workspace_id, dealership_id, kind, note, due_at, done)
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
      insert into research_tasks (id, workspace_id, title, status, dealership_id)
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
    await sql`update agent_findings set accepted = ${data.accepted} where id = ${data.id} and workspace_id = ${scope}`;
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
      insert into pipeline (workspace_id, dealership_id, stage) values (${scope}, ${data.dealershipId}, ${data.stage})
      on conflict (workspace_id, dealership_id) do update set stage = excluded.stage
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
