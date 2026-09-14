import type { MetricResult, Recommendation, RecommendationPriorities } from "@/types/evaluation";

/**
 * Transparent, user-weighted recommendation — never a secret formula. The
 * weights below are exactly what's shown to the user; the reason string names
 * the actual metric values that drove the pick. This is "recommended for this
 * task", never "universal best AI".
 */
const WEIGHT_VALUE: Record<"low" | "medium" | "high", number> = { low: 0, medium: 1, high: 2 };

function normalized(value: number | null, higherIsBetter: boolean, values: (number | null)[]): number {
  if (value === null) return 0;
  const finite = values.filter((v): v is number => v !== null);
  if (finite.length === 0) return 0;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (max === min) return 1;
  const n = (value - min) / (max - min);
  return higherIsBetter ? n : 1 - n;
}

export function recommendForTask(
  results: MetricResult[],
  priorities: RecommendationPriorities,
): Recommendation | null {
  const withGroundTruth = results.filter((r) => r.casesWithGroundTruth > 0);
  if (withGroundTruth.length === 0) return null;

  const accuracies = withGroundTruth.map((r) => r.accuracy);
  const fprs = withGroundTruth.map((r) => r.falsePositiveRate);
  const costs = withGroundTruth.map((r) => r.estimatedCost);
  const latencies = withGroundTruth.map((r) => r.avgLatencyMs);

  let best: { result: MetricResult; score: number } | null = null;
  for (const r of withGroundTruth) {
    const score =
      WEIGHT_VALUE[priorities.accuracy] * normalized(r.accuracy, true, accuracies) +
      WEIGHT_VALUE[priorities.falsePositive] * normalized(r.falsePositiveRate, false, fprs) +
      WEIGHT_VALUE[priorities.cost] * normalized(r.estimatedCost, false, costs) +
      WEIGHT_VALUE[priorities.latency] * normalized(r.avgLatencyMs, false, latencies);
    if (!best || score > best.score) best = { result: r, score };
  }
  if (!best) return null;

  const parts: string[] = [];
  if (best.result.accuracy !== null) parts.push(`accuracy ${pct(best.result.accuracy)}`);
  if (best.result.falsePositiveRate !== null) {
    parts.push(`false positive rate ${pct(best.result.falsePositiveRate)}`);
  }
  if (best.result.avgLatencyMs !== null) parts.push(`avg latency ${best.result.avgLatencyMs}ms`);
  if (best.result.estimatedCost !== null) parts.push(`est. cost $${best.result.estimatedCost}`);

  return {
    modelId: best.result.modelId,
    reason: `Best weighted score given your priorities (${parts.join(", ")}).`,
    weights: priorities,
  };
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}
