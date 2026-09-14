import { findDuplicate } from "./dedupe";
import { createLead, listLeads } from "./repository";
import type { FromOpportunityInput } from "./validate";
import type { CrmLead } from "@/types/crm";
import { canonicalizeUrl } from "@/lib/opportunity/util";

export interface AddFromOpportunityResult {
  lead: CrmLead;
  created: boolean;
}

/**
 * "Add to CRM" from Opportunity Discovery. Reuses the already-verified
 * business data passed in — no refetch, no re-scoring. If this exact
 * business is already in the CRM, returns it unchanged ("Already in CRM"),
 * never creating a duplicate.
 */
export async function addLeadFromOpportunity(input: FromOpportunityInput): Promise<AddFromOpportunityResult> {
  const existing = await listLeads();
  const duplicate = findDuplicate(
    {
      businessName: input.businessName,
      website: input.website,
      email: null,
      phone: null,
      opportunityBusinessId: input.opportunityBusinessId,
    },
    existing,
  );
  if (duplicate) {
    return { lead: duplicate.lead, created: false };
  }

  const lead = await createLead({
    businessName: input.businessName,
    region: input.region,
    city: input.city,
    category: input.category,
    website: input.website,
    websiteDomain: canonicalizeUrl(input.website ?? "")?.domain ?? null,
    email: null,
    phone: null,
    contactPerson: null,
    contactRole: null,
    instagram: null,
    linkedin: null,
    address: input.address,
    source: "Opportunity Discovery",
    opportunityScore: input.opportunityScore,
    whyItFits: input.whyItFits,
    status: "approved",
    notes: null,
    lastContactedAt: null,
    nextFollowUpAt: null,
    opportunityBusinessId: input.opportunityBusinessId,
    opportunityEvidence: {
      evidenceCount: input.evidenceCount,
      signalsDetected: input.signalsDetected,
      matchedCategories: input.matchedCategories,
    },
  });

  return { lead, created: true };
}
