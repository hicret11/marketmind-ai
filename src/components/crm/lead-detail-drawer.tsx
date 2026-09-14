"use client";

import { useEffect, useState } from "react";
import {
  addActivity,
  ApiError,
  fetchActivities,
  updateLead,
} from "@/lib/crm/client";
import {
  CRM_ACTIVITY_LABELS,
  CRM_LEAD_STATUSES,
  CRM_STATUS_LABELS,
  type CrmActivity,
  type CrmActivityType,
  type CrmLead,
} from "@/types/crm";
import { formatCrmDate, orNotAvailable, StatusBadge } from "./crm-ui";

const inputCls = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs";
const labelCls = "block text-[11px] font-medium text-mm-ink";

const LOGGABLE_ACTIVITY_TYPES: CrmActivityType[] = [
  "email_sent",
  "whatsapp",
  "call",
  "follow_up",
  "reply_received",
  "meeting",
];

export function LeadDetailDrawer({
  lead,
  onClose,
  onChanged,
}: {
  lead: CrmLead;
  onClose: () => void;
  onChanged: (updated: CrmLead) => void;
}) {
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [lastContactedAt, setLastContactedAt] = useState(lead.lastContactedAt?.slice(0, 10) ?? "");
  const [nextFollowUpAt, setNextFollowUpAt] = useState(lead.nextFollowUpAt?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logType, setLogType] = useState<CrmActivityType>("email_sent");
  const [logNote, setLogNote] = useState("");
  const [logging, setLogging] = useState(false);

  function loadActivities() {
    fetchActivities(lead.id)
      .then((res) => setActivities(res.activities))
      .catch(() => undefined);
  }

  useEffect(() => {
    setNotes(lead.notes ?? "");
    setLastContactedAt(lead.lastContactedAt?.slice(0, 10) ?? "");
    setNextFollowUpAt(lead.nextFollowUpAt?.slice(0, 10) ?? "");
    loadActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  async function handleStatusChange(status: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await updateLead(lead.id, { status: status as CrmLead["status"] });
      onChanged(res.lead);
      loadActivities();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update status.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDetails() {
    setSaving(true);
    setError(null);
    try {
      const res = await updateLead(lead.id, {
        notes: notes.trim() || null,
        lastContactedAt: lastContactedAt ? new Date(lastContactedAt).toISOString() : null,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : null,
      });
      onChanged(res.lead);
      loadActivities();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogActivity() {
    setLogging(true);
    setError(null);
    try {
      await addActivity(lead.id, logType, logNote.trim() || undefined);
      setLogNote("");
      loadActivities();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not log this activity.");
    } finally {
      setLogging(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-mm-ink">{lead.businessName}</h2>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={lead.status} />
              <span className="text-[11px] text-mm-muted">Source: {lead.source}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 p-5">
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-muted">Company info</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <Field label="Category" value={lead.category ?? "—"} />
              <Field
                label="Website"
                value={
                  lead.website ? (
                    <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-mm-dark-rose underline">
                      {lead.website}
                    </a>
                  ) : (
                    "Not available"
                  )
                }
              />
              <Field label="City" value={lead.city ?? "—"} />
              <Field label="Region / Country" value={lead.region ?? "—"} />
              <Field label="Address" value={lead.address ?? "—"} />
            </dl>
          </section>

          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-muted">Contact info</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <Field label="Contact person" value={lead.contactPerson ?? "Not available"} />
              <Field label="Role" value={lead.contactRole ?? "Not available"} />
              <Field label="Email" value={orNotAvailable(lead.email)} />
              <Field label="Phone" value={orNotAvailable(lead.phone)} />
              <Field label="Instagram" value={lead.instagram ?? "Not available"} />
              <Field label="LinkedIn" value={lead.linkedin ?? "Not available"} />
            </dl>
          </section>

          {(lead.whyItFits || lead.opportunityScore !== null || lead.opportunityEvidence) && (
            <section className="rounded-lg border border-mm-rose/30 bg-mm-soft-pink/20 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-dark-rose">Why this lead fits</p>
              {lead.opportunityScore !== null && (
                <p className="mt-1 text-xs text-mm-ink">MarketMind fit score: {lead.opportunityScore}/100</p>
              )}
              {lead.whyItFits && <p className="mt-1 text-xs text-mm-ink">{lead.whyItFits}</p>}
              {lead.opportunityEvidence && (
                <div className="mt-2 text-[11px] text-mm-muted">
                  <p>{lead.opportunityEvidence.evidenceCount} evidence snippet(s) from Opportunity Discovery.</p>
                  {lead.opportunityEvidence.signalsDetected.length > 0 && (
                    <p className="mt-1">Detected signals: {lead.opportunityEvidence.signalsDetected.join(", ")}</p>
                  )}
                </div>
              )}
            </section>
          )}

          <section>
            <label className={labelCls}>Status</label>
            <select
              className={inputCls}
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={saving}
            >
              {CRM_LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>{CRM_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Last contacted</label>
              <input type="date" className={inputCls} value={lastContactedAt} onChange={(e) => setLastContactedAt(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Next follow-up</label>
              <input type="date" className={inputCls} value={nextFollowUpAt} onChange={(e) => setNextFollowUpAt(e.target.value)} />
            </div>
          </section>

          <section>
            <label className={labelCls}>Notes</label>
            <textarea className={`${inputCls} min-h-20`} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </section>

          <button
            type="button"
            onClick={handleSaveDetails}
            disabled={saving}
            className="rounded-full bg-mm-pink px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>

          <section className="border-t border-gray-100 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-muted">Log an activity</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs" value={logType} onChange={(e) => setLogType(e.target.value as CrmActivityType)}>
                {LOGGABLE_ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>{CRM_ACTIVITY_LABELS[t]}</option>
                ))}
              </select>
              <input
                className="min-w-[10rem] flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                placeholder="Optional note"
                value={logNote}
                onChange={(e) => setLogNote(e.target.value)}
              />
              <button
                type="button"
                onClick={handleLogActivity}
                disabled={logging}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50"
              >
                {logging ? "Logging…" : "Log"}
              </button>
            </div>
          </section>

          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-muted">Activity history</p>
            {activities.length === 0 ? (
              <p className="mt-2 text-xs text-mm-muted">No activity logged yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {activities.map((a) => (
                  <li key={a.id} className="rounded-lg border border-gray-100 p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-mm-ink">{CRM_ACTIVITY_LABELS[a.type]}</span>
                      <span className="text-[10px] text-mm-muted">{formatCrmDate(a.createdAt)}</span>
                    </div>
                    {a.type === "status_changed" && a.meta && (
                      <p className="mt-0.5 text-mm-muted">
                        {CRM_STATUS_LABELS[a.meta.from as keyof typeof CRM_STATUS_LABELS] ?? a.meta.from} →{" "}
                        {CRM_STATUS_LABELS[a.meta.to as keyof typeof CRM_STATUS_LABELS] ?? a.meta.to}
                      </p>
                    )}
                    {a.note && <p className="mt-0.5 text-mm-muted">{a.note}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-[10px] text-mm-muted">Created {formatCrmDate(lead.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-mm-muted">{label}</dt>
      <dd className="text-mm-ink">{value}</dd>
    </div>
  );
}
