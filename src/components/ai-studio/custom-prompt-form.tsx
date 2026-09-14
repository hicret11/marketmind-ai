import { OptionPills } from "./option-pills";
import { FORMAT_OPTIONS, IMAGE_COUNT_OPTIONS } from "@/lib/ai-studio/prompt-builder";
import type { CustomPromptForm } from "@/types/ai-studio";

export function CustomPromptFormPanel({
  form,
  onChange,
}: {
  form: CustomPromptForm;
  onChange: (patch: Partial<CustomPromptForm>) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-mm-muted">For advanced users who want direct control.</p>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-muted">Prompt</p>
        <textarea
          value={form.prompt}
          onChange={(e) => onChange({ prompt: e.target.value })}
          rows={4}
          placeholder="Describe the birthday visual you want to create…"
          className="mt-1.5 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-mm-pink"
        />
      </div>

      <OptionPills label="Format" options={FORMAT_OPTIONS} value={form.format} onChange={(format) => onChange({ format })} />

      <OptionPills
        label="Number of Images"
        options={IMAGE_COUNT_OPTIONS.map((n) => ({ value: n, label: String(n) }))}
        value={form.numberOfImages}
        onChange={(n) => onChange({ numberOfImages: n })}
      />

      <label className="flex items-center gap-2 text-xs font-medium text-mm-ink">
        <input
          type="checkbox"
          checked={form.noPeople}
          onChange={(e) => onChange({ noPeople: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-mm-pink focus:ring-mm-pink"
        />
        No people
      </label>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-muted">Negative prompt (optional)</p>
        <textarea
          value={form.negativePrompt}
          onChange={(e) => onChange({ negativePrompt: e.target.value })}
          rows={2}
          placeholder="e.g. blurry, low quality, extra limbs"
          className="mt-1.5 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-mm-pink"
        />
      </div>
    </div>
  );
}
