import { CRM_ACTIVITY_TYPES, type CrmActivityType } from "@/types/crm";
import { CrmError, toCrmErrorResponse } from "@/lib/crm/errors";
import { addActivity, getLead, listActivities } from "@/lib/crm/repository";

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
    const activities = await listActivities(id);
    return Response.json({ ok: true, activities });
  } catch (error) {
    return toCrmErrorResponse(error);
  }
}

/** Manual activity logging — no email/WhatsApp is actually sent here, just recorded. */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const lead = await getLead(id);
    if (!lead) throw new CrmError("NOT_FOUND", "Lead not found.");

    const raw = await request.json().catch(() => null);
    const body = (raw ?? {}) as { type?: unknown; note?: unknown };
    const type =
      typeof body.type === "string" && (CRM_ACTIVITY_TYPES as readonly string[]).includes(body.type)
        ? (body.type as CrmActivityType)
        : null;
    if (!type) throw new CrmError("INVALID_REQUEST", "`type` must be a known activity type.");

    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
    const activity = await addActivity({ leadId: id, type, note, meta: null });
    return Response.json({ ok: true, activity }, { status: 201 });
  } catch (error) {
    return toCrmErrorResponse(error);
  }
}
