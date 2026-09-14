"use client";

import type { HandbookSearchResult } from "@/lib/handbook/types";

export function HandbookSearch({
  query,
  onQueryChange,
  results,
  onSelect,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  results: HandbookSearchResult[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search the handbook — e.g. ROAS, lead generation, retargeting…"
        className="w-full rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-mm-pink focus:ring-2 focus:ring-mm-pink/20"
      />

      {query.trim() && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-96 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-mm-muted">No matching sections found.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {results.map((r) => (
                <li key={r.section.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(r.section.id)}
                    className="block w-full px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <p className="text-sm font-semibold text-mm-ink">{r.section.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-mm-muted">{r.snippet}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
