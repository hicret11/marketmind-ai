import type { FitScore } from "@/types/opportunity";
import { SectionLabel } from "./ui";

export function ScoreBreakdown({ fitScore }: { fitScore: FitScore }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <SectionLabel>Fit score breakdown</SectionLabel>
        <span className="text-[11px] text-mm-muted">
          {fitScore.method.replace(/-/g, " ")} ·{" "}
          {fitScore.dataCompleteness === "full"
            ? "full data"
            : "partial data (no website)"}
        </span>
      </div>

      <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200">
        {fitScore.criteria.map((c) => {
          const pct = c.max > 0 ? (c.awarded / c.max) * 100 : 0;
          return (
            <li key={c.key} className="px-3 py-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-medium text-mm-ink">
                  {c.label}
                  <span
                    className={`rounded px-1 py-0.5 text-[10px] font-semibold uppercase ${
                      c.basis === "verified"
                        ? "bg-mm-soft-pink/60 text-mm-dark-rose"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {c.basis}
                  </span>
                </span>
                <span className="tabular-nums text-mm-muted">
                  {c.awarded.toFixed(1)} / {c.max}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-mm-pink to-mm-dark-rose"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-mm-muted">{c.rationale}</p>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-right text-sm font-semibold text-mm-ink">
        Total: {fitScore.score} / {fitScore.maxScore}
      </p>
    </div>
  );
}
