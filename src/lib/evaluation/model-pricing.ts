import type { BenchmarkModelId, ModelPricingEntry } from "@/types/evaluation";

/**
 * Configurable model pricing registry — used ONLY to compute an ESTIMATED API
 * cost from real token usage. Never invented: an entry only exists here when
 * its price has been manually verified against the provider's own pricing
 * page. Every other model reports "Cost unavailable" until someone adds a
 * verified entry below.
 *
 * To add a price: find it on the provider's official pricing page, then add
 * an entry with `note` citing where it came from and `effectiveDate` for when
 * you checked. Prices change — revisit periodically.
 */
const PRICING: ModelPricingEntry[] = [
  {
    modelId: "claude",
    inputPricePerMTok: 5.0,
    outputPricePerMTok: 25.0,
    unit: "per_1m_tokens",
    note: "Claude Opus 5 (claude-opus-5) first-party API rate.",
    effectiveDate: "2026-09-04",
  },
  // Gemini, GPT-OSS, Qwen, Nemotron and GPT are intentionally left unpriced —
  // no verified rate has been entered for the currently configured model ids.
  // Add entries here once confirmed against each provider's pricing page.
];

export function getModelPricing(modelId: BenchmarkModelId): ModelPricingEntry | null {
  return PRICING.find((p) => p.modelId === modelId) ?? null;
}

export function getAllPricing(): ModelPricingEntry[] {
  return PRICING;
}

/** Returns null (never a fabricated number) when no verified pricing exists or tokens are unknown. */
export function estimateCost(
  modelId: BenchmarkModelId,
  inputTokens: number | null,
  outputTokens: number | null,
): number | null {
  const pricing = getModelPricing(modelId);
  if (!pricing || inputTokens === null || outputTokens === null) return null;
  const cost =
    (inputTokens / 1_000_000) * pricing.inputPricePerMTok +
    (outputTokens / 1_000_000) * pricing.outputPricePerMTok;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
