"use client";

import { useState } from "react";
import { ModeTabs } from "./mode-tabs";
import { GuidedModeForm } from "./guided-mode-form";
import { CustomPromptFormPanel } from "./custom-prompt-form";
import { PromptPreview } from "./prompt-preview";
import { ResultPanel } from "./result-panel";
import {
  buildCustomPrompt,
  buildGuidedPrompt,
  buildGuidedSummary,
  emptyCustomPromptForm,
  emptyGuidedForm,
  toGenerateImageRequest,
} from "@/lib/ai-studio/prompt-builder";
import { addHistoryItem } from "@/lib/ai-studio/history-store";
import { generateImage } from "@/lib/ai-studio/generate-client";
import type { AiStudioMode, CustomPromptForm, GenerationSlot, GuidedVisualForm, PreparedVisualResult } from "@/types/ai-studio";

/**
 * Birthday Visual Generator — Guided Mode's "Generate Images" calls the real
 * POST /api/ai-studio/generate route (RunPod SDXL + SMB-Birthday-v2 LoRA;
 * see lib/ai-studio/runpod-client.ts and inference-worker/handler.py).
 * Custom Prompt Mode's "Generate Images" still just surfaces a "coming
 * soon" notice — its free-form prompt/negative-prompt shape doesn't map
 * onto the generate route's theme/color/mood contract.
 */
