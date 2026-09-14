import Anthropic from "@anthropic-ai/sdk";
import { BENCHMARK_CALL_TIMEOUT_MS, BENCHMARK_MAX_OUTPUT_TOKENS, anthropicApiKey, anthropicBenchmarkModel } from "../config";
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
 * Claude benchmark provider. Reuses the `@anthropic-ai/sdk` dependency already
 * in the project (lib/opportunity/ai/anthropic.ts) and the same ANTHROPIC_API_KEY,
 * but a distinct ANTHROPIC_BENCHMARK_MODEL so benchmark runs never silently
 * change if the Opportunity module's model is ever repointed.
 *
 * NOT called unless the user explicitly selects Claude for a benchmark run —
 * MarketMind functions completely without this provider configured.
 */

const TOOL_NAME = "emit_benchmark_result";

function toAnthropicSchema(schema: JsonSchema): Record<string, unknown> {
  const out: Record<string, unknown> = { type: schema.type };
  if (schema.description) out.description = schema.description;
  if (schema.enum) out.enum = schema.enum;
  if (schema.items) out.items = toAnthropicSchema(schema.items);
  if (schema.properties) {
    out.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([k, v]) => [k, toAnthropicSchema(v)]),
    );
  }
  if (schema.required) out.required = schema.required;
  if (schema.type === "object") out.additionalProperties = false;
  return out;
}

function mapError(cause: unknown): EvalError {
  if (cause instanceof Anthropic.APIError) {
    if (cause.status === 401 || cause.status === 403) {
      return new EvalError("PROVIDER_ERROR", "Claude authentication failed.", { cause });
    }
    if (cause.status === 404) {
      return new EvalError("MODEL_UNAVAILABLE", "The configured Claude model is unavailable.", { cause });
    }
    if (cause.status === 429) {
      return new EvalError("RATE_LIMITED", "Claude is rate-limiting requests right now.", { cause });
    }
    return new EvalError("PROVIDER_ERROR", `Claude error: ${cause.message}`, { cause });
  }
  if (cause instanceof Error && cause.name === "TimeoutError") {
    return new EvalError("TIMEOUT", "Claude request timed out.", { cause });
  }
  return new EvalError("PROVIDER_ERROR", "Unexpected Claude error.", { cause });
}

export class AnthropicBenchmarkProvider implements BenchmarkModelProvider {
  readonly id = "claude" as const;
  readonly providerName = "Anthropic" as const;
  readonly displayName = "Claude";
  readonly freeTierNote = null; // paid API usage

  get requestedModelId(): string {
    return anthropicBenchmarkModel();
  }

  isConfigured(): boolean {
    return Boolean(anthropicApiKey());
  }

  status() {
    return this.isConfigured() ? ("ready" as const) : ("not_configured" as const);
  }

  private client(): Anthropic {
    const apiKey = anthropicApiKey();
    if (!apiKey) throw new EvalError("MODEL_NOT_CONFIGURED", "ANTHROPIC_API_KEY is not set.");
    return new Anthropic({ apiKey });
  }

  async generateStructured<T>(
    params: BenchmarkGenerationParams<T>,
  ): Promise<BenchmarkGenerationResult<T>> {
    const model = this.requestedModelId;
    const client = this.client();
    const start = Date.now();

    const tool = {
      name: TOOL_NAME,
      description: params.schemaDescription,
      input_schema: toAnthropicSchema(params.schema),
      strict: true,
    };

    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model,
        max_tokens: params.maxOutputTokens ?? BENCHMARK_MAX_OUTPUT_TOKENS * 2,
        system: params.system,
        tools: [tool] as Anthropic.MessageCreateParams["tools"],
        tool_choice: { type: "tool", name: TOOL_NAME },
        messages: [
          {
            role: "user",
            content: `Input data (JSON):\n${JSON.stringify(params.userPayload, null, 2)}`,
          },
        ],
      });
    } catch (cause) {
      throw mapError(cause);
    }

    const latencyMs = Date.now() - start;
    const block = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === TOOL_NAME,
    );
    if (!block) throw new EvalError("INVALID_OUTPUT", "Claude did not return a structured result.");

    return {
      data: block.input as T,
      requestedModelId: model,
      actualModelId: response.model ?? null,
      usage: {
        inputTokens: response.usage?.input_tokens ?? null,
        outputTokens: response.usage?.output_tokens ?? null,
        totalTokens:
          response.usage?.input_tokens != null && response.usage?.output_tokens != null
            ? response.usage.input_tokens + response.usage.output_tokens
            : null,
      },
      latencyMs,
      rawText: JSON.stringify(block.input),
    };
  }

  async generateText(params: BenchmarkTextParams): Promise<BenchmarkTextResult> {
    const model = this.requestedModelId;
    const client = this.client();
    const start = Date.now();

    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model,
        max_tokens: params.maxOutputTokens ?? BENCHMARK_MAX_OUTPUT_TOKENS * 2,
        system: params.system,
        messages: [{ role: "user", content: JSON.stringify(params.userPayload, null, 2) }],
      });
    } catch (cause) {
      throw mapError(cause);
    }

    const latencyMs = Date.now() - start;
    const block = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    if (!block || !block.text.trim()) {
      throw new EvalError("INVALID_OUTPUT", "Claude returned an empty response.");
    }

    return {
      text: block.text.trim(),
      requestedModelId: model,
      actualModelId: response.model ?? null,
      usage: {
        inputTokens: response.usage?.input_tokens ?? null,
        outputTokens: response.usage?.output_tokens ?? null,
        totalTokens:
          response.usage?.input_tokens != null && response.usage?.output_tokens != null
            ? response.usage.input_tokens + response.usage.output_tokens
            : null,
      },
      latencyMs,
    };
  }
}
