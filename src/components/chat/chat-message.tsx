"use client";

import { useState } from "react";
import type { ChatMessage } from "@/types/chat";
import { ContextBadges } from "./context-badges";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="text-[11px] font-medium text-mm-muted hover:text-mm-ink"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-mm-pink to-mm-dark-rose px-4 py-2.5 text-sm text-white shadow-sm">
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-mm-ink">
          {message.content}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          {message.contextUsed ? <ContextBadges contextUsed={message.contextUsed} /> : <span />}
          <CopyButton text={message.content} />
        </div>
      </div>
    </div>
  );
}
