import { toCrmErrorResponse } from "@/lib/crm/errors";
import { createLead, listLeads } from "@/lib/crm/repository";
import { parseManualLead, parseStatus } from "@/lib/crm/validate";
import { canonicalizeUrl } from "@/lib/opportunity/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * CRM leads — the NEW CRM (crm-leads.json). Separate from the legacy
 * lib/opportunity/crm.ts (opportunity-leads.json), which every "Save to CRM"
 * click used to write to; that module is left untouched but unused now that
 * Opportunity Discovery integrates through "Add to CRM" (see
 * /api/crm/from-opportunity) instead.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    let leads = await listLeads();

    const status = parseStatus(url.searchParams.get("status") ?? undefined);
    if (status) leads = leads.filter((l) => l.status === status);

    const region = url.searchParams.get("region");
    if (region) leads = leads.filter((l) => (l.region ?? "").toLowerCase() === region.toLowerCase());

    const category = url.searchParams.get("category");
    if (category) leads = leads.filter((l) => (l.category ?? "").toLowerCase() === category.toLowerCase());

    const source = url.searchParams.get("source");
    if (source) leads = leads.filter((l) => l.source === source);

    const q = url.searchParams.get("q")?.trim().toLowerCase();
    if (q) {
      leads = leads.filter((l) =>
        [l.businessName, l.email, l.phone, l.contactPerson].some((f) => f?.toLowerCase().includes(q)),
      );
    }

    return Response.json({ ok: true, leads });
  } catch (error) {
    return toCrmErrorResponse(error);
  }
}

/** Manual "add lead" — source is always "Manual". */
export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    const input = parseManualLead(raw);
    const lead = await createLead({
      businessName: input.businessName,
      region: input.region,
      city: input.city,
      category: input.category,
      website: input.website,
      websiteDomain: input.website ? canonicalizeUrl(input.website)?.domain ?? null : null,
      email: input.email,
      phone: input.phone,
      contactPerson: input.contactPerson,
      contactRole: input.contactRole,
      instagram: input.instagram,
      linkedin: input.linkedin,
      address: input.address,
      source: "Manual",
      opportunityScore: null,
      whyItFits: null,
      status: input.status,
      notes: input.notes,
      lastContactedAt: null,
      nextFollowUpAt: null,
      opportunityBusinessId: null,
      opportunityEvidence: null,
    });
    return Response.json({ ok: true, lead }, { status: 201 });
  } catch (error) {
    return toCrmErrorResponse(error);
  }
}
