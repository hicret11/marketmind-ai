"use client";

import { useState } from "react";
import type {
  AnalyzeResponse,
  DiscoveredLead,
  DiscoveryQuery,
} from "@/types/opportunity";
import { ApiError, runAnalysis } from "@/lib/opportunity/client";
import { addLeadQualificationCaseFromOpportunity } from "@/lib/evaluation/client";
import { AddToCrmPanel } from "./add-to-crm-panel";
import { EvidenceList } from "./evidence-list";
import { FitScoreDial } from "./fit-score-dial";
import { OpportunityAnalysisPanel } from "./opportunity-analysis-panel";
import { QualificationPanel } from "./qualification-panel";
import { ScoreBreakdown } from "./score-breakdown";
import { BandBadge, SectionLabel, VerifiedTag } from "./ui";
import { VerifiedDetails } from "./verified-details";

const SOURCE_LABEL: Record<string, string> = {
  google_places: "Google Places",
  foursquare: "Foursquare",
  openstreetmap: "OpenStreetMap",
};

export function LeadCard({
  lead,
  query,
}: {
  lead: DiscoveredLead;
  query: DiscoveryQuery;
}) {
  const [expanded, setExpanded] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [showAddToCrm, setShowAddToCrm] = useState(false);
  const [addedToCrm, setAddedToCrm] = useState(false);
  const [addedToEval, setAddedToEval] = useState(false);
  const [addingToEval, setAddingToEval] = useState(false);
  const [addEvalError, setAddEvalError] = useState<string | null>(null);

  // Prefer the freshly re-verified data from an analysis run, if present.
  const view = analysis ?? lead;
  const { business } = view;

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const result = await runAnalysis(lead.business, query.analyzeWebsites);
      setAnalysis(result);
      setExpanded(true);
    } catch (err) {
      setAnalyzeError(
        err instanceof ApiError ? err.message : "Analysis failed.",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleAddToEvaluation() {
    setAddingToEval(true);
    setAddEvalError(null);
    try {
      await addLeadQualificationCaseFromOpportunity({
        business,
        fitScore: { score: view.fitScore.score, band: view.fitScore.band },
        signals: view.qualification.signals,
        evidence: view.qualification.evidence,
      });
      setAddedToEval(true);
    } catch (err) {
      setAddEvalError(err instanceof ApiError ? err.message : "Could not add to evaluation dataset.");
    } finally {
      setAddingToEval(false);
    }
  }

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <FitScoreDial score={view.fitScore.score} band={view.fitScore.band} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-mm-ink">
              {business.name}
            </h3>
            <BandBadge band={view.fitScore.band} />
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mm-muted">
            {business.category && <span>{business.category}</span>}
            {business.address && <span>· {business.address}</span>}
            {typeof business.rating === "number" && (
              <span>· ★ {business.rating.toFixed(1)}</span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <VerifiedTag>
              Source: {SOURCE_LABEL[business.provider] ?? business.provider}
            </VerifiedTag>
            {business.website ? (
              <a
                href={business.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-mm-dark-rose underline decoration-mm-rose/50 underline-offset-2"
              >
                {business.websiteDomain ?? "website"}
              </a>
            ) : (
              <span className="text-gray-400">no website on record</span>
            )}
            {business.phone && (
              <span className="text-gray-600">{business.phone}</span>
            )}
            {business.mapsUrl && (
              <a
                href={business.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 underline underline-offset-2"
              >
                map
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-mm-rose"
        >
          {expanded ? "Hide details" : "Show score, signals & evidence"}
        </button>
        {!analysis && (
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="rounded-full bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
          >
            {analyzing ? "Analyzing…" : "AI Opportunity Intelligence"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowAddToCrm(true)}
          disabled={addedToCrm}
          className="rounded-full bg-mm-pink px-3 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {addedToCrm ? "In CRM" : "Add to CRM"}
        </button>
        <button
          type="button"
          onClick={handleAddToEvaluation}
          disabled={addingToEval || addedToEval}
          className="rounded-full border border-mm-rose px-3 py-1.5 text-xs font-semibold text-mm-dark-rose transition-opacity disabled:opacity-50"
        >
          {addedToEval ? "In Evaluation Dataset" : addingToEval ? "Adding…" : "Add to Evaluation Dataset"}
        </button>
        {addEvalError && (
          <span className="text-[11px] text-red-600">{addEvalError}</span>
        )}
        {analyzeError && !expanded && (
          <span className="text-[11px] text-red-600">{analyzeError}</span>
        )}
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          <div className="rounded-lg bg-gray-50 p-2 text-[11px] text-mm-muted">
            <span className="font-semibold text-mm-ink">Verified data</span> —
            provider fields{view.website.ok ? " + business website text" : ""}.
            Kept separate from AI interpretation below.
          </div>

          <VerifiedDetails business={business} />
          <ScoreBreakdown fitScore={view.fitScore} />
          <QualificationPanel
            qualification={view.qualification}
            website={view.website}
          />

          <div>
            <SectionLabel>Website evidence</SectionLabel>
            <div className="mt-2">
              <EvidenceList
                evidence={view.qualification.evidence}
                emptyHint={
                  view.website.ok
                    ? "No qualifying keywords found in the website text."
                    : `Website not analyzed${
                        view.website.error ? ` (${view.website.error})` : ""
                      }.`
                }
              />
            </div>
          </div>

          <OpportunityAnalysisPanel
            business={business}
            generation={analysis?.opportunity ?? null}
            evidence={view.qualification.evidence}
            onGenerate={handleAnalyze}
            generating={analyzing}
            error={analyzeError}
          />
        </div>
      )}

      {showAddToCrm && (
        <AddToCrmPanel
          business={business}
          fitScore={view.fitScore}
          signals={view.qualification.signals}
          evidence={view.qualification.evidence}
          aiWhySelected={analysis?.opportunity.analysis?.whySelected ?? null}
          onClose={() => setShowAddToCrm(false)}
          onAdded={() => setAddedToCrm(true)}
        />
      )}
    </article>
  );
}
