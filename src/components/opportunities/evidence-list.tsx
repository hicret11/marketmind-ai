import type { EvidenceSnippet } from "@/types/opportunity";
import { SectionLabel } from "./ui";

export function EvidenceList({
  evidence,
  citedIds,
  emptyHint,
}: {
  evidence: EvidenceSnippet[];
  citedIds?: string[];
  emptyHint?: string;
}) {
  const cited = new Set(citedIds ?? []);

  if (evidence.length === 0) {
    return (
      <p className="text-xs text-mm-muted">
        {emptyHint ?? "No website evidence was extracted for this business."}
      </p>
    );
  }

  return (
    <div>
      <SectionLabel>
        Evidence used ({evidence.length}
        {citedIds ? `, ${cited.size} cited by AI` : ""})
      </SectionLabel>
      <ul className="mt-2 space-y-2">
        {evidence.map((e) => {
          let host = e.sourceUrl;
          try {
            host = new URL(e.sourceUrl).host;
          } catch {
            /* keep raw */
          }
          return (
            <li
              key={e.id}
              className={`rounded-lg border p-2.5 text-xs ${
                cited.has(e.id)
                  ? "border-mm-rose/50 bg-mm-soft-pink/25"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600">
                  {e.matchedTerm}
                </span>
                {cited.has(e.id) && (
                  <span className="rounded bg-mm-lavender px-1.5 py-0.5 font-semibold text-purple-700">
                    cited by AI
                  </span>
                )}
                {e.sourceUrl && (
                  <a
                    href={e.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-mm-dark-rose underline decoration-mm-rose/50 underline-offset-2"
                  >
                    {host}
                  </a>
                )}
              </div>
              <p className="leading-relaxed text-mm-ink">&ldquo;{e.text}&rdquo;</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
