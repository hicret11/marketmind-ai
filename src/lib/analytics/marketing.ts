import { rangeSinceIso, withinRange } from "./date-range";
import { PATTERN_MIN_SAMPLE } from "@/lib/social/config";
import { computePatternComparisons } from "@/lib/social/patterns";
import { average, computePerformance } from "@/lib/social/performance";
import { getConnectedAccount, latestMediaInsightsMap, listMedia } from "@/lib/social/repository";
import type { DateRangeOption, MarketingPerformanceSummary, BestPerformingLabel } from "@/types/analytics";
import type { PatternComparison } from "@/types/social";

/**
 * Marketing Performance — reads Social Analytics' own repository and
 * lib/social/performance.ts's deterministic formulas directly. Nothing is
 * recalculated with different math, and lib/social/* is never modified.
 * "Best performing X" reuses computePatternComparisons() as-is (it already
 * enforces PATTERN_MIN_SAMPLE) — sample-insufficient dimensions come back
 * null here, never guessed.
 */

function bestFromComparison(comparison: PatternComparison | undefined): BestPerformingLabel | null {
  if (!comparison || !comparison.sufficientData) return null;
  const qualifying = comparison.groups.filter((g) => g.posts >= comparison.minSample);
  let best: BestPerformingLabel | null = null;
  for (const g of qualifying) {
    if (g.avgInteractionRate === null) continue;
    if (!best || g.avgInteractionRate > (best.avgInteractionRate ?? -Infinity)) {
      best = { dimension: comparison.dimension, value: g.label, avgInteractionRate: g.avgInteractionRate, posts: g.posts };
    }
  }
  return best;
}

export async function getMarketingPerformance(range: DateRangeOption): Promise<MarketingPerformanceSummary> {
  const account = await getConnectedAccount();
  if (!account) {
    return {
      connected: false,
      postsAnalyzed: 0,
      postsInRange: 0,
      totalViews: null,
      totalReach: null,
      totalInteractions: null,
      avgInteractionRate: null,
      avgSaveRate: null,
      avgShareRate: null,
      bestCreativeType: null,
      bestHookType: null,
      bestCta: null,
      bestEmotion: null,
    };
  }

  const [allMedia, insights, patterns] = await Promise.all([
    listMedia(account.id),
    latestMediaInsightsMap(account.id),
    computePatternComparisons(),
  ]);

  const sinceIso = rangeSinceIso(range);
  const inRange = allMedia.filter((m) => withinRange(m.timestamp, sinceIso));

  let totalViews: number | null = null;
  let totalReach: number | null = null;
  let totalInteractions: number | null = null;
  const interactionRates: (number | null)[] = [];
  const saveRates: (number | null)[] = [];
  const shareRates: (number | null)[] = [];

  for (const m of inRange) {
    const snap = insights.get(m.igMediaId);
    if (!snap) continue;
    const perf = computePerformance(m.igMediaId, snap.metrics);
    if (typeof snap.metrics.views === "number") totalViews = (totalViews ?? 0) + snap.metrics.views;
    if (typeof snap.metrics.reach === "number") totalReach = (totalReach ?? 0) + snap.metrics.reach;
    if (typeof snap.metrics.total_interactions === "number") {
      totalInteractions = (totalInteractions ?? 0) + snap.metrics.total_interactions;
    }
    interactionRates.push(perf.interactionRate);
    saveRates.push(perf.saveRate);
    shareRates.push(perf.shareRate);
  }

  const byDimension = new Map(patterns.comparisons.map((c) => [c.dimension, c]));

  return {
    connected: true,
    postsAnalyzed: allMedia.length,
    postsInRange: inRange.length,
    totalViews,
    totalReach,
    totalInteractions,
    avgInteractionRate: average(interactionRates),
    avgSaveRate: average(saveRates),
    avgShareRate: average(shareRates),
    bestCreativeType: bestFromComparison(byDimension.get("creativeType")),
    bestHookType: bestFromComparison(byDimension.get("hookType")),
    bestCta: bestFromComparison(byDimension.get("ctaType")),
    bestEmotion: bestFromComparison(byDimension.get("primaryEmotion")),
  };
}

export { PATTERN_MIN_SAMPLE };
