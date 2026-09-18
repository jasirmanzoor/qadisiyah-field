import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { AgentFinding } from "@/lib/types";
import { uid } from "@/lib/utils";
import { type DealerRow, scoped } from "@/lib/api-shared";

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
