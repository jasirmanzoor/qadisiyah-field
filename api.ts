import { createServerFn } from "@tanstack/react-start";
import {
  buildPatches,
  canStartRun,
  fieldTarget,
  highConfidenceIds,
  isEmptyValue,
  PHOTO_LIMITS,
  resolveGps,
  validatePhotoBatch,
} from "../../../scripts/ai-survey-rules.mjs";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { AI_NOT_CONFIGURED, getAiConfig } from "@/lib/ai/provider";
import { runSurveyPipeline } from "@/lib/ai/survey-agent";
import type {
  AiDecision,
  AiEvidenceRow,
  AiProposal,
  AiProposalValue,
  AiRun,
  AiRunBundle,
  AiRunStage,
  DealershipFlags,
  SurveyPayload,
} from "@/lib/types";
import { parseJson, toBool, uid } from "@/lib/utils";
import { ensureWorkspace } from "@/lib/workspace";

async function scoped(userId: string) {
  const sql = await getSql();
  const scope = await ensureWorkspace(sql, userId);
  return { sql, scope, userId };
}

type Sql = Awaited<ReturnType<typeof getSql>>;

type RunRow = {
  id: string;
  dealership_id: string | null;
  mode: string;
  status: string;
  stage: string;
  provider: string;
  model: string;
  photo_count: number;
  gps_at_showroom: unknown;
  gps_lat: number | string | null;
  gps_lng: number | string | null;
  gps_accuracy: number | string | null;
  gps_source: string;
  gps_status: string;
  summary: string;
  missing_info: string;
  error: string | null;
  applied: unknown;
  started_at: string;
  completed_at: string | null;
};

type ProposalRow = {
  id: string;
  run_id: string;
  dealership_id: string | null;
  field_key: string;
  value: string;
  confidence: string;
  status: string;
  source_types: string;
  reasoning: string;
  needs_verification: unknown;
  existing_value: string;
  decision: string | null;
};

type EvidenceRow = {
  id: string;
  run_id: string;
  proposal_id: string | null;
  field_key: string;
  source_type: string;
  photo_index: number | null;
  source_url: string | null;
  text: string;
  confidence: string;
};

function mapRun(r: RunRow): AiRun {
  return {
    id: r.id,
    dealershipId: r.dealership_id,
    mode: r.mode === "new" ? "new" : "existing",
    status: (r.status as AiRun["status"]) || "queued",
    stage: (r.stage as AiRunStage) || "queued",
    provider: r.provider,
    model: r.model,
    photoCount: Number(r.photo_count ?? 0),
    gps: {
      atShowroom: toBool(r.gps_at_showroom),
      lat: r.gps_lat == null ? null : Number(r.gps_lat),
      lng: r.gps_lng == null ? null : Number(r.gps_lng),
      accuracy: r.gps_accuracy == null ? null : Number(r.gps_accuracy),
      source: r.gps_source,
      status: (r.gps_status as AiRun["gps"]["status"]) || "unresolved",
    },
    summary: r.summary ?? "",
    missingInformation: parseJson<string[]>(r.missing_info, []),
    error: r.error,
    applied: toBool(r.applied),
    startedAt: String(r.started_at),
    completedAt: r.completed_at ? String(r.completed_at) : null,
  };
}

const LABELS = new Map<string, string>();

function mapProposal(r: ProposalRow, evidence: EvidenceRow[]): AiProposal {
  return {
    id: r.id,
    runId: r.run_id,
    dealershipId: r.dealership_id,
    fieldKey: r.field_key,
    label: LABELS.get(r.field_key) ?? fieldTarget(r.field_key)?.label ?? r.field_key,
    value: parseJson<AiProposalValue>(r.value, null),
    existingValue: parseJson<AiProposalValue>(r.existing_value, null),
    confidence: (r.confidence as AiProposal["confidence"]) || "unknown",
    status: (r.status as AiProposal["status"]) || "unknown",
    sourceTypes: parseJson<AiProposal["sourceTypes"]>(r.source_types, ["photo"]),
    reasoning: r.reasoning ?? "",
    needsVerification: toBool(r.needs_verification),
    decision: (r.decision as AiDecision | null) ?? null,
    evidence: evidence
      .filter((e) => e.proposal_id === r.id)
      .map(
        (e): AiEvidenceRow => ({
          id: e.id,
          runId: e.run_id,
          proposalId: e.proposal_id,
          fieldKey: e.field_key,
          sourceType: (e.source_type as AiEvidenceRow["sourceType"]) || "photo",
          photoIndex: e.photo_index == null ? null : Number(e.photo_index),
          sourceUrl: e.source_url,
          text: e.text,
          confidence: (e.confidence as AiEvidenceRow["confidence"]) || "unknown",
        }),
      ),
  };
}

