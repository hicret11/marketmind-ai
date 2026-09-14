import { resolveAiProvider } from "@/lib/opportunity/ai/provider";
import type { JsonSchema } from "@/lib/opportunity/ai/types";
import { OpportunityError } from "@/lib/opportunity/errors";
import { SING_MY_BIRTHDAY_SUMMARY } from "@/lib/product-context";
import type { GenericPatternComparison } from "./pattern-engine";
import type { CreativeInsight, CreativeInsightConfidence, CreativeInsightsResult } from "@/types/creative-insights";

/**
 * Generic "MarketMind AI Analysis" generator for YouTube and TikTok's Social
 * Analytics tabs — same evidence-grounding discipline as
 * lib/social/insights.ts (Instagram's own generator, left untouched):
 * Gemini receives ONLY aggregated, real numbers (never raw videos/captions),
 * must use associative language, and every insight must cite real evidence.
 *
 * Kept separate from Instagram's generator (rather than generalizing it) so
 * Instagram's insights are never touched by this work. `metricGlossary` is
 * what keeps platform vocabulary honest — e.g. it never lets the model call
 * a TikTok/YouTube number "reach", a metric neither platform provides here.
 */

interface GenerateCreativeInsightsInput {
  platformLabel: string; // "YouTube" or "TikTok"
  /** e.g. "37 videos" or "18 Shorts" — used in the prompt and in basedOn. */
  itemsAnalyzed: number;
  itemsLabel: string; // "videos"
  comparisons: GenericPatternComparison[];
  minSample: number;
  /** Real metric names available for this platform + their exact meaning — prevents wrong terminology. */
  metricGlossary: string;
  /** Optional extra scoping note, e.g. "These are Shorts only — never compare them to Long-form videos." */
  scopingNote?: string;
  /**
   * Metric words this platform does NOT have (e.g. ["reach"] for YouTube and
   * TikTok, which have no reach metric here). Enforced two ways: named
   * explicitly in the prompt, AND any insight that still uses one of these
   * words anywhere in its text is dropped after generation — never trusted
   * on prompt compliance alone.
   */
  forbiddenTerms?: string[];
}

