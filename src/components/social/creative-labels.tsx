import type { CreativeLabels } from "@/types/social";
import { SourceLabel } from "./social-ui";

const FIELDS: Array<{ key: keyof CreativeLabels; label: string }> = [
  { key: "creativeType", label: "Creative type" },
  { key: "hookType", label: "Hook" },
  { key: "primaryEmotion", label: "Emotion" },
  { key: "contentTheme", label: "Theme" },
  { key: "ctaType", label: "CTA" },
  { key: "productVisible", label: "Product visible" },
  { key: "humanReaction", label: "Human reaction" },
  { key: "personalizationVisible", label: "Personalization visible" },
  { key: "textOverlay", label: "Text overlay" },
  { key: "estimatedVideoStyle", label: "Video style" },
];

export function CreativeLabelList({ labels }: { labels: CreativeLabels | null }) {
  if (!labels) {
    return (
      <p className="text-xs text-mm-muted">
        Not analyzed yet — run a sync while AI is connected to generate creative labels.
      </p>
    );
  }
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <SourceLabel source="marketmind" />
        <span className="text-[11px] text-mm-muted">
          confidence: {labels.confidence} · from {labels.analyzedInputs.join(", ")}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
        {FIELDS.map(({ key, label }) => {
          const value = labels[key];
          const isString = typeof value === "string";
          return (
            <div key={key}>
              <dt className="text-[10px] uppercase tracking-wide text-mm-muted">{label}</dt>
              <dd
                className={
                  isString && (value === "Unknown" || value === "Not detected")
                    ? "italic text-gray-400"
                    : "text-mm-ink"
                }
              >
                {isString ? value : "—"}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
