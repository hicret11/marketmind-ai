"use client";

import { useState } from "react";
import { ApiError, generateCrossSourceInsights } from "@/lib/analytics/client";
import type { CrossSourceInsightsResult, DateRangeOption } from "@/types/analytics";
import { SectionCard } from "./analytics-ui";

const CONFIDENCE_STYLE: Record<string, string> = {
  low: "bg-amber-100 text-amber-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-green-100 text-green-800",
};

export function InsightsSection({ range }: { range: DateRangeOption }) {
  const [result, setResult] = useState<CrossSourceInsightsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      setResult(await generateCrossSourceInsights(range));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not generate insights.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard title="MarketMind Intelligence" subtitle="Gemini reasoning over real aggregated data from every connected module — never raw records, never fabricated numbers.">
      <div className="space-y-3">
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="rounded-full bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Analyzing…" : "Generate Insights"}
        </button>

        {error && <p className="text-xs text-red-600">{error}</p>}

        {result && !result.available && <p className="text-xs text-mm-muted">{result.reason}</p>}
        {result?.available && result.reason && <p className="text-xs text-mm-muted">{result.reason}</p>}
        {result?.available && !result.reason && result.insights.length === 0 && (
          <p className="text-xs text-mm-muted">Not enough data to make a reliable recommendation.</p>
        )}

        {result?.available && result.insights.length > 0 && (
          <div className="space-y-3">
            {result.insights.map((insight, i) => (
              <div key={i} className="rounded-lg border border-purple-200 bg-mm-lavender/20 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-mm-ink">{insight.finding}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${CONFIDENCE_STYLE[insight.confidence]}`}>
                    Confidence: {insight.confidence[0].toUpperCase() + insight.confidence.slice(1)}
                  </span>
                </div>
                <div className="mt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-700">Evidence</p>
                  <ul className="mt-0.5 list-inside list-disc text-xs text-mm-muted">
                    {insight.evidence.map((e, j) => (
                      <li key={j}>{e}</li>
                    ))}
                  </ul>
                </div>
                <Field label="Interpretation" value={insight.interpretation} />
                <Field label="Recommendation" value={insight.recommendation} />
                <Field label="Suggested action" value={insight.suggestedAction} />
              </div>
            ))}
            {result.sourcesUsed.length > 0 && (
              <p className="text-[11px] text-mm-muted">Based on real data from: {result.sourcesUsed.join(", ")}.</p>
            )}
          </div>
        )}
      </div>
    </SectionCard>
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
