import { toMetaAdsErrorResponse } from "@/lib/meta-ads/errors";
import { getChatSession, updateChatSession } from "@/lib/meta-ads/repository";
import { validateDraft } from "@/lib/meta-ads/draft";
import type { CampaignDraft } from "@/types/meta-ads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getChatSession(id);
    if (!session) return Response.json({ ok: false, error: { code: "NOT_FOUND", message: "Session not found." } }, { status: 404 });
    return Response.json({ ok: true, session });
  } catch (error) {
    return toMetaAdsErrorResponse(error);
  }
}

/** Manual draft edits from the "Edit Draft" UI — re-validated the same way an AI-proposed patch is. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getChatSession(id);
    if (!session) return Response.json({ ok: false, error: { code: "NOT_FOUND", message: "Session not found." } }, { status: 404 });

    const patch = (await request.json().catch(() => ({}))) as Partial<CampaignDraft>;
    const merged = validateDraft({ ...session.draft, ...patch });
    const updated = await updateChatSession(id, { draft: merged });
    return Response.json({ ok: true, session: updated });
  } catch (error) {
    return toMetaAdsErrorResponse(error);
  }
}
