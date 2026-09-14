import { BENCHMARK_CALL_TIMEOUT_MS, BENCHMARK_MAX_OUTPUT_TOKENS } from "../config";
import { EvalError } from "../errors";
import type {
  BenchmarkGenerationParams,
  BenchmarkGenerationResult,
  BenchmarkTextParams,
  BenchmarkTextResult,
} from "./types";

/**
 * Shared call logic for OpenAI-compatible chat-completions APIs — Groq,
 * OpenRouter and OpenAI all speak this exact wire format. One implementation
 * here means gpt-oss/Qwen/Nemotron/GPT don't each need bespoke HTTP code.
 *
 * Structured output uses `response_format: {type:"json_object"}` (broadly
 * supported, including open-weight models on Groq/OpenRouter) plus the schema
 * spelled out in the system prompt — the result is still fully validated by
 * the caller, never trusted blindly.
 */

export interface OpenAiCompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  extraHeaders?: Record<string, string>;
}

interface ChatCompletionResponse {
  model?: string;
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: { message?: string; code?: string | number; type?: string };
}

function toUsage(usage: ChatCompletionResponse["usage"]) {
  return {
    inputTokens: typeof usage?.prompt_tokens === "number" ? usage.prompt_tokens : null,
    outputTokens: typeof usage?.completion_tokens === "number" ? usage.completion_tokens : null,
    totalTokens: typeof usage?.total_tokens === "number" ? usage.total_tokens : null,
  };
}

async function call(
  cfg: OpenAiCompatibleConfig,
  messages: Array<{ role: "system" | "user"; content: string }>,
  opts: { jsonMode: boolean; maxOutputTokens?: number },
): Promise<{ response: ChatCompletionResponse; latencyMs: number }> {
  const start = Date.now();
  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
        ...cfg.extraHeaders,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: 0.2,
        max_tokens: opts.maxOutputTokens ?? BENCHMARK_MAX_OUTPUT_TOKENS,
        ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(BENCHMARK_CALL_TIMEOUT_MS),
    });
  } catch (cause) {
    const timedOut = cause instanceof Error && cause.name === "TimeoutError";
    throw new EvalError(timedOut ? "TIMEOUT" : "PROVIDER_ERROR", "Could not reach the provider.", {
      cause,
    });
  }

  const latencyMs = Date.now() - start;
  const payload = (await res.json().catch(() => null)) as ChatCompletionResponse | null;

  if (!res.ok || !payload) {
    const message = payload?.error?.message;
    if (res.status === 401 || res.status === 403) {
      throw new EvalError("PROVIDER_ERROR", message ?? "Authentication failed.", { status: 502 });
    }
    if (res.status === 404) {
      throw new EvalError("MODEL_UNAVAILABLE", message ?? `Model "${cfg.model}" is unavailable.`);
    }
    if (res.status === 429) {
      throw new EvalError("RATE_LIMITED", message ?? "Rate limited.");
    }
    throw new EvalError("PROVIDER_ERROR", message ?? `Provider responded with ${res.status}.`);
  }

  return { response: payload, latencyMs };
}

export async function generateStructuredOpenAiCompatible<T>(
  cfg: OpenAiCompatibleConfig,
  params: BenchmarkGenerationParams<T>,
): Promise<BenchmarkGenerationResult<T>> {
  const schemaText = JSON.stringify(params.schema, null, 2);
  const system = `${params.system}\n\nRespond with ONLY a single JSON object (no markdown fences, no commentary) matching this JSON Schema exactly:\n${schemaText}`;

  const { response, latencyMs } = await call(
    cfg,
    [
      { role: "system", content: system },
      { role: "user", content: `Input data (JSON):\n${JSON.stringify(params.userPayload, null, 2)}` },
    ],
    { jsonMode: true, maxOutputTokens: params.maxOutputTokens },
  );

  const rawText = response.choices?.[0]?.message?.content ?? "";
  if (!rawText.trim()) {
    throw new EvalError("INVALID_OUTPUT", "The model returned an empty response.");
  }

  let data: T;
  try {
    data = JSON.parse(stripCodeFence(rawText)) as T;
  } catch (cause) {
    throw new EvalError("INVALID_OUTPUT", "The model's response was not valid JSON.", {
      cause,
      details: { rawTextSnippet: rawText.slice(0, 300) },
    });
  }

  return {
    data,
    requestedModelId: cfg.model,
    actualModelId: response.model ?? null,
    usage: toUsage(response.usage),
    latencyMs,
    rawText,
  };
}

export async function generateTextOpenAiCompatible(
  cfg: OpenAiCompatibleConfig,
  params: BenchmarkTextParams,
): Promise<BenchmarkTextResult> {
  const { response, latencyMs } = await call(
    cfg,
    [
      { role: "system", content: params.system },
      { role: "user", content: JSON.stringify(params.userPayload, null, 2) },
    ],
    { jsonMode: false, maxOutputTokens: params.maxOutputTokens },
  );

  const text = response.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) {
    throw new EvalError("INVALID_OUTPUT", "The model returned an empty response.");
  }

  return {
    text: text.trim(),
    requestedModelId: cfg.model,
    actualModelId: response.model ?? null,
    usage: toUsage(response.usage),
    latencyMs,
  };
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}