function schema(): JsonSchema {
  return {
    type: "object",
    required: ["insights"],
    properties: {
      insights: {
        type: "array",
        items: {
          type: "object",
          required: ["finding", "evidence", "interpretation", "recommendation", "suggestedExperiment", "kpi", "confidence"],
          properties: {
            finding: { type: "string" },
            evidence: { type: "array", items: { type: "string" } },
            interpretation: { type: "string" },
            recommendation: { type: "string" },
            suggestedExperiment: { type: "string" },
            kpi: { type: "string" },
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
  suggestedExperiment?: unknown;
  kpi?: unknown;
  confidence?: unknown;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function generateCreativeInsights(input: GenerateCreativeInsightsInput): Promise<CreativeInsightsResult> {
  const usable = input.comparisons.filter((c) => c.sufficientData);

  if (usable.length === 0) {
    return {
      available: true,
      reason: null,
      model: null,
      generatedAt: new Date().toISOString(),
      insights: [],
      basedOn: { itemsAnalyzed: input.itemsAnalyzed, comparisonsUsed: 0 },
    };
  }

  const provider = resolveAiProvider();
  if (!provider) {
    return {
      available: false,
      reason: "MarketMind AI is temporarily unavailable. Your synced data is still accessible.",
      model: null,
      generatedAt: null,
      insights: [],
      basedOn: null,
    };
  }

  const systemPrompt = `You are MarketMind's ${input.platformLabel} content performance analyst for the Sing My Birthday account.

You are given AGGREGATED, REAL data only: for several content-creative dimensions, the groups within that dimension, how many ${input.itemsLabel} each group has, and each group's average real ${input.platformLabel} metrics. You are NOT given individual videos, captions, or scripts.

Real metric names for ${input.platformLabel} — use ONLY these names, exactly:
${input.metricGlossary}
${input.scopingNote ? `\n${input.scopingNote}\n` : ""}
Rules:
1. Only draw a conclusion from a comparison marked sufficientData: true. Ignore any group/dimension not given to you.
2. Use associative language only: "was associated with", "performed higher in this sample", "may indicate". NEVER claim causation.
3. Never invent a metric, a number, or a metric name that isn't in the data or the glossary above.
4. Every insight's "evidence" array must quote the actual group label(s), the real count(s), and the real average metric value(s) from the data given.
5. "confidence" must be "low" when the sample behind the finding is small or one-sided, "medium" for a reasonably sized real pattern, "high" only for a strong, well-supported pattern.
6. suggestedExperiment must be a concrete, testable next step for this account.
7. kpi is the single real metric (from the glossary) to watch for that experiment.
8. If nothing has sufficient data, return an empty insights array — do not force one.${
    input.forbiddenTerms && input.forbiddenTerms.length > 0
      ? `\n9. ${input.platformLabel} does NOT provide ${input.forbiddenTerms.join(", ")} here — never use ${input.forbiddenTerms
          .map((t) => `"${t}"`)
          .join(" or ")} anywhere in your answer (finding, evidence, interpretation, recommendation, suggestedExperiment, or kpi), not even in passing.`
      : ""
  }`;

  const payload = {
    account: "Sing My Birthday",
    platform: input.platformLabel,
    productContext: SING_MY_BIRTHDAY_SUMMARY,
    itemsAnalyzed: input.itemsAnalyzed,
    comparisons: usable.map((c) => ({
      dimension: c.dimension,
      sufficientData: c.sufficientData,
      minSample: c.minSample,
      groups: c.groups.map((g) => ({
        label: g.label,
        count: g.count,
        avgViews: g.avgViews,
        avgLikes: g.avgLikes,
        avgComments: g.avgComments,
        avgShares: g.avgShares,
        avgEngagementRate: g.avgEngagementRate,
      })),
    })),
  };

  let raw: { insights?: RawInsight[] };
  let model: string;
  try {
    raw = await provider.generateStructured<{ insights?: RawInsight[] }>({
      system: systemPrompt,
      userPayload: payload,
      schemaName: "emit_creative_insights",
      schemaDescription: `Return evidence-based, non-causal ${input.platformLabel} content performance insights.`,
      schema: schema(),
      maxOutputTokens: 3072,
    });
    model = provider.model;
  } catch (error) {
    return {
      available: false,
      reason: error instanceof OpportunityError ? error.message : "AI analysis failed.",
      model: null,
      generatedAt: null,
      insights: [],
      basedOn: null,
    };
  }

  const confidences: CreativeInsightConfidence[] = ["low", "medium", "high"];
  const forbidden = (input.forbiddenTerms ?? []).map((t) => t.toLowerCase());
  const usesForbiddenTerm = (i: CreativeInsight): boolean => {
    if (forbidden.length === 0) return false;
    const haystack = [i.finding, i.interpretation, i.recommendation, i.suggestedExperiment, i.kpi, ...i.evidence]
      .join(" ")
      .toLowerCase();
    return forbidden.some((term) => haystack.includes(term));
  };

  const insights: CreativeInsight[] = (Array.isArray(raw.insights) ? raw.insights : [])
    .map((i) => ({
      finding: str(i.finding),
      evidence: Array.isArray(i.evidence) ? i.evidence.map(str).filter(Boolean) : [],
      interpretation: str(i.interpretation),
      recommendation: str(i.recommendation),
      suggestedExperiment: str(i.suggestedExperiment),
      kpi: str(i.kpi),
      confidence: confidences.includes(i.confidence as CreativeInsightConfidence)
        ? (i.confidence as CreativeInsightConfidence)
        : "low",
    }))
    // Never keep a recommendation with no cited evidence — validated, not trusted blindly.
    .filter((i) => i.finding && i.recommendation && i.evidence.length > 0)
    // Hard safety net: drop anything that still used a metric name this platform doesn't have,
    // rather than relying on prompt compliance alone.
    .filter((i) => !usesForbiddenTerm(i));

  return {
    available: true,
    reason: null,
    model,
    generatedAt: new Date().toISOString(),
    insights,
    basedOn: { itemsAnalyzed: input.itemsAnalyzed, comparisonsUsed: usable.length },
  };
}
