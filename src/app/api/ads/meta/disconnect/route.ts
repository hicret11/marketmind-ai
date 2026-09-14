import { toMetaAdsErrorResponse } from "@/lib/meta-ads/errors";
import { disconnectAccount, getConnectedAccount } from "@/lib/meta-ads/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const account = await getConnectedAccount();
    if (account) await disconnectAccount(account.id);
    return Response.json({ ok: true });
  } catch (error) {
    return toMetaAdsErrorResponse(error);
  }
}
