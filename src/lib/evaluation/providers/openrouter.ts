import { openRouterApiKey, openRouterNemotronModel } from "../config";
import { EvalError } from "../errors";
import { generateStructuredOpenAiCompatible, generateTextOpenAiCompatible } from "./openai-compatible";
import type {
  BenchmarkGenerationParams,
  BenchmarkGenerationResult,
  BenchmarkModelProvider,
  BenchmarkTextParams,
  BenchmarkTextResult,
} from "./types";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/**
 * Nemotron via OpenRouter, pinned to a SPECIFIC named model id
 * (OPENROUTER_NEMOTRON_MODEL) — deliberately never "openrouter/free" or any
 * other router alias, because a free-model router can silently swap which
 * underlying model answers a request, which breaks benchmark reproducibility.
 * `actualModelId` from the response is stored on every result and flagged if
 * it ever differs from what was requested.
 */
export class OpenRouterNemotronProvider implements BenchmarkModelProvider {
  readonly id = "nemotron" as const;
  readonly providerName = "OpenRouter" as const;
  readonly displayName = "Nemotron";
  readonly freeTierNote =
    "Depends on the selected OpenRouter model — some are free, some are paid. Rate limits apply and may change.";

  get requestedModelId(): string {
    return openRouterNemotronModel();
  }

  isConfigured(): boolean {
    return Boolean(openRouterApiKey());
  }

  status() {
    return this.isConfigured() ? ("ready" as const) : ("not_configured" as const);
  }

  private cfg() {
    const apiKey = openRouterApiKey();
    if (!apiKey) throw new EvalError("MODEL_NOT_CONFIGURED", "OPENROUTER_API_KEY is not set.");
    return {
      baseUrl: OPENROUTER_BASE_URL,
      apiKey,
      model: this.requestedModelId,
      extraHeaders: {
        "HTTP-Referer": "https://marketmind.ai",
        "X-Title": "MarketMind AI Evaluation Lab",
      },
    };
  }

  generateStructured<T>(params: BenchmarkGenerationParams<T>): Promise<BenchmarkGenerationResult<T>> {
    return generateStructuredOpenAiCompatible(this.cfg(), params);
  }

  generateText(params: BenchmarkTextParams): Promise<BenchmarkTextResult> {
    return generateTextOpenAiCompatible(this.cfg(), params);
  }
}
