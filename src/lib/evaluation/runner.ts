import { randomUUID } from "node:crypto";
import { mapWithConcurrency } from "@/lib/opportunity/util";
import type {
  BenchmarkCase,
  BenchmarkModelId,
  BenchmarkRun,
  BenchmarkTaskId,
  MetricResult,
  ModelCaseResult,
} from "@/types/evaluation";
import { BENCHMARK_CONCURRENCY } from "./config";
import { EvalError } from "./errors";
import { aggregateClassificationMetrics } from "./metrics/classification";
import type { BenchmarkModelProvider } from "./providers/types";
import { getProvider } from "./providers/registry";
import * as repo from "./repository";
import { getTaskDefinition } from "./tasks";
import { runContentCase } from "./tasks/content";
import { runLeadQualificationCase } from "./tasks/lead-qualification";
import { runLyricsCase } from "./tasks/lyrics";
import type { ClassificationCaseOutcome, TextGenerationOutcome } from "./tasks/types";
import { runWebsiteAnalysisCase } from "./tasks/website-analysis";

export interface StartBenchmarkRunParams {
  taskId: BenchmarkTaskId;
  datasetId: string;
  modelIds: BenchmarkModelId[];
}

/**
 * Real, non-fabricated call-count estimate shown to the user BEFORE they
 * confirm a run — "N cases x M models = N*M calls". No benchmark call may
 * happen before this is shown and explicitly confirmed (see API route).
 */
export function estimateCallCount(caseCount: number, modelCount: number): number {
  return caseCount * modelCount;
}

/**
 * Validates the request, creates the run record (status "running", real
 * progress 0/total), then kicks off execution WITHOUT awaiting it — this is a
 * long-lived Node process (not a serverless/edge function), so the detached
 * promise keeps running and persists progress via repo.updateRun as it goes.
 * GET /api/evaluation/runs/[id] simply reads the run record back, which is
 * why progress always reflects reality instead of a fabricated percentage.
 */
export async function startBenchmarkRun(params: StartBenchmarkRunParams): Promise<BenchmarkRun> {
  const task = getTaskDefinition(params.taskId);

  const dataset = await repo.getDataset(params.datasetId);
  if (!dataset) throw new EvalError("NOT_FOUND", "Dataset not found.");
  if (dataset.taskId !== params.taskId) {
    throw new EvalError("INVALID_REQUEST", "That dataset does not belong to this benchmark task.");
  }
  if (params.modelIds.length === 0) {
    throw new EvalError("INVALID_REQUEST", "Select at least one model to benchmark.");
  }

  const providers: BenchmarkModelProvider[] = [];
  for (const modelId of params.modelIds) {
    const provider = getProvider(modelId);
    if (!provider) throw new EvalError("INVALID_REQUEST", `Unknown model id: ${modelId}`);
    if (!provider.isConfigured()) {
      throw new EvalError(
        "MODEL_NOT_CONFIGURED",
        `${provider.displayName} is not configured — cannot include it in a run.`,
      );
    }
    providers.push(provider);
  }

  const cases = await repo.listCases(params.datasetId);
  if (cases.length === 0) {
    throw new EvalError("INVALID_REQUEST", "This dataset has no cases yet — add at least one case first.");
  }

  const run: BenchmarkRun = {
    id: randomUUID(),
    taskId: params.taskId,
    datasetId: dataset.id,
    datasetVersion: dataset.version,
    datasetFingerprint: dataset.fingerprint,
    promptVersion: task.promptVersion,
    modelIds: params.modelIds,
    status: "running",
    progress: { completed: 0, total: cases.length * providers.length },
    isBaseline: false,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    metrics: null,
    error: null,
  };
  await repo.createRun(run);

  void executeRun(run, cases, providers, task.evaluationMode).catch(async (error) => {
    console.error(`[evaluation] run ${run.id} failed:`, error);
    await repo.updateRun(run.id, {
      status: "failed",
      finishedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown runner error",
    });
  });

  return run;
}

