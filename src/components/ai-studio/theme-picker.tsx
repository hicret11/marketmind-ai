import { VISUAL_THEME_OPTIONS } from "@/lib/ai-studio/prompt-builder";
import type { VisualTheme } from "@/types/ai-studio";

export function ThemePicker({ value, onChange }: { value: VisualTheme | null; onChange: (theme: VisualTheme) => void }) {
  return (
    <div>
      <p className="text-sm font-semibold text-mm-ink">What would you like to create?</p>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {VISUAL_THEME_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors ${
              value === opt.value
                ? "border-mm-pink bg-mm-soft-pink/40"
                : "border-gray-200 bg-white hover:border-mm-pink/60"
            }`}
          >
            <span className="text-2xl" aria-hidden>
              {opt.icon}
            </span>
            <span className={`text-xs font-medium ${value === opt.value ? "text-mm-dark-rose" : "text-gray-700"}`}>
              {opt.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
