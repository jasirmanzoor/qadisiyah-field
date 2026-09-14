import { callStructured, type AiConfig } from "@/lib/ai/provider";
import { AGGREGATE_SYSTEM, aggregatePrompt } from "@/lib/ai/prompts";
import { AiSurveyResultSchema } from "@/lib/ai/schemas";
import {
  resultToProposals,
  type PipelineContext,
  type PipelineOutput,
} from "@/lib/ai/survey-agent";

type StageFn = (stage: "queued" | "analyzing_photos" | "extracting_text" | "detecting_vehicles" | "aggregating_evidence" | "researching" | "generating_results" | "completed" | "partial" | "failed") => Promise<void> | void;

/**
 * Field path used in production. One multimodal call for the whole photo set.
 * The per-photo loop in survey-agent exceeds the Vercel Hobby duration budget.
 */
export async function runSurveyPipeline(
  cfg: AiConfig,
  images: string[],
  ctx: PipelineContext,
  onStage: StageFn,
): Promise<PipelineOutput> {
  const batch = images.slice(0, 8);
  await onStage("analyzing_photos");
  await onStage("extracting_text");
  await onStage("detecting_vehicles");
  const aggregated = await callStructured(cfg, AiSurveyResultSchema, {
    system: AGGREGATE_SYSTEM,
    prompt: aggregatePrompt({
      extractionsJson:
        `No pre-extractions. Analyse all ${batch.length} attached photographs as one evidence package. ` +
        "Deduplicate the same vehicle seen from several angles. Read Arabic and English signage, price tags and finance boards.",
      known: { nameEn: ctx.nameEn, nameAr: ctx.nameAr, note: ctx.note },
      photoCount: batch.length,
    }),
    images: batch,
    maxTokens: 4000,
  });

  if (!aggregated.ok) {
    return { result: null, extractions: [], proposals: [], partial: false, error: aggregated.error };
  }

  await onStage("generating_results");
  const proposals = resultToProposals(aggregated.data);
  return {
    result: aggregated.data,
    extractions: [],
    proposals,
    partial: images.length > batch.length,
    error: images.length > batch.length ? `Analysed the first ${batch.length} of ${images.length} photos.` : null,
  };
}
