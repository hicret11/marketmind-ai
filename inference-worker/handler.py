"""
RunPod Serverless worker — SDXL base + SMB-Birthday-v2 LoRA.

MarketMind AI Studio's Next.js app never loads this model itself. It calls
the RunPod Serverless endpoint this worker backs, which returns a generated
image. See src/lib/ai-studio/runpod-client.ts and
src/app/api/ai-studio/generate/route.ts on the Next.js side.

This worker does NOT train anything and does NOT modify the LoRA weights
file it loads — it only loads them (read-only) and runs inference.

Base model : stabilityai/stable-diffusion-xl-base-1.0
VAE        : madebyollin/sdxl-vae-fp16-fix
LoRA       : SMB-Birthday-v2 (smb_birthday_v2.safetensors)

Base model resolution: on RunPod Serverless (detected by the presence of
/runpod-volume/huggingface-cache/hub), the base model is loaded from
RunPod's pre-cached Hugging Face snapshot on the attached volume — never
downloaded onto container disk (this previously caused "OSError: [Errno 28]
No space left on device"). Locally, where that cache doesn't exist, the
base model still loads by model id from the Hugging Face Hub as before.
This only affects the SDXL BASE MODEL: the VAE and the LoRA still resolve
over the network as documented below, so HF_HUB_OFFLINE/TRANSFORMERS_OFFLINE
are deliberately never set globally.

LoRA weight resolution (in order):
  1. Local file at LORA_PATH (default: model/smb_birthday_v2.safetensors
     next to this file) — used for local development. Never committed to
     Git (see .gitignore: *.safetensors, inference-worker/model/).
  2. If that file doesn't exist (e.g. a fresh RunPod Serverless container),
     download it once from the private Hugging Face repo SMB_LORA_REPO
     using HF_TOKEN, via huggingface_hub.hf_hub_download(). hf_hub_download
     caches the file locally, so this only actually hits the network on a
     cold start, never per request.

FAIL-FAST GUARANTEE: if neither step above produces usable LoRA weights, or
`pipe.load_lora_weights(...)` itself raises, worker startup raises
RuntimeError and the process exits. This worker never falls back to
generating with base SDXL alone — every successful generation is guaranteed
to be SDXL + SMB-Birthday-v2 LoRA, or the worker doesn't come up at all.

The pipeline (and the LoRA weights) are loaded ONCE at import time (module
level), not per request, so a warm RunPod worker reuses it across
invocations.
"""

import base64
import io
import os
import time

import torch
from diffusers import AutoencoderKL, StableDiffusionXLPipeline
from huggingface_hub import hf_hub_download
from huggingface_hub.utils import HfHubHTTPError
import runpod

BASE_MODEL_ID = "stabilityai/stable-diffusion-xl-base-1.0"
VAE_MODEL_ID = "madebyollin/sdxl-vae-fp16-fix"

# RunPod Serverless workers get pre-cached Hugging Face models on their
# attached volume under this path. Its presence is also how we detect
# "this is a RunPod Serverless container" vs. local development.
RUNPOD_HF_CACHE_ROOT = "/runpod-volume/huggingface-cache/hub"

# Local-dev path — if this exists, it's used as-is and Hugging Face is never
# contacted. Never committed to Git (see .gitignore: *.safetensors,
# inference-worker/model/).
LOCAL_LORA_PATH = os.environ.get(
    "LORA_PATH", os.path.join(os.path.dirname(__file__), "model", "smb_birthday_v2.safetensors")
)

# Hugging Face fallback — used on RunPod Serverless, where the local file
# above won't exist in a fresh container. HF_TOKEN is a fine-grained READ
# token; it is read from the environment only and is NEVER logged or printed.
HF_LORA_REPO = os.environ.get("SMB_LORA_REPO", "hacire-11/smb-birthday-v2")
HF_LORA_FILENAME = os.environ.get("SMB_LORA_FILENAME", "smb_birthday_v2.safetensors")
HF_TOKEN = os.environ.get("HF_TOKEN")

LORA_ADAPTER_NAME = "smb_birthday_v2"

DEFAULT_STEPS = 30
DEFAULT_GUIDANCE_SCALE = 7.0
DEFAULT_LORA_SCALE = 0.6
MIN_LORA_SCALE = 0.3
MAX_LORA_SCALE = 1.0


def is_runpod_environment() -> bool:
    """True when running on a RunPod Serverless worker with the cached
    Hugging Face hub volume attached — detected solely by that path's
    presence, per RunPod's own convention."""
    return os.path.isdir(RUNPOD_HF_CACHE_ROOT)


