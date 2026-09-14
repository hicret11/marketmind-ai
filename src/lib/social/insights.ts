import { resolveAiProvider } from "@/lib/opportunity/ai/provider";
import type { JsonSchema } from "@/lib/opportunity/ai/types";
import { OpportunityError } from "@/lib/opportunity/errors";
import { SING_MY_BIRTHDAY_SUMMARY } from "@/lib/product-context";
import { computePatternComparisons } from "./patterns";
import type { SocialAiInsight, SocialInsightsResult } from "@/types/social";

/**
 * AI Marketing Insights over real Instagram data.
 *
 * Gemini receives ONLY: aggregated performance numbers + content-label
 * summaries (never raw posts, never captions). It must use associative, not
 * causal, language. Deterministic math is done in patterns.ts, not here.
 */

const SYSTEM_PROMPT = `You are MarketMind's social performance analyst for the Sing My Birthday Instagram account.

You are given AGGREGATED data only: for several content dimensions, the groups within that dimension, how many posts each group has, and each group's average real Instagram metrics (views, reach, interaction rate, save rate, share rate). You are NOT given individual posts or captions.

Rules:
1. Only draw a conclusion when a comparison is marked sufficientData: true. Ignore dimensions marked false.
2. Use associative language only: "was associated with", "performed higher in this sample", "may indicate". NEVER claim causation ("X drives Y", "X causes more Y").
3. Never invent a metric or a number that isn't in the data.
4. Each insight must reference the actual groups and the direction of the difference.
5. Keep every field to 1-3 sentences.
6. suggestedExperiment must be a concrete A/B style test the account could run next.
7. kpi is the single metric to watch for that experiment.
8. If nothing has sufficient data, return an empty insights array.`;

function schema(): JsonSchema {
  return {
    type: "object",
    required: ["insights"],
    properties: {
      insights: {
        type: "array",
        items: {
          type: "object",
          required: ["finding", "interpretation", "recommendation", "suggestedExperiment", "kpi"],
          properties: {
            finding: { type: "string" },
            interpretation: { type: "string" },
            recommendation: { type: "string" },
            suggestedExperiment: { type: "string" },
            kpi: { type: "string" },
          },
        },
      },
    },
  };
}

interface RawInsights {
  insights?: Array<Record<string, unknown>>;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function generateSocialInsights(): Promise<SocialInsightsResult> {
  const { totalPosts, comparisons } = await computePatternComparisons();
  const usable = comparisons.filter((c) => c.sufficientData);

  if (usable.length === 0) {
    return {
      available: true,
      reason: null,
      model: null,
      generatedAt: new Date().toISOString(),
      insights: [],
      basedOn: { postsAnalyzed: totalPosts, comparisonsUsed: 0 },
    };
  }

  const provider = resolveAiProvider();
  if (!provider) {
    return {
      available: false,
      reason: "MarketMind AI is temporarily unavailable. Your synced Instagram data is still accessible.",
      model: null,
      generatedAt: null,
      insights: [],
      basedOn: null,
    };
  }

  const payload = {
    account: "Sing My Birthday (Instagram)",
    productContext: SING_MY_BIRTHDAY_SUMMARY,
    postsAnalyzed: totalPosts,
    comparisons: usable.map((c) => ({
      dimension: c.dimension,
      sufficientData: c.sufficientData,
      minSample: c.minSample,
      groups: c.groups.map((g) => ({
        label: g.label,
        posts: g.posts,
        avgViews: g.avgViews,
        avgReach: g.avgReach,
        avgInteractionRate: g.avgInteractionRate,
        avgSaveRate: g.avgSaveRate,
        avgShareRate: g.avgShareRate,
      })),
    })),
  };

  let raw: RawInsights;
  let model: string;
  try {
    raw = await provider.generateStructured<RawInsights>({
      system: SYSTEM_PROMPT,
      userPayload: payload,
      schemaName: "emit_social_insights",
      schemaDescription: "Return evidence-based, non-causal social performance insights.",
      schema: schema(),
      maxOutputTokens: 3072,
    });
    model = provider.model;
  } catch (error) {
    return {
      available: false,
      reason:
        error instanceof OpportunityError
          ? "MarketMind AI is temporarily unavailable. Your synced Instagram data is still accessible."
          : "AI analysis failed.",
      model: null,
      generatedAt: null,
      insights: [],
      basedOn: null,
    };
  }

  const insights: SocialAiInsight[] = (Array.isArray(raw.insights) ? raw.insights : [])
    .map((i) => ({
      finding: str(i.finding),
      interpretation: str(i.interpretation),
      recommendation: str(i.recommendation),
      suggestedExperiment: str(i.suggestedExperiment),
      kpi: str(i.kpi),
    }))
    .filter((i) => i.finding && i.recommendation);

  return {
    available: true,
    reason: null,
    model,
    generatedAt: new Date().toISOString(),
    insights,
    basedOn: { postsAnalyzed: totalPosts, comparisonsUsed: usable.length },
  };
}
