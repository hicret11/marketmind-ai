import type { AiProviderId } from "@/types/opportunity";
import { env } from "../env";
import { AnthropicProvider } from "./anthropic";
import { GeminiProvider } from "./gemini";
import type { AiProvider } from "./types";

export type { AiProvider, JsonSchema, StructuredGenerationParams } from "./types";

/**
 * AI provider resolution for Opportunity Intelligence.
 *
 * Priority: explicit AI_PROVIDER (if its credential is present) -> Gemini (the
 * active/default provider) -> Anthropic (optional, kept for later) -> none.
 * ANTHROPIC_API_KEY is never required for this feature.
 */
export function resolveAiProviderId(): AiProviderId | null {
  const explicit = env("AI_PROVIDER").toLowerCase();
  const geminiReady = Boolean(env("GEMINI_API_KEY"));
  const anthropicReady = Boolean(env("ANTHROPIC_API_KEY") || env("ANTHROPIC_AUTH_TOKEN"));

  if (explicit === "gemini" && geminiReady) return "gemini";
  if (explicit === "anthropic" && anthropicReady) return "anthropic";
  if (geminiReady) return "gemini";
  if (anthropicReady) return "anthropic";
  return null;
}

export function resolveAiProvider(): AiProvider | null {
  const id = resolveAiProviderId();
  if (id === "gemini") return new GeminiProvider();
  if (id === "anthropic") return new AnthropicProvider();
  return null;
}
