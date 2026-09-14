import type { GenerateImageRequest, GenerateImageResponse } from "@/types/ai-studio";

/** Browser-side wrapper for POST /api/ai-studio/generate. Never touches RunPod directly. */
export async function generateImage(input: GenerateImageRequest): Promise<GenerateImageResponse> {
  try {
    const response = await fetch("/api/ai-studio/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await response.json()) as GenerateImageResponse;
    return data;
  } catch {
    return { success: false, error: "Could not reach the image generation service. Check your connection and try again." };
  }
}
