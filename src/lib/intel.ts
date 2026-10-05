import type { SurveyPayload } from "@/lib/types";

export type Freshness = "fresh" | "aging" | "stale" | "unknown";
export type Confidence = "verified" | "likely" | "unverified" | "stale";
export type FactKind = "listing" | "contact" | "profile" | "news" | "other";
export type PhotoCategory = "facade" | "inventory" | "inside" | "outside" | "document" | "other";

export type RawFact = {
  label: string;
  value: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string | null;
  kind: FactKind;
};

export type AnnotatedFact = RawFact & {
  id: string;
  researchedAt: string;
  freshness: Freshness;
  confidence: Confidence;
  ageDays: number | null;
  sourceRank: 1 | 2 | 3 | 4 | 5 | 6;
};

export type ResearchSnapshot = {
  id: string;
  dealershipId: string;
  researchedAt: string;
  summary: string;
  facts: AnnotatedFact[];
  error?: string;
};

export type MarketBrief = {
  id: string;
  topic: string;
  researchedAt: string;
  summary: string;
  facts: AnnotatedFact[];
  error?: string;
};

export type DeepdiveDraft = {
  dealershipId: string;
  updatedAt: string;
  fpr: string;
  monthlySold: string;
  financialSales: string;
  cashSales: string;
  financeSales: string;
  listingsNote: string;
  contacts: string;
  pocName: string;
  pocTitle: string;
  competitors: string;
  observations: string;
};

export type SurveyDraft = {
  payload: Partial<SurveyPayload>;
  step: number;
  updatedAt: string;
};

export type IntelPhoto = {
  id: string;
  dealershipId: string;
  dataUrl: string;
  category: PhotoCategory;
  capturedAt: string;
  fingerprint: string;
};

export const EMPTY_DEEPDIVE = (dealershipId: string): DeepdiveDraft => ({
  dealershipId,
  updatedAt: new Date().toISOString(),
  fpr: "",
  monthlySold: "",
  financialSales: "",
  cashSales: "",
  financeSales: "",
  listingsNote: "",
  contacts: "",
  pocName: "",
  pocTitle: "",
  competitors: "",
  observations: "",
});

const LISTING_HOSTS = [
  "syarah.com",
  "haraj.com.sa",
  "haraj.com",
  "opensooq.com",
  "dubizzle.com",
  "dubizzle.sa",
  "yallamotor.com",
  "motory.com",
  "carswitch.com",
  "saudisale.com",
  "hatla2ee.com",
  "cars.com",
];

const SOCIAL_HOSTS = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "x.com",
  "twitter.com",
  "tiktok.com",
  "snapchat.com",
  "linkedin.com",
  "youtube.com",
];

const MAP_HOSTS = ["google.com", "goo.gl", "maps.app.goo.gl", "g.page"];

const NEWS_HOSTS = [
  "argaam.com",
  "alarabiya.net",
  "aleqt.com",
  "spa.gov.sa",
  "reuters.com",
  "bloomberg.com",
  "arabnews.com",
  "saudigazette.com",
  "zawya.com",
];

export function tx(lang: "en" | "ar", en: string, ar: string): string {
  return lang === "ar" ? ar : en;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function sourceRank(url: string): 1 | 2 | 3 | 4 | 5 | 6 {
  const host = hostOf(url);
  if (!host) return 6;
  if (SOCIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return 2;
  if (LISTING_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return 3;
  if (MAP_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return 4;
  if (NEWS_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return 5;
  if (host.endsWith(".sa") || host.endsWith(".com.sa")) return 1;
  return 6;
}

export function parseDay(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const day = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const t = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  return t;
}

export function ageDays(iso: string | null | undefined, now = Date.now()): number | null {
  const t = parseDay(iso);
  if (t == null) return null;
  const days = Math.floor((now - t) / 86_400_000);
  if (days < 0 || days > 3650) return null;
  return days;
}

/** 30 days is current. Over 90 days is stale. Missing dates stay unknown. */
export function freshnessOf(iso: string | null | undefined, now = Date.now()): Freshness {
  const days = ageDays(iso, now);
  if (days == null) return "unknown";
  if (days <= 30) return "fresh";
  if (days <= 90) return "aging";
  return "stale";
}

export function fingerprint(dataUrl: string): string {
  return `${dataUrl.length}:${dataUrl.slice(0, 80)}:${dataUrl.slice(-40)}`;
}

function confidenceFor(rank: 1 | 2 | 3 | 4 | 5 | 6, freshness: Freshness, hosts: number): Confidence {
  if (freshness === "stale") return "stale";
  if (freshness === "unknown") return "unverified";
  if (rank <= 2) return "verified";
  if (hosts >= 2 || rank === 3) return hosts >= 2 ? "likely" : "unverified";
  if (hosts >= 2) return "likely";
  return "unverified";
}

export function annotateFacts(raw: RawFact[], researchedAt: string, now = Date.now()): AnnotatedFact[] {
  const clean = raw
    .map((f) => ({
      label: f.label.trim().slice(0, 80),
      value: f.value.trim().slice(0, 400),
      sourceName: f.sourceName.trim().slice(0, 80),
      sourceUrl: f.sourceUrl.trim(),
      publishedAt: parseDay(f.publishedAt) != null ? f.publishedAt!.slice(0, 10) : null,
      kind: f.kind,
    }))
    .filter((f) => f.label && f.value && /^https:\/\//i.test(f.sourceUrl));

  const byValue = new Map<string, Set<string>>();
  for (const f of clean) {
    const key = f.value.toLowerCase();
    const hosts = byValue.get(key) ?? new Set<string>();
    const host = hostOf(f.sourceUrl);
    if (host) hosts.add(host);
    byValue.set(key, hosts);
  }

  const seen = new Set<string>();
  const out: AnnotatedFact[] = [];
  for (const f of clean) {
    const sig = `${f.label}|${f.value}|${f.sourceUrl}`.toLowerCase();
    if (seen.has(sig)) continue;
    seen.add(sig);
    const freshness = freshnessOf(f.publishedAt, now);
    const rank = sourceRank(f.sourceUrl);
    const hosts = byValue.get(f.value.toLowerCase())?.size ?? 1;
    out.push({
      ...f,
      id: sig.slice(0, 120),
      researchedAt,
      freshness,
      confidence: confidenceFor(rank, freshness, hosts),
      ageDays: ageDays(f.publishedAt, now),
      sourceRank: rank,
    });
  }
  return out.sort((a, b) => a.sourceRank - b.sourceRank || (a.ageDays ?? 9999) - (b.ageDays ?? 9999));
}

export function phoneTail(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 ? digits.slice(-9) : "";
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
