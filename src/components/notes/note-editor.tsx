"use client";

import { useEffect, useRef, useState } from "react";
import { NOTE_TYPES, NOTE_TYPE_LABELS, type MarketingNote, type NoteType } from "@/types/notes";

export interface NoteEditorValue {
  title: string;
  content: string;
  type: NoteType;
  tags: string[];
}

function toValue(note: MarketingNote | null): NoteEditorValue {
  return note
    ? { title: note.title ?? "", content: note.content, type: note.type, tags: note.tags }
    : { title: "", content: "", type: "note", tags: [] };
}

/**
 * The note create/edit surface — a calm, notebook-like overlay: large
 * auto-growing textarea, minimal chrome, explicit Save (autosave would add
 * debounce/race complexity this V1 doesn't need).
 */
export function NoteEditor({
  note,
  saving,
  error,
  onSave,
  onDelete,
  onClose,
}: {
  note: MarketingNote | null;
  saving: boolean;
  error: string | null;
  onSave: (value: NoteEditorValue) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState<NoteEditorValue>(() => toValue(note));
  const [tagDraft, setTagDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setValue(toValue(note));
  }, [note]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(220, el.scrollHeight)}px`;
  }, [value.content]);

  function addTag() {
    const tag = tagDraft.trim();
    if (!tag || value.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setTagDraft("");
      return;
    }
    setValue((v) => ({ ...v, tags: [...v.tags, tag].slice(0, 8) }));
    setTagDraft("");
  }

  function removeTag(tag: string) {
    setValue((v) => ({ ...v, tags: v.tags.filter((t) => t !== tag) }));
  }

  const canSave = value.content.trim().length > 0 && !saving;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8 sm:py-14"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-mm-ink">
            {note ? "Edit note" : "New note"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <input
            type="text"
            value={value.title}
            onChange={(e) => setValue((v) => ({ ...v, title: e.target.value }))}
            placeholder="Title (optional)"
            className="w-full border-none p-0 text-lg font-semibold text-mm-ink outline-none placeholder:text-gray-300"
          />

          <textarea
            ref={textareaRef}
            value={value.content}
            onChange={(e) => setValue((v) => ({ ...v, content: e.target.value }))}
            placeholder="Write what you learned, noticed, tested or want to remember..."
            className="min-h-[220px] w-full resize-none border-none p-0 text-[15px] leading-relaxed text-mm-ink outline-none placeholder:text-gray-300"
            autoFocus
          />

          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
            <label className="text-xs font-medium text-mm-muted">Type</label>
            <select
              value={value.type}
              onChange={(e) => setValue((v) => ({ ...v, type: e.target.value as NoteType }))}
              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-mm-ink outline-none focus:border-mm-pink"
            >
              {NOTE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {NOTE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-mm-muted">Tags</label>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {value.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-mm-soft-pink/60 px-2.5 py-1 text-xs font-medium text-mm-dark-rose"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                    className="text-mm-dark-rose/60 hover:text-mm-dark-rose"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                onBlur={addTag}
                placeholder="Add a tag…"
                className="min-w-[100px] flex-1 border-none p-1 text-xs text-mm-ink outline-none placeholder:text-gray-400"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          {note && onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave(value)}
              disabled={!canSave}
              className="rounded-full bg-gradient-to-r from-mm-pink to-mm-dark-rose px-5 py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save note"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
