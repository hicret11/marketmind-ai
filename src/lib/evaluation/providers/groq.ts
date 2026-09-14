import { groqApiKey, groqGptOssModel, groqQwenModel } from "../config";
import { EvalError } from "../errors";
import { generateStructuredOpenAiCompatible, generateTextOpenAiCompatible } from "./openai-compatible";
import type {
  BenchmarkGenerationParams,
  BenchmarkGenerationResult,
  BenchmarkModelProvider,
  BenchmarkTextParams,
  BenchmarkTextResult,
} from "./types";

/**
 * Groq hosts multiple open-weight models behind one OpenAI-compatible API and
 * one API key. GPT-OSS 120B and Qwen are two provider instances sharing this
 * single HTTP client — no second Groq client is created.
 */
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

abstract class GroqBenchmarkProviderBase implements BenchmarkModelProvider {
  abstract readonly id: "gpt-oss" | "qwen";
  readonly providerName = "Groq" as const;
  abstract readonly displayName: string;
  readonly freeTierNote = "Free-tier available on Groq. Rate limits apply and may change.";
  protected abstract modelId(): string;

  get requestedModelId(): string {
    return this.modelId();
  }

  isConfigured(): boolean {
    return Boolean(groqApiKey());
  }

  status() {
    return this.isConfigured() ? ("ready" as const) : ("not_configured" as const);
  }

  private cfg() {
    const apiKey = groqApiKey();
    if (!apiKey) throw new EvalError("MODEL_NOT_CONFIGURED", "GROQ_API_KEY is not set.");
    return { baseUrl: GROQ_BASE_URL, apiKey, model: this.modelId() };
  }

  generateStructured<T>(params: BenchmarkGenerationParams<T>): Promise<BenchmarkGenerationResult<T>> {
    return generateStructuredOpenAiCompatible(this.cfg(), params);
  }

  generateText(params: BenchmarkTextParams): Promise<BenchmarkTextResult> {
    return generateTextOpenAiCompatible(this.cfg(), params);
  }
}

export class GroqGptOssProvider extends GroqBenchmarkProviderBase {
  readonly id = "gpt-oss" as const;
  readonly displayName = "GPT-OSS 120B";
  protected modelId(): string {
    return groqGptOssModel();
  }
}

export class GroqQwenProvider extends GroqBenchmarkProviderBase {
  readonly id = "qwen" as const;
  readonly displayName = "Qwen";
  protected modelId(): string {
    return groqQwenModel();
  }
}
