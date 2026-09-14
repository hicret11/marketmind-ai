import { SocialError, toSocialErrorResponse } from "@/lib/social/errors";
import { getConnectedAccount } from "@/lib/social/repository";
import { labelPendingCreative } from "@/lib/social/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DEFAULT_BUDGET = 50;
const MAX_BUDGET = 200;

/**
 * Explicit, user-triggered backfill: labels already-synced posts that don't
 * have MarketMind AI creative labels yet. Same Gemini labeling system as
 * sync's per-run trickle, just without that step's small per-sync budget —
 * this is a one-off "catch up the backlog" action, not something that runs
 * automatically. No Instagram API calls; real posts, real Gemini calls only.
 */
export async function POST(request: Request) {
  try {
    const account = await getConnectedAccount();
    if (!account) throw new SocialError("SOCIAL_NOT_CONNECTED");

    const body = await request.json().catch(() => null);
    const requested = typeof body?.budget === "number" ? body.budget : DEFAULT_BUDGET;
    const budget = Math.min(MAX_BUDGET, Math.max(1, Math.trunc(requested)));

    const result = await labelPendingCreative(account.id, budget);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return toSocialErrorResponse(error);
  }
}
