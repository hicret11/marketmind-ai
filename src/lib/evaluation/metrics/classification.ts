import type { BenchmarkModelId, MetricResult, ModelCaseResult } from "@/types/evaluation";

/**
 * Classification metrics — used by Lead Qualification and Website Analysis
 * (both reduce to a single boolean prediction vs. a boolean ground truth).
 *
 * Every formula below is deterministic code, computed from stored
 * ModelCaseResult rows — never asked of an LLM, never estimated.
 *
 *   Accuracy  = (TP + TN) / (TP + TN + FP + FN)
 *   Precision = TP / (TP + FP)                    — null if TP+FP = 0
 *   Recall    = TP / (TP + FN)                    — null if TP+FN = 0
 *   F1        = 2 * Precision * Recall / (Precision + Recall)
 *   FPR       = FP / (FP + TN)                    — null if FP+TN = 0
 *   FNR       = FN / (FN + TP)                    — null if FN+TP = 0
 *
 * Silent Error Rate = count(silentFailureCategory == "incorrect_silent")
 *                      / casesWithGroundTruth
 * (see lib/evaluation/metrics/silent-failure.ts for how that category is assigned)
 */
export function aggregateClassificationMetrics(
  modelId: BenchmarkModelId,
  results: ModelCaseResult[],
): MetricResult {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  let silentIncorrect = 0;
  let withGroundTruth = 0;

  let latencySum = 0;
  let latencyCount = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let costSum = 0;
  let costKnown = 0;
  let apiErrors = 0;
  let timeouts = 0;
  let invalidOutputs = 0;
  let excludedCases = 0;

  for (const r of results) {
    if (r.status === "excluded") {
      // No call was made — excluded from every aggregate below, including
      // latency/token/cost (there is no "0ms" of real work to average in).
      excludedCases += 1;
      continue;
    }

    if (typeof r.latencyMs === "number") {
      latencySum += r.latencyMs;
      latencyCount += 1;
    }
    if (typeof r.inputTokens === "number") inputTokens += r.inputTokens;
    if (typeof r.outputTokens === "number") outputTokens += r.outputTokens;
    if (typeof r.estimatedCost === "number") {
      costSum += r.estimatedCost;
      costKnown += 1;
    }
    if (r.status === "error") apiErrors += 1;
    if (r.status === "timeout") timeouts += 1;
    if (r.status === "invalid_output") invalidOutputs += 1;

    if (r.actualPositive === null) continue;
    withGroundTruth += 1;

    if (r.predictedPositive === true && r.actualPositive === true) tp += 1;
    else if (r.predictedPositive === true && r.actualPositive === false) fp += 1;
    else if (r.predictedPositive === false && r.actualPositive === true) fn += 1;
    else if (r.predictedPositive === false && r.actualPositive === false) tn += 1;

    if (r.silentFailureCategory === "incorrect_silent") silentIncorrect += 1;
  }

  const total = tp + fp + fn + tn;
  const accuracy = total > 0 ? tp2(tp + tn, total) : null;
  const precision = tp + fp > 0 ? tp2(tp, tp + fp) : null;
  const recall = tp + fn > 0 ? tp2(tp, tp + fn) : null;
  const f1 =
    precision !== null && recall !== null && precision + recall > 0
      ? tp2(2 * precision * recall, precision + recall)
      : null;
  const fpr = fp + tn > 0 ? tp2(fp, fp + tn) : null;
  const fnr = fn + tp > 0 ? tp2(fn, fn + tp) : null;
  const silentErrorRate = withGroundTruth > 0 ? tp2(silentIncorrect, withGroundTruth) : null;

  return {
    modelId,
    casesEvaluated: results.length,
    casesWithGroundTruth: withGroundTruth,
    accuracy,
    precision,
    recall,
    f1,
    falsePositives: fp,
    falseNegatives: fn,
    truePositives: tp,
    trueNegatives: tn,
    falsePositiveRate: fpr,
    falseNegativeRate: fnr,
    silentErrorRate,
    avgLatencyMs: latencyCount > 0 ? Math.round(latencySum / latencyCount) : null,
    totalInputTokens: inputTokens,
    totalOutputTokens: outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCost: costKnown > 0 ? Math.round(costSum * 1_000_000) / 1_000_000 : null,
    apiErrors,
    timeouts,
    invalidOutputs,
    excludedCases,
  };
}

function tp2(numerator: number, denominator: number): number {
  return Math.round((numerator / denominator) * 10000) / 10000;
}
