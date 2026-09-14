import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { env } from "../env";
import { AI_USER_MESSAGES, OpportunityError } from "../errors";
import type {
  AiProvider,
  JsonSchema,
  StructuredGenerationParams,
  TextGenerationParams,
} from "./types";

/**
 * Gemini implementation of {@link AiProvider} — the active/default AI provider
 * for MarketMind Opportunity Intelligence. Uses the official `@google/genai`
 * SDK's structured JSON output (`responseJsonSchema`), server-side only.
 */

// Flash-Lite tier — verified live against this account: fast (~2-4s), stable,
// and supports both structured JSON output and low/minimal thinking levels.
// "gemini-2.5-flash"/"gemini-2.5-flash-lite" 404 ("no longer available to new
// users"); the newer "gemini-3.6-flash" preview was intermittently 503
// (overloaded) during testing — flash-lite proved the more reliable default.
// Overridable via GEMINI_MODEL without a code change if that changes again.
const DEFAULT_MODEL = "gemini-3.1-flash-lite";
const REQUEST_TIMEOUT_MS = 30000;

/** Recursively marks every object schema closed, so the model can't pad the
 * response with unrequested fields. `responseJsonSchema` supports this key. */
function toGeminiSchema(schema: JsonSchema): Record<string, unknown> {
  const out: Record<string, unknown> = { type: schema.type };
  if (schema.description) out.description = schema.description;
  if (schema.enum) out.enum = schema.enum;
  if (schema.items) out.items = toGeminiSchema(schema.items);
  if (schema.properties) {
    out.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [
        key,
        toGeminiSchema(value),
      ]),
    );
  }
  if (schema.required) out.required = schema.required;
  if (schema.type === "object") out.additionalProperties = false;
  return out;
}

function mapGeminiError(cause: unknown, model: string): OpportunityError {
  if (cause instanceof ApiError) {
    if (cause.status === 401 || cause.status === 403) {
      return new OpportunityError("AI_AUTH_ERROR", AI_USER_MESSAGES.AI_AUTH_ERROR, {
        cause,
      });
    }
    if (cause.status === 404) {
      return new OpportunityError(
        "AI_MODEL_UNAVAILABLE",
        AI_USER_MESSAGES.AI_MODEL_UNAVAILABLE,
        { cause, details: { model } },
      );
    }
    if (cause.status === 429 || cause.status === 503) {
      // 503 = model temporarily overloaded on Google's side — same
      // "try again shortly" UX as a rate limit, not a real outage.
      return new OpportunityError("AI_RATE_LIMITED", AI_USER_MESSAGES.AI_RATE_LIMITED, {
        cause,
      });
    }
    return new OpportunityError("AI_ERROR", "AI analysis failed unexpectedly. Please try again.", {
      cause,
      status: cause.status >= 500 ? 502 : cause.status,
    });
  }

  if (
    cause instanceof Error &&
    (cause.name === "AbortError" || cause.name === "TimeoutError")
  ) {
    return new OpportunityError("AI_TIMEOUT", AI_USER_MESSAGES.AI_TIMEOUT, { cause });
  }

  return new OpportunityError("AI_ERROR", "AI analysis failed unexpectedly. Please try again.", {
    cause,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** One short retry for Gemini's "temporarily overloaded" 503 — genuinely transient. */
async function withOverloadRetry<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 503) {
      await sleep(1500);
      return call();
    }
    throw cause;
  }
}

export class GeminiProvider implements AiProvider {
  readonly id = "gemini" as const;

  get model(): string {
    return env("GEMINI_MODEL") || DEFAULT_MODEL;
  }

  private client(): GoogleGenAI {
    const apiKey = env("GEMINI_API_KEY");
    if (!apiKey) {
      throw new OpportunityError("AI_NOT_CONFIGURED", AI_USER_MESSAGES.AI_NOT_CONFIGURED);
    }
    return new GoogleGenAI({ apiKey });
  }

  async generateStructured<T>(params: StructuredGenerationParams<T>): Promise<T> {
    const model = this.model;
    const ai = this.client();

    let response;
    try {
      type Part =
        | { text: string }
        | { inlineData: { mimeType: string; data: string } };
      const parts: Part[] = [
        { text: `Input data (JSON):\n${JSON.stringify(params.userPayload, null, 2)}` },
      ];
      for (const image of params.images ?? []) {
        parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
      }
      response = await withOverloadRetry(() =>
        ai.models.generateContent({
          model,
          contents: [{ role: "user", parts }],
          config: {
            systemInstruction: params.system,
            responseMimeType: "application/json",
            responseJsonSchema: toGeminiSchema(params.schema),
            temperature: 0.2,
            // This model tier reasons before answering ("thinking" tokens count
            // against maxOutputTokens) — generous headroom avoids truncation.
            maxOutputTokens: params.maxOutputTokens ?? 4096,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          },
        }),
      );
    } catch (cause) {
      throw mapGeminiError(cause, model);
    }

    const text = response.text;
    if (!text) {
      throw new OpportunityError("AI_INVALID_OUTPUT", AI_USER_MESSAGES.AI_INVALID_OUTPUT, {
        details: { reason: "empty response" },
      });
    }

    try {
      return JSON.parse(text) as T;
    } catch (cause) {
      throw new OpportunityError("AI_INVALID_OUTPUT", AI_USER_MESSAGES.AI_INVALID_OUTPUT, {
        cause,
        details: { rawTextSnippet: text.slice(0, 300) },
      });
    }
  }

  async generateText(params: TextGenerationParams): Promise<string> {
    const model = this.model;
    const ai = this.client();

    const contents = [
      ...params.history.map((turn) => ({
        role: turn.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: turn.content }],
      })),
      { role: "user" as const, parts: [{ text: params.message }] },
    ];

    let response;
    try {
      response = await withOverloadRetry(() =>
        ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: params.system,
            temperature: 0.4,
            maxOutputTokens: params.maxOutputTokens ?? 2048,
            // "minimal" keeps chat replies fast and low-cost — conversational
            // answers don't need multi-step reasoning the way partnership
            // analysis does.
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          },
        }),
      );
    } catch (cause) {
      throw mapGeminiError(cause, model);
    }

    const text = response.text;
    if (!text || !text.trim()) {
      throw new OpportunityError("AI_INVALID_OUTPUT", AI_USER_MESSAGES.AI_INVALID_OUTPUT, {
        details: { reason: "empty response" },
      });
    }
    return text.trim();
  }
}
