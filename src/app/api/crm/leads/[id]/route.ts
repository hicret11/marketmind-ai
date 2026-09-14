import { CrmError, toCrmErrorResponse } from "@/lib/crm/errors";
import { addActivity, getLead, updateLead } from "@/lib/crm/repository";
import { parseUpdateLead } from "@/lib/crm/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const lead = await getLead(id);
    if (!lead) throw new CrmError("NOT_FOUND", "Lead not found.");
    return Response.json({ ok: true, lead });
  } catch (error) {
    return toCrmErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const existing = await getLead(id);
    if (!existing) throw new CrmError("NOT_FOUND", "Lead not found.");

    const raw = await request.json().catch(() => null);
    const patch = parseUpdateLead(raw);
    const updated = await updateLead(id, patch);
    if (!updated) throw new CrmError("NOT_FOUND", "Lead not found.");

    if (patch.status && patch.status !== existing.status) {
      await addActivity({
        leadId: id,
        type: "status_changed",
        note: null,
        meta: { from: existing.status, to: patch.status },
      });
    }
    if (patch.notes !== undefined && patch.notes !== existing.notes) {
      await addActivity({ leadId: id, type: "note_added", note: patch.notes, meta: null });
    }

    return Response.json({ ok: true, lead: updated });
  } catch (error) {
    return toCrmErrorResponse(error);
  }
}
