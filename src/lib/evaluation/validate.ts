import {
  BUILD_TARGET_OPTIONS,
  DATASET_BUILDER_CATEGORY_GROUPS,
  DEFAULT_BUILD_TARGET,
  type BuildDatasetParams,
  type BuildTargetOption,
} from "./dataset-builder";
import { EvalError } from "./errors";
import { detectLeadQualificationEvidenceMismatch } from "./evidence-audit";
import type {
  BenchmarkModelId,
  BenchmarkTaskId,
  ContentInput,
  LeadQualificationGroundTruth,
  LeadQualificationInput,
  LyricsInput,
  QualificationTier,
  ReviewStatus,
  WebsiteAnalysisGroundTruth,
  WebsiteAnalysisInput,
} from "@/types/evaluation";
import { BENCHMARK_TASKS } from "./tasks";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const TASK_IDS = BENCHMARK_TASKS.map((t) => t.id);
const MODEL_IDS: BenchmarkModelId[] = ["gemini", "gpt-oss", "qwen", "nemotron", "gpt", "claude"];
const REVIEW_STATUSES: ReviewStatus[] = ["human_verified", "needs_review"];
const QUALIFICATION_TIERS: QualificationTier[] = ["strong", "potential", "weak", "not_relevant"];

export function parseTaskId(value: unknown): BenchmarkTaskId {
  if (typeof value !== "string" || !TASK_IDS.includes(value as BenchmarkTaskId)) {
    throw new EvalError("INVALID_REQUEST", `Unknown or missing benchmark task id: ${String(value)}`);
  }
  return value as BenchmarkTaskId;
}

export interface CreateCaseInput {
  label: string;
  input: unknown;
  groundTruth: unknown;
  reviewStatus: ReviewStatus;
  reviewNote: string | null;
  sourceBusinessId: string | null;
  evidenceMismatchAcknowledged: boolean;
}

export interface UpdateCaseInput {
  label?: string;
  input?: unknown;
  groundTruth?: unknown;
  reviewStatus?: ReviewStatus;
  reviewNote?: string | null;
  evidenceMismatchAcknowledged?: boolean;
}

/** Task-agnostic shape check — task-specific input/groundTruth shape is validated by the executor at run time. */
export function parseCreateCase(taskId: BenchmarkTaskId, body: unknown): CreateCaseInput {
  if (!isRecord(body)) throw new EvalError("INVALID_REQUEST", "Request body must be an object.");
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) throw new EvalError("INVALID_REQUEST", "`label` is required.");
  if (body.input === undefined) throw new EvalError("INVALID_REQUEST", "`input` is required.");

  const reviewStatus = parseReviewStatus(body.reviewStatus) ?? "needs_review";
  const evidenceMismatchAcknowledged = body.evidenceMismatchAcknowledged === true;
  if (reviewStatus === "human_verified" && taskId !== "image") {
    validateGroundTruthShape(taskId, body.groundTruth);
    assertEvidenceMismatchAcknowledged(taskId, body.input, evidenceMismatchAcknowledged);
  }

  return {
    label,
    input: body.input,
    groundTruth: body.groundTruth ?? null,
    reviewStatus,
    reviewNote: typeof body.reviewNote === "string" ? body.reviewNote : null,
    sourceBusinessId: typeof body.sourceBusinessId === "string" ? body.sourceBusinessId : null,
    evidenceMismatchAcknowledged,
  };
}

export function parseUpdateCase(taskId: BenchmarkTaskId, body: unknown): UpdateCaseInput {
  if (!isRecord(body)) throw new EvalError("INVALID_REQUEST", "Request body must be an object.");
  const update: UpdateCaseInput = {};
  if (typeof body.label === "string" && body.label.trim()) update.label = body.label.trim();
  if (body.input !== undefined) update.input = body.input;
  if (body.groundTruth !== undefined) update.groundTruth = body.groundTruth;
  const reviewStatus = parseReviewStatus(body.reviewStatus);
  if (reviewStatus) update.reviewStatus = reviewStatus;
  if (body.reviewNote !== undefined) {
    update.reviewNote = typeof body.reviewNote === "string" ? body.reviewNote : null;
  }
  if (typeof body.evidenceMismatchAcknowledged === "boolean") {
    update.evidenceMismatchAcknowledged = body.evidenceMismatchAcknowledged;
  }

  // If groundTruth/input are included in this same patch, validate them now. If the
  // caller is marking reviewStatus "human_verified" WITHOUT also patching them, the
  // route handler validates against the case's existing stored values instead (see
  // datasets/[id]/cases/[caseId]/route.ts) — this function can't see that here.
  if (update.groundTruth !== undefined && taskId !== "image") {
    validateGroundTruthShape(taskId, update.groundTruth);
  }
  if (update.reviewStatus === "human_verified" && update.input !== undefined) {
    assertEvidenceMismatchAcknowledged(taskId, update.input, update.evidenceMismatchAcknowledged ?? false);
  }
  return update;
}

