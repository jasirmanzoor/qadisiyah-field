import { AI_FIELDS, normalizeAgeMix } from "../../../scripts/ai-survey-rules.mjs";
import { callStructured, liveSearch, parseJsonBlock, type AiConfig } from "@/lib/ai/provider";
import {
  AiSurveyResultSchema,
  PhotoExtractionSchema,
  ResearchResultSchema,
  type AiSurveyResult,
  type PhotoExtraction,
} from "@/lib/ai/schemas";
import { AGGREGATE_SYSTEM, aggregatePrompt, PHOTO_SYSTEM, photoPrompt, RESEARCH_SYSTEM, researchPrompt } from "@/lib/ai/prompts";
import type {
  AiConfidence,
  AiEvidenceRow,
  AiEvidenceSource,
  AiProposal,
  AiProposalStatus,
  AiProposalValue,
  AiRunStage,
} from "@/lib/types";
import { uid } from "@/lib/utils";

const LABELS = new Map(AI_FIELDS.map((f) => [f.key, f.label]));

export type PipelineContext = {
  nameEn: string;
  nameAr: string;
  lat: number | null;
  lng: number | null;
  note: string;
  allowResearch: boolean;
};

export type PipelineOutput = {
  result: AiSurveyResult | null;
  extractions: PhotoExtraction[];
  proposals: Omit<AiProposal, "runId" | "dealershipId" | "existingValue">[];
  partial: boolean;
  error: string | null;
};

type StageFn = (stage: AiRunStage) => Promise<void> | void;

/** Per-photo extraction. A photo that fails is skipped, not fatal. */
async function extractPhotos(
  cfg: AiConfig,
  images: string[],
  onStage: StageFn,
): Promise<{ extractions: PhotoExtraction[]; failures: number }> {
  await onStage("analyzing_photos");
  const extractions: PhotoExtraction[] = [];
  let failures = 0;
  for (let i = 0; i < images.length; i += 1) {
    if (i === 1) await onStage("extracting_text");
    if (i === Math.floor(images.length / 2)) await onStage("detecting_vehicles");
    const res = await callStructured(cfg, PhotoExtractionSchema, {
      system: PHOTO_SYSTEM,
      prompt: photoPrompt(i, images.length),
      images: [images[i]],
      maxTokens: 2500,
    });
    if (res.ok) extractions.push(res.data);
    else failures += 1;
  }
  return { extractions, failures };
}

/** Trim extractions before the aggregation call so the prompt stays bounded. */
function compactExtractions(extractions: PhotoExtraction[]): string {
  return JSON.stringify(
    extractions.map((e, i) => ({
      photo: i + 1,
      scene: e.scene,
      signboardTextEn: e.signboardTextEn,
      signboardTextAr: e.signboardTextAr,
      showroomNameEn: e.showroomNameEn,
      showroomNameAr: e.showroomNameAr,
      logos: e.logos.slice(0, 8),
      ocrText: e.ocrText.slice(0, 12),
      vehicles: e.vehicles.slice(0, 40),
      prices: e.prices.slice(0, 20),
      financeEvidence: e.financeEvidence.slice(0, 8),
      salesDesks: e.salesDesks,
      staffLikePeople: e.staffLikePeople,
      sizeHints: e.sizeHints.slice(0, 4),
      notes: e.notes.slice(0, 300),
    })),
  ).slice(0, 60_000);
}

type Proposal = PipelineOutput["proposals"][number];

function evidenceRows(
  fieldKey: string,
  proposalId: string,
  texts: string[],
  sourceType: AiEvidenceSource,
  confidence: AiConfidence,
  sourceUrl: string | null = null,
): AiEvidenceRow[] {
  return texts.slice(0, 6).map((text) => ({
    id: uid(),
    runId: "",
    proposalId,
    fieldKey,
    sourceType,
    photoIndex: null,
    sourceUrl,
    text: text.slice(0, 400),
    confidence,
  }));
}

