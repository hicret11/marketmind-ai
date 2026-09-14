"use client";

import { useEffect, useState } from "react";
import { BirthdayVisualGenerator } from "@/components/ai-studio/birthday-visual-generator";
import { ImageHistory } from "@/components/ai-studio/image-history";
import { FutureTools } from "@/components/ai-studio/future-tools";
import { listHistory } from "@/lib/ai-studio/history-store";
import type { HistoryItem } from "@/types/ai-studio";

export default function AiStudioPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  function refreshHistory() {
    setHistory(listHistory());
  }

  useEffect(refreshHistory, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-mm-ink">AI Studio</h1>
        <p className="mt-1 text-sm text-mm-muted">Create visual and creative assets with guided AI workflows.</p>
      </header>

      <BirthdayVisualGenerator onHistoryChanged={refreshHistory} />
      <ImageHistory items={history} />
      <FutureTools />
    </div>
  );
}
