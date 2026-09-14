"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  getDefaultDataset,
  getRun,
  listCases,
  listModels,
  listRuns,
  setBaselineRun,
} from "@/lib/evaluation/client";
import { computeDatasetBalance } from "@/lib/evaluation/dataset-balance";
import type {
  BenchmarkCase,
  BenchmarkDataset,
  BenchmarkRun,
  BenchmarkTaskId,
  ModelCaseResult,
  ModelRegistryEntry,
  RegressionFinding,
} from "@/types/evaluation";
import { DatasetBalanceSummary } from "./dataset-balance-summary";
import { RunLauncher } from "./run-launcher";
import { RunResultView } from "./run-result-view";

const POLL_MS = 2500;

export function ClassificationBenchmarkPage({
  taskId,
  title,
  icon,
  description,
}: {
  taskId: BenchmarkTaskId;
  title: string;
  icon: string;
  description: string;
}) {
  const [models, setModels] = useState<ModelRegistryEntry[] | null>(null);
  const [dataset, setDataset] = useState<BenchmarkDataset | null>(null);
  const [cases, setCases] = useState<BenchmarkCase[]>([]);
  const [pastRuns, setPastRuns] = useState<BenchmarkRun[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [activeRun, setActiveRun] = useState<BenchmarkRun | null>(null);
  const [activeResults, setActiveResults] = useState<ModelCaseResult[] | null>(null);
  const [activeRegression, setActiveRegression] = useState<RegressionFinding[] | null>(null);
  const [settingBaseline, setSettingBaseline] = useState(false);
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
    setActiveRegression(res.regression);
    return res.run;
  }, []);

  useEffect(() => {
    if (!activeRun) return;
    const terminal = activeRun.status === "completed" || activeRun.status === "completed_with_errors" || activeRun.status === "failed";
    if (terminal) {
      if (pollRef.current) clearInterval(pollRef.current);
      load();
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

  async function handleSetBaseline() {
    if (!activeRun) return;
    setSettingBaseline(true);
    try {
      const res = await setBaselineRun(activeRun.id);
      setActiveRun(res.run);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not set baseline.");
    } finally {
      setSettingBaseline(false);
    }
  }

  const verifiedCount = cases.filter((c) => c.reviewStatus === "human_verified").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-xl">{icon}</span>
          <h1 className="text-2xl font-semibold text-mm-ink">{title}</h1>
        </div>
        <p className="mt-1 text-sm text-mm-muted">{description}</p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-4 text-xs text-mm-muted">
        <span>
          {cases.length} case{cases.length === 1 ? "" : "s"} · {verifiedCount} Human Verified
        </span>
        <Link href="/evaluation/datasets" className="text-mm-dark-rose underline decoration-mm-rose/50 underline-offset-2">
          Manage dataset →
        </Link>
      </div>

      {verifiedCount === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-mm-muted">
          Add Human Verified cases to start evaluating models.
        </div>
      )}

      <DatasetBalanceSummary balance={computeDatasetBalance(taskId, cases)} />

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
        <RunResultView
          run={activeRun}
          results={activeResults}
          cases={cases}
          regression={activeRegression}
          onSetBaseline={handleSetBaseline}
          settingBaseline={settingBaseline}
        />
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
                {r.isBaseline && " · baseline"}
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