function makeProposal(input: {
  fieldKey: string;
  value: AiProposalValue;
  confidence: AiConfidence;
  status: AiProposalStatus;
  evidence: string[];
  sourceTypes?: AiEvidenceSource[];
  reasoning?: string;
  sourceUrl?: string | null;
}): Proposal | null {
  const { fieldKey, value } = input;
  if (value == null) return null;
  if (typeof value === "string" && !value.trim()) return null;
  if (Array.isArray(value) && value.length === 0) return null;
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  const id = uid();
  const sourceTypes = input.sourceTypes ?? ["photo", "ocr"];
  return {
    id,
    fieldKey,
    label: LABELS.get(fieldKey) ?? fieldKey,
    value,
    confidence: input.confidence,
    status: input.status,
    sourceTypes,
    reasoning: (input.reasoning ?? input.evidence[0] ?? "").slice(0, 400),
    needsVerification: input.status !== "observed" || input.confidence !== "high",
    decision: null,
    evidence: evidenceRows(
      fieldKey,
      id,
      input.evidence,
      sourceTypes.includes("web") ? "web" : "photo",
      input.confidence,
      input.sourceUrl ?? null,
    ),
  };
}

/** Map the validated showroom-level result onto the app's existing fields. */
export function resultToProposals(result: AiSurveyResult): Proposal[] {
  const out: (Proposal | null)[] = [];
  const { identity, inventory, pricing, ageMix, marketProfile, finance, showroom, staff } = result;

  out.push(
    makeProposal({
      fieldKey: "name_en",
      value: identity.nameEn.value,
      confidence: identity.nameEn.confidence,
      status: identity.nameEn.status,
      evidence: identity.nameEn.evidence,
    }),
  );
  out.push(
    makeProposal({
      fieldKey: "name_ar",
      value: identity.nameAr.value,
      confidence: identity.nameAr.confidence,
      status: identity.nameAr.status,
      evidence: identity.nameAr.evidence,
    }),
  );

  const visible = inventory.estimatedVisibleInventory;
  out.push(
    makeProposal({
      fieldKey: "inventory_units",
      value: visible.value,
      confidence: visible.confidence,
      status: inventory.fullInventoryConfirmed ? visible.status : "estimated",
      evidence: visible.evidence,
      reasoning: [
        visible.evidence[0],
        inventory.observedUniqueVehicles.value != null
          ? `${inventory.observedUniqueVehicles.value} unique vehicles observed; ${inventory.likelyDuplicates ?? 0} duplicate observations consolidated.`
          : "",
        inventory.fullInventoryConfirmed ? "" : "Visible inventory only — full stock not confirmed.",
      ]
        .filter(Boolean)
        .join(" "),
    }),
  );
  out.push(
    makeProposal({
      fieldKey: "inventory_inside",
      value: inventory.inside.value,
      confidence: inventory.inside.confidence,
      status: inventory.inside.status,
      evidence: inventory.inside.evidence,
    }),
  );
  out.push(
    makeProposal({
      fieldKey: "inventory_outside",
      value: inventory.outside.value,
      confidence: inventory.outside.confidence,
      status: inventory.outside.status,
      evidence: inventory.outside.evidence,
    }),
  );

  // ASP is only proposed when real prices were read.
  if (pricing.observedPriceCount >= 2 && pricing.averageSellingPriceSar.value != null) {
    out.push(
      makeProposal({
        fieldKey: "avg_selling_price_sar",
        value: Math.round(pricing.averageSellingPriceSar.value),
        confidence: pricing.averageSellingPriceSar.confidence,
        status: pricing.averageSellingPriceSar.status,
        evidence: pricing.averageSellingPriceSar.evidence,
        reasoning: `Average of ${pricing.observedPriceCount} observed price tags.`,
      }),
    );
  }

  const mix = normalizeAgeMix(ageMix.over5Percent.value, ageMix.under5Percent.value);
  if (mix) {
    out.push(
      makeProposal({
        fieldKey: "inventory_age_pct_over5",
        value: mix.over5,
        confidence: ageMix.over5Percent.confidence,
        status: ageMix.over5Percent.status === "observed" ? "observed" : "estimated",
        evidence: ageMix.over5Percent.evidence,
        reasoning: `${mix.under5}% under 5 years, ${mix.over5}% 5 years or older.`,
      }),
    );
  }

  out.push(
    makeProposal({
      fieldKey: "main_brands",
      value: marketProfile.brands.value,
      confidence: marketProfile.brands.confidence,
      status: marketProfile.brands.status,
      evidence: marketProfile.brands.evidence,
    }),
  );
  out.push(
    makeProposal({
      fieldKey: "vehicle_type",
      value: marketProfile.vehicleType.value,
      confidence: marketProfile.vehicleType.confidence,
      status: marketProfile.vehicleType.status,
      evidence: marketProfile.vehicleType.evidence,
    }),
  );

  if (finance.available.value === "yes" || finance.available.value === "no") {
    out.push(
      makeProposal({
        fieldKey: "finance_available",
        value: finance.available.value,
        confidence: finance.available.confidence,
        status: finance.available.status,
        evidence: finance.available.evidence,
      }),
    );
  }
  out.push(
    makeProposal({
      fieldKey: "banks_partnered",
      value: finance.providers.value,
      confidence: finance.providers.confidence,
      status: finance.providers.status,
      evidence: finance.providers.evidence,
    }),
  );
  // Rates are only ever carried through when explicitly evidenced.
  if (finance.fpr.value != null && finance.fpr.status === "observed" && finance.fpr.evidence.length) {
    const raw = finance.fpr.value;
    const rate = raw > 1 ? raw / 100 : raw;
    if (rate >= 0 && rate <= 1) {
      out.push(
        makeProposal({
          fieldKey: "fpr",
          value: Number(rate.toFixed(2)),
          confidence: finance.fpr.confidence,
          status: "needs_review",
          evidence: finance.fpr.evidence,
        }),
      );
    }
  }

  out.push(
    makeProposal({
      fieldKey: "showroom_size_sqm",
      value: showroom.sizeSqm.value != null ? Math.round(showroom.sizeSqm.value) : null,
      confidence: showroom.sizeSqm.confidence,
      status: showroom.sizeSqm.status === "observed" ? "estimated" : showroom.sizeSqm.status,
      evidence: showroom.sizeSqm.evidence,
      reasoning: showroom.sizeSqm.evidence[0] ?? "Visual estimate from photo evidence.",
    }),
  );
  const basis = showroom.sizeBasis.value;
  if (basis === "measured" || basis === "estimated" || basis === "dealer_stated") {
    out.push(
      makeProposal({
        fieldKey: "size_basis",
        value: basis,
        confidence: showroom.sizeBasis.confidence,
        status: showroom.sizeBasis.status,
        evidence: showroom.sizeBasis.evidence,
      }),
    );
  }

  if (staff.salesmenCount.value != null) {
    const confirmed = staff.countBasis === "confirmed";
    out.push(
      makeProposal({
        fieldKey: "salesmen_count",
        value: Math.round(staff.salesmenCount.value),
        confidence: confirmed ? staff.salesmenCount.confidence : "low",
        status: confirmed ? "observed" : "needs_review",
        evidence: staff.salesmenCount.evidence,
        reasoning: confirmed
          ? staff.salesmenCount.evidence[0] ?? ""
          : `Observed minimum only — total headcount not established (${staff.countBasis}).`,
      }),
    );
  }

  return out.filter((p): p is Proposal => p != null);
}

