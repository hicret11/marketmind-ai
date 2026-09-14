import { ChatShell } from "@/components/chat/chat-shell";

export default function ChatPage() {
  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-mm-ink">MarketMind Chat</h1>
        <p className="mt-1 text-sm text-mm-muted">
          Ask anything about marketing — from strategy to your own business.
        </p>
      </header>

      <ChatShell />
    </div>
  );
}
