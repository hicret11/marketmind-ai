import type { ModelCaseStatus } from "@/types/evaluation";
import type { SilentFailureCategory } from "../metrics/silent-failure";

/** What one (case, model) execution produces, before the runner stamps id/runId/createdAt. */
export interface ClassificationCaseOutcome {
  status: ModelCaseStatus;
  requestedModelId: string;
  actualModelId: string | null;
  modelMismatch: boolean;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  rawOutputSnippet: string | null;
  output: unknown;
  estimatedCost: number | null;
  predictedPositive: boolean | null;
  actualPositive: boolean | null;
  correct: boolean | null;
  silentFailureCategory: SilentFailureCategory | null;
  errorMessage: string | null;
}

/** What one (case, model) text-generation execution produces (Lyrics / Content). */
export interface TextGenerationOutcome {
  status: ModelCaseStatus;
  requestedModelId: string;
  actualModelId: string | null;
  modelMismatch: boolean;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCost: number | null;
  output: string | null;
  errorMessage: string | null;
}
