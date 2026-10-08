import type { DealershipFlags, SurveyPayload } from "@/lib/types";

export const FLOOR_WATCH_ID = "floor-watch";

export const FLOOR_WATCH_INSTRUCTION =
  "For every pinned showroom in Al Shifa and Al Qadisiyah, find public information that is not already on our record. Search Arabic and English. Use only public pages: Google Maps, the showroom's own site, Instagram, Snapchat, TikTok, X, Haraj, Motory, OpenSooq, Syarah, YallaMotor, and Soum. A fact counts only with the public page it came from. Never repeat what we already filed. Never invent a phone, price, bank, rate, sales figure, or social account. Do not change the showroom record.";

const FIELD_KEYS = new Set([
  "social_instagram",
  "social_snapchat",
  "social_tiktok",
  "social_x",
  "haraj",
  "bank",
  "fpr",
  "sales_claim",
  "inventory_claim",
  "competitor",
  "phone",
  "other",
]);

export function knownRecord(input: {
  nameEn: string;
  nameAr: string;
  phone: string;
  lat: number;
  lng: number;
  notes: string;
  flags: DealershipFlags;
  survey?: Partial<SurveyPayload> | null;
}): string {
  const s = input.survey ?? {};
  const lines = [
    `English name: ${input.nameEn}`,
    `Arabic name: ${input.nameAr}`,
    `Phone: ${input.phone || "(none)"}`,
    `Pin: ${input.lat}, ${input.lng}`,
    `Market: ${input.flags.market || "(not set)"}`,
    `Street: ${input.flags.street || "(none)"}`,
    `Maps: ${input.flags.mapsUrl || "(none)"}`,
    `Car type: ${s.vehicleType || "(blank)"}`,
    `Brands: ${(s.mainBrands ?? []).join(", ") || "(blank)"}`,
    `Inventory: ${s.inventoryUnits ?? "(blank)"}`,
    `Inside / outside: ${s.inventoryInside ?? "(blank)"} / ${s.inventoryOutside ?? "(blank)"}`,
    `ASP: ${s.avgSellingPriceSar ?? "(blank)"}`,
    `Over 5 years: ${s.inventoryAgePctOver5 ?? "(blank)"}`,
    `Size: ${s.showroomSizeSqm ?? "(blank)"}`,
    `Finance: ${s.financeAvailable || "(blank)"}`,
    `Banks: ${(s.banksPartnered ?? []).join(", ") || "(blank)"}`,
    `FPR: ${s.fpr ?? "(blank)"}`,
    `Salesmen: ${s.salesmenCount ?? "(blank)"}`,
    `Monthly sold: ${s.monthlySoldExact ?? "(blank)"}`,
    `Notes: ${input.notes || "(blank)"}`,
  ];
  return lines.join("\n");
}

export function floorWatchPrompt(known: string, marketHint: string): string {
  return [
    FLOOR_WATCH_INSTRUCTION,
    "",
    `This door is in ${marketHint}, Riyadh.`,
    "Already on our record. Do not report any of this again:",
    known,
    "",
    "Return ONLY JSON: {\"facts\":[{\"fieldKey\":\"social_instagram|social_snapchat|social_tiktok|social_x|haraj|bank|fpr|sales_claim|inventory_claim|competitor|phone|other\",\"value\":\"one sourced sentence\",\"sourceUrl\":\"https://...\",\"confidence\":\"high|medium|low\"}]}",
    "If nothing new is on a public page, return {\"facts\":[]}.",
    "sourceUrl must be a real http(s) page. No source, no fact.",
  ].join("\n");
}

export function parseFloorFacts(text: string, known: string): { fieldKey: string; value: string; sourceUrl: string; confidence: "high" | "medium" | "low" }[] {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [];
  let parsed: { facts?: unknown } = {};
  try {
    parsed = JSON.parse(match[0]) as { facts?: unknown };
  } catch {
    return [];
  }
  if (!Array.isArray(parsed.facts)) return [];
  const knownBlob = known.toLowerCase();
  const out: { fieldKey: string; value: string; sourceUrl: string; confidence: "high" | "medium" | "low" }[] = [];
  for (const row of parsed.facts) {
    if (!row || typeof row !== "object") continue;
    const item = row as { fieldKey?: unknown; value?: unknown; sourceUrl?: unknown; confidence?: unknown };
    const value = String(item.value ?? "").trim();
    const sourceUrl = String(item.sourceUrl ?? "").trim();
    const fieldKey = String(item.fieldKey ?? "other");
    if (!value || value.length > 500) continue;
    if (!/^https?:\/\//i.test(sourceUrl)) continue;
    if (!FIELD_KEYS.has(fieldKey)) continue;
    if (knownBlob.includes(value.toLowerCase())) continue;
    out.push({
      fieldKey,
      value,
      sourceUrl: sourceUrl.slice(0, 500),
      confidence: item.confidence === "high" || item.confidence === "low" ? item.confidence : "medium",
    });
  }
  return out.slice(0, 6);
}