def resolve_runpod_cached_snapshot(model_id: str) -> str | None:
    """
    Resolves a local snapshot directory for `model_id` from RunPod's cached
    Hugging Face hub volume (RUNPOD_HF_CACHE_ROOT), if present. Never
    downloads anything — read-only filesystem lookup. Returns None if the
    cache root, the model's cache directory, or any snapshot for it can't
    be found; callers decide what to do with that.

    Expected structure:
      RUNPOD_HF_CACHE_ROOT/models--<org>--<name>/
        refs/main            (a file containing a commit hash)
        snapshots/<hash>/    (the actual model files, one dir per commit)
    """
    model_dir_name = "models--" + model_id.replace("/", "--")
    model_dir = os.path.join(RUNPOD_HF_CACHE_ROOT, model_dir_name)
    snapshots_dir = os.path.join(model_dir, "snapshots")
    if not os.path.isdir(snapshots_dir):
        return None

    # Prefer the commit hash pinned in refs/main.
    ref_main_path = os.path.join(model_dir, "refs", "main")
    if os.path.isfile(ref_main_path):
        try:
            with open(ref_main_path, "r", encoding="utf-8") as f:
                commit_hash = f.read().strip()
        except OSError:
            commit_hash = ""
        if commit_hash:
            candidate = os.path.join(snapshots_dir, commit_hash)
            if os.path.isdir(candidate):
                return candidate

    # Fall back to the first snapshot directory found (sorted for
    # determinism — there is normally only one anyway).
    try:
        snapshot_names = sorted(
            name for name in os.listdir(snapshots_dir) if os.path.isdir(os.path.join(snapshots_dir, name))
        )
    except OSError:
        snapshot_names = []

    if snapshot_names:
        return os.path.join(snapshots_dir, snapshot_names[0])

    return None


def resolve_lora_path() -> str | None:
    """
    Returns a local filesystem path to the LoRA weights, or None if it
    could not be resolved. Runs once, at worker startup — never per request.
    """
    if os.path.exists(LOCAL_LORA_PATH):
        print(f"[handler] using local LoRA file: {LOCAL_LORA_PATH}")
        return LOCAL_LORA_PATH

    print(
        f"[handler] no local LoRA file at {LOCAL_LORA_PATH} — "
        f"falling back to Hugging Face Hub: {HF_LORA_REPO}/{HF_LORA_FILENAME}"
    )
    if not HF_TOKEN:
        print("[handler] WARNING: HF_TOKEN is not set — cannot download the private LoRA repo.")
        return None

    try:
        downloaded_path = hf_hub_download(
            repo_id=HF_LORA_REPO,
            filename=HF_LORA_FILENAME,
            token=HF_TOKEN,
        )
    except HfHubHTTPError as exc:
        # Never include the token in a log line — str(exc) from huggingface_hub
        # does not include it, only the request URL/status, which is safe.
        print(f"[handler] WARNING: Hugging Face download failed ({exc}).")
        return None
    except Exception as exc:  # noqa: BLE001 - surface any other download failure the same way
        print(f"[handler] WARNING: Hugging Face download failed ({exc}).")
        return None

    print(f"[handler] downloaded LoRA from Hugging Face Hub to: {downloaded_path}")
    return downloaded_path


# ---------------------------------------------------------------------------
# Model load — runs once when the worker process starts (cold start), then
# stays resident in memory for every subsequent warm invocation.
# ---------------------------------------------------------------------------

if is_runpod_environment():
    # On RunPod, load the base model from its pre-cached local snapshot —
    # never download it onto container disk. Downloading the ~7GB SDXL
    # base model here is what previously caused
    # "OSError: [Errno 28] No space left on device".
    cached_snapshot = resolve_runpod_cached_snapshot(BASE_MODEL_ID)
    if not cached_snapshot:
        raise RuntimeError(
            f"RunPod environment detected ({RUNPOD_HF_CACHE_ROOT} exists) but no cached "
            f"snapshot for {BASE_MODEL_ID} was found under it. Refusing to fall back to "
            "downloading the SDXL base model onto container disk. Attach/enable the RunPod "
            "Cached Model for this base model on the endpoint (or a Network Volume with it) "
            "before deploying."
        )
    print(f"[handler] loading base pipeline from RunPod cached snapshot: {cached_snapshot}")
    pipe = StableDiffusionXLPipeline.from_pretrained(
        cached_snapshot,
        torch_dtype=torch.float16,
        variant="fp16",
        use_safetensors=True,
        local_files_only=True,
    )
