"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  createCase,
  deleteCase,
  exportDatasetUrl,
  getDefaultDataset,
  listCases,
  updateCase,
} from "@/lib/evaluation/client";
import { computeDatasetBalance } from "@/lib/evaluation/dataset-balance";
import { detectLeadQualificationEvidenceMismatch } from "@/lib/evaluation/evidence-audit";
import { BENCHMARK_TASKS } from "@/lib/evaluation/tasks";
import type { BenchmarkCase, BenchmarkDataset, BenchmarkTaskId, LeadQualificationInput } from "@/types/evaluation";
import { BuildDatasetModal } from "@/components/evaluation/build-dataset-modal";
import { CaseInputForm } from "@/components/evaluation/case-input-form";
import { DatasetBalanceSummary } from "@/components/evaluation/dataset-balance-summary";
import { GroundTruthEditor } from "@/components/evaluation/ground-truth-editor";

const CLASSIFICATION_TASKS: BenchmarkTaskId[] = ["lead-qualification", "website-analysis"];

function caseLabel(taskId: BenchmarkTaskId, kase: BenchmarkCase): string {
  const input = kase.input as Record<string, unknown>;
  if (taskId === "website-analysis") return String(input.question ?? kase.label);
  return kase.label;
}

function caseHasSuspectedMismatch(taskId: BenchmarkTaskId, kase: BenchmarkCase): boolean {
  if (taskId !== "lead-qualification") return false;
  const mismatch = detectLeadQualificationEvidenceMismatch(kase.input as LeadQualificationInput);
  return mismatch.suspected && !kase.evidenceMismatchAcknowledged;
}

export default function DatasetsPage() {
  const [taskId, setTaskId] = useState<BenchmarkTaskId>("lead-qualification");
  const [dataset, setDataset] = useState<BenchmarkDataset | null>(null);
  const [cases, setCases] = useState<BenchmarkCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [savingReview, setSavingReview] = useState(false);
  const [showBuildModal, setShowBuildModal] = useState(false);

  async function load(forTask: BenchmarkTaskId) {
    setLoading(true);
    setError(null);
    try {
      const ds = await getDefaultDataset(forTask);
      const d = ds.datasets[0];
      setDataset(d);
      const res = await listCases(d.id);
      setCases(res.cases);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load the dataset.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(taskId);
    setShowAdd(false);
    setEditingCaseId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  async function handleAddCase(label: string, input: unknown) {
    if (!dataset) return;
    setAdding(true);
    try {
      const res = await createCase(dataset.id, { label, input, reviewStatus: "needs_review" });
      setCases((prev) => [res.case, ...prev]);
      setShowAdd(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not add the case.");
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveGroundTruth(
    caseId: string,
    groundTruth: unknown,
    note: string,
    evidenceMismatchAcknowledged: boolean,
  ) {
    if (!dataset) return;
    setSavingReview(true);
    try {
      const res = await updateCase(dataset.id, caseId, {
        groundTruth,
        reviewNote: note,
        reviewStatus: "human_verified",
        evidenceMismatchAcknowledged,
      });
      setCases((prev) => prev.map((c) => (c.id === caseId ? res.case : c)));
      setEditingCaseId(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save ground truth.");
    } finally {
      setSavingReview(false);
    }
  }

  async function handleDelete(caseId: string) {
    if (!dataset) return;
    try {
      await deleteCase(dataset.id, caseId);
      setCases((prev) => prev.filter((c) => c.id !== caseId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete the case.");
    }
  }

  const verifiedCount = cases.filter((c) => c.reviewStatus === "human_verified").length;
  const isClassification = CLASSIFICATION_TASKS.includes(taskId);
  const balance = computeDatasetBalance(taskId, cases);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-xl">🗃️</span>
          <h1 className="text-2xl font-semibold text-mm-ink">Evaluation Datasets</h1>
        </div>
        <p className="mt-1 text-sm text-mm-muted">
          Human Verified cases are the primary ground truth — no model ever generates its own.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {BENCHMARK_TASKS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTaskId(t.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              taskId === t.id ? "bg-mm-pink text-white" : "border border-gray-300 text-gray-600"
            }`}
          >
            {t.shortTitle}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {dataset && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-mm-muted">
            <span className="font-semibold text-mm-ink">{dataset.name}</span> · v{dataset.version} ·{" "}
            {cases.length} case{cases.length === 1 ? "" : "s"} · {verifiedCount} human verified
          </div>
          <div className="flex gap-2">
            <a
              href={exportDatasetUrl(dataset.id, "json")}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700"
            >
              Export JSON
            </a>
            <a
              href={exportDatasetUrl(dataset.id, "csv")}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700"
            >
              Export CSV
            </a>
            <button
              type="button"
              onClick={() => setShowAdd((v) => !v)}
              className="rounded-full bg-mm-pink px-3 py-1.5 text-xs font-semibold text-white"
            >
              {showAdd ? "Close" : "Add case"}
            </button>
            {taskId === "lead-qualification" && (
              <button
                type="button"
                onClick={() => setShowBuildModal(true)}
                className="rounded-full border border-mm-rose px-3 py-1.5 text-xs font-semibold text-mm-dark-rose"
              >
                Build Evaluation Dataset
              </button>
            )}
          </div>
        </div>
      )}

      {showBuildModal && (
        <BuildDatasetModal
          onClose={() => setShowBuildModal(false)}
          onDone={() => load(taskId)}
        />
      )}

      {showAdd && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <CaseInputForm taskId={taskId} onSubmit={handleAddCase} submitting={adding} />
        </div>
      )}

      <DatasetBalanceSummary balance={balance} />

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-mm-muted">
          Loading dataset…
        </div>
      ) : cases.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-mm-muted">
          No cases yet. Add Human Verified cases to start evaluating models.
        </div>
      ) : (
        <ul className="space-y-2">
          {cases.map((c) => (
            <li key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-mm-ink">{caseLabel(taskId, c)}</p>
                  <p className="text-[11px] text-mm-muted">
                    {c.sourceBusinessId ? "From Opportunity Discovery · " : ""}
                    Updated {new Date(c.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {caseHasSuspectedMismatch(taskId, c) && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                      ⚠ Evidence mismatch
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      c.reviewStatus === "human_verified"
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {c.reviewStatus === "human_verified" ? "Human Verified" : "Needs Review"}
                  </span>
                  {isClassification && (
                    <button
                      type="button"
                      onClick={() => setEditingCaseId(editingCaseId === c.id ? null : c.id)}
                      className="rounded-full border border-gray-300 px-2.5 py-1 text-[11px] font-semibold text-gray-700"
                    >
                      {c.reviewStatus === "human_verified" ? "Edit" : "Review"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className="rounded-full border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {c.reviewNote && (
                <p className="mt-2 rounded bg-gray-50 px-2 py-1 text-[11px] text-mm-muted">
                  “{c.reviewNote}”
                </p>
              )}
              {isClassification && editingCaseId === c.id && (
                <div className="mt-3">
                  <GroundTruthEditor
                    kase={c}
                    saving={savingReview}
                    onCancel={() => setEditingCaseId(null)}
                    onSave={(gt, note, ack) => handleSaveGroundTruth(c.id, gt, note, ack)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
