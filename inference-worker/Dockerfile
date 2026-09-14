# RunPod Serverless worker — SDXL base + SMB-Birthday-v2 LoRA.
# Not built or deployed by this change — see README.md for the manual
# next steps when you're ready to deploy.

FROM runpod/pytorch:2.4.0-py3.11-cuda12.1.1-devel-ubuntu22.04

WORKDIR /workspace

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY handler.py .

# The LoRA weights are NOT copied in here from this repo (they're
# git-ignored and were only ever local, see .gitignore). handler.py resolves
# them at startup in this order:
#   1. A local file at LORA_PATH (below) — won't exist in a fresh container
#      unless you bake it in or mount a volume (both optional, see README.md):
#      COPY model/smb_birthday_v2.safetensors ./model/smb_birthday_v2.safetensors
#   2. Otherwise, downloaded once from the private Hugging Face repo
#      hacire-11/smb-birthday-v2 using HF_TOKEN (set as a RunPod endpoint
#      secret/env var at deploy time — never baked into this image).
ENV LORA_PATH=/workspace/model/smb_birthday_v2.safetensors
ENV SMB_LORA_REPO=hacire-11/smb-birthday-v2
ENV SMB_LORA_FILENAME=smb_birthday_v2.safetensors
ENV PYTHONUNBUFFERED=1

CMD ["python3", "-u", "handler.py"]
