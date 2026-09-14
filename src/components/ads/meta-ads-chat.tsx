"use client";

import { useState } from "react";
import { ApiError, patchDraft, sendAdsChatMessage } from "@/lib/meta-ads/client";
import { ContentPicker } from "./content-picker";
import type { AdsChatMessage, AdsChatSession } from "@/types/meta-ads";
import type { CreativeSearchResult } from "@/lib/meta-ads/creative-search";

/**
 * The MarketMind Chat-like conversation surface for building a campaign
 * draft. Every AI turn only ever proposes a draft PATCH (see
 * lib/meta-ads/assistant.ts) — it never calls the Meta API itself.
 */
export function MetaAdsChat({
  session,
  onSessionChanged,
}: {
  session: AdsChatSession | null;
  onSessionChanged: (session: AdsChatSession) => void;
}) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CreativeSearchResult[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const messages: AdsChatMessage[] = session?.messages ?? [];

  async function send() {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    setCandidates([]);
    try {
      const res = await sendAdsChatMessage(text, session?.id);
      if (!res.available) {
        setError(res.reason ?? "MarketMind AI is temporarily unavailable.");
      }
      onSessionChanged(res.session);
      if (res.creativeCandidates && res.creativeCandidates.length > 1) {
        setCandidates(res.creativeCandidates);
      }
      setInput("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  async function chooseCandidate(igMediaId: string) {
    if (!session) return;
    const match = candidates.find((c) => c.media.igMediaId === igMediaId);
    if (!match) return;
    const res = await patchDraft(session.id, {
      creative: {
        source: "existing_instagram_post",
        igMediaId: match.media.igMediaId,
        caption: match.media.caption,
        mediaType: match.media.mediaProductType === "REELS" ? "Reel" : match.media.mediaType,
        permalink: match.media.permalink,
        thumbnailUrl: match.media.thumbnailUrl,
        timestamp: match.media.timestamp,
      },
    });
    onSessionChanged(res.session);
    setCandidates([]);
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-4 text-xs text-mm-muted">
            Try: &quot;Create a UK campaign for Sing My Birthday. Budget is $5/day. Target people interested in
            birthday gifts. Use the Instagram Reel from August 28.&quot;
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                m.role === "user" ? "bg-mm-pink text-white" : "bg-gray-100 text-mm-ink"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {candidates.length > 1 && (
          <div className="rounded-lg border border-purple-200 bg-mm-lavender/20 p-3">
            <p className="text-xs font-semibold text-mm-ink">I found a few matching posts — which one did you mean?</p>
            <div className="mt-2 space-y-2">
              {candidates.map((c) => (
                <button
                  key={c.media.id}
                  type="button"
                  onClick={() => chooseCandidate(c.media.igMediaId)}
                  className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 text-left hover:border-mm-pink"
                >
                  {c.media.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.media.thumbnailUrl} alt="" className="h-10 w-10 rounded object-cover" />
                  )}
                  <span className="text-[11px] text-mm-ink">
                    {c.matchedOn} — {c.media.caption?.slice(0, 60) || "No caption"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="shrink-0 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700"
          >
            Choose from Content Library
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !sending && send()}
            placeholder="Describe the campaign you want to create…"
            className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm outline-none focus:border-mm-pink"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !input.trim()}
            className="rounded-full bg-gradient-to-r from-mm-pink to-mm-dark-rose px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {sending ? "…" : "Send"}
          </button>
        </div>
      </div>

      {pickerOpen && session && (
        <ContentPicker
          onClose={() => setPickerOpen(false)}
          onChoose={async (selection) => {
            const res = await patchDraft(session.id, { creative: selection });
            onSessionChanged(res.session);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
