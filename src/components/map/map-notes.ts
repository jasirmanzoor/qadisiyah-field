import { ALL_CENSUS } from "@/lib/census";
import { SHIFA_SOCIALS } from "@/lib/shifa-socials";
import { formatNumber } from "@/lib/utils";
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

const CENSUS_PROSE =
  /visual count|gps still needs a tap|floor notes \d+|asp band|not vin|pin placed east|not filed|cars visible in frame|through closed gate|confirm on site|do not copy d\d|seed pin is still|public maps pin:|field gps locked|license on fascia|related qadisiyah desk|this al shifa lot is unwalked|distinct from s\d/i;

const CENSUS_BY_SD = (() => {
  const m = new Map<string, SurveyPayload>();
  for (const r of ALL_CENSUS) {
    if (r.sdId && r.survey) m.set(r.sdId, r.survey);
  }
  return m;
})();

/** Live survey wins field-by-field. Census seed fills gaps. Display only — never written back. */
export function displaySurvey(dealer: Dealership, live?: SurveyPayload | null): SurveyPayload | undefined {
  const seed = dealer.flags.sdId ? CENSUS_BY_SD.get(dealer.flags.sdId) : undefined;
  if (!seed && !live) return undefined;
  const out: SurveyPayload = { ...(seed ?? {}) };
  if (!live) return out;
  for (const [key, value] of Object.entries(live) as [keyof SurveyPayload, SurveyPayload[keyof SurveyPayload]][]) {
    if (value == null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value as never;
  }
  return out;
}

function extractMapsUrl(text: string): string | null {
  const m = text.match(/https:\/\/(?:maps\.app\.goo\.gl|www\.google\.com\/maps)[^\s,;]+/i);
  if (!m) return null;
  return m[0].replace(/[).,;]+$/g, "");
}

function compactAsp(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return formatNumber(n);
}

function cleanSurveyNotes(text: string): string {
  const t = text.trim();
  if (!t) return "";
  if (CENSUS_PROSE.test(t)) return "";
  return t;
}

function socialLines(sdId?: string): string[] {
  if (!sdId) return [];
  const s = SHIFA_SOCIALS[sdId];
  if (!s) return [];
  const lines: string[] = [];
  if (s.insta) lines.push(`Insta ${s.insta}`);
  if (s.tiktok) lines.push(`TikTok ${s.tiktok}`);
  if (s.snap) lines.push(`Snap ${s.snap}`);
  if (s.web) lines.push(`Web ${s.web}`);
  return lines;
}

function num(a?: number | null, b?: number | null): number | null {
  if (a != null && Number.isFinite(a)) return a;
  if (b != null && Number.isFinite(b)) return b;
  return null;
}

function filed(dealer: Dealership, live?: SurveyPayload): {
  inv: number | null;
  size: number | null;
  asp: number | null;
  age: number | null;
  brands: string[];
  vehicleType: SurveyPayload["vehicleType"] | "";
  finance: SurveyPayload["financeAvailable"] | "";
  extra: string;
  maps: string;
} {
  const seed = dealer.flags.sdId ? CENSUS_BY_SD.get(dealer.flags.sdId) : undefined;
  const brands = (live?.mainBrands?.length ? live.mainBrands : seed?.mainBrands ?? []).filter(Boolean);
  const maps =
    extractMapsUrl(dealer.seedNote || "") ||
    extractMapsUrl(live?.notes || "") ||
    extractMapsUrl(seed?.notes || "") ||
    dealer.flags.mapsUrl ||
    "";
  return {
    inv: num(live?.inventoryUnits, seed?.inventoryUnits),
    size: num(live?.showroomSizeSqm, seed?.showroomSizeSqm),
    asp: num(live?.avgSellingPriceSar, seed?.avgSellingPriceSar),
    age: num(live?.inventoryAgePctOver5, seed?.inventoryAgePctOver5),
    brands,
    vehicleType: live?.vehicleType || seed?.vehicleType || "",
    finance: live?.financeAvailable || seed?.financeAvailable || "",
    extra: cleanSurveyNotes(live?.notes ?? ""),
    maps,
  };
}

/** WhatsApp-style field card. Only filed / walked values — never dashes, ASP bands, or census prose. */
export function formatThisLotPaste(dealer: Dealership, survey?: SurveyPayload): string {
  const f = filed(dealer, survey);
  const socials = socialLines(dealer.flags.sdId);
  const hasFacts =
    f.inv != null ||
    f.size != null ||
    f.asp != null ||
    f.brands.length > 0 ||
    f.age != null ||
    f.finance === "yes" ||
    f.finance === "no" ||
    Boolean(f.extra) ||
    socials.length > 0;
  if (!hasFacts) return "";

  const lines: string[] = [];
  const title = (dealer.nameAr || dealer.nameEn).trim();
  if (title) lines.push(title);
  if (f.maps) lines.push(f.maps);
  if (f.inv != null) lines.push(`${formatNumber(f.inv)} cars in Inv`);
  if (f.size != null) lines.push(`${formatNumber(f.size)} mtrs`);
  if (f.vehicleType === "used_only") lines.push("Used cars");
  else if (f.vehicleType === "new_only") lines.push("New cars");
  else if (f.vehicleType === "mix") lines.push("New and used");
  if (f.brands.length) lines.push(f.brands.join(", "));
  if (f.asp != null) lines.push(`ASP - ${compactAsp(f.asp)}`);
  if (f.age != null) lines.push(`${100 - f.age}% <5yr old , ${f.age}% >5 yr old`);
  if (f.finance === "no") lines.push("All cash only deals");
  else if (f.finance === "yes") lines.push("Finance available");
  if (f.extra) lines.push(f.extra);
  lines.push(...socials);
  return lines.join("\n");
}

