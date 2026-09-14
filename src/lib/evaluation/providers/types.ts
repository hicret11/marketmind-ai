import type { JsonSchema } from "@/lib/opportunity/ai/types";
import type {
  BenchmarkModelId,
  BenchmarkProviderName,
  ModelStatus,
} from "@/types/evaluation";

export type { JsonSchema };

/**
 * Generic AI model provider interface for the Evaluation Lab.
 *
 * Deliberately separate from lib/opportunity/ai's AiProvider: benchmarking
 * needs latency + token usage + the provider's actually-reported model id on
 * every call, which that interface (built for Opportunity Intelligence) does
 * not expose. Gemini/Claude here still call the SAME SDKs, the SAME env vars
 * (GEMINI_API_KEY / ANTHROPIC_API_KEY) and the SAME general approach
 * (schema-constrained JSON, validated in code) as lib/opportunity/ai — nothing
 * in lib/opportunity/ai is modified or duplicated as "a second client config".
 */

export interface TokenUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

export interface BenchmarkGenerationParams<T> {
  system: string;
  userPayload: unknown;
  schemaName: string;
  schemaDescription: string;
  schema: JsonSchema;
  maxOutputTokens?: number;
  /** Optional type param only for call-site inference. */
  _resultType?: T;
}

export interface BenchmarkTextParams {
  system: string;
  userPayload: unknown;
  maxOutputTokens?: number;
}

export interface BenchmarkGenerationResult<T> {
  data: T;
  requestedModelId: string;
  /** The model id the provider reports back, when it does (null if not exposed). */
  actualModelId: string | null;
  usage: TokenUsage;
  latencyMs: number;
  rawText: string;
}

export interface BenchmarkTextResult {
  text: string;
  requestedModelId: string;
  actualModelId: string | null;
  usage: TokenUsage;
  latencyMs: number;
}

export interface BenchmarkModelProvider {
  readonly id: BenchmarkModelId;
  readonly providerName: BenchmarkProviderName;
  readonly displayName: string;
  readonly requestedModelId: string;
  readonly freeTierNote: string | null;
  isConfigured(): boolean;
  /** Best-effort status without making a network call (used by the registry page). */
  status(): ModelStatus;
  /**
   * Structured (schema-validated JSON) generation — used by the classification
   * benchmarks (Lead Qualification, Website Analysis). Implementations MUST
   * throw EvalError on failure; callers never receive a fabricated result.
   */
  generateStructured<T>(params: BenchmarkGenerationParams<T>): Promise<BenchmarkGenerationResult<T>>;
  /** Free-form text generation — used by the human-eval benchmarks (Lyrics, Content). */
  generateText(params: BenchmarkTextParams): Promise<BenchmarkTextResult>;
}