async function executeRun(
  run: BenchmarkRun,
  cases: BenchmarkCase[],
  providers: BenchmarkModelProvider[],
  evaluationMode: "classification" | "human-eval",
): Promise<void> {
  const pairs = cases.flatMap((kase) => providers.map((provider) => ({ kase, provider })));
  let completed = 0;
  const total = pairs.length;

  const results = await mapWithConcurrency(pairs, BENCHMARK_CONCURRENCY, async ({ kase, provider }) => {
    const result = await runOnePair(run, kase, provider, evaluationMode);
    await repo.addModelResult(result);
    completed += 1;
    await repo.updateRun(run.id, { progress: { completed, total } });
    return result;
  });

  // "excluded" (evidence-mismatch gate) is neither success nor failure — it's
  // a deliberate skip. A run that's all-excluded still "completed" the work
  // it could safely do, so it's not "failed"; but it's also not a clean
  // "completed" since something needs the reviewer's attention, hence
  // "completed_with_errors" whenever real errors OR exclusions are present.
  const okCount = results.filter((r) => r.status === "ok").length;
  const excludedCount = results.filter((r) => r.status === "excluded").length;
  const problemCount = results.length - okCount - excludedCount;
  const status =
    okCount === 0 && excludedCount === 0
      ? "failed"
      : problemCount > 0 || excludedCount > 0
        ? "completed_with_errors"
        : "completed";

  let metrics: Partial<Record<BenchmarkModelId, MetricResult>> | null = null;
  if (evaluationMode === "classification") {
    metrics = {};
    for (const modelId of run.modelIds) {
      const forModel = results.filter((r) => r.modelId === modelId);
      metrics[modelId] = aggregateClassificationMetrics(modelId, forModel);
    }
  }

  await repo.updateRun(run.id, {
    status,
    progress: { completed, total },
    finishedAt: new Date().toISOString(),
    metrics: metrics as BenchmarkRun["metrics"],
  });
}

async function runOnePair(
  run: BenchmarkRun,
  kase: BenchmarkCase,
  provider: BenchmarkModelProvider,
  evaluationMode: "classification" | "human-eval",
): Promise<ModelCaseResult> {
  const createdAt = new Date().toISOString();
  const base = {
    id: randomUUID(),
    runId: run.id,
    taskId: run.taskId,
    caseId: kase.id,
    modelId: provider.id,
    provider: provider.providerName,
    createdAt,
  };

  if (evaluationMode === "classification") {
    const outcome = await runClassificationCase(run.taskId, provider, kase);
    return {
      ...base,
      requestedModelId: outcome.requestedModelId,
      actualModelId: outcome.actualModelId,
      modelMismatch: outcome.modelMismatch,
      status: outcome.status,
      latencyMs: outcome.latencyMs,
      inputTokens: outcome.inputTokens,
      outputTokens: outcome.outputTokens,
      totalTokens: outcome.totalTokens,
      estimatedCost: outcome.estimatedCost,
      rawOutputSnippet: outcome.rawOutputSnippet,
      output: outcome.output,
      predictedPositive: outcome.predictedPositive,
      actualPositive: outcome.actualPositive,
      correct: outcome.correct,
      silentFailureCategory: outcome.silentFailureCategory,
      errorMessage: outcome.errorMessage,
    };
  }

  const outcome = await runTextGenerationCase(run.taskId, provider, kase);
  return {
    ...base,
    requestedModelId: outcome.requestedModelId,
    actualModelId: outcome.actualModelId,
    modelMismatch: outcome.modelMismatch,
    status: outcome.status,
    latencyMs: outcome.latencyMs,
    inputTokens: outcome.inputTokens,
    outputTokens: outcome.outputTokens,
    totalTokens: outcome.totalTokens,
    estimatedCost: outcome.estimatedCost,
    rawOutputSnippet: outcome.output ? outcome.output.slice(0, 2000) : null,
    output: outcome.output,
    predictedPositive: null,
    actualPositive: null,
    correct: null,
    silentFailureCategory: null,
    errorMessage: outcome.errorMessage,
  };
}

function runClassificationCase(
  taskId: BenchmarkTaskId,
  provider: BenchmarkModelProvider,
  kase: BenchmarkCase,
): Promise<ClassificationCaseOutcome> {
  if (taskId === "lead-qualification") return runLeadQualificationCase(provider, kase);
  if (taskId === "website-analysis") return runWebsiteAnalysisCase(provider, kase);
  throw new EvalError("INTERNAL", `Task "${taskId}" is not a classification benchmark.`);
}

function runTextGenerationCase(
  taskId: BenchmarkTaskId,
  provider: BenchmarkModelProvider,
  kase: BenchmarkCase,
): Promise<TextGenerationOutcome> {
  if (taskId === "lyrics") return runLyricsCase(provider, kase);
  if (taskId === "content") return runContentCase(provider, kase);
  throw new EvalError("INTERNAL", `Task "${taskId}" is not a text-generation benchmark.`);
}