function parseReviewStatus(value: unknown): ReviewStatus | undefined {
  return typeof value === "string" && REVIEW_STATUSES.includes(value as ReviewStatus)
    ? (value as ReviewStatus)
    : undefined;
}

/**
 * Blocks marking a Lead Qualification case Human Verified while its evidence
 * has a suspected, unacknowledged domain mismatch (see evidence-audit.ts) —
 * server-side enforcement of the same rule the reviewer UI gates on, so it
 * can't be bypassed by calling the API directly.
 */
export function assertEvidenceMismatchAcknowledged(
  taskId: BenchmarkTaskId,
  input: unknown,
  acknowledged: boolean,
): void {
  if (taskId !== "lead-qualification" || acknowledged) return;
  const mismatch = detectLeadQualificationEvidenceMismatch(input as LeadQualificationInput);
  if (mismatch.suspected) {
    throw new EvalError(
      "INVALID_REQUEST",
      `This case's evidence appears to come from a different domain than the business's own website (${mismatch.businessDomain}). Review the evidence and acknowledge the match before marking it Human Verified.`,
    );
  }
}

export function validateGroundTruthShape(taskId: BenchmarkTaskId, groundTruth: unknown): void {
  if (taskId === "lead-qualification") {
    if (!isRecord(groundTruth) || typeof groundTruth.qualified !== "boolean") {
      throw new EvalError(
        "INVALID_REQUEST",
        "Marking a case Human Verified requires groundTruth.qualified (boolean).",
      );
    }
    const qualification = (groundTruth as Record<string, unknown>).qualification;
    if (qualification !== undefined && !QUALIFICATION_TIERS.includes(qualification as QualificationTier)) {
      throw new EvalError("INVALID_REQUEST", "groundTruth.qualification must be a valid tier.");
    }
    return;
  }
  if (taskId === "website-analysis") {
    if (!isRecord(groundTruth) || typeof groundTruth.answer !== "boolean") {
      throw new EvalError(
        "INVALID_REQUEST",
        "Marking a case Human Verified requires groundTruth.answer (boolean).",
      );
    }
  }
  // lyrics / content have no ground truth concept — human-eval only.
}

export interface StartRunInput {
  taskId: BenchmarkTaskId;
  datasetId: string;
  modelIds: BenchmarkModelId[];
  confirm: boolean;
}

export function parseStartRun(body: unknown): StartRunInput {
  if (!isRecord(body)) throw new EvalError("INVALID_REQUEST", "Request body must be an object.");
  const taskId = parseTaskId(body.taskId);
  const datasetId = typeof body.datasetId === "string" ? body.datasetId : "";
  if (!datasetId) throw new EvalError("INVALID_REQUEST", "`datasetId` is required.");
  const modelIds = Array.isArray(body.modelIds)
    ? body.modelIds.filter((m): m is BenchmarkModelId => MODEL_IDS.includes(m as BenchmarkModelId))
    : [];
  if (modelIds.length === 0) {
    throw new EvalError("INVALID_REQUEST", "Select at least one model.");
  }
  return { taskId, datasetId, modelIds, confirm: body.confirm === true };
}

export interface HumanReviewInput {
  runId: string | null;
  taskId: BenchmarkTaskId;
  caseId: string;
  subjectId: string;
  subjectLabel: string;
  scores: Record<string, number>;
  note: string | null;
  reviewerName: string | null;
}

export function parseHumanReview(body: unknown): HumanReviewInput {
  if (!isRecord(body)) throw new EvalError("INVALID_REQUEST", "Request body must be an object.");
  const taskId = parseTaskId(body.taskId);
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  const subjectId = typeof body.subjectId === "string" ? body.subjectId : "";
  const subjectLabel = typeof body.subjectLabel === "string" ? body.subjectLabel : "";
  if (!caseId || !subjectId) {
    throw new EvalError("INVALID_REQUEST", "`caseId` and `subjectId` are required.");
  }
  if (!isRecord(body.scores)) {
    throw new EvalError("INVALID_REQUEST", "`scores` must be an object of dimension -> 0-10 number.");
  }
  const scores: Record<string, number> = {};
  for (const [key, value] of Object.entries(body.scores)) {
    const n = typeof value === "number" ? value : NaN;
    if (!Number.isFinite(n) || n < 0 || n > 10) {
      throw new EvalError("INVALID_REQUEST", `Score for "${key}" must be a number between 0 and 10.`);
    }
    scores[key] = n;
  }
  return {
    runId: typeof body.runId === "string" ? body.runId : null,
    taskId,
    caseId,
    subjectId,
    subjectLabel,
    scores,
    note: typeof body.note === "string" ? body.note : null,
    reviewerName: typeof body.reviewerName === "string" ? body.reviewerName : null,
  };
}

