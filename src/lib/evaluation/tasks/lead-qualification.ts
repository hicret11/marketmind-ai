import { isEvalError } from "@/lib/evaluation/errors";
import { detectLeadQualificationEvidenceMismatch } from "@/lib/evaluation/evidence-audit";
import { estimateCost } from "@/lib/evaluation/model-pricing";
import { categorizeSilentFailure } from "@/lib/evaluation/metrics/silent-failure";
import {
  LEAD_QUALIFICATION_SYSTEM_PROMPT,
  buildLeadQualificationPayload,
  leadQualificationSchema,
} from "@/lib/evaluation/prompts/lead-qualification";
import type { BenchmarkModelProvider } from "@/lib/evaluation/providers/types";
import type {
  BenchmarkCase,
  LeadQualificationGroundTruth,
  LeadQualificationInput,
  LeadQualificationModelOutput,
  QualificationTier,
} from "@/types/evaluation";
import type { ClassificationCaseOutcome } from "./types";

const QUALIFICATION_TIERS: QualificationTier[] = ["strong", "potential", "weak", "not_relevant"];
const CONFIDENCE_LEVELS = ["high", "medium", "low"];

/** Validates the model's raw JSON against the exact shape the task requires — never trusted blindly. */
function validateOutput(value: unknown): LeadQualificationModelOutput | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.qualified !== "boolean") return null;
  if (typeof v.qualification !== "string" || !QUALIFICATION_TIERS.includes(v.qualification as QualificationTier)) {
    return null;
  }
  if (typeof v.confidence !== "string" || !CONFIDENCE_LEVELS.includes(v.confidence)) return null;
  if (typeof v.reason !== "string") return null;
  if (typeof v.uncertainty !== "string") return null;
  return {
    qualified: v.qualified,
    qualification: v.qualification as QualificationTier,
    confidence: v.confidence as "high" | "medium" | "low",
    reason: v.reason,
    uncertainty: v.uncertainty,
  };
}

/**
 * Runs ONE (case, model) execution for the Lead Qualification benchmark.
 * Every model receives the exact same evidence payload built by
 * buildLeadQualificationPayload — no per-model variation.
 */
export async function runLeadQualificationCase(
  provider: BenchmarkModelProvider,
  kase: BenchmarkCase,
): Promise<ClassificationCaseOutcome> {
  const input = kase.input as LeadQualificationInput;
  // Only Human Verified cases count as ground truth — "Needs Review" cases
  // run through the model (useful for spotting disagreement) but never feed metrics.
  const groundTruth =
    kase.reviewStatus === "human_verified"
      ? (kase.groundTruth as LeadQualificationGroundTruth)
      : null;
  const requestedModelId = provider.requestedModelId;

  // Data-quality gate: never spend a model call on evidence with a suspected
  // domain/business mismatch until a human has reviewed and acknowledged it
  // (see lib/evaluation/evidence-audit.ts for how "suspected" is determined).
  const mismatch = detectLeadQualificationEvidenceMismatch(input);
  if (mismatch.suspected && !kase.evidenceMismatchAcknowledged) {
    const domains = mismatch.mismatchedEvidence.map((e) => e.domain).filter(Boolean);
    return {
      status: "excluded",
      requestedModelId,
      actualModelId: null,
      modelMismatch: false,
      latencyMs: 0,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      rawOutputSnippet: null,
      output: null,
      estimatedCost: null,
      predictedPositive: null,
      actualPositive: null,
      correct: null,
      silentFailureCategory: null,
      errorMessage: `Excluded: evidence appears to come from ${domains.join(", ") || "an unrelated domain"}, not ${mismatch.businessDomain} (this business's recorded website). Review and acknowledge in the Dataset Manager before including this case in a benchmark run.`,
    };
  }

  const startedAt = Date.now();

  try {
    const result = await provider.generateStructured<unknown>({
      system: LEAD_QUALIFICATION_SYSTEM_PROMPT,
      userPayload: buildLeadQualificationPayload(input),
      schemaName: "lead_qualification_result",
      schemaDescription: "Qualification verdict for a single business.",
      schema: leadQualificationSchema(),
    });
    const latencyMs = Date.now() - startedAt;
    const validated = validateOutput(result.data);

    if (!validated) {
      return {
        status: "invalid_output",
        requestedModelId,
        actualModelId: result.actualModelId,
        modelMismatch: result.actualModelId !== null && result.actualModelId !== requestedModelId,
        latencyMs,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
        rawOutputSnippet: result.rawText.slice(0, 2000),
        output: result.data,
        estimatedCost: estimateCost(provider.id, result.usage.inputTokens, result.usage.outputTokens),
        predictedPositive: null,
        actualPositive: null,
        correct: null,
        silentFailureCategory: null,
        errorMessage: "Model output did not match the required lead-qualification schema.",
      };
    }

    const predictedPositive = validated.qualified;
    const actualPositive = groundTruth ? groundTruth.qualified : null;
    const correct = actualPositive === null ? null : predictedPositive === actualPositive;
    const silentFailureCategory =
      actualPositive === null
        ? null
        : categorizeSilentFailure({
            predicted: predictedPositive,
            actual: actualPositive,
            confidence: validated.confidence,
            uncertainty: validated.uncertainty,
          });

    return {
      status: "ok",
      requestedModelId,
      actualModelId: result.actualModelId,
      modelMismatch: result.actualModelId !== null && result.actualModelId !== requestedModelId,
      latencyMs,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
      rawOutputSnippet: result.rawText.slice(0, 2000),
      output: validated,
      estimatedCost: estimateCost(provider.id, result.usage.inputTokens, result.usage.outputTokens),
      predictedPositive,
      actualPositive,
      correct,
      silentFailureCategory,
      errorMessage: null,
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const status = isEvalError(error) && error.code === "TIMEOUT" ? "timeout" : "error";
    const message = error instanceof Error ? error.message : "Unknown provider error";
    return {
      status,
      requestedModelId,
      actualModelId: null,
      modelMismatch: false,
      latencyMs,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      rawOutputSnippet: null,
      output: null,
      estimatedCost: null,
      predictedPositive: null,
      actualPositive: null,
      correct: null,
      silentFailureCategory: null,
      errorMessage: message,
    };
  }
}
