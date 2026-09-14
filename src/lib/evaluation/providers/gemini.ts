import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { BENCHMARK_CALL_TIMEOUT_MS, BENCHMARK_MAX_OUTPUT_TOKENS, geminiApiKey, geminiBenchmarkModel } from "../config";
import { EvalError } from "../errors";
import type {
  BenchmarkGenerationParams,
  BenchmarkGenerationResult,
  BenchmarkModelProvider,
  BenchmarkTextParams,
  BenchmarkTextResult,
  JsonSchema,
} from "./types";

/**
 * Gemini benchmark provider — reuses the SAME env var (GEMINI_API_KEY) and the
 * SAME `@google/genai` SDK already used by lib/opportunity/ai/gemini.ts (no new
 * dependency, no new credential). This is a separate thin call path purely
 * because benchmarking needs usage/latency metadata that Opportunity's
 * AiProvider interface doesn't expose — lib/opportunity/ai is untouched.
 */

function toGeminiSchema(schema: JsonSchema): Record<string, unknown> {
  const out: Record<string, unknown> = { type: schema.type };
  if (schema.description) out.description = schema.description;
  if (schema.enum) out.enum = schema.enum;
  if (schema.items) out.items = toGeminiSchema(schema.items);
  if (schema.properties) {
    out.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([k, v]) => [k, toGeminiSchema(v)]),
    );
  }
  if (schema.required) out.required = schema.required;
  if (schema.type === "object") out.additionalProperties = false;
  return out;
}

function mapError(cause: unknown): EvalError {
  if (cause instanceof ApiError) {
    if (cause.status === 401 || cause.status === 403) {
      return new EvalError("PROVIDER_ERROR", "Gemini authentication failed.", { cause });
    }
    if (cause.status === 404) {
      return new EvalError("MODEL_UNAVAILABLE", "The configured Gemini model is unavailable.", { cause });
    }
    if (cause.status === 429 || cause.status === 503) {
      return new EvalError("RATE_LIMITED", "Gemini is rate-limiting or overloaded right now.", { cause });
    }
    return new EvalError("PROVIDER_ERROR", `Gemini error: ${cause.message}`, { cause });
  }
  if (cause instanceof Error && (cause.name === "AbortError" || cause.name === "TimeoutError")) {
    return new EvalError("TIMEOUT", "Gemini request timed out.", { cause });
  }
  return new EvalError("PROVIDER_ERROR", "Unexpected Gemini error.", { cause });
}

export class GeminiBenchmarkProvider implements BenchmarkModelProvider {
  readonly id = "gemini" as const;
  readonly providerName = "Google" as const;
  readonly displayName = "Gemini";
  readonly freeTierNote =
    "Free-tier available on Google AI Studio. Rate limits apply and may change.";

  get requestedModelId(): string {
    return geminiBenchmarkModel();
  }

  isConfigured(): boolean {
    return Boolean(geminiApiKey());
  }

  status() {
    return this.isConfigured() ? ("ready" as const) : ("not_configured" as const);
  }

  private client(): GoogleGenAI {
    const apiKey = geminiApiKey();
    if (!apiKey) throw new EvalError("MODEL_NOT_CONFIGURED", "GEMINI_API_KEY is not set.");
    return new GoogleGenAI({ apiKey });
  }

  async generateStructured<T>(
    params: BenchmarkGenerationParams<T>,
  ): Promise<BenchmarkGenerationResult<T>> {
    const model = this.requestedModelId;
    const ai = this.client();
    const start = Date.now();

    let response;
    try {
      response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [{ text: `Input data (JSON):\n${JSON.stringify(params.userPayload, null, 2)}` }],
          },
        ],
        config: {
          systemInstruction: params.system,
          responseMimeType: "application/json",
          responseJsonSchema: toGeminiSchema(params.schema),
          temperature: 0.2,
          maxOutputTokens: params.maxOutputTokens ?? BENCHMARK_MAX_OUTPUT_TOKENS * 2,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          abortSignal: AbortSignal.timeout(BENCHMARK_CALL_TIMEOUT_MS),
        },
      });
    } catch (cause) {
      throw mapError(cause);
    }

    const latencyMs = Date.now() - start;
    const rawText = response.text ?? "";
    if (!rawText) {
      throw new EvalError("INVALID_OUTPUT", "Gemini returned an empty response.");
    }
    let data: T;
    try {
      data = JSON.parse(rawText) as T;
    } catch (cause) {
      throw new EvalError("INVALID_OUTPUT", "Gemini's response was not valid JSON.", {
        cause,
        details: { rawTextSnippet: rawText.slice(0, 300) },
      });
    }

    return {
      data,
      requestedModelId: model,
      actualModelId: response.modelVersion ?? null,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount ?? null,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
        totalTokens: response.usageMetadata?.totalTokenCount ?? null,
      },
      latencyMs,
      rawText,
    };
  }

  async generateText(params: BenchmarkTextParams): Promise<BenchmarkTextResult> {
    const model = this.requestedModelId;
    const ai = this.client();
    const start = Date.now();

    let response;
    try {
      response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: JSON.stringify(params.userPayload, null, 2) }] }],
        config: {
          systemInstruction: params.system,
          temperature: 0.7,
          maxOutputTokens: params.maxOutputTokens ?? BENCHMARK_MAX_OUTPUT_TOKENS * 2,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          abortSignal: AbortSignal.timeout(BENCHMARK_CALL_TIMEOUT_MS),
        },
      });
    } catch (cause) {
      throw mapError(cause);
    }

    const latencyMs = Date.now() - start;
    const text = (response.text ?? "").trim();
    if (!text) throw new EvalError("INVALID_OUTPUT", "Gemini returned an empty response.");

    return {
      text,
      requestedModelId: model,
      actualModelId: response.modelVersion ?? null,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount ?? null,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
        totalTokens: response.usageMetadata?.totalTokenCount ?? null,
      },
      latencyMs,
    };
  }
}
