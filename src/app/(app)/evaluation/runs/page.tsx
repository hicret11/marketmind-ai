"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, listRuns } from "@/lib/evaluation/client";
import { BENCHMARK_TASKS } from "@/lib/evaluation/tasks";
import type { BenchmarkRun } from "@/types/evaluation";

const TASK_TITLE = Object.fromEntries(BENCHMARK_TASKS.map((t) => [t.id, t.shortTitle]));

export default function RunsPage() {
  const [runs, setRuns] = useState<BenchmarkRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listRuns()
      .then((res) => active && setRuns(res.runs))
      .catch((e) => active && setError(e instanceof ApiError ? e.message : "Could not load runs."));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-xl">📋</span>
          <h1 className="text-2xl font-semibold text-mm-ink">Benchmark Runs</h1>
        </div>
        <p className="mt-1 text-sm text-mm-muted">Every run across every benchmark, with real progress and status.</p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {runs && runs.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-mm-muted">
          No benchmark runs yet.
        </div>
      )}

      {runs && runs.length > 0 && (
        <ul className="space-y-2">
          {runs.map((r) => (
            <li key={r.id}>
              <Link
                href={`/evaluation/runs/${r.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-4 text-xs hover:border-mm-rose"
              >
                <div>
                  <span className="font-semibold text-mm-ink">{TASK_TITLE[r.taskId] ?? r.taskId}</span>
                  <span className="ml-2 text-mm-muted">{new Date(r.startedAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-mm-muted">
                  <span>{r.modelIds.length} model{r.modelIds.length === 1 ? "" : "s"}</span>
                  <span>{r.progress.completed}/{r.progress.total}</span>
                  {r.isBaseline && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">Baseline</span>}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      r.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : r.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : r.status === "completed_with_errors"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {r.status.replace(/_/g, " ")}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
