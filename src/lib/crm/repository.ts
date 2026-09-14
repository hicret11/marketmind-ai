import { randomUUID } from "node:crypto";
import { createJsonArrayStore } from "@/lib/file-store";
import type { CrmActivity, CrmActivityType, CrmLead } from "@/types/crm";

/**
 * CRM persistence — .data/crm-leads.json + .data/crm-activities.json. Same
 * file-based repository pattern used across MarketMind; interfaces are narrow
 * enough to swap in a Supabase implementation later without touching callers.
 *
 * This is a SEPARATE store from the older lib/opportunity/crm.ts
 * (.data/opportunity-leads.json), which held every "Save to CRM" click from
 * Opportunity Discovery. That module is left in place but no longer wired to
 * any button — Opportunity Discovery now integrates with this CRM only
 * through the explicit "Add to CRM" action (lib/crm/from-opportunity.ts).
 */

const leadsStore = createJsonArrayStore<CrmLead>("crm-leads.json");
const activitiesStore = createJsonArrayStore<CrmActivity>("crm-activities.json");

export async function listLeads(): Promise<CrmLead[]> {
  const leads = await leadsStore.list();
  return leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getLead(id: string): Promise<CrmLead | null> {
  const leads = await leadsStore.list();
  return leads.find((l) => l.id === id) ?? null;
}

export async function createLead(input: Omit<CrmLead, "id" | "createdAt" | "updatedAt">): Promise<CrmLead> {
  const now = new Date().toISOString();
  const record: CrmLead = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
  await leadsStore.mutate((items) => ({ items: [...items, record], result: undefined }));
  await addActivity({ leadId: record.id, type: "added", note: `Source: ${record.source}`, meta: null });
  return record;
}

export async function updateLead(id: string, patch: Partial<CrmLead>): Promise<CrmLead | null> {
  return leadsStore.mutate((items) => {
    const index = items.findIndex((l) => l.id === id);
    if (index < 0) return { items, result: null };
    items[index] = { ...items[index], ...patch, id, updatedAt: new Date().toISOString() };
    return { items, result: items[index] };
  });
}

/* ------------------------------ Activities ------------------------------- */

export async function listActivities(leadId: string): Promise<CrmActivity[]> {
  const all = await activitiesStore.list();
  return all
    .filter((a) => a.leadId === leadId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addActivity(input: {
  leadId: string;
  type: CrmActivityType;
  note: string | null;
  meta: Record<string, string> | null;
}): Promise<CrmActivity> {
  const record: CrmActivity = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  await activitiesStore.mutate((items) => ({ items: [...items, record], result: undefined }));
  return record;
}

/* -------------------------------- Summary --------------------------------- */

export interface CrmSummary {
  total: number;
  byStatus: Record<string, number>;
}

export async function getSummary(): Promise<CrmSummary> {
  const leads = await leadsStore.list();
  const byStatus: Record<string, number> = {};
  for (const lead of leads) {
    byStatus[lead.status] = (byStatus[lead.status] ?? 0) + 1;
  }
  return { total: leads.length, byStatus };
}
