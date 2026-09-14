import { z } from "zod";

/**
 * Strict structured output for the AI Field Survey Agent. Every model response
 * is validated here before anything is persisted — malformed output is
 * repaired once, then dropped.
 */

export const CONFIDENCES = ["high", "medium", "low", "unknown"] as const;
export const PROPOSAL_STATUSES = ["observed", "estimated", "needs_review", "unknown"] as const;
export const EVIDENCE_SOURCES = ["photo", "ocr", "web", "gps", "manual", "derived"] as const;

export type FieldConfidence = (typeof CONFIDENCES)[number];
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];
export type EvidenceSource = (typeof EVIDENCE_SOURCES)[number];

const confidence = z.enum(CONFIDENCES).catch("unknown");
const status = z.enum(PROPOSAL_STATUSES).catch("unknown");

/** A single field the agent proposes, always carrying its evidence. */
function proposal<T extends z.ZodTypeAny>(value: T) {
  return z.object({
    value: value.nullable().catch(null),
    confidence,
    status,
    evidence: z.array(z.string().max(400)).max(6).catch([]),
  });
}

const num = z.coerce.number().finite();
const pct = z.coerce.number().min(0).max(100);

/** Per-photo extraction — one of these per uploaded image. */
export const PhotoExtractionSchema = z.object({
  scene: z.enum(["exterior", "interior", "outdoor_lot", "document", "other"]).catch("other"),
  signboardTextEn: z.string().max(300).catch(""),
  signboardTextAr: z.string().max(300).catch(""),
  showroomNameEn: z.string().max(160).nullable().catch(null),
  showroomNameAr: z.string().max(160).nullable().catch(null),
  logos: z.array(z.string().max(80)).max(12).catch([]),
  ocrText: z.array(z.string().max(300)).max(24).catch([]),
  vehicles: z
    .array(
      z.object({
        brand: z.string().max(40).catch(""),
        model: z.string().max(60).catch(""),
        colour: z.string().max(30).catch(""),
        bodyType: z.string().max(30).catch(""),
        placement: z.enum(["inside", "outside", "unknown"]).catch("unknown"),
        modelYear: num.nullable().catch(null),
        yearBasis: z.enum(["visible_label", "estimated", "unknown"]).catch("unknown"),
        descriptor: z.string().max(160).catch(""),
      }),
    )
    .max(60)
    .catch([]),
  prices: z
    .array(
      z.object({
        amountSar: num.nullable().catch(null),
        currencyVisible: z.boolean().catch(false),
        context: z.string().max(160).catch(""),
      }),
    )
    .max(30)
    .catch([]),
  financeEvidence: z
    .array(
      z.object({
        kind: z.enum(["promotion", "installment_text", "bank_logo", "other"]).catch("other"),
        provider: z.string().max(80).catch(""),
        text: z.string().max(200).catch(""),
      }),
    )
    .max(12)
    .catch([]),
  salesDesks: num.nullable().catch(null),
  staffLikePeople: num.nullable().catch(null),
  sizeHints: z.array(z.string().max(200)).max(6).catch([]),
  notes: z.string().max(600).catch(""),
});

export type PhotoExtraction = z.infer<typeof PhotoExtractionSchema>;

/** Showroom-level aggregation across the whole evidence set. */
export const AiSurveyResultSchema = z.object({
  identity: z.object({
    nameEn: proposal(z.string().max(160)),
    nameAr: proposal(z.string().max(160)),
    transliterationSuggestion: z.string().max(160).nullable().catch(null),
  }),
  inventory: z.object({
    observedUniqueVehicles: proposal(num),
    likelyDuplicates: num.nullable().catch(null),
    uncertainVehicles: num.nullable().catch(null),
    estimatedVisibleInventory: proposal(num),
    inside: proposal(num),
    outside: proposal(num),
    fullInventoryConfirmed: z.boolean().catch(false),
  }),
  pricing: z.object({
    averageSellingPriceSar: proposal(num),
    priceRangeSar: z
      .object({ min: num.nullable().catch(null), max: num.nullable().catch(null) })
      .nullable()
      .catch(null),
    observedPriceCount: num.catch(0),
  }),
  ageMix: z.object({
    over5Percent: proposal(pct),
    under5Percent: proposal(pct),
  }),
  marketProfile: z.object({
    vehicleType: proposal(z.enum(["new_only", "used_only", "mix"])),
    categories: z.array(z.string().max(40)).max(10).catch([]),
    brands: proposal(z.array(z.string().max(40)).max(20)),
  }),
  finance: z.object({
    available: proposal(z.enum(["yes", "no", "unknown"])),
    providers: proposal(z.array(z.string().max(60)).max(12)),
    fpr: proposal(num),
    apr: proposal(num),
  }),
  showroom: z.object({
    sizeSqm: proposal(num),
    sizeBasis: proposal(z.enum(["measured", "verified", "dealer_stated", "estimated", "unknown"])),
  }),
  staff: z.object({
    salesmenCount: proposal(num),
    countBasis: z.enum(["observed_minimum", "estimated", "confirmed", "unknown"]).catch("unknown"),
  }),
  summary: z.string().max(1200).catch(""),
  missingInformation: z.array(z.string().max(120)).max(20).catch([]),
});

export type AiSurveyResult = z.infer<typeof AiSurveyResultSchema>;

/** Optional web-research supplement for fields the photos could not settle. */
export const ResearchResultSchema = z.object({
  findings: z
    .array(
      z.object({
        fieldKey: z.string().max(60),
        value: z.string().max(400),
        sourceUrl: z.string().max(500).nullable().catch(null),
        sourceType: z.string().max(60).catch("web"),
        confidence,
        note: z.string().max(300).catch(""),
      }),
    )
    .max(20)
    .catch([]),
});

export type ResearchResult = z.infer<typeof ResearchResultSchema>;
