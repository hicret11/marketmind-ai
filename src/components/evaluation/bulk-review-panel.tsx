"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, updateCase } from "@/lib/evaluation/client";
import { detectLeadQualificationEvidenceMismatch } from "@/lib/evaluation/evidence-audit";
import { canonicalizeUrl } from "@/lib/opportunity/util";
import type { BenchmarkCase, LeadQualificationInput, QualificationTier } from "@/types/evaluation";

/**
 * Fast bulk review for freshly-built candidates: one business at a time,
 * everything needed to judge it on screen at once, no separate page per
 * case. Q/N/S keyboard shortcuts commit immediately (mouse flow stays the
 * documented two-step: pick a verdict, then confirm) — nothing here ever
 * pre-selects a verdict; every case starts undecided.
 */
export function BulkReviewPanel({
  datasetId,
  candidates,
  onClose,
  onCaseReviewed,
}: {
  datasetId: string;
  candidates: BenchmarkCase[];
  onClose: () => void;
  onCaseReviewed?: (updated: BenchmarkCase) => void;
}) {
  const [index, setIndex] = useState(0);
  const [verdict, setVerdict] = useState<boolean | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  const current = candidates[index];
  const input = current?.input as LeadQualificationInput | undefined;
  const mismatch = input ? detectLeadQualificationEvidenceMismatch(input) : null;
  const done = index >= candidates.length;

  const advance = useCallback(() => {
    setVerdict(null);
    setNote("");
    setError(null);
    setIndex((i) => i + 1);
  }, []);

  const commit = useCallback(
    async (qualified: boolean) => {
      if (!current || saving) return;
      setSaving(true);
      setError(null);
      try {
        const tier: QualificationTier = qualified ? "strong" : "not_relevant";
        const res = await updateCase(datasetId, current.id, {
          groundTruth: { qualified, qualification: tier },
          reviewNote: note.trim() || (qualified ? "Bulk-reviewed: qualified." : "Bulk-reviewed: not qualified."),
          reviewStatus: "human_verified",
          evidenceMismatchAcknowledged: current.evidenceMismatchAcknowledged,
        });
        onCaseReviewed?.(res.case);
        setVerifiedCount((c) => c + 1);
        advance();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Could not save this review.");
      } finally {
        setSaving(false);
      }
    },
    [current, datasetId, note, saving, advance, onCaseReviewed],
  );

  function skip() {
    setSkippedCount((c) => c + 1);
    advance();
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (done || saving) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return; // don't hijack the note field
      if (mismatch?.suspected) return;
      if (e.key === "q" || e.key === "Q") commit(true);
      else if (e.key === "n" || e.key === "N") commit(false);
      else if (e.key === "s" || e.key === "S") skip();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, saving, mismatch?.suspected, commit]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8 sm:py-14" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-mm-ink">Review Candidates</h2>
            <p className="text-xs text-mm-muted">
              {done ? "All done" : `${index + 1} of ${candidates.length}`} · {verifiedCount} verified ·{" "}
              {skippedCount} skipped
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {done ? (
            <div className="py-10 text-center">
              <p className="text-sm font-semibold text-mm-ink">Review complete</p>
              <p className="mt-1 text-xs text-mm-muted">
                {verifiedCount} case{verifiedCount === 1 ? "" : "s"} marked Human Verified ·{" "}
                {skippedCount} left as Needs Review.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 rounded-full bg-mm-pink px-4 py-2 text-xs font-semibold text-white"
              >
                Done
              </button>
            </div>
          ) : current && input ? (
            <div className="space-y-4">
              <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full bg-mm-pink transition-all"
                  style={{ width: `${(index / candidates.length) * 100}%` }}
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-mm-ink">{input.businessName}</h3>
                <p className="text-xs text-mm-muted">
                  {input.category ?? "Uncategorized"} ·{" "}
                  {input.website ? (canonicalizeUrl(input.website)?.domain ?? input.website) : "no website"}
                </p>
                {input.referenceFitScore && (
                  <p className="mt-1 text-xs text-mm-muted">
                    MarketMind fit score: {input.referenceFitScore.score}/100 ({input.referenceFitScore.band})
                  </p>
                )}
              </div>

              {input.signals.filter((s) => s.status === "detected").length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-mm-ink">Detected signals</p>
                  <ul className="mt-1 space-y-0.5">
                    {input.signals
                      .filter((s) => s.status === "detected")
                      .map((s) => (
                        <li key={s.key} className="text-[11px] text-mm-muted">
                          {s.label} — {s.matchedTerms.join(", ")}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {input.evidence.length > 0 ? (
                <div>
                  <p className="text-[11px] font-medium text-mm-ink">Evidence</p>
                  <div className="mt-1 max-h-40 space-y-1.5 overflow-y-auto">
                    {input.evidence.slice(0, 4).map((e) => (
                      <div key={e.id} className="rounded border border-gray-100 bg-gray-50 p-2">
                        <p className="truncate font-mono text-[10px] text-mm-muted">{e.sourceUrl}</p>
                        <p className="mt-0.5 text-[11px] text-gray-700">{e.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-mm-muted">No website evidence extracted for this business.</p>
              )}

              {mismatch?.suspected && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-[11px] text-red-700">
                  ⚠ Suspected evidence/domain mismatch — this shouldn&apos;t normally reach bulk review. Skip it and
                  resolve it in the Dataset Manager&apos;s per-case editor.
                </div>
              )}

              {error && <p className="text-xs text-red-600">{error}</p>}

              <textarea
                placeholder="Optional note"
                value={note}
                onChange={(ev) => setNote(ev.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs"
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={saving || mismatch?.suspected}
                  onClick={() => setVerdict(true)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                    verdict === true ? "bg-green-600 text-white" : "border border-gray-300 text-gray-600"
                  }`}
                >
                  Qualified <span className="opacity-70">(Q)</span>
                </button>
                <button
                  type="button"
                  disabled={saving || mismatch?.suspected}
                  onClick={() => setVerdict(false)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                    verdict === false ? "bg-red-600 text-white" : "border border-gray-300 text-gray-600"
                  }`}
                >
                  Not Qualified <span className="opacity-70">(N)</span>
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={skip}
                  className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50"
                >
                  Skip <span className="opacity-70">(S)</span>
                </button>
                <button
                  type="button"
                  disabled={saving || verdict === null || mismatch?.suspected}
                  onClick={() => verdict !== null && commit(verdict)}
                  className="ml-auto rounded-full bg-mm-pink px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Mark Human Verified"}
                </button>
              </div>
              <p className="text-[10px] text-mm-muted">
                Keyboard: Q = Qualified &amp; verify, N = Not Qualified &amp; verify, S = skip.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
