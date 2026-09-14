import { MetaAdsError, toMetaAdsErrorResponse } from "@/lib/meta-ads/errors";
import { getConnectedAccount, updateAccount } from "@/lib/meta-ads/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const account = await getConnectedAccount();
    if (!account) throw new MetaAdsError("META_ADS_NOT_CONNECTED");

    const body = await request.json().catch(() => ({}));
    const adAccountId = typeof body?.adAccountId === "string" ? body.adAccountId : null;
    if (!adAccountId) throw new MetaAdsError("INVALID_REQUEST", "adAccountId is required.");

    const updated = await updateAccount(account.id, { selectedAdAccountId: adAccountId });
    return Response.json({ ok: true, account: updated });
  } catch (error) {
    return toMetaAdsErrorResponse(error);
  }
}
