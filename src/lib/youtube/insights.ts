import { PATTERN_MIN_SAMPLE } from "@/lib/social/config";
import { generateCreativeInsights } from "@/lib/social/creative-insights";
import { computeYoutubePatternComparisons } from "./patterns";
import type { CreativeInsightsResult } from "@/types/creative-insights";

/**
 * MarketMind AI Analysis for YouTube. Same evidence-grounding discipline as
 * Instagram's own generator (lib/social/insights.ts, untouched) via the
 * shared engine in lib/social/creative-insights.ts.
 *
 * Shorts and Long-form are NEVER averaged together in one comparison group:
 * computeYoutubePatternComparisons(format) already filters to one format
 * before computing any average, so a specific-format request is inherently
 * pure. When no format is requested ("All" tab), Shorts and Long-form are
 * analyzed as two fully separate AI calls and the results are merged —
 * still never mixed into one number.
 */

const YOUTUBE_METRIC_GLOSSARY = `- Views: the real YouTube view count per video (never call this "reach" — YouTube does not provide a reach metric here)
- Likes: real like count per video
- Comments: real comment count per video
- Engagement rate: (likes + comments) / views, calculated in code, never estimated
Note: watch time, average view duration, average view percentage, engaged views, and subscribers gained are NOT collected by MarketMind yet — never mention, estimate, or imply a value for them.`;

function scopingNoteFor(format: "shorts" | "long_form"): string {
  const label = format === "shorts" ? "Shorts" : "Long-form";
  return `Every video in this data is ${label} — this is a ${label}-only analysis. Explicitly say "${label}" in each finding and in the evidence, and never compare these numbers to the other video type.`;
}

async function generateForFormat(format: "shorts" | "long_form"): Promise<CreativeInsightsResult> {
  const { totalVideos, comparisons } = await computeYoutubePatternComparisons(format);
  if (totalVideos === 0) {
    return { available: true, reason: null, model: null, generatedAt: new Date().toISOString(), insights: [], basedOn: { itemsAnalyzed: 0, comparisonsUsed: 0 } };
  }
  return generateCreativeInsights({
    platformLabel: "YouTube",
    itemsAnalyzed: totalVideos,
    itemsLabel: format === "shorts" ? "Shorts" : "Long-form videos",
    comparisons,
    minSample: PATTERN_MIN_SAMPLE,
    metricGlossary: YOUTUBE_METRIC_GLOSSARY,
    scopingNote: scopingNoteFor(format),
    forbiddenTerms: ["reach"],
  });
}

function mergeResults(a: CreativeInsightsResult, b: CreativeInsightsResult): CreativeInsightsResult {
  if (!a.available && !b.available) return a;
  const usable = [a, b].filter((r) => r.available);
  return {
    available: true,
    reason: usable.every((r) => r.insights.length === 0) ? (usable[0]?.reason ?? null) : null,
    model: usable.find((r) => r.model)?.model ?? null,
    generatedAt: new Date().toISOString(),
    insights: [...a.insights, ...b.insights],
    basedOn: {
      itemsAnalyzed: (a.basedOn?.itemsAnalyzed ?? 0) + (b.basedOn?.itemsAnalyzed ?? 0),
      comparisonsUsed: (a.basedOn?.comparisonsUsed ?? 0) + (b.basedOn?.comparisonsUsed ?? 0),
    },
  };
}

export async function generateYoutubeInsights(format?: "shorts" | "long_form"): Promise<CreativeInsightsResult> {
  if (format) return generateForFormat(format);

  // "All" tab: analyze Shorts and Long-form completely separately, then combine the result lists.
  const [shorts, longForm] = await Promise.all([generateForFormat("shorts"), generateForFormat("long_form")]);
  return mergeResults(shorts, longForm);
}
