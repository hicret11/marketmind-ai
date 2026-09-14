"use client";

import { useState } from "react";

const DIMENSION_LABEL: Record<string, string> = {
  personalization: "Personalization",
  emotionalQuality: "Emotional Quality",
  birthdayRelevance: "Birthday Relevance",
  instructionFollowing: "Instruction Following",
  correctUseOfDetails: "Correct Use of Details",
  noInventedFacts: "No Invented Personal Facts",
  naturalLanguage: "Natural Language Quality",
  brandFit: "Brand Fit",
  originality: "Originality",
  ctaQuality: "CTA Quality",
  emotionalFit: "Emotional Fit",
  platformFit: "Platform Fit",
  promptAdherence: "Prompt Adherence",
  visualQuality: "Visual Quality",
  noFaceCompliance: "No Face / People Compliance",
  slideshowUsability: "Slideshow Usability",
  composition: "Composition",
  overall: "Overall",
};

export function HumanEvalScoreForm({
  dimensions,
  onSubmit,
  onCancel,
  submitting,
}: {
  dimensions: readonly string[];
  onSubmit: (scores: Record<string, number>, note: string) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(dimensions.map((d) => [d, 5])),
  );
  const [note, setNote] = useState("");

  return (
    <div className="space-y-2 rounded-lg border border-mm-rose/40 bg-mm-soft-pink/30 p-3">
      {dimensions.map((d) => (
        <div key={d} className="flex items-center gap-2">
          <label className="w-48 shrink-0 text-[11px] text-mm-ink">{DIMENSION_LABEL[d] ?? d}</label>
          <input
            type="range"
            min={0}
            max={10}
            value={scores[d]}
            onChange={(e) => setScores((prev) => ({ ...prev, [d]: Number(e.target.value) }))}
            className="flex-1"
          />
          <span className="w-6 text-right text-[11px] font-semibold text-mm-ink">{scores[d]}</span>
        </div>
      ))}
      <textarea
        placeholder="Optional note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-2 py-1 text-xs"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-full border border-gray-300 px-3 py-1.5 text-xs">
          Cancel
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => onSubmit(scores, note.trim())}
          className="rounded-full bg-mm-pink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save review"}
        </button>
      </div>
    </div>
  );
}
