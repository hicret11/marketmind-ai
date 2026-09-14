"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  getDefaultDataset,
  getRun,
  listCases,
  listHumanReviewsForRun,
  listModels,
  listRuns,
  submitHumanReview,
} from "@/lib/evaluation/client";
import type {
  BenchmarkCase,
  BenchmarkDataset,
  BenchmarkModelId,
  BenchmarkRun,
  BenchmarkTaskId,
  HumanReview,
  ModelCaseResult,
  ModelRegistryEntry,
} from "@/types/evaluation";
import { HumanEvalScoreForm } from "./human-eval-score-form";
import { RunLauncher } from "./run-launcher";

const MODEL_LABEL: Record<BenchmarkModelId, string> = {
  gemini: "Gemini",
  "gpt-oss": "GPT-OSS 120B",
  qwen: "Qwen",
  nemotron: "Nemotron",
  gpt: "GPT",
  claude: "Claude",
};

const POLL_MS = 2500;

export function HumanEvalBenchmarkPage({
  taskId,
  title,
  icon,
  description,
  dimensions,
}: {
  taskId: BenchmarkTaskId;
  title: string;
  icon: string;
  description: string;
  dimensions: readonly string[];
}) {
  const [models, setModels] = useState<ModelRegistryEntry[] | null>(null);
  const [dataset, setDataset] = useState<BenchmarkDataset | null>(null);
  const [cases, setCases] = useState<BenchmarkCase[]>([]);
  const [pastRuns, setPastRuns] = useState<BenchmarkRun[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [activeRun, setActiveRun] = useState<BenchmarkRun | null>(null);
  const [activeResults, setActiveResults] = useState<ModelCaseResult[] | null>(null);
  const [reviews, setReviews] = useState<HumanReview[]>([]);
  const [scoringSubjectId, setScoringSubjectId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [m, ds, runs] = await Promise.all([listModels(), getDefaultDataset(taskId), listRuns(taskId)]);
      setModels(m.models);
      const d = ds.datasets[0];
      setDataset(d);
      setPastRuns(runs.runs);
      const c = await listCases(d.id);
      setCases(c.cases);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load this benchmark.");
    }
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const fetchRun = useCallback(async (runId: string) => {
    const res = await getRun(runId, true);
    setActiveRun(res.run);
    setActiveResults(res.results);
    const r = await listHumanReviewsForRun(runId);
    setReviews(r.reviews);
    return res.run;
  }, []);

  useEffect(() => {
    if (!activeRun) return;
    const terminal =
      activeRun.status === "completed" || activeRun.status === "completed_with_errors" || activeRun.status === "failed";
    if (terminal) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(() => {
      fetchRun(activeRun.id).catch(() => undefined);
    }, POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRun?.id, activeRun?.status]);

  async function handleStarted(runId: string) {
    setError(null);
    await fetchRun(runId).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load the run."));
  }

  async function handleScoreSubmit(kase: BenchmarkCase, result: ModelCaseResult, scores: Record<string, number>, note: string) {
    if (!activeRun) return;
    setSubmitting(true);
    try {
      await submitHumanReview({
        runId: activeRun.id,
        taskId,
        caseId: kase.id,
        subjectId: result.id,
        subjectLabel: `${kase.label} · ${MODEL_LABEL[result.modelId]}`,
        scores,
        note: note || null,
      });
      const r = await listHumanReviewsForRun(activeRun.id);
      setReviews(r.reviews);
      setScoringSubjectId(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save the review.");
    } finally {
      setSubmitting(false);
    }
  }

  const caseById = new Map(cases.map((c) => [c.id, c]));
  const reviewBySubject = new Map(reviews.map((r) => [r.subjectId, r]));

  // Average "overall" score per model, from completed human reviews only.
  const averagesByModel = new Map<BenchmarkModelId, { sum: number; count: number }>();
  for (const r of reviews) {
    if (typeof r.scores.overall !== "number") continue;
    const result = activeResults?.find((res) => res.id === r.subjectId);
    if (!result) continue;
    const entry = averagesByModel.get(result.modelId) ?? { sum: 0, count: 0 };
    entry.sum += r.scores.overall;
    entry.count += 1;
    averagesByModel.set(result.modelId, entry);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-xl">{icon}</span>
          <h1 className="text-2xl font-semibold text-mm-ink">{title}</h1>
        </div>
        <p className="mt-1 text-sm text-mm-muted">{description}</p>
        <p className="mt-1 text-xs text-mm-muted">
          This is a creative task — there is no automated &ldquo;accuracy&rdquo;. Scores below come only from
          completed Human Evaluation.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-4 text-xs text-mm-muted">
        <span>{cases.length} case{cases.length === 1 ? "" : "s"} in this dataset.</span>
        <Link href="/evaluation/datasets" className="text-mm-dark-rose underline decoration-mm-rose/50 underline-offset-2">
          Manage dataset →
        </Link>
      </div>

      {cases.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-mm-muted">
          Add cases to start generating and comparing outputs.
        </div>
      )}

      {models && (
        <RunLauncher
          taskId={taskId}
          datasetId={dataset?.id ?? null}
          models={models}
          caseCount={cases.length}
          onStarted={handleStarted}
        />
      )}

      {activeRun && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-4">
            <span className="text-xs text-mm-muted">
              {activeRun.progress.completed}/{activeRun.progress.total} generated
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                activeRun.status === "completed" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
              }`}
            >
              {activeRun.status.replace(/_/g, " ")}
            </span>
          </div>

          {averagesByModel.size > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[...averagesByModel.entries()].map(([modelId, { sum, count }]) => (
                <div key={modelId} className="rounded-xl border border-gray-200 bg-white p-3 text-center">
                  <p className="text-xs font-semibold text-mm-ink">{MODEL_LABEL[modelId]}</p>
                  <p className="text-lg font-semibold text-mm-dark-rose">{(sum / count).toFixed(1)}/10</p>
                  <p className="text-[10px] text-mm-muted">{count} review{count === 1 ? "" : "s"}</p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {(activeResults ?? []).map((r) => {
              const kase = caseById.get(r.caseId);
              const review = reviewBySubject.get(r.id);
              return (
                <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-mm-ink">{kase?.label ?? r.caseId}</span>
                    <span className="text-xs text-mm-muted">{MODEL_LABEL[r.modelId]}</span>
                  </div>
                  {r.status === "ok" ? (
                    <p className="mt-2 whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs text-mm-ink">
                      {String(r.output ?? "")}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-red-600">{r.status}: {r.errorMessage}</p>
                  )}
                  <p className="mt-1 text-[11px] text-mm-muted">
                    {r.latencyMs}ms · {r.totalTokens ?? "—"} tokens
                  </p>

                  {review ? (
                    <p className="mt-2 text-xs text-mm-muted">
                      Human review: overall {review.scores.overall ?? "—"}/10{review.note ? ` — “${review.note}”` : ""}
                    </p>
                  ) : r.status === "ok" ? (
                    scoringSubjectId === r.id ? (
                      <div className="mt-2">
                        <HumanEvalScoreForm
                          dimensions={dimensions}
                          submitting={submitting}
                          onCancel={() => setScoringSubjectId(null)}
                          onSubmit={(scores, note) => kase && handleScoreSubmit(kase, r, scores, note)}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setScoringSubjectId(r.id)}
                        className="mt-2 rounded-full border border-gray-300 px-3 py-1 text-[11px] font-semibold text-gray-700"
                      >
                        Score this output
                      </button>
                    )
                  ) : (
                    <p className="mt-2 text-[11px] text-mm-muted">No Human Review yet.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!activeRun && pastRuns.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-mm-ink">Past runs</h3>
          <ul className="space-y-1 text-xs">
            {pastRuns.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => fetchRun(r.id)}
                  className="text-mm-dark-rose underline decoration-mm-rose/50 underline-offset-2"
                >
                  {new Date(r.startedAt).toLocaleString()}
                </button>{" "}
                — {r.status.replace(/_/g, " ")} · {r.modelIds.length} model{r.modelIds.length === 1 ? "" : "s"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!activeRun && pastRuns.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-mm-muted">
          No benchmark runs yet.
        </div>
      )}
    </div>
  );
}
