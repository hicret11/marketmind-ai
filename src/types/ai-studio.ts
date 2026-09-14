/**
 * AI Studio — Birthday Visual Generator types.
 *
 * UI/state/prompt-building only. Nothing here calls a model or an image
 * API — see lib/ai-studio/prompt-builder.ts's own doc comment for exactly
 * where a real integration would plug in later.
 */

export type VisualTheme = "cake" | "balloons" | "flowers" | "pet" | "romantic" | "sunset" | "mixed";

export type ColorPalette = "purple" | "pink" | "blue" | "gold" | "pastel" | "custom";

export type VisualMood = "elegant" | "cute" | "romantic" | "fun" | "dreamy" | "minimal";

export type VisualFormat = "9:16" | "4:5" | "1:1";

export type PetOption = "none" | "cat" | "dog" | "custom";

export type ImageCount = 1 | 3 | 5;

/** Guided Mode's full form state. */
export interface GuidedVisualForm {
  theme: VisualTheme | null;
  palette: ColorPalette;
  customPalette: string;
  mood: VisualMood;
  format: VisualFormat;
  pet: PetOption;
  customPet: string;
  /** Always "no_people" — shown as a locked/disabled selector, never user-editable. */
  people: "no_people";
  numberOfImages: ImageCount;
  additionalDetails: string;
}

export interface GuidedStructuredSummary {
  theme: string;
  palette: string;
  mood: string;
  format: string;
  pet: string;
  numberOfImages: ImageCount;
}

/** Custom Prompt Mode's form state. */
export interface CustomPromptForm {
  prompt: string;
  format: VisualFormat;
  numberOfImages: ImageCount;
  noPeople: boolean;
  negativePrompt: string;
}

export type AiStudioMode = "guided" | "custom";

/** What "Prepare Prompt" produces — ready for a future model call, never one made now. */
export interface PreparedVisualResult {
  id: string;
  createdAt: string;
  mode: AiStudioMode;
  prompt: string;
  negativePrompt: string | null;
  format: VisualFormat;
  numberOfImages: ImageCount;
  summary: GuidedStructuredSummary | null;
  /** Always this today — no model is ever called by this module. */
  status: "ready_for_model_integration";
}

export type HistoryItemType = "draft_prompt";

/** A lightweight, client-side-only history entry (localStorage) — no backend yet. */
export interface HistoryItem {
  id: string;
  title: string;
  type: HistoryItemType;
  format: VisualFormat;
  createdAt: string;
  mode: AiStudioMode;
  prompt: string;
}

/**
 * Real image generation — POST /api/ai-studio/generate.
 *
 * MarketMind (this Next.js app) never loads the LoRA/SDXL model itself. This
 * route only builds a prompt and forwards it to a RunPod GPU endpoint; see
 * lib/ai-studio/runpod-client.ts and inference-worker/handler.py.
 *
 * Note: `theme` here uses plural "pets" per this route's own contract, which
 * differs from GuidedVisualForm's singular "pet" above (already shipped UI
 * state) — the singular/plural mapping happens at the call site.
 */
export type GenerateImageTheme = "cake" | "balloons" | "flowers" | "pets" | "romantic" | "sunset" | "mixed";

export interface GenerateImageRequest {
  theme: GenerateImageTheme;
  color: string;
  mood: string;
  format: VisualFormat;
  pet?: string;
  details?: string;
}

export interface GenerateImageSettings {
  width: number;
  height: number;
  steps: number;
  guidanceScale: number;
  loraScale: number;
  seed: number | null;
}

/** Successful generation. */
export interface GenerateImageSuccess {
  success: true;
  imageUrl: string;
  prompt: string;
  settings: GenerateImageSettings;
}

/** RunPod isn't configured yet (missing env vars) — an honest, non-crashing state, never a fabricated result. */
export interface GenerateImageNotConfigured {
  configured: false;
}

/** A real failure — bad input, or the RunPod call itself failed. */
export interface GenerateImageFailure {
  success: false;
  error: string;
}

export type GenerateImageResponse = GenerateImageSuccess | GenerateImageNotConfigured | GenerateImageFailure;

/** One "Preview Slot" in the result panel while/after a real generation request runs. */
export interface GenerationSlot {
  status: "loading" | "success" | "error" | "not_configured";
  imageUrl?: string;
  error?: string;
}
