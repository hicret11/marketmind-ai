import type { GuidedStructuredSummary } from "@/types/ai-studio";

export function PromptPreview({
  prompt,
  summary,
}: {
  prompt: string;
  summary: GuidedStructuredSummary | null;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-muted">Generated Prompt Preview</p>
      <p className="mt-1.5 text-sm leading-relaxed text-mm-ink">
        {prompt || <span className="italic text-gray-400">Choose a theme to start building your prompt…</span>}
      </p>

      {summary && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-gray-200 pt-3 text-xs sm:grid-cols-3">
          <SummaryRow label="Theme" value={summary.theme} />
          <SummaryRow label="Palette" value={summary.palette} />
          <SummaryRow label="Mood" value={summary.mood} />
          <SummaryRow label="Format" value={summary.format} />
          <SummaryRow label="Pet" value={summary.pet} />
          <SummaryRow label="Number of Images" value={String(summary.numberOfImages)} />
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-mm-muted">{label}: </span>
      <span className="font-medium text-mm-ink">{value}</span>
    </div>
  );
}
