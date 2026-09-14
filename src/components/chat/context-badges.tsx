import type { ChatContextUsed } from "@/types/chat";

/** Per-response source transparency — only shows sources actually used, never faked. */
export function ContextBadges({ contextUsed }: { contextUsed: ChatContextUsed }) {
  const hasAny =
    contextUsed.handbook.length > 0 ||
    contextUsed.notes.length > 0 ||
    contextUsed.company ||
    contextUsed.instagram;
  if (!hasAny) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-medium text-mm-muted">Used knowledge:</span>
      {contextUsed.handbook.map((h) => (
        <span
          key={h.id}
          className="rounded-full bg-mm-lavender/60 px-2 py-0.5 text-[11px] font-medium text-purple-700"
        >
          {h.title}
        </span>
      ))}
      {contextUsed.notes.map((n) => (
        <span
          key={n.id}
          className="rounded-full bg-mm-soft-pink/60 px-2 py-0.5 text-[11px] font-medium text-mm-dark-rose"
        >
          My Notes{n.title ? `: ${n.title}` : ""}
        </span>
      ))}
      {contextUsed.company && (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
          Sing My Birthday
        </span>
      )}
      {contextUsed.instagram && (
        <span className="rounded-full bg-mm-soft-pink/60 px-2 py-0.5 text-[11px] font-medium text-mm-dark-rose">
          Instagram Data
        </span>
      )}
    </div>
  );
}
