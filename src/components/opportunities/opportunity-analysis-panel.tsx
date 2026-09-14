"use client";

import { useState } from "react";
import type {
  EvidenceSnippet,
  OpportunityGeneration,
  OutreachGeneration,
  VerifiedBusiness,
} from "@/types/opportunity";
import { ApiError, runOutreach } from "@/lib/opportunity/client";
import { EvidenceList } from "./evidence-list";

function SectionCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white/70 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-700">
        {label}
      </p>
      <div className="mt-1 text-sm leading-relaxed text-mm-ink">{children}</div>
    </div>
  );
}

function ConfidencePill({ confidence }: { confidence: string }) {
  const styles: Record<string, string> = {
    high: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-gray-200 text-gray-600",
  };
  return (
    <span
      className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
        styles[confidence] ?? styles.low
      }`}
    >
      {confidence} confidence
    </span>
  );
}

/**
 * "MarketMind AI Opportunity Intelligence" — the AI interpretation, visually
 * separated from verified data. The active provider (Gemini) is never named
 * in this UI — it's an implementation detail.
 */
export function OpportunityAnalysisPanel({
  business,
  generation,
  evidence,
  onGenerate,
  generating,
  error,
}: {
  business: VerifiedBusiness;
  generation: OpportunityGeneration | null;
  evidence: EvidenceSnippet[];
  onGenerate: () => void;
  generating: boolean;
  error: string | null;
}) {
  const [outreach, setOutreach] = useState<OutreachGeneration | null>(null);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [outreachError, setOutreachError] = useState<string | null>(null);

  const analysis = generation?.available ? generation.analysis : null;

  async function handleOutreach() {
    if (!analysis) return;
    setOutreachLoading(true);
    setOutreachError(null);
    try {
      const result = await runOutreach(business, analysis, evidence);
      setOutreach(result.outreach);
    } catch (err) {
      setOutreachError(err instanceof ApiError ? err.message : "Outreach generation failed.");
    } finally {
      setOutreachLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-purple-200 bg-mm-lavender/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-purple-600 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
            MarketMind AI Opportunity Intelligence
          </span>
          <span className="text-xs text-mm-muted">
            Separate from verified data. Generated on request.
          </span>
        </div>
        {generation?.cached && (
          <span className="text-[11px] text-mm-muted">cached</span>
        )}
      </div>

      {!generation && (
        <div className="mt-3">
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate AI opportunity analysis"}
          </button>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}

      {generation && !generation.available && (
        <div className="mt-3 rounded-lg border border-gray-300 bg-white/70 p-3 text-xs text-gray-700">
          <p className="font-semibold">AI analysis unavailable</p>
          <p className="mt-1">{generation.reason}</p>
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="mt-2 rounded-full border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 disabled:opacity-50"
          >
            {generating ? "Retrying…" : "Retry"}
          </button>
        </div>
      )}

      {analysis && (
        <div className="mt-3 space-y-3">
          <SectionCard label="Why this business?">{analysis.whySelected}</SectionCard>
          <SectionCard label="Current experience">
            {analysis.currentExperience || "Not detected in the analyzed public information."}
          </SectionCard>

          <SectionCard label="Experience gap">
            <span
              className={`mr-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                analysis.experienceGap.detected
                  ? "bg-mm-soft-pink text-mm-dark-rose"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {analysis.experienceGap.detected ? "Gap detected" : "No clear gap"}
            </span>
            <ConfidencePill confidence={analysis.experienceGap.confidence} />
            <p className="mt-1">{analysis.experienceGap.summary}</p>
          </SectionCard>

          <SectionCard label="Best Sing My Birthday match">
            <p className="font-medium">{analysis.matchedProductFeature.name}</p>
            <p className="mt-0.5 text-mm-muted">{analysis.matchedProductFeature.reason}</p>
          </SectionCard>

          <SectionCard label="Partnership idea">
            {analysis.partnership.recommended ? (
              <>
                <p className="font-medium">
                  {analysis.partnership.title || analysis.partnership.type}
                </p>
                <p className="text-[11px] uppercase tracking-wide text-purple-600">
                  {analysis.partnership.type}
                </p>
                <p className="mt-1">{analysis.partnership.summary}</p>
                {analysis.partnership.howItWorks.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-muted">
                      How it could work
                    </p>
                    <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                      {analysis.partnership.howItWorks.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            ) : (
              <p className="text-mm-muted">
                {analysis.partnership.summary ||
                  "Not enough evidence for a meaningful partnership recommendation."}
              </p>
            )}
          </SectionCard>

          <SectionCard label="Suggested pilot">
            {analysis.suggestedPilot.recommended ? (
              <>
                <p className="font-medium">{analysis.suggestedPilot.duration}</p>
                <p className="mt-0.5">{analysis.suggestedPilot.scope}</p>
                {analysis.suggestedPilot.successMetrics.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-muted">
                      Track
                    </p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                      {analysis.suggestedPilot.successMetrics.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-mm-muted">
                {analysis.suggestedPilot.scope || "Not recommended yet — insufficient evidence."}
              </p>
            )}
          </SectionCard>

          {analysis.recommendedContactRoles.length > 0 && (
            <SectionCard label="Who to contact">
              <div className="flex flex-wrap gap-1.5">
                {analysis.recommendedContactRoles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-mm-ink ring-1 ring-purple-200"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </SectionCard>
          )}

          {analysis.limitations.length > 0 && (
            <SectionCard label="Limitations">
              <ul className="list-disc space-y-0.5 pl-4 text-mm-muted">
                {analysis.limitations.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </SectionCard>
          )}

          {generation?.groundedOn && (
            <p className="text-[11px] text-mm-muted">
              Grounded on {generation.groundedOn.evidenceCount} evidence
              snippet(s), fit score {generation.groundedOn.fitScore}/100
              {generation.groundedOn.analyzedFromWebsite
                ? ""
                : " (website not analyzed)"}
              .
            </p>
          )}

          <EvidenceList evidence={evidence} citedIds={analysis.usedEvidenceIds} />

          <div className="border-t border-purple-100 pt-3">
            {!outreach ? (
              <>
                <button
                  type="button"
                  onClick={handleOutreach}
                  disabled={outreachLoading}
                  className="rounded-full bg-mm-ink px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                >
                  {outreachLoading ? "Drafting…" : "Generate Outreach"}
                </button>
                {outreachError && (
                  <p className="mt-2 text-xs text-red-600">{outreachError}</p>
                )}
              </>
            ) : outreach.available && outreach.draft ? (
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-muted">
                    Outreach draft — not sent
                  </p>
                  <button
                    type="button"
                    onClick={handleOutreach}
                    disabled={outreachLoading}
                    className="text-[11px] font-semibold text-mm-dark-rose disabled:opacity-50"
                  >
                    {outreachLoading ? "Regenerating…" : "Regenerate"}
                  </button>
                </div>
                <p className="mt-2 text-sm font-semibold text-mm-ink">
                  Subject: {outreach.draft.subject}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-mm-ink">
                  {outreach.draft.body}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-300 bg-white/70 p-3 text-xs text-gray-700">
                <p className="font-semibold">Outreach draft unavailable</p>
                <p className="mt-1">{outreach.reason}</p>
                <button
                  type="button"
                  onClick={handleOutreach}
                  disabled={outreachLoading}
                  className="mt-2 rounded-full border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 disabled:opacity-50"
                >
                  {outreachLoading ? "Retrying…" : "Retry"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
