import { toCrmErrorResponse } from "@/lib/crm/errors";
import { addLeadFromOpportunity } from "@/lib/crm/from-opportunity";
import { parseFromOpportunityBody } from "@/lib/crm/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Add to CRM" from Opportunity Discovery. Reuses the already-verified
 * business + evidence the client already has — never refetches or re-scores.
 * Returns created:false ("Already in CRM") instead of creating a duplicate.
 */
export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    const input = parseFromOpportunityBody(raw);
    const result = await addLeadFromOpportunity(input);
    return Response.json({ ok: true, ...result }, { status: result.created ? 201 : 200 });
  } catch (error) {
    return toCrmErrorResponse(error);
  }
}
