import { apiRequest } from "@/lib/http";
import type {
  BenchmarkCase,
  BenchmarkDataset,
  BenchmarkModelId,
  BenchmarkRun,
  BenchmarkTaskDefinition,
  BenchmarkTaskId,
  HumanReview,
  ModelCaseResult,
  ModelPricingEntry,
  ModelRegistryEntry,
  RegressionFinding,
  ReviewStatus,
} from "@/types/evaluation";

export { ApiError } from "@/lib/http";

/* ------------------------------- Models / tasks / pricing ------------------------------- */

export function listModels(): Promise<{ ok: true; models: ModelRegistryEntry[] }> {
  return apiRequest("/api/evaluation/models");
}

export function listTasks(): Promise<{ ok: true; tasks: BenchmarkTaskDefinition[] }> {
  return apiRequest("/api/evaluation/tasks");
}

export function listPricing(): Promise<{ ok: true; pricing: ModelPricingEntry[] }> {
  return apiRequest("/api/evaluation/pricing");
}

/* ------------------------------------- Datasets ------------------------------------------ */

export function getDefaultDataset(
  taskId: BenchmarkTaskId,
): Promise<{ ok: true; datasets: BenchmarkDataset[] }> {
  return apiRequest(`/api/evaluation/datasets?taskId=${encodeURIComponent(taskId)}`);
}

export function getDataset(id: string): Promise<{ ok: true; dataset: BenchmarkDataset }> {
  return apiRequest(`/api/evaluation/datasets/${id}`);
}

export function listCases(
  datasetId: string,
): Promise<{ ok: true; dataset: BenchmarkDataset; cases: BenchmarkCase[] }> {
  return apiRequest(`/api/evaluation/datasets/${datasetId}/cases`);
}

export interface CreateCasePayload {
  label: string;
  input: unknown;
  groundTruth?: unknown;
  reviewStatus?: ReviewStatus;
  reviewNote?: string | null;
  sourceBusinessId?: string | null;
  evidenceMismatchAcknowledged?: boolean;
}

