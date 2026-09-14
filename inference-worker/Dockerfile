# RunPod Serverless worker — SDXL base + SMB-Birthday-v2 LoRA.
# Not built or deployed by this change — see README.md for the manual
# next steps when you're ready to deploy.
#
# IMPORTANT — build context: RunPod's GitHub Serverless deploy builds this
# Dockerfile with the REPOSITORY ROOT as the Docker build context, even
# though this file lives at inference-worker/Dockerfile (a monorepo, not a
# standalone worker repo). Every COPY source path below is therefore
# written relative to the repo root — inference-worker/requirements.txt,
# inference-worker/handler.py — NOT relative to this file's own directory.
# Do not "simplify" these back to bare filenames; that only works if the
# build context is set to inference-worker/ itself (see the matching
# `docker build -f inference-worker/Dockerfile .` command in README.md,
# run from the repo root, which mirrors what RunPod does).

# NVIDIA Blackwell GPUs (e.g. RTX PRO 6000 Blackwell, compute capability
# sm_120) are not supported by the PyTorch 2.4/CUDA 12.4 build previously
# used here. This base image ships a CUDA 12.8-enabled PyTorch 2.8 build
# with Blackwell support.
FROM runpod/pytorch:2.8.0-py3.11-cuda12.8.1-cudnn-devel-ubuntu22.04

WORKDIR /workspace

COPY inference-worker/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY inference-worker/handler.py ./handler.py

# The LoRA weights are NOT copied in here from this repo (they're
# git-ignored and were only ever local — see .gitignore and .dockerignore).
# handler.py resolves them at startup in this order:
#   1. A local file at LORA_PATH — won't exist in a fresh container unless
#      you deliberately bake it in or mount a volume (see README.md); not
#      done here.
#   2. Downloaded once from the private Hugging Face repo
#      hacire-11/smb-birthday-v2 using HF_TOKEN (set as a RunPod endpoint
#      secret/env var at deploy time — never baked into this image, never
#      committed to Git). If the LoRA can't be resolved at all, handler.py
#      raises and the worker refuses to start — it never falls back to
#      base SDXL alone.
ENV LORA_PATH=/workspace/model/smb_birthday_v2.safetensors
ENV SMB_LORA_REPO=hacire-11/smb-birthday-v2
ENV SMB_LORA_FILENAME=smb_birthday_v2.safetensors
ENV PYTHONUNBUFFERED=1

CMD ["python", "handler.py"]