async function loadBundle(sql: Sql, scope: string, runId: string): Promise<AiRunBundle | null> {
  const runs = await sql<RunRow>`
    select * from ai_survey_runs where id = ${runId} and user_id = ${scope}
  `;
  if (!runs[0]) return null;
  const proposals = await sql<ProposalRow>`
    select * from ai_field_proposals where run_id = ${runId} and user_id = ${scope} order by created_at
  `;
  const evidence = await sql<EvidenceRow>`
    select * from ai_evidence where run_id = ${runId} and user_id = ${scope}
  `;
  return { run: mapRun(runs[0]), proposals: proposals.map((p) => mapProposal(p, evidence)) };
}

async function setStage(sql: Sql, scope: string, runId: string, stage: AiRunStage, status: AiRun["status"]) {
  await sql`
    update ai_survey_runs set stage = ${stage}, status = ${status}
    where id = ${runId} and user_id = ${scope}
  `;
}

/** Survey payload + dealership values, keyed by AI field key, for conflict checks. */
function existingByFieldKey(
  dealer: { name_en: string; name_ar: string } | null,
  payload: SurveyPayload,
): Record<string, AiProposalValue> {
  const out: Record<string, AiProposalValue> = {};
  for (const key of [
    "name_en",
    "name_ar",
    "vehicle_type",
    "main_brands",
    "inventory_units",
    "inventory_inside",
    "inventory_outside",
    "inventory_age_pct_over5",
    "avg_selling_price_sar",
    "showroom_size_sqm",
    "size_basis",
    "salesmen_count",
    "finance_available",
    "banks_partnered",
    "fpr",
  ]) {
    const target = fieldTarget(key);
    if (!target) continue;
    if (target.target === "dealer") {
      out[key] = dealer ? ((dealer as unknown as Record<string, string>)[target.field === "nameEn" ? "name_en" : "name_ar"] ?? null) : null;
    } else {
      out[key] = (payload as unknown as Record<string, AiProposalValue>)[target.field] ?? null;
    }
  }
  return out;
}

