"use client";

import { useState } from "react";
import { ApiError, estimateRun, startRun, type RunEstimate } from "@/lib/evaluation/client";
import type { BenchmarkModelId, BenchmarkTaskId, ModelRegistryEntry } from "@/types/evaluation";

/**
 * Model selection -> real, non-fabricated call-count estimate -> explicit
 * "Start Benchmark" confirmation. No API call happens until the user has
 * seen the estimate and pressed Start.
 */
export function RunLauncher({
  taskId,
  datasetId,
  models,
  caseCount,
  onStarted,
}: {
  taskId: BenchmarkTaskId;
  datasetId: string | null;
  models: ModelRegistryEntry[];
  caseCount: number;
  onStarted: (runId: string) => void;
}) {
  const [selected, setSelected] = useState<Set<BenchmarkModelId>>(new Set());
  const [estimate, setEstimate] = useState<RunEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: BenchmarkModelId) {
    setEstimate(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleEstimate() {
    if (!datasetId || selected.size === 0) return;
    setEstimating(true);
    setError(null);
    try {
      const res = await estimateRun(taskId, datasetId, [...selected]);
      setEstimate(res.estimate);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not estimate this run.");
    } finally {
      setEstimating(false);
    }
  }

  async function handleStart() {
    if (!datasetId) return;
    setStarting(true);
    setError(null);
    try {
      const res = await startRun(taskId, datasetId, [...selected]);
      onStarted(res.run.id);
      setEstimate(null);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not start the benchmark run.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-mm-ink">Run a benchmark</h3>
      <p className="mt-1 text-xs text-mm-muted">
        {caseCount} case{caseCount === 1 ? "" : "s"} in this dataset. Select the models to compare.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((m) => (
          <label
            key={m.id}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
              m.status === "ready" ? "border-gray-200" : "border-gray-100 opacity-50"
            }`}
          >
            <input
              type="checkbox"
              disabled={m.status !== "ready"}
              checked={selected.has(m.id)}
              onChange={() => toggle(m.id)}
            />
            <span className="font-medium text-mm-ink">{m.displayName}</span>
            {m.status !== "ready" && <span className="ml-auto text-[10px] text-mm-muted">{m.status.replace(/_/g, " ")}</span>}
          </label>
        ))}
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      {!estimate ? (
        <button
          type="button"
          disabled={selected.size === 0 || caseCount === 0 || estimating || !datasetId}
          onClick={handleEstimate}
          className="mt-4 rounded-full bg-mm-pink px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {estimating ? "Estimating…" : "Review call estimate"}
        </button>
      ) : (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">
            {estimate.caseCount} cases × {estimate.modelCount} models = {estimate.estimatedCalls} API calls
          </p>
          <p className="mt-1">{estimate.warning}</p>
          {estimate.unconfiguredModels.length > 0 && (
            <p className="mt-1 text-red-700">
              Not configured: {estimate.unconfiguredModels.map((m) => m.displayName).join(", ")}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setEstimate(null)}
              className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={starting || estimate.unconfiguredModels.length > 0}
              onClick={handleStart}
              className="rounded-full bg-mm-pink px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {starting ? "Starting…" : "Start Benchmark"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