/** Payload accepted from Opportunity Discovery's "Add to Evaluation Dataset" button. */
export interface AddFromOpportunityInput {
  sourceBusinessId: string;
  label: string;
  input: LeadQualificationInput;
}

export function parseAddLeadQualificationFromOpportunity(body: unknown): AddFromOpportunityInput {
  if (!isRecord(body)) throw new EvalError("INVALID_REQUEST", "Request body must be an object.");
  const business = body.business;
  const fitScore = body.fitScore;
  const signals = body.signals;
  const evidence = body.evidence;
  if (!isRecord(business) || typeof business.id !== "string" || typeof business.name !== "string") {
    throw new EvalError("INVALID_REQUEST", "`business` (VerifiedBusiness) is required.");
  }
  if (!Array.isArray(signals) || !Array.isArray(evidence)) {
    throw new EvalError("INVALID_REQUEST", "`signals` and `evidence` arrays are required.");
  }

  const input: LeadQualificationInput = {
    businessName: business.name,
    category: typeof business.category === "string" ? business.category : null,
    address: typeof business.address === "string" ? business.address : null,
    website: typeof business.website === "string" ? business.website : null,
    matchedCategories: Array.isArray(business.matchedCategories)
      ? business.matchedCategories.filter((c): c is string => typeof c === "string")
      : [],
    signals: signals
      .filter(isRecord)
      .map((s) => ({
        key: String(s.key ?? ""),
        label: String(s.label ?? ""),
        status: String(s.status ?? "unknown"),
        confidence: typeof s.confidence === "number" ? s.confidence : 0,
        matchedTerms: Array.isArray(s.matchedTerms)
          ? s.matchedTerms.filter((t): t is string => typeof t === "string")
          : [],
      })),
    evidence: evidence.filter(isRecord).map((e) => ({
      id: String(e.id ?? ""),
      sourceUrl: String(e.sourceUrl ?? ""),
      matchedTerm: String(e.matchedTerm ?? ""),
      text: String(e.text ?? ""),
    })),
    referenceFitScore:
      isRecord(fitScore) && typeof fitScore.score === "number" && typeof fitScore.band === "string"
        ? { score: fitScore.score, band: fitScore.band }
        : null,
  };

  return { sourceBusinessId: business.id, label: business.name, input };
}

export function isLeadQualificationGroundTruth(value: unknown): value is LeadQualificationGroundTruth {
  return isRecord(value) && typeof value.qualified === "boolean";
}

export function isWebsiteAnalysisGroundTruth(value: unknown): value is WebsiteAnalysisGroundTruth {
  return isRecord(value) && typeof value.answer === "boolean";
}

export function isLyricsInput(value: unknown): value is LyricsInput {
  return isRecord(value) && typeof value.name === "string";
}

export function isContentInput(value: unknown): value is ContentInput {
  return isRecord(value) && typeof value.platform === "string";
}

const BUILD_GROUP_IDS = new Set(DATASET_BUILDER_CATEGORY_GROUPS.map((g) => g.id));

export function parseBuildDatasetBody(body: unknown): BuildDatasetParams {
  if (!isRecord(body)) throw new EvalError("INVALID_REQUEST", "Request body must be an object.");

  const location = typeof body.location === "string" ? body.location.trim() : "";
  if (!location) throw new EvalError("INVALID_REQUEST", "`location` is required.");
  if (location.length > 160) throw new EvalError("INVALID_REQUEST", "`location` is too long.");

  const targetRaw = Number(body.targetCount);
  const targetCount = (BUILD_TARGET_OPTIONS as readonly number[]).includes(targetRaw)
    ? (targetRaw as BuildTargetOption)
    : DEFAULT_BUILD_TARGET;

  let fillShortfall: BuildDatasetParams["fillShortfall"];
  if (isRecord(body.fillShortfall)) {
    const additionalRaw = Number(body.fillShortfall.additionalCount);
    const additionalCount = Number.isFinite(additionalRaw) ? Math.max(1, Math.trunc(additionalRaw)) : 0;
    const fromGroupIds = Array.isArray(body.fillShortfall.fromGroupIds)
      ? body.fillShortfall.fromGroupIds.filter(
          (g): g is string => typeof g === "string" && BUILD_GROUP_IDS.has(g),
        )
      : [];
    if (additionalCount > 0 && fromGroupIds.length > 0) {
      fillShortfall = { additionalCount, fromGroupIds };
    }
  }

  return { location, targetCount, fillShortfall };
}
