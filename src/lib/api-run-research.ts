import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getAiConfig, liveSearch } from "@/lib/ai/provider";
import { FLOOR_WATCH_ID, floorWatchPrompt, knownRecord, parseFloorFacts } from "@/lib/floor-watch";
import type { AgentFinding, DealershipFlags, SurveyPayload } from "@/lib/types";
import { uid } from "@/lib/utils";
import { type DealerRow, scoped } from "@/lib/api-shared";

function asFlags(raw: unknown): DealershipFlags {
  if (raw && typeof raw === "object") return raw as DealershipFlags;
  try {
    return JSON.parse(String(raw ?? "{}")) as DealershipFlags;
  } catch {
    return {};
  }
}

function asPayload(raw: unknown): Partial<SurveyPayload> {
  if (raw && typeof raw === "object") return raw as Partial<SurveyPayload>;
  try {
    return JSON.parse(String(raw ?? "{}")) as Partial<SurveyPayload>;
  } catch {
    return {};
  }
}

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

    const cfg = getAiConfig();
    if (!cfg?.canWebSearch) {
      return { ok: false as const, error: "Public search is not available in this environment." };
    }
    if (!data.taskIds.includes(FLOOR_WATCH_ID)) {
      return { ok: false as const, error: "The research tab only runs the floor watch." };
    }
    if (runsToday >= cap) {
      return { ok: false as const, error: `Daily cap reached (${runsToday}/${cap}). The watch continues tomorrow.` };
    }

    const dealers = await sql<DealerRow>`select * from dealerships where user_id = ${scope}`;
    const dealerMap = new Map(dealers.map((d) => [d.id, d]));
    const dealer = data.dealershipIds.map((id) => dealerMap.get(id)).find((d): d is DealerRow => Boolean(d));
    if (!dealer) return { ok: false as const, error: "That showroom is not on the saved roster." };

    const surveys = await sql<{ dealership_id: string; payload: unknown }>`
      select dealership_id, payload from surveys where user_id = ${scope} and dealership_id = ${dealer.id}
    `;
    const flags = asFlags(dealer.flags);
    const known = knownRecord({
      nameEn: dealer.name_en,
      nameAr: dealer.name_ar || "",
      phone: dealer.listed_phone || "",
      lat: Number(dealer.lat),
      lng: Number(dealer.lng),
      notes: dealer.seed_note || "",
      flags,
      survey: asPayload(surveys[0]?.payload),
    });
    const market = flags.market === "shifa" ? "Al Shifa" : flags.market === "qadisiyah" ? "Al Qadisiyah" : "Al Shifa or Al Qadisiyah";
    const searched = await liveSearch(cfg.apiKey, floorWatchPrompt(known, market));

    const findings: AgentFinding[] = [];
    const now = new Date().toISOString();
    if ("error" in searched) {
      return { ok: false as const, error: searched.error };
    }
    const facts = parseFloorFacts(searched.text, known);
    const rows = facts.length
      ? facts
      : [{ fieldKey: "watch_checked", value: "No new public fact beyond the record.", sourceUrl: "", confidence: "low" as const }];

    for (const fact of rows) {
      const finding: AgentFinding = {
        id: uid(),
        dealershipId: dealer.id,
        taskId: FLOOR_WATCH_ID,
        fieldKey: fact.fieldKey,
        value: fact.value,
        sourceUrl: fact.sourceUrl || null,
        confidence: fact.confidence,
        retrievedAt: now,
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
      findings.push(finding);
    }

    runsToday += 1;
    await sql`
      update research_settings set runs_today = ${runsToday}, runs_date = ${today}
      where user_id = ${scope}
    `;
    return { ok: true as const, findings, runsToday, cap };
  });
