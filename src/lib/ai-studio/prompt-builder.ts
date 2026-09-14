import type {
  ColorPalette,
  CustomPromptForm,
  GenerateImageRequest,
  GenerateImageTheme,
  GuidedStructuredSummary,
  GuidedVisualForm,
  ImageCount,
  PetOption,
  VisualFormat,
  VisualMood,
  VisualTheme,
} from "@/types/ai-studio";

/**
 * Turns Guided Mode's structured selections into a natural-language prompt
 * and a display summary — pure, deterministic, no side effects.
 *
 * This is the ONLY thing that will need to change when real model
 * integration is added: a future `lib/ai-studio/generate.ts` would take the
 * string this returns and pass it to an image API. Nothing here calls
 * anything external.
 */

const THEME_LABELS: Record<VisualTheme, string> = {
  cake: "Cake",
  balloons: "Balloons",
  flowers: "Flowers",
  pet: "Pet",
  romantic: "Romantic",
  sunset: "Sunset",
  mixed: "Mixed",
};

const THEME_NOUN: Record<VisualTheme, string> = {
  cake: "birthday cake",
  balloons: "birthday balloon display",
  flowers: "birthday flower arrangement",
  pet: "pet",
  romantic: "romantic birthday scene",
  sunset: "birthday celebration at sunset",
  mixed: "birthday celebration scene",
};

const PALETTE_LABELS: Record<ColorPalette, string> = {
  purple: "Purple",
  pink: "Pink",
  blue: "Blue",
  gold: "Gold",
  pastel: "Pastel",
  custom: "Custom",
};

const PALETTE_PHRASE: Record<Exclude<ColorPalette, "custom">, string> = {
  purple: "pastel purple",
  pink: "soft pink",
  blue: "cool blue",
  gold: "elegant gold",
  pastel: "pastel",
};

const MOOD_LABELS: Record<VisualMood, string> = {
  elegant: "Elegant",
  cute: "Cute",
  romantic: "Romantic",
  fun: "Fun",
  dreamy: "Dreamy",
  minimal: "Minimal",
};

const FORMAT_LABELS: Record<VisualFormat, string> = {
  "9:16": "9:16 Story",
  "4:5": "4:5 Post",
  "1:1": "1:1 Square",
};

const COMPOSITION_PHRASE: Record<VisualFormat, string> = {
  "9:16": "vertical composition",
  "4:5": "portrait composition",
  "1:1": "square composition",
};

const PET_LABELS: Record<string, string> = {
  none: "None",
  cat: "Cat",
  dog: "Dog",
  custom: "Custom",
};

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

function colorPhraseFor(form: GuidedVisualForm): string {
  if (form.palette === "custom") return form.customPalette.trim() || "a custom color palette";
  return PALETTE_PHRASE[form.palette];
}

function petNounFor(form: GuidedVisualForm): string {
  if (form.pet === "cat") return "cat";
  if (form.pet === "dog") return "dog";
  if (form.pet === "custom") return form.customPet.trim() || "pet";
  return "pet";
}

/** Builds the natural-language prompt from Guided Mode's current selections. Returns "" until a theme is chosen. */
export function buildGuidedPrompt(form: GuidedVisualForm): string {
  if (!form.theme) return "";

  const details = form.additionalDetails.trim();
  const mood = form.mood;

  const subjectNoun = form.theme === "pet" ? petNounFor(form) : THEME_NOUN[form.theme];
  const subject = details ? `${mood} ${details}` : `${mood} ${subjectNoun}`;

  const colorPhrase = colorPhraseFor(form);
  const composition = COMPOSITION_PHRASE[form.format];

  return [
    `${article(mood)} ${subject} in an elegant birthday setting`,
    "small decorated cake",
    `${colorPhrase} balloons and flowers`,
    "soft premium photography",
    composition,
    "no people, no human hands, no text",
  ].join(", ");
}

