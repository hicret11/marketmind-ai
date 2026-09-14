import { NOTE_TYPE_LABELS, type MarketingNote } from "@/types/notes";

const TYPE_STYLES: Record<string, string> = {
  note: "bg-gray-100 text-gray-600",
  lesson_learned: "bg-emerald-50 text-emerald-700",
  mistake: "bg-mm-soft-pink text-mm-dark-rose",
  observation: "bg-mm-lavender text-purple-700",
  strategy: "bg-blue-50 text-blue-700",
  idea: "bg-amber-50 text-amber-700",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function NoteCard({
  note,
  onClick,
}: {
  note: MarketingNote;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full w-full flex-col rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            TYPE_STYLES[note.type] ?? TYPE_STYLES.note
          }`}
        >
          {NOTE_TYPE_LABELS[note.type]}
        </span>
        <span className="shrink-0 text-[11px] text-mm-muted">
          {formatDate(note.updatedAt)}
        </span>
      </div>

      {note.title && (
        <h3 className="mt-2 text-sm font-semibold text-mm-ink">{note.title}</h3>
      )}
      <p className="mt-1.5 line-clamp-4 flex-1 text-sm leading-relaxed text-mm-muted">
        {note.content}
      </p>

      {note.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
