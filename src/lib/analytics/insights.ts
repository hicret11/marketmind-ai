import { resolveAiProvider } from "@/lib/opportunity/ai/provider";
import type { JsonSchema } from "@/lib/opportunity/ai/types";
import { OpportunityError } from "@/lib/opportunity/errors";
import { PATTERN_MIN_SAMPLE } from "@/lib/social/config";
import type {
  AnalyticsOverviewResponse,
  CrossSourceInsight,
  CrossSourceInsightsResult,
  InsightConfidence,
} from "@/types/analytics";

/**
 * MarketMind Intelligence — cross-source insights over REAL aggregated data
 * only (marketing/CRM/opportunity/evaluation summaries, never raw records or
 * captions). Same evidence-grounding discipline as lib/social/insights.ts:
 * associative language, every recommendation must cite real numbers already
 * present in the payload, and a validated structured schema — never trusted
 * blindly. Explicitly user-triggered; never called on page load.
 */

const SYSTEM_PROMPT = `You are MarketMind's cross-channel marketing analyst. You are given AGGREGATED, REAL summaries from up to four MarketMind modules: Instagram/Social performance, CRM pipeline, Opportunity Discovery qualification data, and AI model benchmark results. Some modules may be missing or have too little data — you are told which.

Rules:
1. Every insight's "evidence" array must quote the actual numbers/labels from the data given to you — never invent a statistic, percentage, or count that isn't present.
2. Use associative language only ("was associated with", "tends to", "may indicate") — never causal claims ("X causes Y", "X drives Y").
3. Only produce an insight for a question you have real supporting data for. If a module has no data or too little, do not answer questions that would need it.
4. "confidence" must be "low" when the sample behind the finding is small or one-sided, "medium" for a reasonably sized real pattern, "high" only for a strong, well-supported pattern across a meaningful sample.
5. suggestedAction must be one concrete, testable next step.
6. If truly nothing here has enough data to support any insight, return an empty insights array — do not force one.`;

function schema(): JsonSchema {
  return {
    type: "object",
    required: ["insights"],
    properties: {
      insights: {
        type: "array",
        items: {
          type: "object",
          required: ["finding", "evidence", "interpretation", "recommendation", "suggestedAction", "confidence"],
          properties: {
            finding: { type: "string" },
            evidence: { type: "array", items: { type: "string" } },
            interpretation: { type: "string" },
            recommendation: { type: "string" },
            suggestedAction: { type: "string" },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
          },
        },
      },
    },
  };
}

interface RawInsight {
  finding?: unknown;
  evidence?: unknown;
  interpretation?: unknown;
  recommendation?: unknown;
  suggestedAction?: unknown;
  confidence?: unknown;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function buildPayload(overview: AnalyticsOverviewResponse) {
  const { marketing, crm, opportunity, evaluation } = overview;
  const sourcesUsed: string[] = [];
  const payload: Record<string, unknown> = { range: overview.range };

  if (marketing.connected && marketing.postsAnalyzed >= PATTERN_MIN_SAMPLE) {
    sourcesUsed.push("Instagram Social Analytics");
    payload.socialAnalytics = {
      postsAnalyzed: marketing.postsAnalyzed,
      avgInteractionRate: marketing.avgInteractionRate,
      avgSaveRate: marketing.avgSaveRate,
      avgShareRate: marketing.avgShareRate,
      bestCreativeType: marketing.bestCreativeType,
      bestHookType: marketing.bestHookType,
      bestCta: marketing.bestCta,
      bestEmotion: marketing.bestEmotion,
    };
  }

  if (crm.totalLeads > 0) {
    sourcesUsed.push("CRM");
    payload.crm = {
      totalLeads: crm.totalLeads,
      funnel: crm.funnel,
      byRegion: crm.byRegion,
      byCategory: crm.byCategory,
      bySource: crm.bySource,
    };
  }

  if (opportunity.totalReviewed > 0) {
    sourcesUsed.push("Opportunity Discovery");
    payload.opportunityIntelligence = {
      totalReviewed: opportunity.totalReviewed,
      strong: opportunity.strong,
      potential: opportunity.potential,
      weak: opportunity.weak,
      notRelevant: opportunity.notRelevant,
      needsReview: opportunity.needsReview,
      byCategory: opportunity.byCategory,
      topCategory: opportunity.topCategory,
    };
  }

  if (evaluation.hasCompletedRun) {
    sourcesUsed.push("AI Evaluation Lab");
    payload.aiEvaluation = {
      taskTitle: evaluation.taskTitle,
      modelsTested: evaluation.modelsTested,
      bestAccuracy: evaluation.bestAccuracy,
      lowestFalsePositiveRate: evaluation.lowestFalsePositiveRate,
      fastest: evaluation.fastest,
      lowestCost: evaluation.lowestCost,
      isSmallSample: evaluation.isSmallSample,
    };
  }

  return { payload, sourcesUsed };
}

export async function generateCrossSourceInsights(
  overview: AnalyticsOverviewResponse,
): Promise<CrossSourceInsightsResult> {
  const { payload, sourcesUsed } = buildPayload(overview);

  if (sourcesUsed.length === 0) {
    return {
      available: true,
      reason: "Not enough data to make a reliable recommendation.",
      model: null,
      generatedAt: null,
      insights: [],
      sourcesUsed: [],
    };
  }

  const provider = resolveAiProvider();
  if (!provider) {
    return {
      available: false,
      reason: "MarketMind AI is temporarily unavailable. Your real data above is still accessible.",
      model: null,
      generatedAt: null,
      insights: [],
      sourcesUsed,
    };
  }

  let raw: { insights?: RawInsight[] };
  try {
    raw = await provider.generateStructured<{ insights?: RawInsight[] }>({
      system: SYSTEM_PROMPT,
      userPayload: payload,
      schemaName: "emit_cross_source_insights",
      schemaDescription: "Evidence-grounded, non-causal cross-module marketing insights.",
      schema: schema(),
      maxOutputTokens: 3072,
    });
  } catch (error) {
    return {
      available: false,
      reason: error instanceof OpportunityError ? error.message : "AI analysis failed.",
      model: null,
      generatedAt: null,
      insights: [],
      sourcesUsed,
    };
  }

  const confidences: InsightConfidence[] = ["low", "medium", "high"];
  const insights: CrossSourceInsight[] = (Array.isArray(raw.insights) ? raw.insights : [])
    .map((i) => ({
      finding: str(i.finding),
      evidence: Array.isArray(i.evidence) ? i.evidence.map(str).filter(Boolean) : [],
      interpretation: str(i.interpretation),
      recommendation: str(i.recommendation),
      suggestedAction: str(i.suggestedAction),
      confidence: confidences.includes(i.confidence as InsightConfidence) ? (i.confidence as InsightConfidence) : "low",
    }))
    // Never keep a recommendation with no cited evidence — validated, not trusted blindly.
    .filter((i) => i.finding && i.recommendation && i.evidence.length > 0);

  return {
    available: true,
    reason: null,
    model: provider.model,
    generatedAt: new Date().toISOString(),
    insights,
    sourcesUsed,
  };
}
