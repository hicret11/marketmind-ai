"use client";

import { NOTE_TYPES, NOTE_TYPE_LABELS, type NoteType } from "@/types/notes";

export function NoteFilters({
  query,
  onQueryChange,
  type,
  onTypeChange,
  tags,
  activeTag,
  onTagChange,
  onNewNote,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  type: NoteType | "";
  onTypeChange: (value: NoteType | "") => void;
  tags: string[];
  activeTag: string;
  onTagChange: (value: string) => void;
  onNewNote: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search your notes…"
            className="w-full rounded-full border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-mm-pink focus:ring-2 focus:ring-mm-pink/20"
          />
        </div>

        <select
          value={type}
          onChange={(e) => onTypeChange(e.target.value as NoteType | "")}
          className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-mm-ink outline-none focus:border-mm-pink"
        >
          <option value="">All types</option>
          {NOTE_TYPES.map((t) => (
            <option key={t} value={t}>
              {NOTE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        {tags.length > 0 && (
          <select
            value={activeTag}
            onChange={(e) => onTagChange(e.target.value)}
            className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-mm-ink outline-none focus:border-mm-pink"
          >
            <option value="">All tags</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        )}
      </div>

      <button
        type="button"
        onClick={onNewNote}
        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-mm-pink to-mm-dark-rose px-4 py-2 text-sm font-semibold text-white shadow-sm"
      >
        + New Note
      </button>
    </div>
  );
}