export function createCase(
  datasetId: string,
  input: CreateCasePayload,
): Promise<{ ok: true; case: BenchmarkCase }> {
  return apiRequest(`/api/evaluation/datasets/${datasetId}/cases`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCase(
  datasetId: string,
  caseId: string,
  patch: Partial<CreateCasePayload>,
): Promise<{ ok: true; case: BenchmarkCase }> {
  return apiRequest(`/api/evaluation/datasets/${datasetId}/cases/${caseId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteCase(datasetId: string, caseId: string): Promise<{ ok: true }> {
  return apiRequest(`/api/evaluation/datasets/${datasetId}/cases/${caseId}`, { method: "DELETE" });
}

export function exportDatasetUrl(datasetId: string, format: "json" | "csv"): string {
  return `/api/evaluation/datasets/${datasetId}/export?format=${format}`;
}

/* --------------------------------------- Runs --------------------------------------------- */

export function listRuns(taskId?: BenchmarkTaskId): Promise<{ ok: true; runs: BenchmarkRun[] }> {
  const qs = taskId ? `?taskId=${encodeURIComponent(taskId)}` : "";
  return apiRequest(`/api/evaluation/runs${qs}`);
}

export interface RunEstimate {
  taskId: BenchmarkTaskId;
  promptVersion: string;
  caseCount: number;
  modelCount: number;
  estimatedCalls: number;
  models: { id: BenchmarkModelId; displayName: string; configured: boolean }[];
  unconfiguredModels: { id: BenchmarkModelId; displayName: string; configured: boolean }[];
  warning: string;
}

/** confirm:false (default) returns a cost/call estimate WITHOUT calling any model. */
export function estimateRun(
  taskId: BenchmarkTaskId,
  datasetId: string,
  modelIds: BenchmarkModelId[],
): Promise<{ ok: true; estimate: RunEstimate; started: false }> {
  return apiRequest("/api/evaluation/runs", {
    method: "POST",
    body: JSON.stringify({ taskId, datasetId, modelIds, confirm: false }),
  });
}

/** The ONLY call that actually starts a benchmark run (real API calls to selected models). */
export function startRun(
  taskId: BenchmarkTaskId,
  datasetId: string,
  modelIds: BenchmarkModelId[],
): Promise<{ ok: true; run: BenchmarkRun; started: true }> {
  return apiRequest("/api/evaluation/runs", {
    method: "POST",
    body: JSON.stringify({ taskId, datasetId, modelIds, confirm: true }),
  });
}

export function getRun(
  id: string,
  includeResults = false,
): Promise<{ ok: true; run: BenchmarkRun; results: ModelCaseResult[] | null; regression: RegressionFinding[] | null }> {
  const qs = includeResults ? "?includeResults=true" : "";
  return apiRequest(`/api/evaluation/runs/${id}${qs}`);
}

export function setBaselineRun(id: string): Promise<{ ok: true; run: BenchmarkRun }> {
  return apiRequest(`/api/evaluation/runs/${id}/baseline`, { method: "POST" });
}

/* ---------------------------------- Human reviews ------------------------------------------ */

export interface SubmitHumanReviewPayload {
  runId: string | null;
  taskId: BenchmarkTaskId;
  caseId: string;
  subjectId: string;
  subjectLabel: string;
  scores: Record<string, number>;
  note?: string | null;
  reviewerName?: string | null;
}

export function submitHumanReview(
  input: SubmitHumanReviewPayload,
): Promise<{ ok: true; review: HumanReview }> {
  return apiRequest("/api/evaluation/human-reviews", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listHumanReviewsForRun(runId: string): Promise<{ ok: true; reviews: HumanReview[] }> {
  return apiRequest(`/api/evaluation/human-reviews?runId=${encodeURIComponent(runId)}`);
}

export function listHumanReviewsForSubject(
  subjectId: string,
): Promise<{ ok: true; reviews: HumanReview[] }> {
  return apiRequest(`/api/evaluation/human-reviews?subjectId=${encodeURIComponent(subjectId)}`);
}

/* ------------------------------ Opportunity Discovery bridge ------------------------------- */

export interface AddLeadQualificationCasePayload {
  business: unknown;
  fitScore: unknown;
  signals: unknown[];
  evidence: unknown[];
}

export function addLeadQualificationCaseFromOpportunity(
  payload: AddLeadQualificationCasePayload,
): Promise<{ ok: true; case: BenchmarkCase; dataset: BenchmarkDataset; created: boolean }> {
  return apiRequest("/api/evaluation/lead-qualification/from-opportunity", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* --------------------------- Build Evaluation Dataset --------------------------------------- */

export interface CategoryBuildOutcome {
  groupId: string;
  label: string;
  target: number;
  added: number;
}

export interface CategoryShortfall {
  groupId: string;
  label: string;
  found: number;
  target: number;
}

export interface BuildDatasetResult {
  requested: number;
  added: number;
  skippedDuplicates: number;
  skippedEvidenceMismatch: number;
  skippedNoWebsite: number;
  skippedInsufficientMetadata: number;
  byCategory: CategoryBuildOutcome[];
  shortfalls: CategoryShortfall[];
  addedCases: BenchmarkCase[];
}

export interface BuildDatasetRequest {
  location: string;
  targetCount: 10 | 20 | 30;
  fillShortfall?: { additionalCount: number; fromGroupIds: string[] };
}

/**
 * Bulk-populates the Lead Qualification dataset from real businesses via the
 * existing OSM discovery + website analysis pipeline. Never calls a
 * benchmark model. Can take a while (discovery + website crawling across up
 * to 5 category groups) — the caller should show a long-running state.
 */
export function buildLeadQualificationDataset(
  params: BuildDatasetRequest,
): Promise<{ ok: true; result: BuildDatasetResult }> {
  return apiRequest("/api/evaluation/lead-qualification/build-dataset", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
