"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, Conversation } from "@/types/chat";
import { ApiError, getConversation, listConversations, sendChatMessage } from "@/lib/chat/client";
import { ChatInput } from "./chat-input";
import { ChatMessageBubble } from "./chat-message";
import { ConversationList } from "./conversation-list";
import { SuggestedPrompts } from "./suggested-prompts";

let tempIdCounter = 0;
function tempId() {
  tempIdCounter += 1;
  return `temp-${Date.now()}-${tempIdCounter}`;
}

export function ChatShell() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; retry: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listConversations()
      .then((res) => setConversations(res.conversations))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function selectConversation(id: string) {
    setShowHistory(false);
    setError(null);
    setUnavailable(null);
    try {
      const res = await getConversation(id);
      setActiveId(res.conversation.id);
      setMessages(res.messages);
    } catch {
      // conversation vanished or failed to load — fall back to a fresh chat
      startNewChat();
    }
  }

  function startNewChat() {
    setActiveId(null);
    setMessages([]);
    setError(null);
    setUnavailable(null);
    setShowHistory(false);
  }

  async function send(content: string) {
    setError(null);
    setUnavailable(null);
    setSending(true);

    const optimisticUser: ChatMessage = {
      id: tempId(),
      conversationId: activeId ?? "pending",
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const res = await sendChatMessage({ conversationId: activeId ?? undefined, message: content });
      setActiveId(res.conversationId);
      setMessages((prev) => {
        const withoutOptimistic = prev.filter((m) => m.id !== optimisticUser.id);
        return [
          ...withoutOptimistic,
          res.userMessage,
          ...(res.assistantMessage ? [res.assistantMessage] : []),
        ];
      });
      if (!res.ai.available) setUnavailable(res.ai.reason);
      if (!conversations.some((c) => c.id === res.conversationId)) {
        listConversations()
          .then((r) => setConversations(r.conversations))
          .catch(() => undefined);
      }
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
      setError({
        message: e instanceof ApiError ? e.message : "Could not send your message.",
        retry: content,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid h-[calc(100vh-8rem)] gap-4 md:grid-cols-[220px_1fr]">
      <aside className="hidden rounded-xl border border-gray-200 bg-white p-3 md:block">
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={selectConversation}
          onNew={startNewChat}
        />
      </aside>

      <div className="flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mm-muted">
            <span className="font-medium text-mm-ink">Context: Sing My Birthday</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden items-center gap-1.5 sm:flex">
              Knowledge:
              <span className="text-mm-ink">✓ Handbook</span>
              <span className="text-mm-ink">✓ My Notes</span>
              <span className="text-mm-ink">✓ Product Context</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 md:hidden"
          >
            History
          </button>
        </div>

        {showHistory && (
          <div className="border-b border-gray-100 p-3 md:hidden">
            <ConversationList
              conversations={conversations}
              activeId={activeId}
              onSelect={selectConversation}
              onNew={startNewChat}
            />
          </div>
        )}

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <SuggestedPrompts onSelect={send} />
            </div>
          ) : (
            messages.map((m) => <ChatMessageBubble key={m.id} message={m} />)
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-4 py-3 text-sm text-mm-muted shadow-sm">
                MarketMind is thinking…
              </div>
            </div>
          )}

          {unavailable && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              {unavailable}
            </div>
          )}

          {error && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{error.message}</span>
              <button
                type="button"
                onClick={() => send(error.retry)}
                className="shrink-0 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 p-3">
          <ChatInput disabled={sending} onSend={send} />
        </div>
      </div>
    </div>
  );
}