export function formatRelatedWalkedPaste(
  partner: Dealership | null,
  survey?: SurveyPayload,
  _heading?: string,
): string | null {
  if (!partner || !survey) return null;
  const body = formatThisLotPaste(partner, survey);
  return body || null;
}

export function collectRoughNotes(opts: {
  nameEn?: string;
  seedNote?: string;
  surveyNotes?: string;
  publicSnippet?: string;
  lotPaste?: string;
  relatedPaste?: string | null;
}): string {
  return (opts.lotPaste ?? "").trim();
}

const NOTE_LINES: { label: string; key: string }[] = [
  { label: "Showroom name", key: "name" },
  { label: "Location", key: "location" },
  { label: "Car type", key: "type" },
  { label: "Showroom size", key: "size" },
  { label: "Mostly sold brands", key: "brands" },
  { label: "Total cars in inventory", key: "total" },
  { label: "Inside inventory / outside inventory", key: "split" },
  { label: "ASP", key: "asp" },
  { label: ">5 years model cars ratio", key: "age" },
];

function carTypeLabel(value?: string) {
  if (value === "new_only") return "New";
  if (value === "mix") return "New and used";
  if (value === "used_only") return "Used";
  return "";
}

function noteNum(n: number | null | undefined) {
  return n == null ? "" : String(n);
}

/** Locked field order. Blank values stay blank. Existing custom notes are kept under the form. */
export function standardNoteText(dealer: Dealership, survey?: SurveyPayload): string {
  const existing = (survey?.notes ?? "").trim();
  if (/^showroom name\s*:/i.test(existing)) return existing;
  const name = [dealer.nameEn, dealer.nameAr].filter(Boolean).join(" | ");
  const placed = !dealer.flags.unplaced && dealer.lat !== 0 && dealer.lng !== 0;
  const inside = noteNum(survey?.inventoryInside);
  const outside = noteNum(survey?.inventoryOutside);
  const split = inside || outside ? `${inside} / ${outside}` : "";
  const values: Record<string, string> = {
    name,
    location: placed ? `${formatCoord(dealer.lat)}, ${formatCoord(dealer.lng)}` : "",
    type: carTypeLabel(survey?.vehicleType),
    size: survey?.showroomSizeSqm != null ? `${survey.showroomSizeSqm} mtrs` : "",
    brands: (survey?.mainBrands ?? []).join(" · "),
    total: noteNum(survey?.inventoryUnits),
    split,
    asp: noteNum(survey?.avgSellingPriceSar),
    age: survey?.inventoryAgePctOver5 != null ? `${survey.inventoryAgePctOver5}%` : "",
  };
  const form = NOTE_LINES.map((row) => `${row.label}: ${values[row.key] ?? ""}`).join("\n");
  if (!existing || CENSUS_PROSE.test(existing)) return form;
  return `${form}\n\n${existing}`;
}

function parseLooseNumber(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const k = t.match(/(\d+(?:\.\d+)?)\s*k\b/i);
  if (k) return Math.round(Number(k[1]) * 1000);
  const n = t.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!n) return null;
  const value = Number(n[0]);
  return Number.isFinite(value) ? value : null;
}

function splitShowroomName(raw: string): { nameEn?: string; nameAr?: string } {
  const parts = raw.split("|").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return {};
  const arabic = /[\u0600-\u06FF]/;
  if (parts.length === 1) return arabic.test(parts[0]) ? { nameAr: parts[0] } : { nameEn: parts[0] };
  const nameAr = parts.find((p) => arabic.test(p));
  const nameEn = parts.find((p) => p !== nameAr);
  return { nameEn, nameAr };
}

export function parseStandardNote(text: string): {
  patch: Partial<SurveyPayload>;
  nameEn?: string;
  nameAr?: string;
  coords?: { lat: number; lng: number };
} {
  const patch: Partial<SurveyPayload> = { notes: text };
  let nameEn: string | undefined;
  let nameAr: string | undefined;
  let coords: { lat: number; lng: number } | undefined;
  for (const rawLine of text.split(/\r?\n/)) {
    const splitAt = rawLine.indexOf(":");
    if (splitAt < 0) continue;
    const label = rawLine.slice(0, splitAt).trim().toLowerCase();
    const value = rawLine.slice(splitAt + 1).trim();
    const row = NOTE_LINES.find((item) => item.label.toLowerCase() === label);
    if (!row) continue;
    if (row.key === "name") {
      const names = splitShowroomName(value);
      nameEn = names.nameEn;
      nameAr = names.nameAr;
    } else if (row.key === "location") {
      const pair = parseCoordPair(value);
      if (pair) coords = pair;
    } else if (row.key === "type") {
      const v = value.toLowerCase();
      patch.vehicleType = !v ? "" : /mix|both|new and used/.test(v) ? "mix" : /\bnew\b/.test(v) ? "new_only" : /used|old/.test(v) ? "used_only" : "";
    } else if (row.key === "size") {
      patch.showroomSizeSqm = parseLooseNumber(value);
    } else if (row.key === "brands") {
      patch.mainBrands = value ? value.split(/[·,;|/]+/).map((s) => s.trim()).filter(Boolean) : [];
    } else if (row.key === "total") {
      patch.inventoryUnits = parseLooseNumber(value);
    } else if (row.key === "split") {
      const [left, right] = value.split("/");
      patch.inventoryInside = parseLooseNumber(left ?? "");
      patch.inventoryOutside = value.includes("/") ? parseLooseNumber(right ?? "") : null;
    } else if (row.key === "asp") {
      patch.avgSellingPriceSar = parseLooseNumber(value);
    } else if (row.key === "age") {
      patch.inventoryAgePctOver5 = parseLooseNumber(value);
    }
  }
  return { patch, nameEn, nameAr, coords };
}
