import type { DiscoverResponse } from "@/types/opportunity";
import { LeadCard } from "./lead-card";

export function LeadResults({ response }: { response: DiscoverResponse }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-mm-ink">
          {response.results.length} business
          {response.results.length === 1 ? "" : "es"} found
        </h2>
        <p className="text-xs text-mm-muted">
          via {response.provider} ·{" "}
          {new Date(response.generatedAt).toLocaleString()}
        </p>
      </div>

      {response.warnings.length > 0 && (
        <ul className="space-y-1">
          {response.warnings.map((w) => (
            <li key={w} className="text-xs text-amber-700">
              — {w}
            </li>
          ))}
        </ul>
      )}

      {response.results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-mm-muted">
          The provider returned no matching businesses. Try a broader location or
          more categories.
        </div>
      ) : (
        response.results.map((lead) => (
          <LeadCard
            key={lead.business.id}
            lead={lead}
            query={response.query}
          />
        ))
      )}
    </div>
  );
}
