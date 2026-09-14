import { randomUUID } from "node:crypto";
import { createJsonArrayStore } from "@/lib/file-store";
import { fingerprintCases } from "./hash";
import type {
  BenchmarkCase,
  BenchmarkDataset,
  BenchmarkModelId,
  BenchmarkRun,
  BenchmarkTaskId,
  HumanReview,
  ModelCaseResult,
} from "@/types/evaluation";

/**
 * Evaluation Lab persistence — file-based (Supabase not configured), same
 * pattern as CRM/Notes/Chat/Social. Flat filenames prefixed "evaluation-"
 * under ./.data (functionally the same as a .data/evaluation/ directory,
 * without needing to touch the shared file-store helper's directory logic).
 *
 *   evaluation-datasets.json
 *   evaluation-cases.json
 *   evaluation-runs.json
 *   evaluation-model-results.json
 *   evaluation-human-reviews.json
 *
 * Repository interfaces are intentionally narrow so a Supabase implementation
 * can replace this file later without touching callers.
 */

const datasetsStore = createJsonArrayStore<BenchmarkDataset>("evaluation-datasets.json");
const casesStore = createJsonArrayStore<BenchmarkCase>("evaluation-cases.json");
const runsStore = createJsonArrayStore<BenchmarkRun>("evaluation-runs.json");
const resultsStore = createJsonArrayStore<ModelCaseResult>("evaluation-model-results.json");
const reviewsStore = createJsonArrayStore<HumanReview>("evaluation-human-reviews.json");

/* ------------------------------- Datasets -------------------------------- */

export async function listDatasets(taskId?: BenchmarkTaskId): Promise<BenchmarkDataset[]> {
  const all = await datasetsStore.list();
  return taskId ? all.filter((d) => d.taskId === taskId) : all;
}

export async function getDataset(id: string): Promise<BenchmarkDataset | null> {
  const all = await datasetsStore.list();
  return all.find((d) => d.id === id) ?? null;
}

/** Returns the single default dataset for a task, creating it if needed. */
export async function getOrCreateDefaultDataset(
  taskId: BenchmarkTaskId,
  name: string,
): Promise<BenchmarkDataset> {
  const existing = (await listDatasets(taskId))[0];
  if (existing) return existing;

  const now = new Date().toISOString();
  const dataset: BenchmarkDataset = {
    id: randomUUID(),
    taskId,
    name,
    version: 1,
    fingerprint: fingerprintCases([]),
    createdAt: now,
    updatedAt: now,
  };
  return datasetsStore.mutate((all) => ({ items: [...all, dataset], result: dataset }));
}

async function touchDataset(datasetId: string): Promise<void> {
  const cases = await listCases(datasetId);
  const fingerprint = fingerprintCases(cases);
  await datasetsStore.mutate((all) => {
    const index = all.findIndex((d) => d.id === datasetId);
    if (index < 0) return { items: all, result: undefined };
    all[index] = {
      ...all[index],
      version: all[index].version + 1,
      fingerprint,
      updatedAt: new Date().toISOString(),
    };
    return { items: all, result: undefined };
  });
}

/* --------------------------------- Cases ---------------------------------- */

