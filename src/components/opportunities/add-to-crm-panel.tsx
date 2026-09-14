"use client";

import { useState } from "react";
import { addLeadFromOpportunity, ApiError } from "@/lib/crm/client";
import type { EvidenceSnippet, FitScore, QualificationSignal, VerifiedBusiness } from "@/types/opportunity";

/** Derives a plain, evidence-grounded "why it fits" line — never invented, never AI-generated here. */
function deriveWhyItFits(signals: QualificationSignal[], aiWhySelected?: string | null): string {
  if (aiWhySelected) return aiWhySelected;
  const detected = signals.filter((s) => s.status === "detected").map((s) => s.label);
  if (detected.length > 0) return `Website evidence detected: ${detected.join(", ")}.`;
  return "Matches a targeted B2B category for Sing My Birthday.";
}

export function AddToCrmPanel({
  business,
  fitScore,
  signals,
  evidence,
  aiWhySelected,
  onClose,
  onAdded,
}: {
  business: VerifiedBusiness;
  fitScore: FitScore;
  signals: QualificationSignal[];
  evidence: EvidenceSnippet[];
  aiWhySelected?: string | null;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: boolean } | null>(null);
  const whyItFits = deriveWhyItFits(signals, aiWhySelected);

  async function handleAdd() {
    setSaving(true);
    setError(null);
    try {
      const res = await addLeadFromOpportunity({
        business,
        fitScore: { score: fitScore.score, band: fitScore.band },
        signals,
        evidence,
        whyItFits,
      });
      setResult({ created: res.created });
      onAdded();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not add to CRM.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8 sm:py-14" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-mm-ink">Add to CRM</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            ✕
          </button>
        </div>

        <div className="space-y-3 px-6 py-5 text-sm">
          {result ? (
            <div className="py-6 text-center">
              <p className="font-semibold text-mm-ink">
                {result.created ? "Added to CRM" : "Already in CRM"}
              </p>
              <p className="mt-1 text-xs text-mm-muted">
                {result.created
                  ? `${business.name} was added with status Approved.`
                  : `${business.name} is already tracked in the CRM — no duplicate was created.`}
              </p>
              <button type="button" onClick={onClose} className="mt-4 rounded-full bg-mm-pink px-4 py-2 text-xs font-semibold text-white">
                Done
              </button>
            </div>
          ) : (
            <>
              <Row label="Business" value={business.name} />
              <Row label="Category" value={business.category ?? "—"} />
              <Row label="Website" value={business.website ?? "Not available"} />
              <Row label="Score" value={`${fitScore.score}/100 (${fitScore.band})`} />
              <Row label="Why it fits" value={whyItFits} />
              <Row label="Source" value="Opportunity Discovery" />

              {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleAdd}
                  className="rounded-full bg-mm-pink px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Adding…" : "Add to CRM"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-mm-muted">{label}</p>
      <p className="text-mm-ink">{value}</p>
    </div>
  );
}
