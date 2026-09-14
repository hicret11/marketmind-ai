import type { DecisionInsight } from "@/types/data-insights";

const CONFIDENCE_STYLE: Record<string, string> = {
  low: "bg-amber-100 text-amber-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-green-100 text-green-800",
};

/**
 * Finding / Evidence / Business Impact / Recommended Action / Confidence —
 * the same evidence-grounded shape used across MarketMind's other AI
 * insight cards (Social Analytics, central Analytics). In real mode this
 * will only ever be populated by lib/data-insights' future decision engine
 * from genuine aggregated database results — never invented.
 */
export function DecisionInsightCard({ insight }: { insight: DecisionInsight }) {
  return (
    <div className="rounded-lg border border-purple-200 bg-mm-lavender/20 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-mm-ink">{insight.finding}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${CONFIDENCE_STYLE[insight.confidence]}`}
        >
          Confidence: {insight.confidence[0].toUpperCase() + insight.confidence.slice(1)}
        </span>
      </div>
      <div className="mt-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-700">Evidence</p>
        <ul className="mt-0.5 list-inside list-disc text-xs text-mm-muted">
          {insight.evidence.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </div>
      <Field label="Business Impact" value={insight.businessImpact} />
      <Field label="Recommended Action" value={insight.recommendedAction} />
    </div>
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
