import type { PerformanceMetrics, SocialMediaInsightSnapshot } from "@/types/social";

/**
 * Deterministic performance calculations — done in code, never by the LLM.
 *
 * Every rate here has an explicit, documented denominator. A rate is `null`
 * (Not available) whenever its denominator is missing — it is never treated
 * as 0. `total_interactions` from Instagram already sums likes + comments +
 * saves + shares (per media type); we do not re-derive it.
 */

function num(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** ratio, rounded to 4 dp; null if numerator or denominator is unavailable or denom<=0. */
function rate(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator <= 0) return null;
  return Math.round((numerator / denominator) * 10000) / 10000;
}

export function computePerformance(
  igMediaId: string,
  metrics: Record<string, number | null>,
): PerformanceMetrics {
  const reach = num(metrics.reach);
  const views = num(metrics.views);
  const totalInteractions = num(metrics.total_interactions);
  const saved = num(metrics.saved);
  const shares = num(metrics.shares);
  const comments = num(metrics.comments);

  return {
    igMediaId,
    raw: metrics,
    interactionRate: rate(totalInteractions, reach),
    saveRate: rate(saved, reach),
    shareRate: rate(shares, reach),
    commentRate: rate(comments, reach),
    viewToInteractionRate: rate(totalInteractions, views),
    formulaNotes: {
      interactionRate: "total_interactions / reach (interactions per unique account reached)",
      saveRate: "saved / reach",
      shareRate: "shares / reach",
      commentRate: "comments / reach",
      viewToInteractionRate:
        "total_interactions / views (used for video/Reels where reach may be absent)",
    },
  };
}

export function performanceFromSnapshot(
  snapshot: SocialMediaInsightSnapshot,
): PerformanceMetrics {
  return computePerformance(snapshot.igMediaId, snapshot.metrics);
}

/** Mean of the non-null values, or null when nothing is available. */
export function average(values: Array<number | null>): number | null {
  const present = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (present.length === 0) return null;
  return Math.round((present.reduce((s, v) => s + v, 0) / present.length) * 10000) / 10000;
}
