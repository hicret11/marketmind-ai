import type { HistoryItem } from "@/types/ai-studio";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function ImageHistory({ items }: { items: HistoryItem[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-base font-semibold text-mm-ink">Image History</h2>
      <p className="mt-0.5 text-xs text-mm-muted">
        Your future image generations and prompt drafts will appear here.
      </p>

      {items.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-mm-muted">
          No generated visuals yet.
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-mm-ink" title={item.title}>
                  {item.title || "Untitled draft"}
                </p>
                <p className="mt-0.5 text-[11px] text-mm-muted">
                  {item.format} · {formatDate(item.createdAt)} · {item.mode === "guided" ? "Guided" : "Custom"}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                Draft Prompt
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
