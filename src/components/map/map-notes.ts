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
  /visual count|gps still needs a tap|floor notes \d+|asp band|not vin|pin placed east|not filed|cars visible in frame|through closed gate|confirm on site|do not copy d\d|seed pin is still|public maps pin:/i;

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

/** WhatsApp-style field card. Only filed values — never invent dashes or ASP bands. */
export function formatThisLotPaste(dealer: Dealership, survey?: SurveyPayload): string {
  const lines: string[] = [];
  const title = (dealer.nameAr || dealer.nameEn).trim();
  if (title) lines.push(title);

  const maps =
    extractMapsUrl(dealer.seedNote || "") ||
    extractMapsUrl(survey?.notes || "") ||
    dealer.flags.mapsUrl ||
    (Number.isFinite(dealer.lat) && Number.isFinite(dealer.lng)
      ? `https://www.google.com/maps?q=${dealer.lat},${dealer.lng}`
      : "");
  if (maps) lines.push(maps);

  const inv = survey?.inventoryUnits;
  if (inv != null) lines.push(`${formatNumber(inv)} cars in Inv`);

  const size = survey?.showroomSizeSqm;
  if (size != null) lines.push(`${formatNumber(size)} mtrs`);

  if (survey?.vehicleType === "used_only") lines.push("Used cars");
  else if (survey?.vehicleType === "new_only") lines.push("New cars");
  else if (survey?.vehicleType === "mix") lines.push("New and used");

  const brands = (survey?.mainBrands ?? []).filter(Boolean);
  if (brands.length) lines.push(brands.join(" , "));

  if (survey?.avgSellingPriceSar != null) {
    lines.push(`ASP - ${compactAsp(survey.avgSellingPriceSar)}`);
  }

  const age = survey?.inventoryAgePctOver5;
  if (age != null) {
    lines.push(`${100 - age}% <5yr old , ${age}% >5 yr old`);
  }

  if (survey?.financeAvailable === "no") lines.push("All cash only deals");
  else if (survey?.financeAvailable === "yes") lines.push("Finance available");

  const extra = cleanSurveyNotes(survey?.notes ?? "");
  if (extra) lines.push(extra);

  const hasFacts =
    inv != null ||
    size != null ||
    survey?.avgSellingPriceSar != null ||
    brands.length > 0 ||
    age != null ||
    survey?.financeAvailable === "yes" ||
    survey?.financeAvailable === "no" ||
    Boolean(extra);
  if (!hasFacts) return "";
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
