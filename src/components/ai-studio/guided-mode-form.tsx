import { ThemePicker } from "./theme-picker";
import { OptionPills } from "./option-pills";
import {
  COLOR_PALETTE_OPTIONS,
  FORMAT_OPTIONS,
  IMAGE_COUNT_OPTIONS,
  MOOD_OPTIONS,
  PET_OPTIONS,
} from "@/lib/ai-studio/prompt-builder";
import type { GuidedVisualForm } from "@/types/ai-studio";

export function GuidedModeForm({
  form,
  onChange,
}: {
  form: GuidedVisualForm;
  onChange: (patch: Partial<GuidedVisualForm>) => void;
}) {
  return (
    <div className="space-y-5">
      <ThemePicker value={form.theme} onChange={(theme) => onChange({ theme })} />

      {form.theme && (
        <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
          <OptionPills
            label="Color Palette"
            options={COLOR_PALETTE_OPTIONS}
            value={form.palette}
            onChange={(palette) => onChange({ palette })}
          />
          {form.palette === "custom" && (
            <input
              value={form.customPalette}
              onChange={(e) => onChange({ customPalette: e.target.value })}
              placeholder="Custom color palette"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-mm-pink"
            />
          )}

          <OptionPills label="Mood" options={MOOD_OPTIONS} value={form.mood} onChange={(mood) => onChange({ mood })} />

          <OptionPills label="Format" options={FORMAT_OPTIONS} value={form.format} onChange={(format) => onChange({ format })} />

          <OptionPills label="Pet" options={PET_OPTIONS} value={form.pet} onChange={(pet) => onChange({ pet })} />
          {form.pet === "custom" && (
            <input
              value={form.customPet}
              onChange={(e) => onChange({ customPet: e.target.value })}
              placeholder="Custom pet details"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-mm-pink"
            />
          )}

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-muted">People</p>
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500">
              🔒 No people
            </span>
          </div>

          <OptionPills
            label="Number of Images"
            options={IMAGE_COUNT_OPTIONS.map((n) => ({ value: n, label: String(n) }))}
            value={form.numberOfImages}
            onChange={(n) => onChange({ numberOfImages: n })}
          />

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-muted">Additional details (optional)</p>
            <textarea
              value={form.additionalDetails}
              onChange={(e) => onChange({ additionalDetails: e.target.value })}
              rows={2}
              placeholder="e.g. black and white cat, lavender flowers, small cake, warm lighting"
              className="mt-1.5 w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-mm-pink"
            />
          </div>
        </div>
      )}
    </div>
  );
}
