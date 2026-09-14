"use client";

import { useEffect, useMemo, useState } from "react";
import type { MarketingNote, NoteType } from "@/types/notes";
import { ApiError, createNote, deleteNote, listNotes, updateNote } from "@/lib/notes/client";
import { scoreText, tokenize } from "@/lib/retrieval/text-score";
import { NoteEditor, type NoteEditorValue } from "@/components/notes/note-editor";
import { NoteFilters } from "@/components/notes/note-filters";
import { NotesList } from "@/components/notes/notes-list";

export default function NotesPage() {
  const [notes, setNotes] = useState<MarketingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [type, setType] = useState<NoteType | "">("");
  const [tag, setTag] = useState("");

  const [editing, setEditing] = useState<MarketingNote | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listNotes()
      .then((res) => active && setNotes(res.notes))
      .catch((e) => active && setLoadError(e instanceof ApiError ? e.message : "Could not load notes."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [notes]);

  const visibleNotes = useMemo(() => {
    const tokens = tokenize(query);
    return notes
      .filter((n) => !type || n.type === type)
      .filter((n) => !tag || n.tags.some((t) => t.toLowerCase() === tag.toLowerCase()))
      .filter((n) => {
        if (tokens.length === 0) return true;
        const haystack = [n.title ?? "", n.content, n.tags.join(" ")].join(" ");
        return scoreText(haystack, tokens) > 0;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [notes, query, type, tag]);

  function openNew() {
    setEditing(null);
    setSaveError(null);
    setCreating(true);
  }

  function openEdit(note: MarketingNote) {
    setEditing(note);
    setSaveError(null);
    setCreating(true);
  }

  function closeEditor() {
    setCreating(false);
    setEditing(null);
    setSaveError(null);
  }

  async function handleSave(value: NoteEditorValue) {
    setSaving(true);
    setSaveError(null);
    try {
      if (editing) {
        const res = await updateNote(editing.id, value);
        setNotes((prev) => prev.map((n) => (n.id === res.note.id ? res.note : n)));
      } else {
        const res = await createNote(value);
        setNotes((prev) => [res.note, ...prev]);
      }
      closeEditor();
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : "Could not save the note.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    setSaving(true);
    setSaveError(null);
    try {
      await deleteNote(editing.id);
      setNotes((prev) => prev.filter((n) => n.id !== editing.id));
      closeEditor();
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : "Could not delete the note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-mm-ink">My Marketing Notes</h1>
        <p className="mt-1 text-sm text-mm-muted">
          Your personal marketing memory. Save what you learn, test and discover.
        </p>
      </header>

      <NoteFilters
        query={query}
        onQueryChange={setQuery}
        type={type}
        onTypeChange={setType}
        tags={allTags}
        activeTag={tag}
        onTagChange={setTag}
        onNewNote={openNew}
      />

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-mm-muted">
          Loading your notes…
        </div>
      ) : (
        <NotesList notes={visibleNotes} onSelect={openEdit} />
      )}

      {creating && (
        <NoteEditor
          note={editing}
          saving={saving}
          error={saveError}
          onSave={handleSave}
          onDelete={editing ? handleDelete : undefined}
          onClose={closeEditor}
        />
      )}
    </div>
  );
}
