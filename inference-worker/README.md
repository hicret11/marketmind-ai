# inference-worker

RunPod Serverless GPU worker for MarketMind AI Studio's Birthday Visual
Generator. This is a **separate project** from the Next.js app — it is never
imported by it, and the Next.js app never loads `stable-diffusion-xl-base-1.0`
or the LoRA weights directly. The only connection between the two is an HTTP
call: `src/lib/ai-studio/runpod-client.ts` → RunPod → this worker.

**Nothing in this folder has been deployed.** This is the worker's source
code and build definition only.

## What it does

1. Loads SDXL base (`stabilityai/stable-diffusion-xl-base-1.0`) once, at
   process start.
2. Swaps in a fixed VAE (`madebyollin/sdxl-vae-fp16-fix`) — the standard
   fp16-safe SDXL VAE.
3. Loads the `SMB-Birthday-v2` LoRA (`smb_birthday_v2.safetensors`) once, at
   process start, read-only. This worker never trains and never writes to
   that file. Resolution order: a local file first (dev), a private
   Hugging Face repo download second (RunPod) — see below.
4. Runs on CUDA, float16.
5. Serves requests via `runpod.serverless.start(...)` — RunPod keeps the
   process (and therefore the loaded pipeline) warm between invocations, so
   the model is not reloaded per request.

## Request shape (`event["input"]`)

Matches what `src/lib/ai-studio/runpod-client.ts` sends:

```json
{
  "prompt": "string, required",
  "negative_prompt": "string",
  "width": 1024,
  "height": 1024,
  "steps": 30,
  "guidance_scale": 7.0,
  "seed": 12345,
  "lora_scale": 0.6
}
```

Defaults if omitted: `steps=30`, `guidance_scale=7.0`, `lora_scale=0.6`.
`lora_scale` is clamped to `[0.3, 1.0]` regardless of what's sent.

## Response shape

Today, the handler returns the generated image as base64 PNG:

```json
{ "image_base64": "...", "seed": 12345, "generation_time_s": 4.31 }
```

`src/lib/ai-studio/runpod-client.ts` on the MarketMind side is already
written to **prefer** `image_url` if present, and currently raises a clear
error if only `image_base64` comes back — as a deliberate reminder that
returning base64 directly is a temporary/dev-only path, not the intended
production shape (large payloads, slow, no CDN caching).

**Before deploying for real use**, swap `_image_to_output()` in
`handler.py` to upload the PNG to Vercel Blob or Supabase Storage and
return `{"image_url": "https://..."}` instead. That's the only change
needed on the worker side; the Next.js side already expects it.

## LoRA weights — where they live

`smb_birthday_v2.safetensors` is **not** committed to Git (see the repo's
root `.gitignore`: `*.safetensors`, `model/`, `inference-worker/model/`).
For local reference, a copy currently lives at
`inference-worker/model/smb_birthday_v2.safetensors` (git-ignored).

`handler.py` resolves the weights at startup, once, in this order:

1. **Local file** — `LORA_PATH` (default: `inference-worker/model/smb_birthday_v2.safetensors`
   next to `handler.py`). Used for local development; if this file exists
   it's used as-is and Hugging Face is never contacted.
2. **Hugging Face Hub fallback** — if the local file doesn't exist (a fresh
   RunPod Serverless container never has it, since it's git-ignored), the
   worker downloads it once from your private repo
   [`hacire-11/smb-birthday-v2`](https://huggingface.co/hacire-11/smb-birthday-v2)
   via `huggingface_hub.hf_hub_download()`, using `HF_TOKEN`. This is the
   path RunPod Serverless actually uses — no Docker rebuild or Network
   Volume needed just to ship the LoRA. `hf_hub_download()` caches the file
   on disk after the first download, so this only touches the network on a
   cold start, never per request.

An alternative for RunPod — baking the weights into the Docker image or
mounting a Network Volume — is still possible (see the commented `COPY
model/...` line in `Dockerfile`), but is no longer necessary now that the
Hugging Face fallback exists.

Never add the `.safetensors` file to Git regardless of which option is used.

## Environment variables (worker side)

| Variable            | Purpose                                                                 |
|----------------------|--------------------------------------------------------------------------|
| `LORA_PATH`          | Local dev path to `smb_birthday_v2.safetensors`. Defaults to `./model/smb_birthday_v2.safetensors` next to `handler.py`. If this file exists, it's used and Hugging Face is skipped entirely. |
| `HF_TOKEN`           | Hugging Face **fine-grained READ token** for the private `hacire-11/smb-birthday-v2` repo. Only used when the local file above is absent. Never logged or printed — set it as a RunPod endpoint secret/env var, never baked into the Docker image. |
| `SMB_LORA_REPO`      | Hugging Face repo to download the LoRA from. Defaults to `hacire-11/smb-birthday-v2`. |
| `SMB_LORA_FILENAME`  | Filename inside that repo. Defaults to `smb_birthday_v2.safetensors`. |

(RunPod's own routing/auth env vars are injected automatically by the
platform at runtime — nothing else to set here.)

## Next steps to actually deploy (not done yet)

1. `docker build -t <your-registry>/smb-birthday-worker:v1 ./inference-worker`
   (no LoRA baking needed — the Hugging Face fallback handles it at cold
   start, as long as `HF_TOKEN` is set on the endpoint).
2. `docker push <your-registry>/smb-birthday-worker:v1`
3. In the RunPod dashboard: **Serverless → New Endpoint**, point it at that
   image, pick a GPU (SDXL needs ≥16GB VRAM — an A4000/A5000 class GPU or
   better), set min/max workers.
4. Add `HF_TOKEN` (your fine-grained read token) as a **secret environment
   variable** on the endpoint — never paste it into the Dockerfile, code, or
   Git. `SMB_LORA_REPO` / `SMB_LORA_FILENAME` only need setting if you want
   to override the defaults already baked into `handler.py`/`Dockerfile`.
5. Copy the endpoint's ID and a RunPod API key into MarketMind's
   `.env.local`:
   ```
   RUNPOD_API_KEY=...
   RUNPOD_ENDPOINT_ID=...
   ```
6. Once both are set, `POST /api/ai-studio/generate` will stop returning
   `{ "configured": false }` and will start calling the real endpoint.
7. Swap `_image_to_output()` in `handler.py` for a real Blob/Supabase
   Storage upload (see "Response shape" above) before relying on this for
   real traffic — base64 responses are a dev-only stopgap.
8. Send one test request through AI Studio's Guided Mode and confirm a real
   image comes back before treating this as production-ready.
