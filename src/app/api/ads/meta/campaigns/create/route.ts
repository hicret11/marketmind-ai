import { createPausedCampaign } from "@/lib/meta-ads/create";
import { MetaAdsError, toMetaAdsErrorResponse } from "@/lib/meta-ads/errors";
import { getChatSession } from "@/lib/meta-ads/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Approve & Create Paused Campaign — the ONLY route that writes to Meta.
 * Requires an explicit prior user action (this endpoint is never called
 * automatically). Every object created is PAUSED — see create.ts.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : null;
    if (!sessionId) throw new MetaAdsError("INVALID_REQUEST", "sessionId is required.");

    const session = await getChatSession(sessionId);
    if (!session) throw new MetaAdsError("INVALID_REQUEST", "Chat session not found.");

    const result = await createPausedCampaign(session.draft);
    return Response.json({ ok: true, result });
  } catch (error) {
    return toMetaAdsErrorResponse(error);
  }
}
