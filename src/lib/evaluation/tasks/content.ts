import { isEvalError } from "@/lib/evaluation/errors";
import { estimateCost } from "@/lib/evaluation/model-pricing";
import { CONTENT_SYSTEM_PROMPT, buildContentPayload } from "@/lib/evaluation/prompts/content";
import type { BenchmarkModelProvider } from "@/lib/evaluation/providers/types";
import type { BenchmarkCase, ContentInput } from "@/types/evaluation";
import type { TextGenerationOutcome } from "./types";

/**
 * Runs ONE (case, model) execution for the Content Generation benchmark.
 * Same human-eval shape as Lyrics — no ground truth, scoring via HumanReview.
 */
export async function runContentCase(
  provider: BenchmarkModelProvider,
  kase: BenchmarkCase,
): Promise<TextGenerationOutcome> {
  const input = kase.input as ContentInput;
  const requestedModelId = provider.requestedModelId;
  const startedAt = Date.now();

  try {
    const result = await provider.generateText({
      system: CONTENT_SYSTEM_PROMPT,
      userPayload: buildContentPayload(input),
    });
    const latencyMs = Date.now() - startedAt;
    return {
      status: "ok",
      requestedModelId,
      actualModelId: result.actualModelId,
      modelMismatch: result.actualModelId !== null && result.actualModelId !== requestedModelId,
      latencyMs,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
      estimatedCost: estimateCost(provider.id, result.usage.inputTokens, result.usage.outputTokens),
      output: result.text,
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
      estimatedCost: null,
      output: null,
      errorMessage: message,
    };
  }
}
