import { PATTERN_MIN_SAMPLE } from "@/lib/social/config";
import { generateCreativeInsights } from "@/lib/social/creative-insights";
import { computeTiktokPatternComparisons } from "./patterns";
import type { CreativeInsightsResult } from "@/types/creative-insights";

/**
 * MarketMind AI Analysis for TikTok. Same evidence-grounding discipline as
 * Instagram's own generator (lib/social/insights.ts, untouched) via the
 * shared engine in lib/social/creative-insights.ts.
 */

const TIKTOK_METRIC_GLOSSARY = `- Views: real TikTok view count per video (never call this "reach" — TikTok does not provide a reach metric here)
- Likes: real like count per video
- Comments: real comment count per video
- Shares: real share count per video
- Engagement rate: (likes + comments + shares) / views, calculated in code, never estimated`;

export async function generateTiktokInsights(): Promise<CreativeInsightsResult> {
  const { totalVideos, comparisons } = await computeTiktokPatternComparisons();
  if (totalVideos === 0) {
    return {
      available: true,
      reason: null,
      model: null,
      generatedAt: new Date().toISOString(),
      insights: [],
      basedOn: { itemsAnalyzed: 0, comparisonsUsed: 0 },
    };
  }
  return generateCreativeInsights({
    platformLabel: "TikTok",
    itemsAnalyzed: totalVideos,
    itemsLabel: "videos",
    comparisons,
    minSample: PATTERN_MIN_SAMPLE,
    metricGlossary: TIKTOK_METRIC_GLOSSARY,
    forbiddenTerms: ["reach"],
  });
}