export const startAiSurvey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      dealershipId: string | null;
      mode: "existing" | "new";
      photos: string[];
      storePhotos?: string[];
      atShowroom: boolean;
      device: { lat: number; lng: number; accuracy?: number } | null;
      allowResearch?: boolean;
      force?: boolean;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const { sql, scope, userId } = await scoped(context.userId);
    const cfg = getAiConfig();
    if (!cfg) return { ok: false as const, error: AI_NOT_CONFIGURED };

    const photos = (data.photos ?? []).filter((p) => typeof p === "string" && p.startsWith("data:image/"));
    const check = validatePhotoBatch({ sizes: photos.map((p) => p.length) }, PHOTO_LIMITS);
    if (!check.ok) return { ok: false as const, error: check.error };

    // Showroom access is verified before anything else touches the record.
    let dealer: { id: string; name_en: string; name_ar: string; lat: number; lng: number; flags: string } | null = null;
    if (data.dealershipId) {
      const rows = await sql<{ id: string; name_en: string; name_ar: string; lat: number; lng: number; flags: string }>`
        select id, name_en, name_ar, lat, lng, flags from dealerships
        where id = ${data.dealershipId} and user_id = ${scope}
      `;
      if (!rows[0]) return { ok: false as const, error: "Showroom not found." };
      dealer = rows[0];
    }

    // Duplicate-run prevention.
    if (data.dealershipId) {
      const prev = await sql<{ status: string; started_at: string; completed_at: string | null }>`
        select status, started_at, completed_at from ai_survey_runs
        where user_id = ${scope} and dealership_id = ${data.dealershipId}
        order by started_at desc limit 1
      `;
      const last = prev[0]
        ? {
            status: prev[0].status,
            startedAt: new Date(prev[0].started_at).getTime(),
            completedAt: prev[0].completed_at ? new Date(prev[0].completed_at).getTime() : null,
          }
        : null;
      const gate = canStartRun({ lastRun: last, now: Date.now(), force: data.force });
      if (!gate.ok) return { ok: false as const, error: gate.error };
    }

    // Daily AI budget is shared with the existing research cap.
    const today = new Date().toISOString().slice(0, 10);
    await sql`
      insert into research_settings (user_id, daily_cap, runs_today, runs_date)
      values (${scope}, 20, 0, ${today}) on conflict (user_id) do nothing
    `;
    const settings = await sql<{ daily_cap: number; runs_today: number; runs_date: string | null }>`
      select daily_cap, runs_today, runs_date from research_settings where user_id = ${scope}
    `;
    const cap = Number(settings[0]?.daily_cap ?? 20);
    let runsToday = settings[0]?.runs_date === today ? Number(settings[0]?.runs_today ?? 0) : 0;
    const charge = photos.length + 1;
    if (runsToday + charge > cap) {
      return {
        ok: false as const,
        error: `This AI survey needs ${charge} of the daily AI budget. ${runsToday}/${cap} already used today.`,
      };
    }

    const gps = resolveGps({
      atShowroom: Boolean(data.atShowroom),
      device: data.device,
      existing: dealer ? { lat: Number(dealer.lat), lng: Number(dealer.lng), confirmed: true } : null,
    });

    const runId = uid();
    await sql`
      insert into ai_survey_runs (
        id, user_id, dealership_id, mode, status, stage, provider, model, photo_count,
        gps_at_showroom, gps_lat, gps_lng, gps_accuracy, gps_source, gps_status, created_by
      ) values (
        ${runId}, ${scope}, ${data.dealershipId}, ${data.mode}, 'running', 'queued',
        ${cfg.provider}, ${cfg.visionModel}, ${photos.length},
        ${Boolean(data.atShowroom)}, ${gps.lat}, ${gps.lng}, ${gps.accuracy}, ${gps.source}, ${gps.status}, ${userId}
      )
    `;
    runsToday += charge;
    await sql`
      update research_settings set runs_today = ${runsToday}, runs_date = ${today} where user_id = ${scope}
    `;

    // Photos belong to the dealership (existing model) and additionally to this run.
    if (dealer) {
      const stored = (data.storePhotos ?? []).filter((p) => typeof p === "string" && p.startsWith("data:image/"));
      const toStore = stored.length === photos.length ? stored : photos;
      for (const dataUrl of toStore) {
        await sql`
          insert into photos (id, user_id, dealership_id, data_url, lat, lng, captured_at, run_id)
          values (${uid()}, ${scope}, ${dealer.id}, ${dataUrl}, ${gps.lat}, ${gps.lng}, now(), ${runId})
        `;
      }
    }

    const payload = dealer
      ? parseJson<SurveyPayload>(
          (
            await sql<{ payload: string }>`
              select payload from surveys where user_id = ${scope} and dealership_id = ${dealer.id}
            `
          )[0]?.payload,
          {},
        )
      : {};

    try {
      const output = await runSurveyPipeline(
        cfg,
        photos,
        {
          nameEn: dealer?.name_en ?? "",
          nameAr: dealer?.name_ar ?? "",
          lat: dealer ? Number(dealer.lat) : (gps.lat ?? null),
          lng: dealer ? Number(dealer.lng) : (gps.lng ?? null),
          note: "",
          allowResearch: data.allowResearch !== false,
        },
        (stage) => setStage(sql, scope, runId, stage, "running"),
      );

      if (!output.result && !output.proposals.length) {
        await sql`
          update ai_survey_runs set status = 'failed', stage = 'failed', error = ${output.error ?? "AI analysis failed."},
            completed_at = now() where id = ${runId} and user_id = ${scope}
        `;
        return { ok: false as const, error: output.error ?? "AI analysis failed.", runId };
      }

      const existing = existingByFieldKey(dealer, payload);
      for (const p of output.proposals) {
        const current = existing[p.fieldKey] ?? null;
        await sql`
          insert into ai_field_proposals (
            id, run_id, user_id, dealership_id, field_key, value, confidence, status,
            source_types, reasoning, needs_verification, existing_value
          ) values (
            ${p.id}, ${runId}, ${scope}, ${data.dealershipId}, ${p.fieldKey},
            ${JSON.stringify(p.value)}, ${p.confidence}, ${p.status},
            ${JSON.stringify(p.sourceTypes)}, ${p.reasoning}, ${p.needsVerification},
            ${JSON.stringify(isEmptyValue(current) ? null : current)}
          )
        `;
        for (const e of p.evidence) {
          await sql`
            insert into ai_evidence (
              id, run_id, user_id, proposal_id, dealership_id, field_key, source_type,
              photo_index, source_url, text, confidence
            ) values (
              ${e.id}, ${runId}, ${scope}, ${p.id}, ${data.dealershipId}, ${e.fieldKey}, ${e.sourceType},
              ${e.photoIndex}, ${e.sourceUrl}, ${e.text}, ${e.confidence}
            )
          `;
        }
      }

      const status = output.partial || !output.result ? "partial" : "completed";
      await sql`
        update ai_survey_runs set
          status = ${status},
          stage = ${status === "partial" ? "partial" : "completed"},
          summary = ${output.result?.summary ?? ""},
          missing_info = ${JSON.stringify(output.result?.missingInformation ?? [])},
          error = ${output.error},
          completed_at = now()
        where id = ${runId} and user_id = ${scope}
      `;

      const bundle = await loadBundle(sql, scope, runId);
      return { ok: true as const, bundle, runsToday, cap };
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI analysis failed.";
      await sql`
        update ai_survey_runs set status = 'failed', stage = 'failed', error = ${message}, completed_at = now()
        where id = ${runId} and user_id = ${scope}
      `;
      return { ok: false as const, error: message, runId };
    }
  });

