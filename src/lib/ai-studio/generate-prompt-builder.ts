import type { GenerateImageRequest, VisualFormat } from "@/types/ai-studio";

/**
 * Server-side prompt builder for POST /api/ai-studio/generate.
 *
 * Distinct from lib/ai-studio/prompt-builder.ts (the client-side Guided/
 * Custom Mode builder for the "Prepare Prompt" preview) — this one builds
 * the prompt actually sent to the RunPod SDXL + LoRA worker, from the
 * route's own request contract (theme/color/mood/pet/details).
 *
 * Pure and deterministic — no side effects, no network calls.
 */

/** Exact mapping the user specified — do not change without re-confirming. */
export const FORMAT_RESOLUTION: Record<VisualFormat, { width: number; height: number }> = {
  "9:16": { width: 768, height: 1344 },
  "4:5": { width: 896, height: 1120 },
  "1:1": { width: 1024, height: 1024 },
};

/** Standard negative prompt — used verbatim, kept separate from the positive prompt. */
export const STANDARD_NEGATIVE_PROMPT =
  "people, person, human, man, woman, boy, girl, child, baby, hands, arms, body, portrait, silhouette, text, watermark, logo, distorted, deformed";

const THEME_SUBJECT: Record<Exclude<GenerateImageRequest["theme"], "pets">, string> = {
  cake: "birthday cake",
  balloons: "birthday balloon arrangement",
  flowers: "birthday flower arrangement",
  romantic: "romantic birthday scene",
  sunset: "birthday celebration at sunset",
  mixed: "birthday celebration scene",
};

/** Named-color → descriptive phrase, with a passthrough for free-form/custom color input. */
function colorPhraseFor(color: string): string {
  const key = color.trim().toLowerCase();
  const known: Record<string, string> = {
    purple: "pastel purple",
    pink: "soft pink",
    blue: "cool blue",
    gold: "elegant gold",
    pastel: "pastel",
  };
  if (known[key]) return known[key];
  return color.trim() || "soft";
}

function subjectClauseFor(input: GenerateImageRequest): string {
  const mood = input.mood.trim() || "elegant";
  if (input.theme === "pets") {
    const petNoun = (input.pet ?? "").trim() || "pet";
    return `a ${mood} ${petNoun} beside a small birthday cake`;
  }
  return `a ${mood} ${THEME_SUBJECT[input.theme]}`;
}

/** Builds the positive prompt sent to the RunPod worker. */
export function buildGeneratePrompt(input: GenerateImageRequest): string {
  const subjectClause = subjectClauseFor(input);
  const decorClause = `${colorPhraseFor(input.color)} balloons and soft flowers`;
  const detailsClause = input.details?.trim() || null;

  return [subjectClause, decorClause, detailsClause, "elegant birthday setup", "premium photography", "clean composition"]
    .filter((part): part is string => Boolean(part))
    .join(", ");
}

export function resolutionForFormat(format: VisualFormat): { width: number; height: number } {
  return FORMAT_RESOLUTION[format];
}
