import { env } from "@/lib/opportunity/env";

/**
 * All Evaluation Lab provider configuration, read from environment variables.
 * Six model slots, each independently optional — the lab must work fully with
 * only Gemini configured. Nothing here fabricates a "ready" state.
 */

export function geminiApiKey(): string {
  return env("GEMINI_API_KEY");
}
/** Falls back to Opportunity's already-validated GEMINI_MODEL, then a known-good default. */
export function geminiBenchmarkModel(): string {
  return env("GEMINI_BENCHMARK_MODEL") || env("GEMINI_MODEL") || "gemini-3.1-flash-lite";
}

export function groqApiKey(): string {
  return env("GROQ_API_KEY");
}
export function groqGptOssModel(): string {
  return env("GROQ_GPT_OSS_MODEL") || "openai/gpt-oss-120b";
}
export function groqQwenModel(): string {
  return env("GROQ_QWEN_MODEL") || "qwen/qwen3-32b";
}

export function openRouterApiKey(): string {
  return env("OPENROUTER_API_KEY");
}
export function openRouterNemotronModel(): string {
  // A specific, named model — deliberately NOT a router alias like "openrouter/free"
  // (see lib/evaluation/providers/openrouter.ts for why that breaks reproducibility).
  return env("OPENROUTER_NEMOTRON_MODEL") || "nvidia/nemotron-nano-9b-v2:free";
}

export function openAiApiKey(): string {
  return env("OPENAI_API_KEY");
}
export function openAiBenchmarkModel(): string {
  return env("OPENAI_BENCHMARK_MODEL") || "gpt-5-mini";
}

export function anthropicApiKey(): string {
  return env("ANTHROPIC_API_KEY") || env("ANTHROPIC_AUTH_TOKEN");
}
export function anthropicBenchmarkModel(): string {
  return env("ANTHROPIC_BENCHMARK_MODEL") || "claude-opus-5";
}

/** Bounded concurrency for benchmark runs — never fire everything at once. */
export const BENCHMARK_CONCURRENCY = 3;
export const BENCHMARK_CALL_TIMEOUT_MS = 45000;
export const BENCHMARK_MAX_OUTPUT_TOKENS = 1536;

/**
 * Data-quality thresholds. A handful of real cases is enough to sanity-check
 * that the pipeline works end to end, but not enough to trust as a stable
 * comparison point or to declare a regression against — both the UI and the
 * baseline API route enforce this same number.
 */
export const MIN_HUMAN_VERIFIED_FOR_BASELINE = 20;
export const SMALL_SAMPLE_WARNING_THRESHOLD = 20;
/** Below this many positive (or negative) Human Verified cases, a comparison isn't reliable. */
export const CLASS_BALANCE_MIN_PER_SIDE = 5;
