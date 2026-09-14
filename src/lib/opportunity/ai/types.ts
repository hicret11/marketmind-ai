import type { AiProviderId } from "@/types/opportunity";

/**
 * Generic AI provider interface for MarketMind's Opportunity Intelligence.
 *
 * The opportunity/outreach pipelines depend ONLY on this interface — never on
 * a specific vendor SDK — so the active provider can change (Gemini today,
 * Anthropic optionally, others later) without rewriting the pipeline.
 */

/** A minimal, provider-agnostic JSON Schema subset (draft-7-ish). */
export interface JsonSchema {
  type: "object" | "string" | "boolean" | "array" | "number" | "integer";
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: string[];
}

/** An inline image the model can look at, alongside the JSON payload. */
export interface InlineImage {
  mimeType: string;
  /** Base64-encoded bytes (no data: prefix). */
  base64: string;
}

export interface StructuredGenerationParams<T> {
  /** System / instruction prompt. Must include grounding + injection-resistance rules. */
  system: string;
  /** Arbitrary JSON-serializable context sent as the user turn. */
  userPayload: unknown;
  /** Optional images for multimodal analysis (e.g. an Instagram thumbnail). */
  images?: InlineImage[];
  /** Short machine name for the expected output shape (used by tool-based providers). */
  schemaName: string;
  schemaDescription: string;
  schema: JsonSchema;
  maxOutputTokens?: number;
  /** Optional type param only for call-site inference; providers return `unknown`. */
  _resultType?: T;
}

/** One prior turn of a conversation, oldest-first when passed as `history`. */
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface TextGenerationParams {
  /** System / instruction prompt. */
  system: string;
  /** Prior turns, oldest first. Keep this bounded by the caller. */
  history: ChatTurn[];
  /** The new user message. */
  message: string;
  maxOutputTokens?: number;
}

export interface AiProvider {
  readonly id: AiProviderId;
  /** The concrete model string currently configured for this provider. */
  readonly model: string;
  /**
   * Requests schema-validated JSON from the model. Implementations MUST throw
   * an OpportunityError (AI_AUTH_ERROR / AI_RATE_LIMITED / AI_TIMEOUT /
   * AI_ERROR) on failure — callers never receive a fabricated fallback.
   */
  generateStructured<T>(params: StructuredGenerationParams<T>): Promise<T>;
  /**
   * Requests a free-form conversational reply (used by MarketMind Chat).
   * Same failure contract as {@link generateStructured}.
   */
  generateText(params: TextGenerationParams): Promise<string>;
}
