import { formatNumber, formatSar } from "@/lib/utils";
import type { Dealership, SurveyPayload } from "@/lib/types";

export function formatCoord(n: number) {
  return n.toFixed(6);
}

export function parseCoordPair(raw: string): { lat: number; lng: number } | null {
  const nums = raw.replace(/[°NSEW]/gi, " ").match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 2) return null;
  const lat = Number(nums[0]);
  const lng = Number(nums[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function parseCoords(latRaw: string, lngRaw: string): { lat: number; lng: number } | null {
  const fromPair = parseCoordPair(`${latRaw} ${lngRaw}`);
  if (fromPair) return fromPair;
  return parseCoordPair(latRaw) ?? parseCoordPair(lngRaw);
}

function uniqueBlobs(...parts: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const t = (p ?? "").trim();
    if (!t) continue;
    const key = t.replace(/\s+/g, " ").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export function formatThisLotPaste(dealer: Dealership, survey?: SurveyPayload): string {
  const inv = survey?.inventoryUnits;
  const inside = survey?.inventoryInside;
  const outside = survey?.inventoryOutside;
  const size = survey?.showroomSizeSqm;
  const age = survey?.inventoryAgePctOver5;
  const lines = [dealer.nameEn];
  lines.push(`Inventory: ${inv != null ? formatNumber(inv) : "–"}`);
  if (inside != null) lines.push(`Inside: ${formatNumber(inside)}`);
  if (outside != null) lines.push(`Outside: ${formatNumber(outside)}`);
  lines.push(`Showroom size: ${size != null ? `${formatNumber(size)} m²` : "–"}`);
  if (inv != null && survey?.avgSellingPriceSar != null) {
    lines.push(`ASP: ${formatSar(survey.avgSellingPriceSar)}`);
  }
  if (inv != null && survey?.monthlySoldExact != null) {
    lines.push(`Monthly sold: ${formatNumber(survey.monthlySoldExact)}`);
  }
  if (age != null) {
    lines.push(`Age: ${age}% ≥5 yr / ${100 - age}% <5 yr`);
  }
  const mix =
    survey?.vehicleType === "used_only"
      ? "used"
      : survey?.vehicleType === "new_only"
        ? "new"
        : survey?.vehicleType === "mix"
          ? "mixed"
          : "";
  if (inv != null && mix) lines.push(`Type: ${mix}`);
  const brands = (survey?.mainBrands ?? []).filter(Boolean);
  if (brands.length) lines.push(`Brands: ${brands.join(", ")}`);
  return lines.join("\n");
}

function stripRelatedSection(text: string): string {
  return text
    .replace(/\n*Related Qadisiyah desk[\s\S]*$/i, "")
    .replace(/\n*مكتب القادسية المرتبط[\s\S]*$/i, "")
    .trim();
}

function stripLeadingLotPaste(text: string, nameEn: string): string {
  if (!nameEn) return text;
  const escaped = nameEn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `^${escaped}\\s*\\nInventory:\\s*[^\\n]*(?:\\nInside:\\s*[^\\n]*)?(?:\\nOutside:\\s*[^\\n]*)?\\nShowroom size:\\s*[^\\n]*(?:\\nASP:\\s*[^\\n]*)?(?:\\nMonthly sold:\\s*[^\\n]*)?(?:\\nAge:\\s*[^\\n]*)?(?:\\nType:\\s*[^\\n]*)?(?:\\nBrands:\\s*[^\\n]*)?\\n*`,
    "i",
  );
  return text.replace(re, "").trim();
}

export function formatRelatedWalkedPaste(
  partner: Dealership | null,
  survey?: SurveyPayload,
  heading?: string,
): string | null {
  if (!partner || !survey) return null;
  const inv = survey.inventoryUnits;
  const size = survey.showroomSizeSqm;
  const asp = survey.avgSellingPriceSar;
  const sold = survey.monthlySoldExact;
  const brands = (survey.mainBrands ?? []).filter(Boolean);
  if (inv == null && size == null && asp == null && sold == null) return null;
  const lines = [
    heading || "Related Qadisiyah desk (walked – do not copy onto this lot)",
    `${partner.flags.sdId ?? ""} ${partner.nameEn}`.trim(),
  ];
  if (inv != null) lines.push(`Inventory: ${formatNumber(inv)}`);
  if (size != null) lines.push(`Showroom size: ${formatNumber(size)} m²`);
  if (asp != null) lines.push(`ASP: ${formatSar(asp)}`);
  if (sold != null) lines.push(`Monthly sold: ${formatNumber(sold)}`);
  if (brands.length) lines.push(`Brands: ${brands.join(", ")}`);
  return lines.join("\n");
}

export function collectRoughNotes(opts: {
  nameEn?: string;
  seedNote?: string;
  surveyNotes?: string;
  publicSnippet?: string;
  lotPaste?: string;
  relatedPaste?: string | null;
}): string {
  const nameEn = opts.nameEn ?? "";
  const seed = (opts.seedNote ?? "").trim();
  const survey = (opts.surveyNotes ?? "").trim();
  const snippet = (opts.publicSnippet ?? "").trim();
  const skipSnippet =
    !snippet || seed.includes(snippet) || survey.includes(snippet);
  const mapping = uniqueBlobs(seed, survey, skipSnippet ? "" : snippet)
    .map((b) => stripLeadingLotPaste(stripRelatedSection(b), nameEn))
    .filter(Boolean);
  const mappingBody = uniqueBlobs(...mapping).join("\n\n");
  const parts: string[] = [];
  const lotPaste = opts.lotPaste?.trim() || "";
  if (lotPaste) parts.push(lotPaste);
  if (mappingBody) parts.push(mappingBody);
  const paste = opts.relatedPaste?.trim() || "";
  if (paste) parts.push(paste);
  return parts.join("\n\n");
}