export async function listCases(datasetId: string): Promise<BenchmarkCase[]> {
  const all = await casesStore.list();
  return all
    .filter((c) => c.datasetId === datasetId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getCase(id: string): Promise<BenchmarkCase | null> {
  const all = await casesStore.list();
  return all.find((c) => c.id === id) ?? null;
}

export async function findCaseBySource(
  datasetId: string,
  sourceBusinessId: string,
): Promise<BenchmarkCase | null> {
  const cases = await listCases(datasetId);
  return cases.find((c) => c.sourceBusinessId === sourceBusinessId) ?? null;
}

export async function createCase(
  input: Omit<BenchmarkCase, "id" | "createdAt" | "updatedAt">,
): Promise<BenchmarkCase> {
  const now = new Date().toISOString();
  const record: BenchmarkCase = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
  await casesStore.mutate((all) => ({ items: [...all, record], result: undefined }));
  await touchDataset(input.datasetId);
  return record;
}

export async function updateCase(
  id: string,
  patch: Partial<BenchmarkCase>,
): Promise<BenchmarkCase | null> {
  const updated = await casesStore.mutate((all) => {
    const index = all.findIndex((c) => c.id === id);
    if (index < 0) return { items: all, result: null };
    all[index] = { ...all[index], ...patch, id, updatedAt: new Date().toISOString() };
    return { items: all, result: all[index] };
  });
  if (updated) await touchDataset(updated.datasetId);
  return updated;
}

export async function deleteCase(id: string): Promise<boolean> {
  const existing = await getCase(id);
  if (!existing) return false;
  await casesStore.mutate((all) => ({
    items: all.filter((c) => c.id !== id),
    result: undefined,
  }));
  await touchDataset(existing.datasetId);
  return true;
}

/* ---------------------------------- Runs ----------------------------------- */

export async function listRuns(taskId?: BenchmarkTaskId): Promise<BenchmarkRun[]> {
  const all = await runsStore.list();
  const filtered = taskId ? all.filter((r) => r.taskId === taskId) : all;
  return filtered.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function getRun(id: string): Promise<BenchmarkRun | null> {
  const all = await runsStore.list();
  return all.find((r) => r.id === id) ?? null;
}

export async function createRun(run: BenchmarkRun): Promise<BenchmarkRun> {
  await runsStore.mutate((all) => ({ items: [...all, run], result: undefined }));
  return run;
}

export async function updateRun(id: string, patch: Partial<BenchmarkRun>): Promise<BenchmarkRun | null> {
  return runsStore.mutate((all) => {
    const index = all.findIndex((r) => r.id === id);
    if (index < 0) return { items: all, result: null };
    all[index] = { ...all[index], ...patch, id };
    return { items: all, result: all[index] };
  });
}

export async function getBaselineRun(taskId: BenchmarkTaskId): Promise<BenchmarkRun | null> {
  const runs = await listRuns(taskId);
  return runs.find((r) => r.isBaseline) ?? null;
}

export async function setBaseline(runId: string): Promise<BenchmarkRun | null> {
  const run = await getRun(runId);
  if (!run) return null;
  await runsStore.mutate((all) => {
    const next = all.map((r) =>
      r.taskId === run.taskId ? { ...r, isBaseline: r.id === runId } : r,
    );
    return { items: next, result: undefined };
  });
  return getRun(runId);
}

/* ------------------------------ Model results ------------------------------ */

export async function addModelResult(result: ModelCaseResult): Promise<void> {
  await resultsStore.mutate((all) => ({ items: [...all, result], result: undefined }));
}

export async function listResultsForRun(runId: string): Promise<ModelCaseResult[]> {
  const all = await resultsStore.list();
  return all.filter((r) => r.runId === runId);
}

export async function listResultsForModel(
  runId: string,
  modelId: BenchmarkModelId,
): Promise<ModelCaseResult[]> {
  return (await listResultsForRun(runId)).filter((r) => r.modelId === modelId);
}

/* ------------------------------ Human reviews ------------------------------ */

export async function addHumanReview(
  review: Omit<HumanReview, "id" | "createdAt">,
): Promise<HumanReview> {
  const record: HumanReview = { ...review, id: randomUUID(), createdAt: new Date().toISOString() };
  await reviewsStore.mutate((all) => ({ items: [...all, record], result: undefined }));
  return record;
}

export async function listReviewsForRun(runId: string): Promise<HumanReview[]> {
  const all = await reviewsStore.list();
  return all.filter((r) => r.runId === runId);
}

export async function listReviewsForSubject(subjectId: string): Promise<HumanReview[]> {
  const all = await reviewsStore.list();
  return all.filter((r) => r.subjectId === subjectId);
}

export async function listReviewsForTask(taskId: BenchmarkTaskId): Promise<HumanReview[]> {
  const all = await reviewsStore.list();
  return all.filter((r) => r.taskId === taskId);
}