export const getAiRun = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { runId?: string; dealershipId?: string }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    let runId = data.runId;
    if (!runId && data.dealershipId) {
      const rows = await sql<{ id: string }>`
        select id from ai_survey_runs
        where user_id = ${scope} and dealership_id = ${data.dealershipId}
        order by started_at desc limit 1
      `;
      runId = rows[0]?.id;
    }
    if (!runId) return { ok: true as const, bundle: null };
    return { ok: true as const, bundle: await loadBundle(sql, scope, runId) };
  });

export const decideProposal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; decision: AiDecision; value?: AiProposalValue }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope, userId } = await scoped(context.userId);
    const rows = await sql<ProposalRow>`
      select * from ai_field_proposals where id = ${data.id} and user_id = ${scope}
    `;
    if (!rows[0]) return { ok: false as const, error: "Proposal not found." };
    const nextValue = data.decision === "edited" ? (data.value ?? null) : parseJson<AiProposalValue>(rows[0].value, null);
    await sql`
      update ai_field_proposals set
        decision = ${data.decision},
        value = ${JSON.stringify(nextValue)},
        decided_at = now(),
        decided_by = ${userId}
      where id = ${data.id} and user_id = ${scope}
    `;
    return { ok: true as const };
  });

export const acceptAllHighConfidence = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { runId: string }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope, userId } = await scoped(context.userId);
    const bundle = await loadBundle(sql, scope, data.runId);
    if (!bundle) return { ok: false as const, error: "Run not found." };
    const ids = highConfidenceIds(bundle.proposals);
    for (const id of ids) {
      await sql`
        update ai_field_proposals set decision = 'accepted', decided_at = now(), decided_by = ${userId}
        where id = ${id} and user_id = ${scope}
      `;
    }
    return { ok: true as const, accepted: ids.length };
  });

/**
 * Write accepted proposals into the showroom record and survey. Rejected,
 * kept-existing and undecided proposals write nothing.
 */
