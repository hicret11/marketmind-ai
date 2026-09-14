"use client";

import { useState } from "react";
import { ApiError, createPausedCampaignFromSession, patchDraft } from "@/lib/meta-ads/client";
import type { CampaignDraft, CreatedCampaignResult } from "@/types/meta-ads";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-xs">
      <span className="text-mm-muted">{label}</span>
      <span className="text-right font-medium text-mm-ink">{value}</span>
    </div>
  );
}

export function CampaignDraftPanel({
  sessionId,
  draft,
  estimatedActions,
  onDraftChanged,
}: {
  sessionId: string;
  draft: CampaignDraft;
  estimatedActions: string[];
  onDraftChanged: (draft: CampaignDraft) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    campaignName: draft.campaignName ?? "",
    dailyBudget: draft.dailyBudget != null ? String(draft.dailyBudget) : "",
    startDate: draft.startDate ?? "",
    endDate: draft.endDate ?? "",
    countries: draft.countries.join(", "),
    ctaLabel: draft.ctaLabel ?? "",
    destinationUrl: draft.destinationUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedCampaignResult | null>(null);

  async function saveEdits() {
    setSaving(true);
    setError(null);
    try {
      const patch: Partial<CampaignDraft> = {
        campaignName: form.campaignName || null,
        dailyBudget: form.dailyBudget ? Number(form.dailyBudget) : null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        countries: form.countries
          .split(",")
          .map((c) => c.trim().toUpperCase())
          .filter(Boolean),
        ctaLabel: form.ctaLabel || null,
        destinationUrl: form.destinationUrl || null,
      };
      const res = await patchDraft(sessionId, patch);
      onDraftChanged(res.session.draft);
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    setCreating(true);
    setError(null);
    try {
      const res = await createPausedCampaignFromSession(sessionId);
      setCreated(res.result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not create the campaign.");
    } finally {
      setCreating(false);
    }
  }

  const approvable = draft.missingFields.length === 0;

  if (created) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-800">Created in Meta</p>
        <p className="mt-1 text-xs text-emerald-700">
          Status: <span className="font-semibold">Paused</span>
        </p>
        <div className="mt-2 space-y-1 text-[11px] text-emerald-800">
          <p>Campaign ID: {created.campaignId}</p>
          <p>Ad Set ID: {created.adSetId}</p>
          <p>Ad ID: {created.adId}</p>
        </div>
        <p className="mt-3 text-xs text-emerald-800">
          Open Meta Ads Manager to review and activate. MarketMind never activates a campaign automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-mm-ink">Campaign Draft</p>
        <button type="button" onClick={() => setEditing((v) => !v)} className="text-xs font-medium text-mm-dark-rose underline">
          {editing ? "Cancel" : "Edit Draft"}
        </button>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <LabeledInput label="Campaign name" value={form.campaignName} onChange={(v) => setForm((f) => ({ ...f, campaignName: v }))} />
          <LabeledInput label="Daily budget" value={form.dailyBudget} onChange={(v) => setForm((f) => ({ ...f, dailyBudget: v }))} />
          <LabeledInput label="Start date (YYYY-MM-DD)" value={form.startDate} onChange={(v) => setForm((f) => ({ ...f, startDate: v }))} />
          <LabeledInput label="End date (YYYY-MM-DD)" value={form.endDate} onChange={(v) => setForm((f) => ({ ...f, endDate: v }))} />
          <LabeledInput label="Countries (comma-separated, e.g. GB, US)" value={form.countries} onChange={(v) => setForm((f) => ({ ...f, countries: v }))} />
          <LabeledInput label="CTA" value={form.ctaLabel} onChange={(v) => setForm((f) => ({ ...f, ctaLabel: v }))} />
          <LabeledInput label="Destination URL" value={form.destinationUrl} onChange={(v) => setForm((f) => ({ ...f, destinationUrl: v }))} />
          <button
            type="button"
            onClick={saveEdits}
            disabled={saving}
            className="mt-1 w-full rounded-full bg-mm-ink px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      ) : (
        <div className="mt-2 divide-y divide-gray-100">
          <Row label="Campaign name" value={draft.campaignName ?? "—"} />
          <Row label="Objective" value={draft.objective ?? "—"} />
          <Row label="Budget" value={draft.dailyBudget != null ? `${draft.dailyBudget}${draft.currency ? ` ${draft.currency}` : ""}/day` : "—"} />
          <Row label="Start date" value={draft.startDate ?? "—"} />
          <Row label="End date" value={draft.endDate ?? (draft.durationDays ? `${draft.durationDays} days` : "—")} />
          <Row label="Countries" value={draft.countries.length ? draft.countries.join(", ") : "—"} />
          <Row label="Age targeting" value={draft.ageMin || draft.ageMax ? `${draft.ageMin ?? "18"}–${draft.ageMax ?? "65"}` : "Not specified"} />
          <Row label="Interests" value={draft.interests.length ? draft.interests.join(", ") : "Not specified"} />
          <Row label="Placements" value={draft.placements === "automatic" ? "Automatic" : Array.isArray(draft.placements) ? draft.placements.join(", ") : "Automatic"} />
          <Row
            label="Creative"
            value={
              draft.creative ? (
                <span>
                  {draft.creative.mediaType ?? "Post"} · {draft.creative.timestamp ? new Date(draft.creative.timestamp).toLocaleDateString() : "—"}
                </span>
              ) : (
                "Not chosen yet"
              )
            }
          />
          <Row label="CTA" value={draft.ctaLabel ? `${draft.ctaLabel} → ${draft.metaCallToActionType ?? "—"}` : "—"} />
          <Row label="Destination URL" value={draft.destinationUrl ?? "—"} />
        </div>
      )}

      {draft.creative?.thumbnailUrl && !editing && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={draft.creative.thumbnailUrl} alt="" className="mt-3 h-32 w-full rounded-lg object-cover" />
      )}

      {draft.warnings.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-gray-100 pt-2">
          {draft.warnings.map((w) => (
            <li key={w} className="text-[11px] text-amber-700">
              — {w}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 rounded-lg bg-gray-50 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-mm-muted">Estimated API actions</p>
        <ul className="mt-1 space-y-0.5 text-[11px] text-mm-ink">
          {estimatedActions.map((a, i) => (
            <li key={i}>• {a}</li>
          ))}
        </ul>
      </div>

      {!approvable && draft.missingFields.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          Still needed: {draft.missingFields.join(", ")}
        </div>
      )}

      {error && (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <p className="font-semibold">Campaign could not be created in Meta.</p>
          <p className="mt-1 text-red-700">{error}</p>
          <p className="mt-1 text-[10px] text-red-600">Your draft is unchanged — fix the issue and try again.</p>
        </div>
      )}

      <button
        type="button"
        onClick={approve}
        disabled={!approvable || creating}
        className="mt-3 w-full rounded-full bg-gradient-to-r from-mm-pink to-mm-dark-rose px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {creating ? "Creating (paused)…" : "Approve & Create Paused Campaign"}
      </button>
      <p className="mt-2 text-center text-[10px] text-mm-muted">
        MarketMind never activates a campaign. It will be created Paused for you to review in Meta Ads Manager.
      </p>
    </div>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-[11px] font-medium text-mm-ink">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-mm-pink"
      />
    </label>
  );
}
