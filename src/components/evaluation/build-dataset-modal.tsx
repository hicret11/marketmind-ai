"use client";

import { useState } from "react";
import {
  ApiError,
  buildLeadQualificationDataset,
  type BuildDatasetResult,
} from "@/lib/evaluation/client";
import {
  BUILD_TARGET_OPTIONS,
  DATASET_BUILDER_CATEGORY_GROUPS,
  DEFAULT_BUILD_LOCATION,
  DEFAULT_BUILD_TARGET,
  type BuildTargetOption,
} from "@/lib/evaluation/dataset-builder-groups";
import type { BenchmarkCase } from "@/types/evaluation";
import { BulkReviewPanel } from "./bulk-review-panel";

type Phase = "setup" | "building" | "summary" | "review";

function mergeResults(prev: BuildDatasetResult, fill: BuildDatasetResult): BuildDatasetResult {
  const byCategory = prev.byCategory.map((c) => {
    const match = fill.byCategory.find((f) => f.groupId === c.groupId);
    return match ? { ...c, added: c.added + match.added } : c;
  });
  const shortfalls = byCategory
    .filter((c) => c.added < c.target)
    .map((c) => ({ groupId: c.groupId, label: c.label, found: c.added, target: c.target }));

  return {
    requested: prev.requested,
    added: prev.added + fill.added,
    skippedDuplicates: prev.skippedDuplicates + fill.skippedDuplicates,
    skippedEvidenceMismatch: prev.skippedEvidenceMismatch + fill.skippedEvidenceMismatch,
    skippedNoWebsite: prev.skippedNoWebsite + fill.skippedNoWebsite,
    skippedInsufficientMetadata: prev.skippedInsufficientMetadata + fill.skippedInsufficientMetadata,
    byCategory,
    shortfalls,
    addedCases: [...prev.addedCases, ...fill.addedCases],
  };
}