const RESEARCHABLE = new Set([
  "name_en",
  "name_ar",
  "avg_selling_price_sar",
  "finance_available",
  "banks_partnered",
  "showroom_size_sqm",
  "main_brands",
  "vehicle_type",
]);

/** Web research runs only for fields the photos left unsettled. */
async function researchGaps(
  cfg: AiConfig,
  ctx: PipelineContext,
  have: Set<string>,
  onStage: StageFn,
): Promise<Proposal[]> {
  const missing = [...RESEARCHABLE].filter((k) => !have.has(k));
  if (!missing.length || !cfg.canWebSearch) return [];
  if (!ctx.nameEn && !ctx.nameAr) return [];
  await onStage("researching");

  const res = await liveSearch(
    cfg.apiKey,
    `${RESEARCH_SYSTEM}\n\n${researchPrompt({
      nameEn: ctx.nameEn,
      nameAr: ctx.nameAr,
      lat: ctx.lat,
      lng: ctx.lng,
      missingFields: missing,
    })}`,
  );
  if ("error" in res) return [];
  const parsed = ResearchResultSchema.safeParse(parseJsonBlock(res.text));
  if (!parsed.success) return [];

  const out: (Proposal | null)[] = [];
  for (const f of parsed.data.findings) {
    if (!RESEARCHABLE.has(f.fieldKey) || have.has(f.fieldKey)) continue;
    if (!f.sourceUrl) continue;
    let value: AiProposalValue = f.value;
    if (f.fieldKey === "avg_selling_price_sar" || f.fieldKey === "showroom_size_sqm") {
      const n = Number(String(f.value).replace(/[^\d.]/g, ""));
      if (!Number.isFinite(n) || n <= 0) continue;
      value = Math.round(n);
    }
    if (f.fieldKey === "main_brands" || f.fieldKey === "banks_partnered") {
      value = String(f.value)
        .split(/[,،]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12);
    }
    if (f.fieldKey === "finance_available") {
      const v = String(f.value).toLowerCase();
      if (v.includes("yes") || v.includes("available")) value = "yes";
      else if (v.includes("no")) value = "no";
      else continue;
    }
    if (f.fieldKey === "vehicle_type") {
      const v = String(f.value).toLowerCase();
      value = v.includes("new") && v.includes("used") ? "mix" : v.includes("new") ? "new_only" : "used_only";
    }
    out.push(
      makeProposal({
        fieldKey: f.fieldKey,
        value,
        confidence: f.confidence === "high" ? "medium" : f.confidence,
        status: "needs_review",
        evidence: [`${f.note || f.value} (${f.sourceType})`, f.sourceUrl],
        sourceTypes: ["web"],
        sourceUrl: f.sourceUrl,
        reasoning: `Public source: ${f.sourceUrl}`,
      }),
    );
  }
  return out.filter((p): p is Proposal => p != null);
}