/** The compact, human-readable summary shown alongside the prompt preview. */
export function buildGuidedSummary(form: GuidedVisualForm): GuidedStructuredSummary | null {
  if (!form.theme) return null;
  return {
    theme: THEME_LABELS[form.theme],
    palette: form.palette === "custom" ? `Custom — ${form.customPalette.trim() || "unspecified"}` : PALETTE_LABELS[form.palette],
    mood: MOOD_LABELS[form.mood],
    format: FORMAT_LABELS[form.format],
    pet: form.pet === "custom" ? `Custom — ${form.customPet.trim() || "unspecified"}` : PET_LABELS[form.pet],
    numberOfImages: form.numberOfImages,
  };
}

/**
 * Adapts Guided Mode's form state into the request shape POST
 * /api/ai-studio/generate expects. Only entry point that bridges the two —
 * note GuidedVisualForm's theme is singular "pet" (already-shipped UI
 * state) while the generate route's contract uses plural "pets"; every
 * other theme value passes through unchanged. Requires `form.theme` to be
 * set (callers already guard "Generate Images" on this).
 */
export function toGenerateImageRequest(form: GuidedVisualForm): GenerateImageRequest {
  if (!form.theme) throw new Error("toGenerateImageRequest called before a theme was selected.");
  const theme: GenerateImageTheme = form.theme === "pet" ? "pets" : form.theme;
  const color = form.palette === "custom" ? form.customPalette.trim() || "custom" : form.palette;
  const pet = form.theme === "pet" ? petNounFor(form) : undefined;
  const details = form.additionalDetails.trim() || undefined;

  return { theme, color, mood: form.mood, format: form.format, pet, details };
}

/** Builds the final prompt for Custom Prompt Mode — the user's own text, plus their explicit constraints. */
export function buildCustomPrompt(prompt: string, noPeople: boolean): string {
  const base = prompt.trim();
  if (!base) return "";
  return noPeople ? `${base}, no people, no human hands, no text` : base;
}

export const VISUAL_THEME_OPTIONS: Array<{ value: VisualTheme; label: string; icon: string }> = [
  { value: "cake", label: "Cake", icon: "🎂" },
  { value: "balloons", label: "Balloons", icon: "🎈" },
  { value: "flowers", label: "Flowers", icon: "💐" },
  { value: "pet", label: "Pet", icon: "🐾" },
  { value: "romantic", label: "Romantic", icon: "💜" },
  { value: "sunset", label: "Sunset", icon: "🌇" },
  { value: "mixed", label: "Mixed", icon: "✨" },
];

export const COLOR_PALETTE_OPTIONS: Array<{ value: ColorPalette; label: string }> = [
  { value: "purple", label: "Purple" },
  { value: "pink", label: "Pink" },
  { value: "blue", label: "Blue" },
  { value: "gold", label: "Gold" },
  { value: "pastel", label: "Pastel" },
  { value: "custom", label: "Custom" },
];

export const MOOD_OPTIONS: Array<{ value: VisualMood; label: string }> = [
  { value: "elegant", label: "Elegant" },
  { value: "cute", label: "Cute" },
  { value: "romantic", label: "Romantic" },
  { value: "fun", label: "Fun" },
  { value: "dreamy", label: "Dreamy" },
  { value: "minimal", label: "Minimal" },
];

export const FORMAT_OPTIONS: Array<{ value: VisualFormat; label: string }> = [
  { value: "9:16", label: "9:16 Story" },
  { value: "4:5", label: "4:5 Post" },
  { value: "1:1", label: "1:1 Square" },
];

export const PET_OPTIONS: Array<{ value: PetOption; label: string }> = [
  { value: "none", label: "None" },
  { value: "cat", label: "Cat" },
  { value: "dog", label: "Dog" },
  { value: "custom", label: "Custom" },
];

export const IMAGE_COUNT_OPTIONS: ImageCount[] = [1, 3, 5];

export function emptyGuidedForm(): GuidedVisualForm {
  return {
    theme: null,
    palette: "purple",
    customPalette: "",
    mood: "elegant",
    format: "9:16",
    pet: "none",
    customPet: "",
    people: "no_people",
    numberOfImages: 3,
    additionalDetails: "",
  };
}

export function emptyCustomPromptForm(): CustomPromptForm {
  return { prompt: "", format: "9:16", numberOfImages: 3, noPeople: true, negativePrompt: "" };
}