export function BuildDatasetModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [location, setLocation] = useState(DEFAULT_BUILD_LOCATION);
  const [targetCount, setTargetCount] = useState<BuildTargetOption>(DEFAULT_BUILD_TARGET);
  const [building, setBuilding] = useState(false);
  const [fillingShortfall, setFillingShortfall] = useState(false);
  const [result, setResult] = useState<BuildDatasetResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const perCategoryTarget = Math.max(1, Math.floor(targetCount / DATASET_BUILDER_CATEGORY_GROUPS.length));

  async function handleBuild() {
    if (!location.trim()) return;
    setBuilding(true);
    setError(null);
    setPhase("building");
    try {
      const res = await buildLeadQualificationDataset({ location: location.trim(), targetCount });
      setResult(res.result);
      setPhase("summary");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not build the dataset.");
      setPhase("setup");
    } finally {
      setBuilding(false);
    }
  }

  async function handleFillShortfall() {
    if (!result) return;
    const healthyGroupIds = result.byCategory
      .filter((c) => !result.shortfalls.some((s) => s.groupId === c.groupId))
      .map((c) => c.groupId);
    const additionalCount = result.shortfalls.reduce((sum, s) => sum + (s.target - s.found), 0);
    if (healthyGroupIds.length === 0 || additionalCount <= 0) return;

    setFillingShortfall(true);
    setError(null);
    try {
      const res = await buildLeadQualificationDataset({
        location: location.trim(),
        targetCount,
        fillShortfall: { additionalCount, fromGroupIds: healthyGroupIds },
      });
      setResult((prev) => (prev ? mergeResults(prev, res.result) : res.result));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not fill the shortfall.");
    } finally {
      setFillingShortfall(false);
    }
  }

  function handleCaseReviewed(updated: BenchmarkCase) {
    setResult((prev) =>
      prev ? { ...prev, addedCases: prev.addedCases.map((c) => (c.id === updated.id ? updated : c)) } : prev,
    );
  }

  if (phase === "review" && result) {
    return (
      <BulkReviewPanel
        datasetId={result.addedCases[0]?.datasetId ?? ""}
        candidates={result.addedCases.filter((c) => c.reviewStatus === "needs_review")}
        onCaseReviewed={handleCaseReviewed}
        onClose={() => {
          onDone();
          onClose();
        }}
      />
    );
  }

  const healthyGroupCount = result
    ? result.byCategory.filter((c) => !result.shortfalls.some((s) => s.groupId === c.groupId)).length
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8 sm:py-14" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-mm-ink">Build Evaluation Dataset</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          {phase === "setup" && (
            <div className="space-y-4">
              <p className="text-xs text-mm-muted">
                Discovers REAL businesses via OpenStreetMap + the existing website analysis pipeline and adds
                them as Needs Review candidates. Nothing is ever marked Qualified, Not Qualified, or Human
                Verified automatically — no benchmark model is called.
              </p>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
              )}

              <div>
                <label className="block text-xs font-medium text-mm-ink">Location</label>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="London"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-mm-ink">Target number of candidates</label>
                <div className="mt-1 flex gap-2">
                  {BUILD_TARGET_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setTargetCount(n)}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                        targetCount === n ? "bg-mm-pink text-white" : "border border-gray-300 text-gray-600"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-mm-ink">Category mix</p>
                <ul className="mt-1 space-y-1">
                  {DATASET_BUILDER_CATEGORY_GROUPS.map((g) => (
                    <li key={g.id} className="flex justify-between text-xs text-mm-muted">
                      <span>{g.label}</span>
                      <span>{perCategoryTarget} businesses</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                disabled={building || !location.trim()}
                onClick={handleBuild}
                className="w-full rounded-full bg-mm-pink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Start discovery
              </button>
            </div>
          )}

          {phase === "building" && (
            <div className="py-10 text-center text-sm text-mm-muted">
              Discovering real businesses in {location} and analyzing their websites… this can take a minute
              or two for {targetCount} candidates.
            </div>
          )}

          {phase === "summary" && result && (
            <div className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
              )}

              <div className="grid grid-cols-3 gap-2 text-center">
                <SummaryStat label="Requested" value={result.requested} />
                <SummaryStat label="Added" value={result.added} accent="text-green-700" />
                <SummaryStat label="Skipped duplicates" value={result.skippedDuplicates} />
                <SummaryStat label="Skipped evidence mismatch" value={result.skippedEvidenceMismatch} accent="text-amber-700" />
                <SummaryStat label="No website" value={result.skippedNoWebsite} />
                {result.skippedInsufficientMetadata > 0 && (
                  <SummaryStat label="Insufficient metadata" value={result.skippedInsufficientMetadata} />
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-mm-ink">By category</p>
                <ul className="mt-1 space-y-1">
                  {result.byCategory.map((c) => (
                    <li key={c.groupId} className="text-xs text-mm-muted">
                      <div className="flex justify-between">
                        <span>{c.label}</span>
                        <span>{c.added}</span>
                      </div>
                      {c.added < c.target && (
                        <p className="text-[11px] text-amber-700">
                          Only {c.added} valid business{c.added === 1 ? "" : "es"} found for this category.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {result.shortfalls.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  {healthyGroupCount > 0 ? (
                    <>
                      <p>
                        {result.shortfalls.reduce((s, f) => s + (f.target - f.found), 0)} slot
                        {result.shortfalls.reduce((s, f) => s + (f.target - f.found), 0) === 1 ? "" : "s"} short of
                        target. You can fill the remaining slots from the categories that had enough real
                        businesses — this never uses fake businesses.
                      </p>
                      <button
                        type="button"
                        disabled={fillingShortfall}
                        onClick={handleFillShortfall}
                        className="mt-2 rounded-full border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 disabled:opacity-50"
                      >
                        {fillingShortfall ? "Filling…" : "Fill remaining from other categories"}
                      </button>
                    </>
                  ) : (
                    <p>No other category had enough real businesses to fill this gap for {location}.</p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDone();
                    onClose();
                  }}
                  className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={result.addedCases.length === 0}
                  onClick={() => setPhase("review")}
                  className="rounded-full bg-mm-pink px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Review Candidates
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-2">
      <p className={`text-base font-semibold ${accent ?? "text-mm-ink"}`}>{value}</p>
      <p className="text-[10px] text-mm-muted">{label}</p>
    </div>
  );
}
