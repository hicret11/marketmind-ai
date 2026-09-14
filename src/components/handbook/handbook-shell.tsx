"use client";

import { useMemo, useState } from "react";
import { searchHandbook } from "@/lib/handbook/search";
import type { HandbookCategory, HandbookSection } from "@/lib/handbook/types";
import { HandbookArticle } from "./handbook-article";
import { HandbookSearch } from "./handbook-search";
import { HandbookSidebar } from "./handbook-sidebar";

export function HandbookShell({
  categories,
  sections,
}: {
  categories: HandbookCategory[];
  sections: HandbookSection[];
}) {
  const [selectedId, setSelectedId] = useState(sections[0]?.id ?? "");
  const [query, setQuery] = useState("");

  const results = useMemo(() => searchHandbook(sections, query, 8), [sections, query]);
  const selected = sections.find((s) => s.id === selectedId) ?? sections[0] ?? null;

  function select(id: string) {
    setSelectedId(id);
    setQuery("");
  }

  return (
    <div className="space-y-5">
      <HandbookSearch query={query} onQueryChange={setQuery} results={results} onSelect={select} />

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-3">
            <HandbookSidebar categories={categories} selectedId={selectedId} onSelect={select} />
          </div>
        </aside>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          {selected ? (
            <HandbookArticle section={selected} />
          ) : (
            <p className="text-sm text-mm-muted">No handbook content found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