else:
    # Local development — the RunPod cache path doesn't exist here, so keep
    # the original behavior: load by model id from the Hugging Face Hub.
    print(f"[handler] loading base pipeline (Hugging Face Hub): {BASE_MODEL_ID}")
    pipe = StableDiffusionXLPipeline.from_pretrained(
        BASE_MODEL_ID,
        torch_dtype=torch.float16,
        variant="fp16",
        use_safetensors=True,
    )

print(f"[handler] loading VAE: {VAE_MODEL_ID}")
vae = AutoencoderKL.from_pretrained(VAE_MODEL_ID, torch_dtype=torch.float16)
pipe.vae = vae

pipe = pipe.to("cuda")

LORA_PATH = resolve_lora_path()

if not LORA_PATH:
    # Fail fast, at startup — never let the worker come up (and start
    # accepting requests) in a state where it could silently generate with
    # base SDXL only. No local file and no usable Hugging Face fallback is a
    # fatal misconfiguration, not something to defer to request time.
    raise RuntimeError(
        "SMB-Birthday-v2 LoRA weights could not be resolved: no local file at "
        f"{LOCAL_LORA_PATH!r}, and the Hugging Face fallback "
        f"({HF_LORA_REPO}/{HF_LORA_FILENAME}) did not produce one either "
        "(missing HF_TOKEN, or the download failed — see the warning above). "
        "Refusing to start: this worker must never generate images with base "
        "SDXL alone."
    )

print(f"[handler] loading LoRA weights: {LORA_PATH}")
try:
    pipe.load_lora_weights(
        os.path.dirname(LORA_PATH),
        weight_name=os.path.basename(LORA_PATH),
        adapter_name=LORA_ADAPTER_NAME,
    )
except Exception as exc:  # noqa: BLE001 - any load failure must abort startup, not just this one type
    raise RuntimeError(f"Failed to load SMB-Birthday-v2 LoRA weights from {LORA_PATH}: {exc}") from exc

print("[handler] pipeline ready (SDXL + SMB-Birthday-v2 LoRA).")


def _clamp_lora_scale(value) -> float:
    try:
        scale = float(value)
    except (TypeError, ValueError):
        scale = DEFAULT_LORA_SCALE
    return max(MIN_LORA_SCALE, min(MAX_LORA_SCALE, scale))


def _image_to_output(image) -> dict:
    """
    Encodes the generated PIL image for the MVP response contract:
    {"image_base64": "...", "seed": ..., "width": ..., "height": ...}
    (seed/width/height are added by the caller).

    This is the ONLY function that needs to change to swap base64 for
    Vercel Blob / Supabase Storage later — return {"image_url": "..."}
    instead of {"image_base64": "..."} once that's wired up. The Next.js
    side (lib/ai-studio/runpod-client.ts) already prefers `image_url` over
    `image_base64` when both/either are present, so no other file needs to
    change when that swap happens.
    """
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return {"image_base64": encoded}


def handler(event):
    """RunPod Serverless entrypoint. `event["input"]` matches the shape
    lib/ai-studio/runpod-client.ts sends."""
    job_input = event.get("input") or {}

    prompt = job_input.get("prompt")
    if not prompt:
        return {"error": '"prompt" is required.'}

    negative_prompt = job_input.get("negative_prompt", "")
    width = int(job_input.get("width", 1024))
    height = int(job_input.get("height", 1024))
    steps = int(job_input.get("steps", DEFAULT_STEPS))
    guidance_scale = float(job_input.get("guidance_scale", DEFAULT_GUIDANCE_SCALE))
    seed = job_input.get("seed")
    lora_scale = _clamp_lora_scale(job_input.get("lora_scale", DEFAULT_LORA_SCALE))

    # No LORA_LOADED check here: the worker guarantees at startup (above)
    # that it never reaches a ready state without the LoRA loaded — if that
    # guarantee were ever violated, `pipe` itself wouldn't have the adapter,
    # which is a bug to fix at startup, not to paper over per-request.

    generator = None
    if seed is not None:
        try:
            generator = torch.Generator(device="cuda").manual_seed(int(seed))
        except (TypeError, ValueError):
            generator = None

    cross_attention_kwargs = {"scale": lora_scale}

    started = time.time()
    result = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        width=width,
        height=height,
        num_inference_steps=steps,
        guidance_scale=guidance_scale,
        generator=generator,
        cross_attention_kwargs=cross_attention_kwargs,
    )
    elapsed = time.time() - started
    print(f"[handler] generated 1 image in {elapsed:.2f}s (lora_scale={lora_scale})")

    image = result.images[0]
    output = _image_to_output(image)
    output["seed"] = seed
    output["width"] = width
    output["height"] = height
    output["generation_time_s"] = round(elapsed, 2)
    return output


runpod.serverless.start({"handler": handler})