export function BirthdayVisualGenerator({ onHistoryChanged }: { onHistoryChanged: () => void }) {
  const [mode, setMode] = useState<AiStudioMode>("guided");
  const [guidedForm, setGuidedForm] = useState<GuidedVisualForm>(emptyGuidedForm());
  const [customForm, setCustomForm] = useState<CustomPromptForm>(emptyCustomPromptForm());
  const [result, setResult] = useState<PreparedVisualResult | null>(null);
  const [imageSlots, setImageSlots] = useState<GenerationSlot[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const guidedPrompt = buildGuidedPrompt(guidedForm);
  const guidedSummary = buildGuidedSummary(guidedForm);
  const customPrompt = buildCustomPrompt(customForm.prompt, customForm.noPeople);

  function updateGuided(patch: Partial<GuidedVisualForm>) {
    setGuidedForm((f) => ({ ...f, ...patch }));
  }
  function updateCustom(patch: Partial<CustomPromptForm>) {
    setCustomForm((f) => ({ ...f, ...patch }));
  }

  function prepareGuidedPrompt() {
    if (!guidedForm.theme) return;
    const prompt = buildGuidedPrompt(guidedForm);
    const summary = buildGuidedSummary(guidedForm);
    const prepared: PreparedVisualResult = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      mode: "guided",
      prompt,
      negativePrompt: null,
      format: guidedForm.format,
      numberOfImages: guidedForm.numberOfImages,
      summary,
      status: "ready_for_model_integration",
    };
    setResult(prepared);
    setImageSlots(null);
    setNotice(null);

    addHistoryItem({
      id: prepared.id,
      title: `${summary?.theme ?? "Birthday visual"} · ${summary?.mood ?? ""}`.trim(),
      type: "draft_prompt",
      format: prepared.format,
      createdAt: prepared.createdAt,
      mode: "guided",
      prompt,
    });
    onHistoryChanged();
  }

  async function generateGuidedImages() {
    if (!guidedForm.theme || generating) return;

    const prompt = buildGuidedPrompt(guidedForm);
    const summary = buildGuidedSummary(guidedForm);
    const prepared: PreparedVisualResult = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      mode: "guided",
      prompt,
      negativePrompt: null,
      format: guidedForm.format,
      numberOfImages: guidedForm.numberOfImages,
      summary,
      status: "ready_for_model_integration",
    };
    setResult(prepared);
    setNotice(null);

    const count = guidedForm.numberOfImages;
    setImageSlots(Array.from({ length: count }, () => ({ status: "loading" })));
    setGenerating(true);

    const request = toGenerateImageRequest(guidedForm);
    const responses = await Promise.all(Array.from({ length: count }, () => generateImage(request)));

    let sawNotConfigured = false;
    const nextSlots: GenerationSlot[] = responses.map((response) => {
      if ("configured" in response) {
        sawNotConfigured = true;
        return { status: "not_configured" };
      }
      if (response.success) {
        return { status: "success", imageUrl: response.imageUrl };
      }
      return { status: "error", error: response.error };
    });

    setImageSlots(nextSlots);
    setGenerating(false);

    if (sawNotConfigured) {
      setNotice("Image generation isn't connected yet — the RunPod endpoint hasn't been configured.");
    } else if (nextSlots.every((slot) => slot.status === "error")) {
      setNotice("Image generation failed. See the details on each preview slot.");
    }

    addHistoryItem({
      id: prepared.id,
      title: `${summary?.theme ?? "Birthday visual"} · ${summary?.mood ?? ""}`.trim(),
      type: "draft_prompt",
      format: prepared.format,
      createdAt: prepared.createdAt,
      mode: "guided",
      prompt,
    });
    onHistoryChanged();
  }

  function saveCustomDraft() {
    const prompt = buildCustomPrompt(customForm.prompt, customForm.noPeople);
    if (!prompt) return;
    const prepared: PreparedVisualResult = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      mode: "custom",
      prompt,
      negativePrompt: customForm.negativePrompt.trim() || null,
      format: customForm.format,
      numberOfImages: customForm.numberOfImages,
      summary: null,
      status: "ready_for_model_integration",
    };
    setResult(prepared);
    setImageSlots(null);
    setNotice(null);

    addHistoryItem({
      id: prepared.id,
      title: customForm.prompt.trim().slice(0, 48) || "Custom prompt draft",
      type: "draft_prompt",
      format: prepared.format,
      createdAt: prepared.createdAt,
      mode: "custom",
      prompt,
    });
    onHistoryChanged();
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-mm-ink">Birthday Visual Generator</h2>
            <span className="rounded-full bg-mm-lavender px-2 py-0.5 text-[10px] font-semibold text-purple-700">
              SMB Visual Model · V2
            </span>
          </div>
          <p className="mt-0.5 text-xs text-mm-muted">
            Create personalized birthday visuals using the Sing My Birthday visual system.
          </p>
        </div>
        <ModeTabs mode={mode} onChange={setMode} />
      </div>

      <div className="mt-5">
        {mode === "guided" ? (
          <GuidedModeForm form={guidedForm} onChange={updateGuided} />
        ) : (
          <CustomPromptFormPanel form={customForm} onChange={updateCustom} />
        )}
      </div>

      {mode === "guided" && guidedForm.theme && (
        <div className="mt-4">
          <PromptPreview prompt={guidedPrompt} summary={guidedSummary} />
        </div>
      )}
      {mode === "custom" && customForm.prompt.trim() && (
        <div className="mt-4">
          <PromptPreview prompt={customPrompt} summary={null} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {mode === "guided" ? (
          <button
            type="button"
            onClick={prepareGuidedPrompt}
            disabled={!guidedForm.theme}
            className="rounded-full bg-mm-ink px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Prepare Prompt
          </button>
        ) : (
          <button
            type="button"
            onClick={saveCustomDraft}
            disabled={!customForm.prompt.trim()}
            className="rounded-full bg-mm-ink px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Save Prompt Draft
          </button>
        )}
        {mode === "guided" ? (
          <button
            type="button"
            onClick={generateGuidedImages}
            disabled={!guidedForm.theme || generating}
            className="rounded-full bg-gradient-to-r from-mm-pink to-mm-dark-rose px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate Images"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setNotice("Model integration coming soon.")}
            className="rounded-full bg-gradient-to-r from-mm-pink to-mm-dark-rose px-4 py-2 text-xs font-semibold text-white"
          >
            Generate Images (Coming Soon)
          </button>
        )}
        {notice && <span className="text-xs font-medium text-mm-dark-rose">{notice}</span>}
      </div>

      <div className="mt-5">
        <ResultPanel result={result} slots={mode === "guided" ? imageSlots : null} />
      </div>
    </div>
  );
}
