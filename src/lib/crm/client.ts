import { apiRequest } from "@/lib/http";
import type {
  CrmActivity,
  CrmActivityType,
  CrmLead,
  CrmLeadStatus,
  CsvImportPreview,
  CsvImportResult,
  CsvRowDecision,
  CsvCandidateLead,
} from "@/types/crm";

export { ApiError } from "@/lib/http";

export interface LeadFilters {
  status?: CrmLeadStatus;
  region?: string;
  category?: string;
  source?: string;
  q?: string;
}

export function fetchLeads(filters?: LeadFilters): Promise<{ ok: boolean; leads: CrmLead[] }> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.region) params.set("region", filters.region);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.source) params.set("source", filters.source);
  if (filters?.q) params.set("q", filters.q);
  const qs = params.toString();
  return apiRequest(`/api/crm/leads${qs ? `?${qs}` : ""}`);
}

export function fetchLead(id: string): Promise<{ ok: boolean; lead: CrmLead }> {
  return apiRequest(`/api/crm/leads/${id}`);
}

export interface ManualLeadPayload {
  businessName: string;
  region?: string | null;
  city?: string | null;
  category?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  contactRole?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  address?: string | null;
  notes?: string | null;
  status?: CrmLeadStatus;
}

export function createLead(input: ManualLeadPayload): Promise<{ ok: boolean; lead: CrmLead }> {
  return apiRequest("/api/crm/leads", { method: "POST", body: JSON.stringify(input) });
}

export function updateLead(
  id: string,
  patch: { status?: CrmLeadStatus; notes?: string | null; lastContactedAt?: string | null; nextFollowUpAt?: string | null },
): Promise<{ ok: boolean; lead: CrmLead }> {
  return apiRequest(`/api/crm/leads/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function fetchActivities(leadId: string): Promise<{ ok: boolean; activities: CrmActivity[] }> {
  return apiRequest(`/api/crm/leads/${leadId}/activities`);
}

export function addActivity(
  leadId: string,
  type: CrmActivityType,
  note?: string,
): Promise<{ ok: boolean; activity: CrmActivity }> {
  return apiRequest(`/api/crm/leads/${leadId}/activities`, {
    method: "POST",
    body: JSON.stringify({ type, note }),
  });
}

export function previewCsvImport(csvText: string, source: string): Promise<{ ok: boolean; preview: CsvImportPreview }> {
  return apiRequest("/api/crm/import/preview", { method: "POST", body: JSON.stringify({ csvText, source }) });
}

export function commitCsvImport(
  source: string,
  rows: { candidate: CsvCandidateLead; decision: CsvRowDecision }[],
): Promise<{ ok: boolean } & CsvImportResult> {
  return apiRequest("/api/crm/import/commit", { method: "POST", body: JSON.stringify({ source, rows }) });
}

export interface AddFromOpportunityPayload {
  business: unknown;
  fitScore: unknown;
  signals: unknown[];
  evidence: unknown[];
  whyItFits?: string | null;
}

export function addLeadFromOpportunity(
  payload: AddFromOpportunityPayload,
): Promise<{ ok: boolean; lead: CrmLead; created: boolean }> {
  return apiRequest("/api/crm/from-opportunity", { method: "POST", body: JSON.stringify(payload) });
}

export function fetchCrmSummary(): Promise<{ ok: boolean; total: number; byStatus: Record<string, number> }> {
  return apiRequest("/api/crm/summary");
}
