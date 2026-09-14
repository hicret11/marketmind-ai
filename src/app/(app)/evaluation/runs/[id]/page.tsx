"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ApiError,
  getDataset,
  getRun,
  listCases,
  listHumanReviewsForRun,
  setBaselineRun,
} from "@/lib/evaluation/client";
import { getTaskDefinition } from "@/lib/evaluation/tasks";
import type {
  BenchmarkCase,
  BenchmarkModelId,
  BenchmarkRun,
  HumanReview,
  ModelCaseResult,
  RegressionFinding,
} from "@/types/evaluation";
import { RunResultView } from "@/components/evaluation/run-result-view";

const MODEL_LABEL: Record<BenchmarkModelId, string> = {
  gemini: "Gemini",
  "gpt-oss": "GPT-OSS 120B",
  qwen: "Qwen",
  nemotron: "Nemotron",
  gpt: "GPT",
  claude: "Claude",
};

export default function RunDetailPage() {
  const params = useParams<{ id: string }>();
  const runId = params.id;

  const [run, setRun] = useState<BenchmarkRun | null>(null);
  const [results, setResults] = useState<ModelCaseResult[] | null>(null);
  const [regression, setRegression] = useState<RegressionFinding[] | null>(null);
  const [cases, setCases] = useState<BenchmarkCase[]>([]);
  const [reviews, setReviews] = useState<HumanReview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [settingBaseline, setSettingBaseline] = useState(false);

  useEffect(() => {
    let active = true;
    getRun(runId, true)
      .then(async (res) => {
        if (!active) return;
        setRun(res.run);
        setResults(res.results);
        setRegression(res.regression);
        const ds = await getDataset(res.run.datasetId);
        const c = await listCases(ds.dataset.id);
        if (!active) return;
        setCases(c.cases);
        if (getTaskDefinition(res.run.taskId).evaluationMode === "human-eval") {
          const r = await listHumanReviewsForRun(res.run.id);
          if (active) setReviews(r.reviews);
        }
      })
      .catch((e) => active && setError(e instanceof ApiError ? e.message : "Could not load this run."));
    return () => {
      active = false;
    };
  }, [runId]);

  async function handleSetBaseline() {
    if (!run) return;
    setSettingBaseline(true);
    try {
      const res = await setBaselineRun(run.id);
      setRun(res.run);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not set baseline.");
    } finally {
      setSettingBaseline(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      </div>
    );
  }
  if (!run) {
    return (
      <div className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-mm-muted">
        Loading run…
      </div>
    );
  }

  const task = getTaskDefinition(run.taskId);
  const caseById = new Map(cases.map((c) => [c.id, c]));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-mm-ink">{task.title} — Run detail</h1>
      </header>

      {task.evaluationMode === "classification" ? (
        <RunResultView
          run={run}
          results={results}
          cases={cases}
          regression={regression}
          onSetBaseline={handleSetBaseline}
          settingBaseline={settingBaseline}
        />
      ) : (
        <div className="space-y-3">
          {(results ?? []).map((r) => {
            const kase = caseById.get(r.caseId);
            const review = reviews.find((rv) => rv.subjectId === r.id);
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
                  {review ? `Human review: overall ${review.scores.overall ?? "—"}/10` : "No Human Review yet."}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
