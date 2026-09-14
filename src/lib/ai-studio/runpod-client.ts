import "server-only";
import { env } from "@/lib/opportunity/env";

/**
 * Server-only RunPod Serverless client for the SMB-Birthday-v2 SDXL+LoRA
 * worker (see inference-worker/handler.py). Never imported by any client
 * component — the `server-only` import above makes that a build error if
 * it ever is. RUNPOD_API_KEY never leaves this module.
 */

export interface RunPodGenerateInput {
  prompt: string;
  negative_prompt: string;
  width: number;
  height: number;
  steps?: number;
  guidance_scale?: number;
  seed?: number;
  lora_scale?: number;
}

interface RunPodRunSyncResponse {
  id: string;
  status: string;
  output?: {
    image_url?: string;
    image_base64?: string;
    seed?: number;
    width?: number;
    height?: number;
    error?: string;
  };
  error?: string;
}

export interface RunPodGenerateResult {
  imageUrl: string;
  seed: number | null;
}

function runpodApiKey(): string {
  return env("RUNPOD_API_KEY");
}

function runpodEndpointId(): string {
  return env("RUNPOD_ENDPOINT_ID");
}

/** True only when both RunPod env vars are actually set — never assumed, never faked. */
export function isRunPodConfigured(): boolean {
  return runpodApiKey().length > 0 && runpodEndpointId().length > 0;
}

/**
 * Calls the RunPod Serverless endpoint synchronously (`/runsync`) and waits
 * for the generated image. Throws on any failure — callers (the API route)
 * are responsible for catching and turning that into a clean error response.
 */
export async function generateWithRunPod(input: RunPodGenerateInput): Promise<RunPodGenerateResult> {
  const apiKey = runpodApiKey();
  const endpointId = runpodEndpointId();
  if (!apiKey || !endpointId) {
    throw new Error("RunPod is not configured.");
  }

  const response = await fetch(`https://api.runpod.ai/v2/${endpointId}/runsync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input }),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(`RunPod request failed (HTTP ${response.status}): ${bodyText || response.statusText}`);
  }

  const data = (await response.json()) as RunPodRunSyncResponse;

  if (data.status === "FAILED" || data.error) {
    throw new Error(data.output?.error ?? data.error ?? "RunPod job failed.");
  }

  // MVP contract: the worker returns raw base64 PNG (no Blob/Supabase Storage
  // yet). `image_url` is preferred and used as-is whenever the worker starts
  // returning one — swapping the worker over to real storage later needs no
  // change here or anywhere downstream (the API route and result panel only
  // ever see `imageUrl`, a plain string).
  const imageUrl = data.output?.image_url ?? (data.output?.image_base64 ? `data:image/png;base64,${data.output.image_base64}` : undefined);

  if (!imageUrl) {
    throw new Error("RunPod response did not include an image.");
  }

  return { imageUrl, seed: data.output?.seed ?? null };
}
