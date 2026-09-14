"use client";

import { useState } from "react";
import { ApiError, createLead } from "@/lib/crm/client";
import type { CrmLead } from "@/types/crm";

const inputCls = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm";
const labelCls = "block text-xs font-medium text-mm-ink";

export function AddLeadModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (lead: CrmLead) => void;
}) {
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!businessName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await createLead({
        businessName: businessName.trim(),
        website: website.trim() || null,
        category: category.trim() || null,
        city: city.trim() || null,
        region: region.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        contactPerson: contactPerson.trim() || null,
        contactRole: contactRole.trim() || null,
        notes: notes.trim() || null,
      });
      onCreated(res.lead);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not add this lead.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8 sm:py-14" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-mm-ink">Add Lead</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-6 py-5">
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          <div>
            <label className={labelCls}>Business name *</label>
            <input className={inputCls} value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Website</label>
              <input className={inputCls} value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>City</label>
              <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Region / Country</label>
              <input className={inputCls} value={region} onChange={(e) => setRegion(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email</label>
              <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Contact person</label>
              <input className={inputCls} value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Contact role</label>
              <input className={inputCls} value={contactRole} onChange={(e) => setContactRole(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea className={`${inputCls} min-h-16`} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <p className="text-[11px] text-mm-muted">Source will be recorded as &quot;Manual&quot; · default status &quot;Approved&quot;.</p>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700">
            Cancel
          </button>
          <button
            type="button"
            disabled={!businessName.trim() || saving}
            onClick={handleSave}
            className="rounded-full bg-mm-pink px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add lead"}
          </button>
        </div>
      </div>
    </div>
  );
}
