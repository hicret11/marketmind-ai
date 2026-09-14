/**
 * Shared AI-insight shape for YouTube and TikTok's own "MarketMind AI
 * Analysis" sections in Social Analytics. Instagram keeps its own existing
 * shape (types/social.ts SocialAiInsight) untouched — this is a separate,
 * richer format (adds Evidence + Confidence) used only for the two newer
 * platforms, matching the format already proven in the central Analytics
 * module's cross-source insights.
 */

export type CreativeInsightConfidence = "low" | "medium" | "high";

export interface CreativeInsight {
  finding: string;
  /** Real numbers/labels quoted from the aggregated data — never invented. */
  evidence: string[];
  interpretation: string;
  recommendation: string;
  suggestedExperiment: string;
  kpi: string;
  confidence: CreativeInsightConfidence;
}

export interface CreativeInsightsResult {
  available: boolean;
  reason: string | null;
  model: string | null;
  generatedAt: string | null;
  insights: CreativeInsight[];
  basedOn: { itemsAnalyzed: number; comparisonsUsed: number } | null;
}
