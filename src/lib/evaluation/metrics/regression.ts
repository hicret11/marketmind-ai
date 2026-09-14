import type { MetricResult, RegressionFinding, RegressionThresholds } from "@/types/evaluation";

/** Default thresholds — shown in the UI, not hidden. Editable per the task spec's own example. */
export const DEFAULT_REGRESSION_THRESHOLDS: RegressionThresholds = {
  maxAccuracyDropPct: 2,
  maxFalsePositiveRateIncreasePct: 3,
};

/**
 * Compares a model's current metrics against its own baseline-run metrics.
 * Only compares models present in BOTH runs. A finding is "regressed" when the
 * configured threshold is violated — thresholds are visible, never a hidden
 * scoring formula.
 */
export function checkRegression(
  current: MetricResult,
  baseline: MetricResult,
  thresholds: RegressionThresholds = DEFAULT_REGRESSION_THRESHOLDS,
): RegressionFinding[] {
  const findings: RegressionFinding[] = [];

  if (current.accuracy !== null && baseline.accuracy !== null) {
    const deltaPct = (current.accuracy - baseline.accuracy) * 100;
    findings.push({
      modelId: current.modelId,
      metric: "accuracy",
      baselineValue: baseline.accuracy,
      currentValue: current.accuracy,
      deltaPct: round2(deltaPct),
      regressed: deltaPct < -thresholds.maxAccuracyDropPct,
    });
  }

  if (current.falsePositiveRate !== null && baseline.falsePositiveRate !== null) {
    const deltaPct = (current.falsePositiveRate - baseline.falsePositiveRate) * 100;
    findings.push({
      modelId: current.modelId,
      metric: "falsePositiveRate",
      baselineValue: baseline.falsePositiveRate,
      currentValue: current.falsePositiveRate,
      deltaPct: round2(deltaPct),
      regressed: deltaPct > thresholds.maxFalsePositiveRateIncreasePct,
    });
  }

  return findings;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
