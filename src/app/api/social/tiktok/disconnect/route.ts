import { toTiktokErrorResponse } from "@/lib/tiktok/errors";
import { disconnectAccount, getConnectedAccount } from "@/lib/tiktok/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const account = await getConnectedAccount();
    if (account) await disconnectAccount(account.id);
    return Response.json({ ok: true });
  } catch (error) {
    return toTiktokErrorResponse(error);
  }
}
