import { openAiApiKey, openAiBenchmarkModel } from "../config";
import { EvalError } from "../errors";
import { generateStructuredOpenAiCompatible, generateTextOpenAiCompatible } from "./openai-compatible";
import type {
  BenchmarkGenerationParams,
  BenchmarkGenerationResult,
  BenchmarkModelProvider,
  BenchmarkTextParams,
  BenchmarkTextResult,
} from "./types";

const OPENAI_BASE_URL = "https://api.openai.com/v1";

/**
 * GPT via OpenAI's own API. Not required — MarketMind functions completely
 * without it. Never called unless the user explicitly selects GPT for a run.
 */
export class OpenAiBenchmarkProvider implements BenchmarkModelProvider {
  readonly id = "gpt" as const;
  readonly providerName = "OpenAI" as const;
  readonly displayName = "GPT";
  readonly freeTierNote = null; // paid API usage

  get requestedModelId(): string {
    return openAiBenchmarkModel();
  }

  isConfigured(): boolean {
    return Boolean(openAiApiKey());
  }

  status() {
    return this.isConfigured() ? ("ready" as const) : ("not_configured" as const);
  }

  private cfg() {
    const apiKey = openAiApiKey();
    if (!apiKey) throw new EvalError("MODEL_NOT_CONFIGURED", "OPENAI_API_KEY is not set.");
    return { baseUrl: OPENAI_BASE_URL, apiKey, model: this.requestedModelId };
  }

  generateStructured<T>(params: BenchmarkGenerationParams<T>): Promise<BenchmarkGenerationResult<T>> {
    return generateStructuredOpenAiCompatible(this.cfg(), params);
  }

  generateText(params: BenchmarkTextParams): Promise<BenchmarkTextResult> {
    return generateTextOpenAiCompatible(this.cfg(), params);
  }
}
