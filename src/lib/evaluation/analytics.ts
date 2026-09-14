import { rangeSinceIso, withinRange } from "@/lib/analytics/date-range";
import { getModelRegistry } from "./providers/registry";
import * as repo from "./repository";
import type {
  AiEvaluationSummary,
  BreakdownCount,
  DateRangeOption,
  EvaluationHighlight,
  OpportunityIntelligenceSummary,
} from "@/types/analytics";
import type {
  BenchmarkModelId,
  BenchmarkRun,
  LeadQualificationGroundTruth,
  LeadQualificationInput,
  MetricResult,
  QualificationTier,
} from "@/types/evaluation";

/**
 * Opportunity Intelligence + AI Evaluation summaries for the Analytics
 * module. Reads the Evaluation Lab's own repository/case data as-is — the
 * "Strong / Potential / Weak / Not Relevant" vocabulary here IS the Lead
 * Qualification dataset's human-verified ground truth (lib/evaluation/), the
 * only place that tier already exists. No score/metric is recalculated
 * differently than lib/evaluation/metrics/*.
 */

function scoreRangeLabel(score: number): string {
  if (score >= 76) return "76-100";
  if (score >= 51) return "51-75";
  if (score >= 26) return "26-50";
  return "0-25";
}

function countBy(items: string[]): BreakdownCount[] {
  const counts = new Map<string, number>();
  for (const label of items) counts.set(label, (counts.get(label) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getOpportunityIntelligence(range: DateRangeOption): Promise<OpportunityIntelligenceSummary> {
  const dataset = (await repo.listDatasets("lead-qualification"))[0];
  if (!dataset) {
    return {
      totalReviewed: 0,
      strong: 0,
      potential: 0,
      weak: 0,
      notRelevant: 0,
      needsReview: 0,
      byCategory: [],
      byScoreRange: [],
      topCategory: null,
      locationBreakdownAvailable: false,
    };
  }

  const allCases = await repo.listCases(dataset.id);
  const sinceIso = rangeSinceIso(range);
  const cases = allCases.filter((c) => withinRange(c.createdAt, sinceIso));

  let strong = 0;
  let potential = 0;
  let weak = 0;
  let notRelevant = 0;
  let needsReview = 0;
  const categories: string[] = [];
  const scoreRanges: string[] = [];
  const categoryVerified = new Map<string, { qualified: number; total: number }>();

  for (const c of cases) {
    const input = c.input as LeadQualificationInput;
    if (input.category) categories.push(input.category);
    if (input.referenceFitScore) scoreRanges.push(scoreRangeLabel(input.referenceFitScore.score));

    if (c.reviewStatus === "human_verified") {
      const gt = c.groundTruth as LeadQualificationGroundTruth | null;
      const tier: QualificationTier | null = gt?.qualification ?? null;
      if (tier === "strong") strong += 1;
      else if (tier === "potential") potential += 1;
      else if (tier === "weak") weak += 1;
      else if (tier === "not_relevant") notRelevant += 1;

      if (input.category && gt) {
        const entry = categoryVerified.get(input.category) ?? { qualified: 0, total: 0 };
        entry.total += 1;
        if (gt.qualified) entry.qualified += 1;
        categoryVerified.set(input.category, entry);
      }
    } else {
      needsReview += 1;
    }
  }

  let topCategory: OpportunityIntelligenceSummary["topCategory"] = null;
  for (const [label, { qualified, total }] of categoryVerified) {
    if (total < 2) continue; // don't rank a category off a single verified case
    const rate = qualified / total;
    if (!topCategory || rate > topCategory.qualifiedRate) {
      topCategory = { label, qualifiedRate: Math.round(rate * 10000) / 10000, verifiedCount: total };
    }
  }

  return {
    totalReviewed: cases.length,
    strong,
    potential,
    weak,
    notRelevant,
    needsReview,
    byCategory: countBy(categories),
    byScoreRange: countBy(scoreRanges),
    topCategory,
    // Opportunity Discovery's address field is free text (street only) — no
    // structured city/region is captured on these cases, so a location
    // breakdown would have to be guessed. It isn't.
    locationBreakdownAvailable: false,
  };
}

function pickHighlight(
  metrics: Partial<Record<BenchmarkModelId, MetricResult>>,
  modelIds: BenchmarkModelId[],
  value: (m: MetricResult) => number | null,
  better: (a: number, b: number) => boolean,
  displayName: (id: BenchmarkModelId) => string,
): EvaluationHighlight | null {
  let best: EvaluationHighlight | null = null;
  for (const id of modelIds) {
    const m = metrics[id];
    if (!m) continue;
    const v = value(m);
    if (v === null) continue;
    if (!best || better(v, best.value)) best = { modelId: id, displayName: displayName(id), value: v };
  }
  return best;
}

export async function getAiEvaluationSummary(): Promise<AiEvaluationSummary> {
  const runs = await repo.listRuns();
  const completed = runs.filter(
    (r) => (r.status === "completed" || r.status === "completed_with_errors") && r.metrics,
  );
  const latest: BenchmarkRun | undefined = completed[0]; // listRuns() already sorts newest-first

  if (!latest || !latest.metrics) {
    return {
      hasCompletedRun: false,
      totalCompletedRuns: completed.length,
      taskTitle: null,
      runStartedAt: null,
      runStatus: null,
      modelsTested: [],
      bestAccuracy: null,
      lowestFalsePositiveRate: null,
      fastest: null,
      lowestCost: null,
      isSmallSample: false,
    };
  }

  const registry = getModelRegistry();
  const displayName = (id: BenchmarkModelId) => registry.find((r) => r.id === id)?.displayName ?? id;
  const metrics = latest.metrics;
  const groundTruthCount = Math.max(0, ...latest.modelIds.map((id) => metrics[id]?.casesWithGroundTruth ?? 0));

  return {
    hasCompletedRun: true,
    totalCompletedRuns: completed.length,
    taskTitle: latest.taskId,
    runStartedAt: latest.startedAt,
    runStatus: latest.status,
    modelsTested: latest.modelIds.map(displayName),
    bestAccuracy: pickHighlight(metrics, latest.modelIds, (m) => m.accuracy, (a, b) => a > b, displayName),
    lowestFalsePositiveRate: pickHighlight(metrics, latest.modelIds, (m) => m.falsePositiveRate, (a, b) => a < b, displayName),
    fastest: pickHighlight(metrics, latest.modelIds, (m) => m.avgLatencyMs, (a, b) => a < b, displayName),
    lowestCost: pickHighlight(metrics, latest.modelIds, (m) => m.estimatedCost, (a, b) => a < b, displayName),
    isSmallSample: groundTruthCount > 0 && groundTruthCount < 20,
  };
}
