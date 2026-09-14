import type { PatternComparison } from "@/types/social";
import { MetricValue } from "./social-ui";

const DIMENSION_LABELS: Record<string, string> = {
  contentFormat: "Format",
  creativeType: "Creative type",
  hookType: "Hook type",
  primaryEmotion: "Primary emotion",
  ctaType: "Call to action",
  humanReaction: "Human reaction present",
  personalizationVisible: "Personalization visible",
};

export function PatternComparisonCard({ comparison }: { comparison: PatternComparison }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-mm-ink">
          {DIMENSION_LABELS[comparison.dimension] ?? comparison.dimension}
        </h3>
        {comparison.sufficientData ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            Sufficient sample
          </span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
            Insufficient data
          </span>
        )}
      </div>

      {comparison.groups.length === 0 ? (
        <p className="mt-2 text-xs text-mm-muted">No labelled posts for this dimension yet.</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase text-mm-muted">
                <th className="py-1 pr-3">Group</th>
                <th className="py-1 pr-3">Posts</th>
                <th className="py-1 pr-3">Avg views</th>
                <th className="py-1 pr-3">Avg reach</th>
                <th className="py-1 pr-3">Avg int. rate</th>
                <th className="py-1 pr-3">Avg save rate</th>
                <th className="py-1">Avg share rate</th>
              </tr>
            </thead>
            <tbody>
              {comparison.groups.map((g) => (
                <tr key={g.label} className="border-t border-gray-100">
                  <td className="py-1.5 pr-3 font-medium text-mm-ink">{g.label}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{g.posts}</td>
                  <td className="py-1.5 pr-3">
                    <MetricValue value={g.avgViews} />
                  </td>
                  <td className="py-1.5 pr-3">
                    <MetricValue value={g.avgReach} />
                  </td>
                  <td className="py-1.5 pr-3">
                    <MetricValue value={g.avgInteractionRate} format="percent" />
                  </td>
                  <td className="py-1.5 pr-3">
                    <MetricValue value={g.avgSaveRate} format="percent" />
                  </td>
                  <td className="py-1.5">
                    <MetricValue value={g.avgShareRate} format="percent" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[11px] text-mm-muted">{comparison.note}</p>
    </div>
  );
}
