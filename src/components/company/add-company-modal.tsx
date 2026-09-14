"use client";

import { useState } from "react";
import { ApiError, createCompany } from "@/lib/company/client";
import type { CompanyProfile } from "@/types/company";

const inputCls =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-mm-rose focus:outline-none";
const labelCls = "block text-xs font-medium text-mm-ink";

function toList(text: string): string[] {
  return text
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function AddCompanyModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (company: CompanyProfile) => void;
}) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [productsServices, setProductsServices] = useState("");
  const [goals, setGoals] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await createCompany({
        name: name.trim(),
        website: website.trim() || null,
        description: description.trim() || null,
        industry: industry.trim() || null,
        targetAudience: toList(targetAudience),
        productsServices: toList(productsServices),
        goals: toList(goals),
        notes: notes.trim() || null,
      });
      onCreated(res.company);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not create the company.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8 sm:py-14"
      onClick={onClose}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-mm-ink">+ Add Company</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-6 py-5">
          <p className="text-xs text-mm-muted">
            MarketMind supports multiple companies. This adds a new profile — it won&apos;t become the
            active company automatically.
          </p>
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

          <div>
            <label className={labelCls}>Company name *</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Website</label>
            <input className={inputCls} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea className={`${inputCls} min-h-20`} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Industry</label>
            <input className={inputCls} value={industry} onChange={(e) => setIndustry(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Target audience (comma or line separated)</label>
            <textarea className={`${inputCls} min-h-16`} value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Products / services (comma or line separated)</label>
            <textarea className={`${inputCls} min-h-16`} value={productsServices} onChange={(e) => setProductsServices(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Goals (comma or line separated)</label>
            <textarea className={`${inputCls} min-h-16`} value={goals} onChange={(e) => setGoals(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea className={`${inputCls} min-h-16`} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700">
            Cancel
          </button>
          <button
            type="button"
            disabled={!name.trim() || saving}
            onClick={handleSave}
            className="rounded-full bg-mm-pink px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create company"}
          </button>
        </div>
      </div>
    </div>
  );
}
