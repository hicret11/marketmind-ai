import type { GenerationSlot, PreparedVisualResult } from "@/types/ai-studio";

/**
 * `slots`, when provided, reflects a real POST /api/ai-studio/generate call
 * in flight/finished for each requested image — loading spinner, the real
 * generated image, or a per-slot error. When omitted (or null), this falls
 * back to the original placeholder "Preview Slot" grid.
 */
export function ResultPanel({ result, slots }: { result: PreparedVisualResult | null; slots?: GenerationSlot[] | null }) {
  if (!result) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-mm-muted">
        Your generated visual setup will appear here.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-mm-ink">Prepared Setup</p>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
          Ready for model integration
        </span>
      </div>

      {result.summary && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
          <div>
            <span className="text-mm-muted">Theme: </span>
            <span className="font-medium text-mm-ink">{result.summary.theme}</span>
          </div>
          <div>
            <span className="text-mm-muted">Palette: </span>
            <span className="font-medium text-mm-ink">{result.summary.palette}</span>
          </div>
          <div>
            <span className="text-mm-muted">Mood: </span>
            <span className="font-medium text-mm-ink">{result.summary.mood}</span>
          </div>
          <div>
            <span className="text-mm-muted">Format: </span>
            <span className="font-medium text-mm-ink">{result.summary.format}</span>
          </div>
          <div>
            <span className="text-mm-muted">Pet: </span>
            <span className="font-medium text-mm-ink">{result.summary.pet}</span>
          </div>
          <div>
            <span className="text-mm-muted">Images: </span>
            <span className="font-medium text-mm-ink">{result.numberOfImages}</span>
          </div>
        </div>
      )}

      <div className="mt-3 rounded-lg bg-gray-50 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-mm-muted">Generated Prompt</p>
        <p className="mt-1 text-xs text-mm-ink">{result.prompt}</p>
        {result.negativePrompt && (
          <>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-mm-muted">Negative Prompt</p>
            <p className="mt-1 text-xs text-mm-ink">{result.negativePrompt}</p>
          </>
        )}
      </div>

      <div className={`mt-3 grid gap-2 ${result.numberOfImages === 1 ? "grid-cols-1" : result.numberOfImages === 3 ? "grid-cols-3" : "grid-cols-5"}`}>
        {Array.from({ length: result.numberOfImages }).map((_, i) => {
          const slot = slots?.[i];

          if (slot?.status === "loading") {
            return (
              <div
                key={i}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-gray-200 bg-gray-50 text-center"
              >
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-mm-dark-rose border-t-transparent" aria-hidden />
                <span className="mt-1 text-[10px] font-medium text-mm-muted">Generating…</span>
              </div>
            );
          }

          if (slot?.status === "success" && slot.imageUrl) {
            return (
              <div key={i} className="aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element -- remote RunPod/blob-storage URL, not a static asset */}
                <img src={slot.imageUrl} alt={`Generated visual ${i + 1}`} className="h-full w-full object-cover" />
              </div>
            );
          }

          if (slot?.status === "error") {
            return (
              <div
                key={i}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-red-200 bg-red-50 p-2 text-center"
              >
                <span className="text-lg text-red-300" aria-hidden>
                  ⚠️
                </span>
                <span className="text-[10px] font-medium text-red-500">{slot.error || "Generation failed"}</span>
              </div>
            );
          }

          if (slot?.status === "not_configured") {
            return (
              <div
                key={i}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-2 text-center"
              >
                <span className="text-lg text-gray-300" aria-hidden>
                  🔌
                </span>
                <span className="text-[10px] font-medium text-gray-400">Image generation not connected yet</span>
              </div>
            );
          }

          return (
            <div
              key={i}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-center"
            >
              <span className="text-lg text-gray-300" aria-hidden>
                🖼️
              </span>
              <span className="text-[10px] font-medium text-gray-400">Preview Slot {i + 1}</span>
            </div>
          );
        })}
      </div>
      {!slots && (
        <p className="mt-2 text-center text-[10px] text-mm-muted">
          Placeholder slots — no images have been generated yet.
        </p>
      )}
    </div>
  );
}
