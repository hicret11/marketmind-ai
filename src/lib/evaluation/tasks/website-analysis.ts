import { isEvalError } from "@/lib/evaluation/errors";
import { estimateCost } from "@/lib/evaluation/model-pricing";
import { categorizeSilentFailure } from "@/lib/evaluation/metrics/silent-failure";
import {
  WEBSITE_ANALYSIS_SYSTEM_PROMPT,
  buildWebsiteAnalysisPayload,
  websiteAnalysisSchema,
} from "@/lib/evaluation/prompts/website-analysis";
import type { BenchmarkModelProvider } from "@/lib/evaluation/providers/types";
import type {
  BenchmarkCase,
  WebsiteAnalysisGroundTruth,
  WebsiteAnalysisInput,
  WebsiteAnalysisModelOutput,
} from "@/types/evaluation";
import type { ClassificationCaseOutcome } from "./types";

const CONFIDENCE_LEVELS = ["high", "medium", "low"];

function validateOutput(value: unknown): WebsiteAnalysisModelOutput | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.answer !== "boolean") return null;
  if (typeof v.confidence !== "string" || !CONFIDENCE_LEVELS.includes(v.confidence)) return null;
  if (typeof v.reason !== "string") return null;
  if (typeof v.uncertainty !== "string") return null;
  return {
    answer: v.answer,
    confidence: v.confidence as "high" | "medium" | "low",
    reason: v.reason,
    uncertainty: v.uncertainty,
  };
}

/** Runs ONE (case, model) execution for the Website Analysis benchmark — same shape as Lead Qualification. */
export async function runWebsiteAnalysisCase(
  provider: BenchmarkModelProvider,
  kase: BenchmarkCase,
): Promise<ClassificationCaseOutcome> {
  const input = kase.input as WebsiteAnalysisInput;
  // Only Human Verified cases count as ground truth — see lead-qualification.ts for rationale.
  const groundTruth =
    kase.reviewStatus === "human_verified"
      ? (kase.groundTruth as WebsiteAnalysisGroundTruth)
      : null;
  const requestedModelId = provider.requestedModelId;
  const startedAt = Date.now();

  try {
    const result = await provider.generateStructured<unknown>({
      system: WEBSITE_ANALYSIS_SYSTEM_PROMPT,
      userPayload: buildWebsiteAnalysisPayload(input),
      schemaName: "website_analysis_result",
      schemaDescription: "Yes/no answer about a business's website content.",
      schema: websiteAnalysisSchema(),
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
        errorMessage: "Model output did not match the required website-analysis schema.",
      };
    }

    const predictedPositive = validated.answer;
    const actualPositive = groundTruth ? groundTruth.answer : null;
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
