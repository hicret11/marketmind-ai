import type { QualificationResult, WebsiteAnalysis } from "@/types/opportunity";
import { SectionLabel, SignalBadge, formatConfidence } from "./ui";

export function QualificationPanel({
  qualification,
  website,
}: {
  qualification: QualificationResult;
  website: WebsiteAnalysis;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <SectionLabel>Qualification signals</SectionLabel>
        <span className="text-[11px] text-mm-muted">
          rule-based ·{" "}
          {qualification.analyzedFromWebsite
            ? `${website.pages.length} page(s), ${website.totalWords} words`
            : "website not analyzed"}
        </span>
      </div>

      <ul className="mt-2 space-y-1.5">
        {qualification.signals.map((s) => (
          <li
            key={s.key}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-mm-ink">{s.label}</span>
              <div className="flex items-center gap-2">
                {s.status === "detected" && (
                  <span className="text-[11px] text-mm-muted">
                    {formatConfidence(s.confidence)}
                  </span>
                )}
                <SignalBadge status={s.status} />
              </div>
            </div>
            <p className="mt-0.5 text-xs text-mm-muted">{s.description}</p>
            {s.matchedTerms.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {s.matchedTerms.slice(0, 6).map((t) => (
                  <span
                    key={t}
                    className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {qualification.notes.length > 0 && (
        <ul className="mt-2 space-y-1">
          {qualification.notes.map((n) => (
            <li key={n} className="text-[11px] text-amber-700">
              {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
