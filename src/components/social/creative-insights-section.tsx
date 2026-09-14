"use client";

import { SourceLabel } from "./social-ui";
import type { CreativeInsightsResult } from "@/types/creative-insights";

const CONFIDENCE_STYLE: Record<string, string> = {
  low: "bg-amber-100 text-amber-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-green-100 text-green-800",
};

/**
 * "MarketMind AI Analysis" block shared by YouTube and TikTok's Social
 * Analytics tabs — same visual language as Instagram's own AI insights
 * section, extended with Evidence + Confidence. Instagram keeps its own
 * separate component (analytics/page.tsx's inline section) untouched.
 */
export function CreativeInsightsSection({
  result,
  loading,
  error,
  onGenerate,
}: {
  result: CreativeInsightsResult | null;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
}) {
  return (
    <section className="rounded-xl border border-purple-200 bg-mm-lavender/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SourceLabel source="marketmind" />
          <span className="text-sm font-semibold text-mm-ink">AI marketing insights</span>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="shrink-0 rounded-full bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Analyzing…" : "Generate insights"}
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      {result && !result.available && <p className="mt-3 text-xs text-gray-600">{result.reason}</p>}
      {result?.available && result.insights.length === 0 && (
        <p className="mt-3 text-xs text-mm-muted">
          {result.reason ?? "Not enough data yet for a confident comparison — keep syncing more content."}
        </p>
      )}

      {result?.available && result.insights.length > 0 && (
        <div className="mt-3 space-y-3">
          {result.insights.map((ins, i) => (
            <div key={i} className="rounded-lg bg-white/70 p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-mm-ink">{ins.finding}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${CONFIDENCE_STYLE[ins.confidence]}`}
                >
                  Confidence: {ins.confidence[0].toUpperCase() + ins.confidence.slice(1)}
                </span>
              </div>
              <div className="mt-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-700">Evidence</p>
                <ul className="mt-0.5 list-inside list-disc text-xs text-mm-muted">
                  {ins.evidence.map((e, j) => (
                    <li key={j}>{e}</li>
                  ))}
                </ul>
              </div>
              <Field label="Interpretation" value={ins.interpretation} />
              <Field label="Recommendation" value={ins.recommendation} />
              <Field label="Suggested Experiment" value={ins.suggestedExperiment} />
              <Field label="KPI" value={ins.kpi} />
            </div>
          ))}
          <p className="text-[11px] text-mm-muted">
            Based on {result.basedOn?.itemsAnalyzed} item(s) and {result.basedOn?.comparisonsUsed} comparison(s).
            Language is associative, not causal.
          </p>
        </div>
      )}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <p className="mt-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-purple-700">{label}: </span>
      <span className="text-mm-ink">{value}</span>
    </p>
  );
}
