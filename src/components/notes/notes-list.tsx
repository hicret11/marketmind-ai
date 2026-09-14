import type { MarketingNote } from "@/types/notes";
import { NoteCard } from "./note-card";

export function NotesList({
  notes,
  onSelect,
}: {
  notes: MarketingNote[];
  onSelect: (note: MarketingNote) => void;
}) {
  if (notes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-base font-semibold text-mm-ink">
          Your marketing memory starts here.
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-mm-muted">
          Write down experiments, mistakes, ideas and lessons so MarketMind can
          use them later.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} onClick={() => onSelect(note)} />
      ))}
    </div>
  );
}
