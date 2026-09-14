"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, listModels, listRuns, listTasks } from "@/lib/evaluation/client";
import type { BenchmarkRun, BenchmarkTaskDefinition, ModelRegistryEntry } from "@/types/evaluation";
import { ModelRegistryList } from "@/components/evaluation/model-registry-list";

const MODE_LABEL: Record<BenchmarkTaskDefinition["evaluationMode"], string> = {
  classification: "Accuracy-based",
  "human-eval": "Human-scored",
};

export default function EvaluationOverviewPage() {
  const [models, setModels] = useState<ModelRegistryEntry[] | null>(null);
  const [tasks, setTasks] = useState<BenchmarkTaskDefinition[] | null>(null);
  const [runs, setRuns] = useState<BenchmarkRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([listModels(), listTasks(), listRuns()])
      .then(([m, t, r]) => {
        if (!active) return;
        setModels(m.models);
        setTasks(t.tasks);
        setRuns(r.runs);
      })
      .catch((e) => active && setError(e instanceof ApiError ? e.message : "Could not load the Evaluation Lab."));
    return () => {
      active = false;
    };
  }, []);

  const readyCount = models?.filter((m) => m.status === "ready").length ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-xl">🧪</span>
          <h1 className="text-2xl font-semibold text-mm-ink">AI Evaluation Lab</h1>
        </div>
        <p className="mt-1 text-sm text-mm-muted">
          There is no universal &ldquo;best AI&rdquo; — only the best model for a specific,
          real MarketMind task. Every number here traces back to a stored benchmark run; nothing
          is ever fabricated.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-mm-ink">Model Registry</h2>
          <Link href="/evaluation/models" className="text-xs text-mm-dark-rose underline decoration-mm-rose/50 underline-offset-2">
            View all →
          </Link>
        </div>
        {models ? (
          <>
            <p className="mb-3 text-xs text-mm-muted">{readyCount} of {models.length} model slots ready.</p>
            <ModelRegistryList models={models} />
          </>
        ) : (
          !error && <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-mm-muted">Loading…</div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-mm-ink">Benchmarks</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(tasks ?? []).map((task) => {
            const taskRuns = (runs ?? []).filter((r) => r.taskId === task.id);
            const lastRun = taskRuns[0];
            return (
              <Link
                key={task.id}
                href={task.route}
                className="rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-mm-rose"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-mm-ink">{task.title}</h3>
                  <span className="rounded-full bg-mm-soft-pink px-2 py-0.5 text-[10px] font-semibold text-mm-dark-rose">
                    {MODE_LABEL[task.evaluationMode]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-mm-muted">{task.description}</p>
                <p className="mt-3 text-[11px] text-mm-muted">
                  {taskRuns.length === 0
                    ? "No benchmark runs yet."
                    : `${taskRuns.length} run${taskRuns.length === 1 ? "" : "s"} · last ${lastRun.status.replace(/_/g, " ")}`}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-mm-ink">Manage evaluation datasets</h2>
        <p className="mt-1 text-xs text-mm-muted">
          Add cases, set Human Verified ground truth, and export datasets for any benchmark.
        </p>
        <Link
          href="/evaluation/datasets"
          className="mt-3 inline-block rounded-full bg-mm-pink px-3 py-1.5 text-xs font-semibold text-white"
        >
          Open Dataset Manager
        </Link>
      </section>
    </div>
  );
}
