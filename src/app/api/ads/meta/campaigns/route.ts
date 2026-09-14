import { MetaAdsApiClient } from "@/lib/meta-ads/api-client";
import { META_ADS_MAX_CAMPAIGNS } from "@/lib/meta-ads/config";
import { MetaAdsError, toMetaAdsErrorResponse } from "@/lib/meta-ads/errors";
import { resolveMetaAdsAccess } from "@/lib/meta-ads/token-resolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Real campaign history + real insight metrics from the selected ad account. Never fabricated. */
export async function GET() {
  try {
    const access = await resolveMetaAdsAccess();
    if (!access) throw new MetaAdsError("META_ADS_NOT_CONNECTED");
    if (!access.adAccountId) throw new MetaAdsError("META_ADS_NO_AD_ACCOUNT");

    const client = new MetaAdsApiClient();
    const [campaigns, adAccounts] = await Promise.all([
      client.listCampaignsWithInsights(access.accessToken, access.adAccountId, META_ADS_MAX_CAMPAIGNS),
      client.listAdAccounts(access.accessToken),
    ]);
    const currency = adAccounts.find((a) => a.id === access.adAccountId)?.currency ?? null;

    return Response.json({ ok: true, campaigns: campaigns.map((c) => ({ ...c, currency })) });
  } catch (error) {
    return toMetaAdsErrorResponse(error);
  }
}
