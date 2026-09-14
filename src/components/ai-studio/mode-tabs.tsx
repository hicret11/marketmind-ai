import type { AiStudioMode } from "@/types/ai-studio";

export function ModeTabs({ mode, onChange }: { mode: AiStudioMode; onChange: (mode: AiStudioMode) => void }) {
  const options: Array<{ value: AiStudioMode; label: string }> = [
    { value: "guided", label: "Guided Mode" },
    { value: "custom", label: "Custom Prompt" },
  ];
  return (
    <div className="inline-flex gap-1 rounded-full border border-gray-200 bg-white p-1 text-xs">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-4 py-1.5 font-semibold transition-colors ${
            mode === opt.value ? "bg-mm-pink text-white" : "text-gray-600"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
