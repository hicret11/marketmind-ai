import type {
  BenchmarkCase,
  BenchmarkTaskId,
  LeadQualificationGroundTruth,
  LeadQualificationInput,
  WebsiteAnalysisGroundTruth,
  WebsiteAnalysisInput,
} from "@/types/evaluation";

/**
 * Dataset balance summary — purely descriptive, computed on demand from the
 * case list. Not persisted (recomputing is cheap and avoids ever going
 * stale). Only meaningful for the two classification tasks; callers should
 * treat `null` (human-eval tasks) as "not applicable", not "empty".
 */
export interface CategoryCount {
  label: string;
  count: number;
}

export interface DatasetBalance {
  verifiedPositive: number;
  verifiedNegative: number;
  unverified: number;
  categoryDistribution: CategoryCount[];
}

function positiveOf(taskId: BenchmarkTaskId, kase: BenchmarkCase): boolean | null {
  if (kase.reviewStatus !== "human_verified") return null;
  if (taskId === "lead-qualification") {
    return (kase.groundTruth as LeadQualificationGroundTruth | null)?.qualified ?? null;
  }
  if (taskId === "website-analysis") {
    return (kase.groundTruth as WebsiteAnalysisGroundTruth | null)?.answer ?? null;
  }
  return null;
}

function categoryOf(taskId: BenchmarkTaskId, kase: BenchmarkCase): string {
  if (taskId === "lead-qualification") {
    return (kase.input as LeadQualificationInput).category?.trim() || "Uncategorized";
  }
  if (taskId === "website-analysis") {
    const question = (kase.input as WebsiteAnalysisInput).question?.trim();
    return question ? (question.length > 48 ? `${question.slice(0, 48)}…` : question) : "Uncategorized";
  }
  return "Uncategorized";
}

export function computeDatasetBalance(
  taskId: BenchmarkTaskId,
  cases: BenchmarkCase[],
): DatasetBalance | null {
  if (taskId !== "lead-qualification" && taskId !== "website-analysis") return null;

  let verifiedPositive = 0;
  let verifiedNegative = 0;
  let unverified = 0;
  const categoryCounts = new Map<string, number>();

  for (const kase of cases) {
    const positive = positiveOf(taskId, kase);
    if (positive === true) verifiedPositive += 1;
    else if (positive === false) verifiedNegative += 1;
    else unverified += 1;

    const category = categoryOf(taskId, kase);
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
  }

  const categoryDistribution = Array.from(categoryCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return { verifiedPositive, verifiedNegative, unverified, categoryDistribution };
}

const SKEW_THRESHOLD = 0.5;
const LOW_CLASS_THRESHOLD = 5;

/** Plain-language, deterministic warnings — no AI judgment involved. */
export function computeBalanceWarnings(balance: DatasetBalance): string[] {
  const warnings: string[] = [];
  const total = balance.verifiedPositive + balance.verifiedNegative + balance.unverified;
  const [topCategory] = balance.categoryDistribution;

  if (total >= 4 && balance.categoryDistribution.length > 1 && topCategory && topCategory.count / total >= SKEW_THRESHOLD) {
    warnings.push(`Dataset is heavily skewed toward ${topCategory.label.toLowerCase()}.`);
  }
  if (balance.verifiedPositive > 0 && balance.verifiedPositive < LOW_CLASS_THRESHOLD) {
    warnings.push(`Only ${balance.verifiedPositive} positive case${balance.verifiedPositive === 1 ? "" : "s"} verified.`);
  }
  if (balance.verifiedNegative > 0 && balance.verifiedNegative < LOW_CLASS_THRESHOLD) {
    warnings.push(`Only ${balance.verifiedNegative} negative case${balance.verifiedNegative === 1 ? "" : "s"} verified.`);
  }
  return warnings;
}