/**
 * Full on-demand pipeline for ONE showroom survey session:
 * photo extraction → cross-photo aggregation → optional research → proposals.
 */
export async function runSurveyPipeline(
  cfg: AiConfig,
  images: string[],
  ctx: PipelineContext,
  onStage: StageFn,
): Promise<PipelineOutput> {
  const { extractions, failures } = await extractPhotos(cfg, images, onStage);
  if (!extractions.length) {
    return {
      result: null,
      extractions: [],
      proposals: [],
      partial: false,
      error: "No photograph could be analysed. Check the images and try again.",
    };
  }

  await onStage("aggregating_evidence");
  const aggregated = await callStructured(cfg, AiSurveyResultSchema, {
    system: AGGREGATE_SYSTEM,
    prompt: aggregatePrompt({
      extractionsJson: compactExtractions(extractions),
      known: { nameEn: ctx.nameEn, nameAr: ctx.nameAr, note: ctx.note },
      photoCount: extractions.length,
    }),
    maxTokens: 4000,
  });

  if (!aggregated.ok) {
    // Partial success: the per-photo evidence is still worth keeping.
    return { result: null, extractions, proposals: [], partial: true, error: aggregated.error };
  }

  await onStage("generating_results");
  const proposals = resultToProposals(aggregated.data);
  const have = new Set(proposals.map((p) => p.fieldKey));
  const researched = ctx.allowResearch ? await researchGaps(cfg, { ...ctx }, have, onStage) : [];

  return {
    result: aggregated.data,
    extractions,
    proposals: [...proposals, ...researched],
    partial: failures > 0,
    error: failures > 0 ? `${failures} of ${images.length} photos could not be analysed.` : null,
  };
}