export const applyAiRun = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { runId: string; dealershipId: string; manualPin?: { lat: number; lng: number } | null }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    const bundle = await loadBundle(sql, scope, data.runId);
    if (!bundle) return { ok: false as const, error: "Run not found." };

    const dealers = await sql<{
      id: string;
      name_en: string;
      name_ar: string;
      lat: number | string;
      lng: number | string;
      flags: string;
      status: string;
    }>`
      select id, name_en, name_ar, lat, lng, flags, status from dealerships
      where id = ${data.dealershipId} and user_id = ${scope}
    `;
    const dealer = dealers[0];
    if (!dealer) return { ok: false as const, error: "Showroom not found." };

    const { dealerPatch, surveyPatch, aiFilled } = buildPatches({ proposals: bundle.proposals });

    const flags = parseJson<DealershipFlags>(dealer.flags, {});
    const gps = resolveGps({
      atShowroom: bundle.run.gps.atShowroom,
      device:
        bundle.run.gps.lat != null && bundle.run.gps.lng != null
          ? { lat: bundle.run.gps.lat, lng: bundle.run.gps.lng, accuracy: bundle.run.gps.accuracy ?? undefined }
          : null,
      existing: { lat: Number(dealer.lat), lng: Number(dealer.lng), confirmed: !flags.needsGps },
      manualPin: data.manualPin ?? null,
    });

    const nextFlags: DealershipFlags = {
      ...flags,
      lastAiRunAt: new Date().toISOString(),
      ...(gps.write
        ? {
            gpsSource: gps.source as DealershipFlags["gpsSource"],
            gpsAccuracy: gps.accuracy ?? undefined,
            gpsTimestamp: new Date().toISOString(),
            gpsStatus: "confirmed" as const,
            needsGps: false,
          }
        : { gpsStatus: gps.status }),
    };

    const nameEn = typeof dealerPatch.nameEn === "string" ? dealerPatch.nameEn : dealer.name_en;
    const nameAr = typeof dealerPatch.nameAr === "string" ? dealerPatch.nameAr : dealer.name_ar;
    const lat = gps.write && gps.lat != null ? gps.lat : Number(dealer.lat);
    const lng = gps.write && gps.lng != null ? gps.lng : Number(dealer.lng);

    await sql`
      update dealerships set
        name_en = ${nameEn}, name_ar = ${nameAr}, lat = ${lat}, lng = ${lng},
        flags = ${JSON.stringify(nextFlags)}, updated_at = now()
      where id = ${dealer.id} and user_id = ${scope}
    `;

    const surveyRows = await sql<{ id: string; payload: string; step: number }>`
      select id, payload, step from surveys where user_id = ${scope} and dealership_id = ${dealer.id}
    `;
    const current = parseJson<SurveyPayload>(surveyRows[0]?.payload, {});
    const merged: SurveyPayload = { ...current };
    for (const [k, v] of Object.entries(surveyPatch)) {
      if (v == null) continue;
      // Belt and braces: never overwrite a non-empty existing value here either.
      const existingValue = (current as unknown as Record<string, unknown>)[k];
      const proposal = bundle.proposals.find((p) => fieldTarget(p.fieldKey)?.field === k);
      const userChose = proposal?.decision === "accepted" || proposal?.decision === "edited";
      if (!isEmptyValue(existingValue) && !userChose) continue;
      (merged as unknown as Record<string, unknown>)[k] = v;
    }
    merged.aiFilled = [...new Set([...(current.aiFilled ?? []), ...aiFilled])];
    merged.aiLastRunId = data.runId;
    if (isEmptyValue(merged.visitStatus)) merged.visitStatus = dealer.status as SurveyPayload["visitStatus"];

    await sql`
      insert into surveys (id, user_id, dealership_id, payload, step, updated_at)
      values (${surveyRows[0]?.id ?? uid()}, ${scope}, ${dealer.id}, ${JSON.stringify(merged)}, ${surveyRows[0]?.step ?? 0}, now())
      on conflict (user_id, dealership_id) do update set payload = excluded.payload, updated_at = now()
    `;

    await sql`
      update ai_survey_runs set applied = true, dealership_id = ${dealer.id}
      where id = ${data.runId} and user_id = ${scope}
    `;
    await sql`
      update ai_field_proposals set dealership_id = ${dealer.id}
      where run_id = ${data.runId} and user_id = ${scope}
    `;
    await sql`
      update photos set dealership_id = ${dealer.id}
      where run_id = ${data.runId} and user_id = ${scope}
    `;

    return {
      ok: true as const,
      applied: aiFilled.length,
      gpsStatus: gps.write ? "confirmed" : gps.status,
    };
  });
