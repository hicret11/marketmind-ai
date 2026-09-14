"use client";

import { useMemo, useState } from "react";
import {
  CLASS_BALANCE_MIN_PER_SIDE,
  MIN_HUMAN_VERIFIED_FOR_BASELINE,
  SMALL_SAMPLE_WARNING_THRESHOLD,
} from "@/lib/evaluation/config";
import type {
  BenchmarkCase,
  BenchmarkModelId,
  BenchmarkRun,
  MetricResult,
  ModelCaseResult,
  RegressionFinding,
} from "@/types/evaluation";

const MODEL_LABEL: Record<BenchmarkModelId, string> = {
  gemini: "Gemini",
  "gpt-oss": "GPT-OSS 120B",
  qwen: "Qwen",
  nemotron: "Nemotron",
  gpt: "GPT",
  claude: "Claude",
};

function pct(v: number | null): string {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}
function num(v: number | null): string {
  return v === null ? "—" : String(v);
}
function cost(v: number | null): string {
  return v === null ? "Cost unavailable" : `$${v.toFixed(4)}`;
}

type Filter =
  | "all"
  | "false_positive"
  | "false_negative"
  | "silent_failure"
  | "disagreement"
  | "errors"
  | "excluded";

export function RunResultView({
  run,
  results,
  cases,
  regression,
  onSetBaseline,
  settingBaseline,
}: {
  run: BenchmarkRun;
  results: ModelCaseResult[] | null;
  cases: BenchmarkCase[];
  regression: RegressionFinding[] | null;
  onSetBaseline?: () => void;
  settingBaseline?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const caseById = useMemo(() => new Map(cases.map((c) => [c.id, c])), [cases]);
  const metrics = run.metrics as Partial<Record<BenchmarkModelId, MetricResult>> | null;

  const highlights = useMemo(() => {
    if (!metrics) return null;
    const entries = run.modelIds.map((id) => metrics[id]).filter((m): m is MetricResult => Boolean(m));
    const withGT = entries.filter((m) => m.casesWithGroundTruth > 0);
    const pick = <T,>(list: MetricResult[], value: (m: MetricResult) => T | null, better: (a: T, b: T) => boolean) => {
      let best: { modelId: BenchmarkModelId; value: T } | null = null;
      for (const m of list) {
        const v = value(m);
        if (v === null) continue;
        if (!best || better(v, best.value)) best = { modelId: m.modelId, value: v };
      }
      return best;
    };
    return {
      bestAccuracy: pick(withGT, (m) => m.accuracy, (a, b) => (a as number) > (b as number)),
      lowestFpr: pick(withGT, (m) => m.falsePositiveRate, (a, b) => (a as number) < (b as number)),
      bestRecall: pick(withGT, (m) => m.recall, (a, b) => (a as number) > (b as number)),
      fastest: pick(entries, (m) => m.avgLatencyMs, (a, b) => (a as number) < (b as number)),
      lowestCost: pick(entries, (m) => m.estimatedCost, (a, b) => (a as number) < (b as number)),
    };
  }, [metrics, run.modelIds]);

  const disagreementCaseIds = useMemo(() => {
    if (!results) return new Set<string>();
    const byCase = new Map<string, Set<string>>();
    for (const r of results) {
      if (r.predictedPositive === null) continue;
      const set = byCase.get(r.caseId) ?? new Set<string>();
      set.add(String(r.predictedPositive));
      byCase.set(r.caseId, set);
    }
    return new Set([...byCase.entries()].filter(([, v]) => v.size > 1).map(([k]) => k));
  }, [results]);

  const filteredResults = useMemo(() => {
    if (!results) return [];
    switch (filter) {
      case "false_positive":
        return results.filter((r) => r.predictedPositive === true && r.actualPositive === false);
      case "false_negative":
        return results.filter((r) => r.predictedPositive === false && r.actualPositive === true);
      case "silent_failure":
        return results.filter((r) => r.silentFailureCategory === "incorrect_silent");
      case "disagreement":
        return results.filter((r) => disagreementCaseIds.has(r.caseId));
      case "errors":
        return results.filter((r) => r.status === "error" || r.status === "timeout" || r.status === "invalid_output");
      case "excluded":
        return results.filter((r) => r.status === "excluded");
      default:
        return results;
    }
  }, [results, filter, disagreementCaseIds]);

  // Same dataset, so every evaluated model's casesWithGroundTruth is identical —
  // take the max defensively in case a model errored out before finishing.
  const groundTruthCount = metrics
    ? Math.max(0, ...run.modelIds.map((id) => metrics[id]?.casesWithGroundTruth ?? 0))
    : 0;
  const isSmallSample = metrics !== null && groundTruthCount > 0 && groundTruthCount < SMALL_SAMPLE_WARNING_THRESHOLD;
  const meetsBaselineThreshold = groundTruthCount >= MIN_HUMAN_VERIFIED_FOR_BASELINE;

  // Class balance, derived straight from the confusion-matrix counts already
  // stored per model — positive = TP+FN (all actual-positive ground truth),
  // negative = FP+TN (all actual-negative ground truth). Same "no fabricated
  // numbers" rule: computed, never estimated.
  const positiveGroundTruthCount = metrics
    ? Math.max(0, ...run.modelIds.map((id) => {
        const m = metrics[id];
        return m ? m.truePositives + m.falseNegatives : 0;
      }))
    : 0;
  const negativeGroundTruthCount = metrics
    ? Math.max(0, ...run.modelIds.map((id) => {
        const m = metrics[id];
        return m ? m.falsePositives + m.trueNegatives : 0;
      }))
    : 0;
  const isClassImbalanced =
    groundTruthCount > 0 && (positiveGroundTruthCount < CLASS_BALANCE_MIN_PER_SIDE || negativeGroundTruthCount < CLASS_BALANCE_MIN_PER_SIDE);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-xs text-mm-muted">
          Dataset v{run.datasetVersion} ({run.datasetFingerprint.slice(0, 8)}) · Prompt {run.promptVersion} ·{" "}
          Started {new Date(run.startedAt).toLocaleString()}
          {run.finishedAt && ` · Finished ${new Date(run.finishedAt).toLocaleString()}`}
        </div>
        <div className="flex items-center gap-2">
          {run.isBaseline && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
              Baseline
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              run.status === "completed"
                ? "bg-green-100 text-green-800"
                : run.status === "completed_with_errors"
                  ? "bg-amber-100 text-amber-800"
                  : run.status === "failed"
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-800"
            }`}
          >
            {run.status.replace(/_/g, " ")}
          </span>
          {!run.isBaseline && onSetBaseline && (run.status === "completed" || run.status === "completed_with_errors") && (
            <button
              type="button"
              onClick={onSetBaseline}
              disabled={settingBaseline || !meetsBaselineThreshold}
              title={
                meetsBaselineThreshold
                  ? undefined
                  : `Requires at least ${MIN_HUMAN_VERIFIED_FOR_BASELINE} Human Verified cases (this run has ${groundTruthCount}).`
              }
              className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50"
            >
              {settingBaseline ? "Setting…" : "Mark as Baseline"}
            </button>
          )}
        </div>
      </div>

      {isSmallSample && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          Small evaluation set — results are preliminary.{" "}
          <span className="font-normal text-amber-800">
            Only {groundTruthCount} Human Verified case{groundTruthCount === 1 ? "" : "s"} evaluated (
            {MIN_HUMAN_VERIFIED_FOR_BASELINE}+ recommended before treating this as a baseline or drawing
            conclusions).
          </span>
        </div>
      )}

      {isClassImbalanced && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          Class balance is too small for reliable comparison.{" "}
          <span className="font-normal text-amber-800">
            {positiveGroundTruthCount} positive / {negativeGroundTruthCount} negative Human Verified case
            {positiveGroundTruthCount + negativeGroundTruthCount === 1 ? "" : "s"} ({CLASS_BALANCE_MIN_PER_SIDE}+ of
            each recommended).
          </span>
        </div>
      )}

      {(run.status === "running" || run.status === "queued") && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-1 flex justify-between text-xs text-mm-muted">
            <span>Running…</span>
            <span>{run.progress.completed}/{run.progress.total} cases</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full bg-mm-pink transition-all"
              style={{ width: `${run.progress.total ? (run.progress.completed / run.progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {regression && regression.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-mm-ink">Regression vs. Baseline</h3>
          <ul className="mt-2 space-y-1 text-xs">
            {regression.map((f, i) => (
              <li key={i} className={f.regressed ? "text-red-700" : "text-mm-muted"}>
                {f.regressed ? "⚠ " : "✓ "}
                {MODEL_LABEL[f.modelId]} — {f.metric}: {pct(f.baselineValue)} → {pct(f.currentValue)} (
                {f.deltaPct > 0 ? "+" : ""}
                {f.deltaPct}pp){f.regressed ? " — regression detected" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {metrics && highlights && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ["Best Accuracy", highlights.bestAccuracy, pct],
            ["Lowest FPR", highlights.lowestFpr, pct],
            ["Best Recall", highlights.bestRecall, pct],
            ["Fastest", highlights.fastest, (v: number) => `${v}ms`],
            ["Lowest Cost", highlights.lowestCost, cost],
          ].map(([label, entry, fmt]) => (
            <div key={label as string} className="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-mm-muted">{label as string}</p>
              {entry ? (
                <>
                  <p className="mt-1 text-sm font-semibold text-mm-ink">
                    {MODEL_LABEL[(entry as { modelId: BenchmarkModelId }).modelId]}
                  </p>
                  <p className="text-xs text-mm-muted">
                    {(fmt as (v: number) => string)((entry as { value: number }).value)}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs text-mm-muted">Not evaluated yet</p>
              )}
            </div>
          ))}
        </div>
      )}

      {metrics && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[760px] text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-left text-mm-muted">
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2">Accuracy</th>
                <th className="px-3 py-2">Precision</th>
                <th className="px-3 py-2">Recall</th>
                <th className="px-3 py-2">F1</th>
                <th className="px-3 py-2">FPR</th>
                <th className="px-3 py-2">FNR</th>
                <th className="px-3 py-2">Silent Err.</th>
                <th className="px-3 py-2">Avg Latency</th>
                <th className="px-3 py-2">Tokens</th>
                <th className="px-3 py-2">Est. Cost</th>
                <th className="px-3 py-2">Errors</th>
                <th className="px-3 py-2">Excluded</th>
              </tr>
            </thead>
            <tbody>
              {run.modelIds.map((modelId) => {
                const m = metrics[modelId];
                if (!m) return null;
                return (
                  <tr key={modelId} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2 font-medium text-mm-ink">{MODEL_LABEL[modelId]}</td>
                    <td className="px-3 py-2">{pct(m.accuracy)}</td>
                    <td className="px-3 py-2">{pct(m.precision)}</td>
                    <td className="px-3 py-2">{pct(m.recall)}</td>
                    <td className="px-3 py-2">{pct(m.f1)}</td>
                    <td className="px-3 py-2">{pct(m.falsePositiveRate)}</td>
                    <td className="px-3 py-2">{pct(m.falseNegativeRate)}</td>
                    <td className="px-3 py-2">{pct(m.silentErrorRate)}</td>
                    <td className="px-3 py-2">{m.avgLatencyMs === null ? "—" : `${m.avgLatencyMs}ms`}</td>
                    <td className="px-3 py-2">{num(m.totalTokens)}</td>
                    <td className="px-3 py-2">{cost(m.estimatedCost)}</td>
                    <td className="px-3 py-2">
                      {m.apiErrors + m.timeouts + m.invalidOutputs === 0
                        ? "0"
                        : `${m.apiErrors + m.timeouts + m.invalidOutputs} (${m.apiErrors} api, ${m.timeouts} timeout, ${m.invalidOutputs} invalid)`}
                    </td>
                    <td className="px-3 py-2">
                      {m.excludedCases === 0 ? "0" : (
                        <span className="text-amber-700">{m.excludedCases} mismatch</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {results && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-mm-ink">Error Analysis &amp; Disagreement</h3>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["all", "All"],
                  ["false_positive", "False Positives"],
                  ["false_negative", "False Negatives"],
                  ["silent_failure", "Silent Failures"],
                  ["disagreement", "Model Disagreement"],
                  ["errors", "Errors"],
                  ["excluded", "Excluded (mismatch)"],
                ] as [Filter, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    filter === key ? "bg-mm-pink text-white" : "border border-gray-300 text-gray-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {filteredResults.length === 0 ? (
            <p className="py-6 text-center text-xs text-mm-muted">No results in this filter.</p>
          ) : (
            <ul className="space-y-2">
              {filteredResults.slice(0, 100).map((r) => {
                const kase = caseById.get(r.caseId);
                const output = r.output as { reason?: string; uncertainty?: string } | null;
                return (
                  <li key={r.id} className="rounded-lg border border-gray-100 p-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-mm-ink">{kase?.label ?? r.caseId}</span>
                      <span className="text-mm-muted">{MODEL_LABEL[r.modelId]}</span>
                    </div>
                    <div className="mt-1 grid gap-1 text-mm-muted sm:grid-cols-2">
                      <span>Ground truth: {r.actualPositive === null ? "not verified" : r.actualPositive ? "positive" : "negative"}</span>
                      <span>Model answer: {r.status !== "ok" ? r.status : r.predictedPositive === null ? "—" : r.predictedPositive ? "positive" : "negative"}</span>
                    </div>
                    {output?.reason && <p className="mt-1 text-mm-muted">Reason: {output.reason}</p>}
                    {output?.uncertainty && <p className="mt-1 text-amber-700">Uncertainty: {output.uncertainty}</p>}
                    {kase?.reviewNote && <p className="mt-1 text-mm-muted">Human note: {kase.reviewNote}</p>}
                    {r.errorMessage && <p className="mt-1 text-red-600">{r.errorMessage}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
