import { rangeSinceIso, withinRange } from "@/lib/analytics/date-range";
import { listLeads } from "./repository";
import { CRM_STATUS_LABELS, type CrmLeadStatus } from "@/types/crm";
import type { BreakdownCount, CrmPerformanceSummary, DateRangeOption, FunnelStage } from "@/types/analytics";

/**
 * CRM Performance for the Analytics module. Reads listLeads() as-is — no new
 * scoring or status logic, only aggregation. Lives under lib/crm/ (not
 * lib/analytics/) since it's the CRM's own read-model, the same pattern as
 * lib/social/patterns.ts belonging to Social.
 */

const FUNNEL_ORDER: CrmLeadStatus[] = [
  "approved",
  "to_contact",
  "contacted",
  "replied",
  "meeting",
  "interested",
  "converted",
];

export async function getCrmPerformance(range: DateRangeOption): Promise<CrmPerformanceSummary> {
  const leads = await listLeads();
  const sinceIso = rangeSinceIso(range);
  const inRange = leads.filter((l) => withinRange(l.createdAt, sinceIso));

  // Funnel = "leads (created within the selected range) currently AT OR PAST
  // this stage", given each lead's single current status (not_interested/
  // no_response are exits, excluded from the funnel entirely — they never
  // fully progressed). This is the only funnel shape the data actually
  // supports without inventing a stage history. Leads DO have a real
  // createdAt, so the date filter is genuinely meaningful here — applied to
  // the funnel and every breakdown below, not just the headline count.
  const statusIndex = new Map(FUNNEL_ORDER.map((s, i) => [s, i]));
  const cumulativeCounts = FUNNEL_ORDER.map((_, i) =>
    inRange.filter((l) => (statusIndex.get(l.status) ?? -1) >= i).length,
  );

  const funnel: FunnelStage[] = FUNNEL_ORDER.map((status, i) => ({
    status,
    label: CRM_STATUS_LABELS[status],
    count: cumulativeCounts[i],
    conversionFromPrevious:
      i === 0 || cumulativeCounts[i - 1] === 0
        ? null
        : Math.round((cumulativeCounts[i] / cumulativeCounts[i - 1]) * 10000) / 10000,
  }));

  return {
    totalLeads: leads.length,
    leadsInRange: inRange.length,
    funnel,
    byRegion: countBy(inRange, (l) => l.region),
    byCategory: countBy(inRange, (l) => l.category),
    bySource: countBy(inRange, (l) => l.source),
  };
}

function countBy<T>(items: T[], key: (item: T) => string | null): BreakdownCount[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = key(item) ?? "Unspecified";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}
