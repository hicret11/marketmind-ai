import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env";
import { AI_USER_MESSAGES, OpportunityError } from "../errors";
import type {
  AiProvider,
  JsonSchema,
  StructuredGenerationParams,
  TextGenerationParams,
} from "./types";

/**
 * Optional Anthropic implementation of {@link AiProvider}.
 *
 * Not required and not the default — Gemini is the active provider for
 * Opportunity Intelligence. This exists purely so Anthropic can be selected
 * later (`AI_PROVIDER=anthropic`) without rewriting the opportunity/outreach
 * pipeline, which depends only on the generic {@link AiProvider} interface.
 */

const DEFAULT_MODEL = "claude-opus-5";

function toAnthropicSchema(schema: JsonSchema): Record<string, unknown> {
  const out: Record<string, unknown> = { type: schema.type };
  if (schema.description) out.description = schema.description;
  if (schema.enum) out.enum = schema.enum;
  if (schema.items) out.items = toAnthropicSchema(schema.items);
  if (schema.properties) {
    out.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [
        key,
        toAnthropicSchema(value),
      ]),
    );
  }
  if (schema.required) out.required = schema.required;
  if (schema.type === "object") out.additionalProperties = false;
  return out;
}

function mapAnthropicError(cause: unknown, model: string): OpportunityError {
  if (cause instanceof Anthropic.APIError) {
    if (cause.status === 401 || cause.status === 403) {
      return new OpportunityError("AI_AUTH_ERROR", AI_USER_MESSAGES.AI_AUTH_ERROR, { cause });
    }
    if (cause.status === 404) {
      return new OpportunityError(
        "AI_MODEL_UNAVAILABLE",
        AI_USER_MESSAGES.AI_MODEL_UNAVAILABLE,
        { cause, details: { model } },
      );
    }
    if (cause.status === 429 || cause.status === 503) {
      return new OpportunityError("AI_RATE_LIMITED", AI_USER_MESSAGES.AI_RATE_LIMITED, {
        cause,
      });
    }
    return new OpportunityError(
      "AI_ERROR",
      "AI analysis failed unexpectedly. Please try again.",
      { cause, status: cause.status && cause.status >= 500 ? 502 : cause.status },
    );
  }
  if (cause instanceof Error && cause.name === "TimeoutError") {
    return new OpportunityError("AI_TIMEOUT", AI_USER_MESSAGES.AI_TIMEOUT, { cause });
  }
  return new OpportunityError(
    "AI_ERROR",
    "AI analysis failed unexpectedly. Please try again.",
    { cause },
  );
}

export class AnthropicProvider implements AiProvider {
  readonly id = "anthropic" as const;
  private cachedClient: Anthropic | null = null;

  get model(): string {
    return env("ANTHROPIC_MODEL") || DEFAULT_MODEL;
  }

  private client(): Anthropic {
    const apiKey = env("ANTHROPIC_API_KEY");
    if (!apiKey && !env("ANTHROPIC_AUTH_TOKEN")) {
      throw new OpportunityError("AI_NOT_CONFIGURED", AI_USER_MESSAGES.AI_NOT_CONFIGURED);
    }
    if (!this.cachedClient) {
      this.cachedClient = apiKey ? new Anthropic({ apiKey }) : new Anthropic();
    }
    return this.cachedClient;
  }

  async generateStructured<T>(params: StructuredGenerationParams<T>): Promise<T> {
    const model = this.model;
    const client = this.client();

    const tool = {
      name: params.schemaName,
      description: params.schemaDescription,
      input_schema: toAnthropicSchema(params.schema),
      strict: true,
    };

    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model,
        max_tokens: params.maxOutputTokens ?? 2048,
        system: params.system,
        tools: [tool] as Anthropic.MessageCreateParams["tools"],
        tool_choice: { type: "tool", name: params.schemaName },
        messages: [
          {
            role: "user",
            content: `Input data (JSON):\n${JSON.stringify(params.userPayload, null, 2)}`,
          },
        ],
      });
    } catch (cause) {
      throw mapAnthropicError(cause, model);
    }

    const block = response.content.find(
      (b): b is Anthropic.ToolUseBlock =>
        b.type === "tool_use" && b.name === params.schemaName,
    );
    if (!block) {
      throw new OpportunityError("AI_INVALID_OUTPUT", AI_USER_MESSAGES.AI_INVALID_OUTPUT);
    }

    return block.input as T;
  }

  async generateText(params: TextGenerationParams): Promise<string> {
    const model = this.model;
    const client = this.client();

    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model,
        max_tokens: params.maxOutputTokens ?? 1536,
        system: params.system,
        messages: [
          ...params.history.map((turn) => ({
            role: turn.role,
            content: turn.content,
          })),
          { role: "user" as const, content: params.message },
        ],
      });
    } catch (cause) {
      throw mapAnthropicError(cause, model);
    }

    const block = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );
    if (!block || !block.text.trim()) {
      throw new OpportunityError("AI_INVALID_OUTPUT", AI_USER_MESSAGES.AI_INVALID_OUTPUT);
    }
    return block.text.trim();
  }
}
