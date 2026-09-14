import Link from "next/link";
import type { AiEvaluationSummary, EvaluationHighlight } from "@/types/analytics";
import { MetricValue, SectionCard, StatTile } from "./analytics-ui";

function HighlightTile({
  label,
  highlight,
  format,
  suffix,
}: {
  label: string;
  highlight: EvaluationHighlight | null;
  format?: "number" | "percent";
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-center">
      {highlight ? (
        <>
          <p className="text-sm font-semibold text-mm-ink">{highlight.displayName}</p>
          <p className="text-xs text-mm-muted">
            <MetricValue value={highlight.value} format={format} suffix={suffix} />
          </p>
        </>
      ) : (
        <p className="text-xs italic text-gray-400">Not evaluated yet</p>
      )}
      <p className="mt-1 text-[10px] uppercase tracking-wide text-mm-muted">{label}</p>
    </div>
  );
}

export function AiEvaluationSection({ data }: { data: AiEvaluationSummary }) {
  if (!data.hasCompletedRun) {
    return (
      <SectionCard title="AI Model Performance" subtitle="Real completed benchmark runs from the AI Evaluation Lab.">
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-xs text-mm-muted">
          No completed benchmark runs yet.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="AI Model Performance"
      subtitle={`Current benchmark: ${data.taskTitle} · ${data.totalCompletedRuns} completed run(s) · models tested: ${data.modelsTested.join(", ")}`}
    >
      <div className="space-y-3">
        {data.isSmallSample && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            Small evaluation set — these results are preliminary, never treated as a universal &quot;best model&quot;.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <HighlightTile label="Best accuracy" highlight={data.bestAccuracy} format="percent" />
          <HighlightTile label="Lowest FPR" highlight={data.lowestFalsePositiveRate} format="percent" />
          <StatTile
            label="Fastest"
            value={data.fastest ? `${data.fastest.displayName} · ${data.fastest.value}ms` : <span className="italic text-gray-400">Not evaluated yet</span>}
          />
          <StatTile
            label="Lowest cost"
            value={data.lowestCost ? `${data.lowestCost.displayName} · $${data.lowestCost.value.toFixed(4)}` : <span className="italic text-gray-400">Cost unavailable</span>}
          />
        </div>
        <Link href="/evaluation" className="text-xs text-mm-dark-rose underline decoration-mm-rose/50 underline-offset-2">
          Open AI Evaluation Lab →
        </Link>
      </div>
    </SectionCard>
  );
}
