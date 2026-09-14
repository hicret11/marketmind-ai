import { NextResponse } from "next/server";
import { buildGeneratePrompt, resolutionForFormat, STANDARD_NEGATIVE_PROMPT } from "@/lib/ai-studio/generate-prompt-builder";
import { generateWithRunPod, isRunPodConfigured } from "@/lib/ai-studio/runpod-client";
import type { GenerateImageRequest, GenerateImageResponse, VisualFormat } from "@/types/ai-studio";

/**
 * POST /api/ai-studio/generate
 *
 * MarketMind AI Studio → this route → RunPod GPU endpoint → SDXL base +
 * SMB-Birthday-v2 LoRA (see inference-worker/handler.py) → generated image
 * URL back to MarketMind. This route never loads the model itself, and
 * RUNPOD_API_KEY never leaves the server (see lib/ai-studio/runpod-client.ts).
 */

const VALID_THEMES: GenerateImageRequest["theme"][] = ["cake", "balloons", "flowers", "pets", "romantic", "sunset", "mixed"];
const VALID_FORMATS: VisualFormat[] = ["9:16", "4:5", "1:1"];

const DEFAULT_STEPS = 30;
const DEFAULT_GUIDANCE_SCALE = 7.0;
const DEFAULT_LORA_SCALE = 0.6;

function validationError(message: string) {
  return NextResponse.json<GenerateImageResponse>({ success: false, error: message }, { status: 400 });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError("Request body must be valid JSON.");
  }

  if (typeof body !== "object" || body === null) {
    return validationError("Request body must be a JSON object.");
  }

  const input = body as Partial<GenerateImageRequest>;

  if (!input.theme || !VALID_THEMES.includes(input.theme)) {
    return validationError(`"theme" must be one of: ${VALID_THEMES.join(", ")}.`);
  }
  if (!input.color || typeof input.color !== "string" || !input.color.trim()) {
    return validationError('"color" is required.');
  }
  if (!input.mood || typeof input.mood !== "string" || !input.mood.trim()) {
    return validationError('"mood" is required.');
  }
  if (!input.format || !VALID_FORMATS.includes(input.format)) {
    return validationError(`"format" must be one of: ${VALID_FORMATS.join(", ")}.`);
  }
  if (input.pet !== undefined && typeof input.pet !== "string") {
    return validationError('"pet" must be a string when provided.');
  }
  if (input.details !== undefined && typeof input.details !== "string") {
    return validationError('"details" must be a string when provided.');
  }

  const generateRequest: GenerateImageRequest = {
    theme: input.theme,
    color: input.color,
    mood: input.mood,
    format: input.format,
    pet: input.pet,
    details: input.details,
  };

  // Honest, non-crashing state when RunPod isn't set up yet — never a fabricated image.
  if (!isRunPodConfigured()) {
    return NextResponse.json<GenerateImageResponse>({ configured: false });
  }

  const prompt = buildGeneratePrompt(generateRequest);
  const { width, height } = resolutionForFormat(generateRequest.format);

  try {
    const result = await generateWithRunPod({
      prompt,
      negative_prompt: STANDARD_NEGATIVE_PROMPT,
      width,
      height,
      steps: DEFAULT_STEPS,
      guidance_scale: DEFAULT_GUIDANCE_SCALE,
      lora_scale: DEFAULT_LORA_SCALE,
    });

    return NextResponse.json<GenerateImageResponse>({
      success: true,
      imageUrl: result.imageUrl,
      prompt,
      settings: {
        width,
        height,
        steps: DEFAULT_STEPS,
        guidanceScale: DEFAULT_GUIDANCE_SCALE,
        loraScale: DEFAULT_LORA_SCALE,
        seed: result.seed,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RunPod generation failed.";
    return NextResponse.json<GenerateImageResponse>({ success: false, error: message }, { status: 502 });
  }
}
