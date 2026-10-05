import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { FactKind, RawFact } from "@/lib/intel";

export type IntelQuery = {
  mode: "showroom" | "market";
  nameEn?: string;
  nameAr?: string;
  area?: string;
  phone?: string;
  topic?: string;
};

const KINDS = new Set<FactKind>(["listing", "contact", "profile", "news", "other"]);

function asFact(row: unknown): RawFact | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const kind = typeof r.kind === "string" && KINDS.has(r.kind as FactKind) ? (r.kind as FactKind) : "other";
  const label = typeof r.label === "string" ? r.label : "";
  const value = typeof r.value === "string" ? r.value : "";
  const sourceName = typeof r.sourceName === "string" ? r.sourceName : "";
  const sourceUrl = typeof r.sourceUrl === "string" ? r.sourceUrl : "";
  const publishedAt = typeof r.publishedAt === "string" ? r.publishedAt : null;
  if (!label || !value || !sourceUrl.startsWith("https://")) return null;
  return { label, value, sourceName: sourceName || sourceUrl, sourceUrl, publishedAt, kind };
}

function extractJson(text: string): { summary: string; facts: RawFact[] } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return { summary: "", facts: [] };
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as {
      summary?: unknown;
      facts?: unknown;
    };
    const facts = Array.isArray(parsed.facts) ? parsed.facts.map(asFact).filter((f): f is RawFact => Boolean(f)) : [];
    return { summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 700) : "", facts };
  } catch {
    return { summary: "", facts: [] };
  }
}

function collectText(node: unknown, out: string[]) {
  if (!node) return;
  if (typeof node === "string") {
    if (node.includes("{") && node.includes("facts")) out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectText(item, out);
    return;
  }
  if (typeof node === "object") {
    const rec = node as Record<string, unknown>;
    if (typeof rec.text === "string") out.push(rec.text);
    if (typeof rec.output_text === "string") out.push(rec.output_text);
    for (const value of Object.values(rec)) collectText(value, out);
  }
}

function promptFor(q: IntelQuery): string {
  const rules = `You research public web pages. Return ONLY JSON:
{"summary":"short","facts":[{"label":"","value":"","sourceName":"","sourceUrl":"https://...","publishedAt":"YYYY-MM-DD or null","kind":"listing|contact|profile|news|other"}]}
Rules:
- Never invent phone numbers, WhatsApp numbers, emails, owners, managers, prices, mileage, or listing dates.
- Every fact MUST include the https URL of the page that states that exact value. If you cannot cite a URL, omit the fact.
- publishedAt is the page's published or updated date. Use null if the page does not show a date. Never use today's date as a stand-in.
- Prefer pages updated within 30 days for listings, prices, inventory, and contacts. For news, prefer the last 7 to 30 days.
- If the only source is older than 90 days, still include it with its real date. Do not describe it as current.
- If sources disagree, include each value with its own source. Do not pick a winner.
- Official dealer website first, then official social or business pages, then major listing sites, then Google/Maps listings, then reputable news, then other public pages.
- Do not treat an unverified blog or directory as confirmed.
- No markdown.`;

  if (q.mode === "market") {
    return `${rules}
Topic: ${q.topic || "Saudi used-car market"}
Geography: Riyadh, Saudi Arabia, with attention to Al Qadisiyah and Al Shifa independent dealers when sources mention them.
Find recent public news, pricing or demand signals, popular models, financing trends, and dealership activity. Each item needs its source URL and date.`;
  }
  return `${rules}
Showroom: ${q.nameEn || ""}
Arabic name: ${q.nameAr || ""}
Area: ${q.area || "Riyadh"}
Known field phone (do not repeat it unless a public page also prints it): ${q.phone || "none"}
Find public listings of this business: website, social profiles, current vehicle listings (make, model, year, price, mileage, listing date), phone, WhatsApp, email, and a publicly named owner, manager, or point of contact with title. Omit anything you cannot source.`;
}

async function callModel(apiKey: string, model: string, content: string): Promise<{ ok: true; body: unknown } | { ok: false; status: number; detail: string }> {
  const res = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      input: [{ role: "user", content }],
      tools: [{ type: "web_search" }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    return { ok: false, status: res.status, detail: detail.slice(0, 300) };
  }
  return { ok: true, body: await res.json() };
}

export const searchIntel = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: IntelQuery) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Web research is not available in this environment." };
    const content = promptFor(data);
    let attempt = await callModel(apiKey, "grok-4.5", content);
    if (!attempt.ok && (attempt.status === 400 || attempt.status === 404)) {
      attempt = await callModel(apiKey, "grok-4.7", content);
    }
    if (!attempt.ok) return { ok: false as const, error: `Research failed (${attempt.status}).` };
    const texts: string[] = [];
    collectText(attempt.body, texts);
    const parsed = extractJson(texts.join("\n"));
    return { ok: true as const, summary: parsed.summary, facts: parsed.facts };
  });
