"use client";

import { useEffect, useMemo, useState } from "react";
import { AddLeadModal } from "@/components/crm/add-lead-modal";
import { CsvImportModal } from "@/components/crm/csv-import-modal";
import { CrmSummaryCards } from "@/components/crm/crm-summary-cards";
import { LeadDetailDrawer } from "@/components/crm/lead-detail-drawer";
import { LeadTable } from "@/components/crm/lead-table";
import { ApiError, fetchCrmSummary, fetchLeads } from "@/lib/crm/client";
import { CRM_LEAD_STATUSES, CRM_STATUS_LABELS, type CrmLead } from "@/types/crm";

export default function CrmPage() {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CrmLead | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const [statusFilter, setStatusFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [query, setQuery] = useState("");

  function load() {
    setLoading(true);
    Promise.all([fetchLeads(), fetchCrmSummary()])
      .then(([l, s]) => {
        setLeads(l.leads);
        setSummary(s.byStatus);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load CRM data."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const regions = useMemo(() => Array.from(new Set(leads.map((l) => l.region).filter((r): r is string => Boolean(r)))).sort(), [leads]);
  const categories = useMemo(() => Array.from(new Set(leads.map((l) => l.category).filter((c): c is string => Boolean(c)))).sort(), [leads]);
  const sources = useMemo(() => Array.from(new Set(leads.map((l) => l.source))).sort(), [leads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (regionFilter && l.region !== regionFilter) return false;
      if (categoryFilter && l.category !== categoryFilter) return false;
      if (sourceFilter && l.source !== sourceFilter) return false;
      if (q) {
        const haystack = [l.businessName, l.email, l.phone, l.contactPerson].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [leads, statusFilter, regionFilter, categoryFilter, sourceFilter, query]);

  function handleLeadChanged(updated: CrmLead) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setSelected(updated);
    fetchCrmSummary().then((s) => setSummary(s.byStatus)).catch(() => undefined);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-xl">👥</span>
            <h1 className="text-2xl font-semibold text-mm-ink">CRM</h1>
          </div>
          <p className="mt-1 text-sm text-mm-muted">
            Leads you&apos;ve intentionally approved or imported — never every Opportunity Discovery result.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
          >
            Import CSV
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="rounded-full bg-mm-pink px-4 py-2 text-sm font-semibold text-white"
          >
            + Add Lead
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <CrmSummaryCards byStatus={summary} />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3">
        <input
          className="min-w-[12rem] flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          placeholder="Search business, email, phone, contact…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {CRM_LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>{CRM_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-mm-muted">
          Loading CRM leads…
        </div>
      ) : (
        <LeadTable leads={filtered} onSelect={setSelected} />
      )}

      {selected && (
        <LeadDetailDrawer lead={selected} onClose={() => setSelected(null)} onChanged={handleLeadChanged} />
      )}
      {showAdd && (
        <AddLeadModal
          onClose={() => setShowAdd(false)}
          onCreated={(lead) => {
            setLeads((prev) => [lead, ...prev]);
            fetchCrmSummary().then((s) => setSummary(s.byStatus)).catch(() => undefined);
          }}
        />
      )}
      {showImport && <CsvImportModal onClose={() => setShowImport(false)} onImported={load} />}
    </div>
  );
}
