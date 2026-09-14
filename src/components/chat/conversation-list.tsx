import type { Conversation } from "@/types/chat";

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <button
        type="button"
        onClick={onNew}
        className="mb-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-mm-rose/40 bg-white px-3 py-2 text-sm font-semibold text-mm-dark-rose hover:bg-mm-soft-pink/30"
      >
        + New chat
      </button>

      <div className="flex-1 space-y-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="px-2 text-xs text-mm-muted">No conversations yet.</p>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                c.id === activeId
                  ? "bg-mm-ink text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              title={c.title}
            >
              {c.title}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
