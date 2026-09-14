import { TiktokError, toTiktokErrorResponse } from "@/lib/tiktok/errors";
import { getConnectedAccount } from "@/lib/tiktok/repository";
import { labelPendingCreative } from "@/lib/tiktok/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DEFAULT_BUDGET = 25;

export async function POST(request: Request) {
  try {
    const account = await getConnectedAccount();
    if (!account) throw new TiktokError("TIKTOK_NOT_CONNECTED");

    const body = await request.json().catch(() => ({}));
    const budget = typeof body?.budget === "number" && body.budget > 0 ? body.budget : DEFAULT_BUDGET;

    const result = await labelPendingCreative(account.id, budget);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return toTiktokErrorResponse(error);
  }
}
