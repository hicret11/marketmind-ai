import { isMetaAdsStaticModeConfigured, metaAdsStaticAccessToken, metaAdsStaticAdAccountId } from "./config";
import { getAccessToken, getConnectedAccount } from "./repository";

/**
 * Every place that needs to call the Meta Marketing API (status, campaign
 * history, campaign creation) resolves its access through here — so the
 * static-token path (config.ts) and the OAuth-connected-account path
 * (repository.ts) never have to be handled twice, and adding/removing one
 * path can't accidentally break the other.
 */
export interface ResolvedMetaAdsAccess {
  mode: "static" | "oauth";
  accessToken: string;
  /** Pre-selected in static mode; user-chosen (via /api/ads/meta/select-account) in OAuth mode. */
  adAccountId: string | null;
}

export async function resolveMetaAdsAccess(): Promise<ResolvedMetaAdsAccess | null> {
  if (isMetaAdsStaticModeConfigured()) {
    return { mode: "static", accessToken: metaAdsStaticAccessToken(), adAccountId: metaAdsStaticAdAccountId() };
  }

  const account = await getConnectedAccount();
  if (!account) return null;
  const tokenInfo = await getAccessToken(account.id);
  if (!tokenInfo || tokenInfo.expired) return null;
  return { mode: "oauth", accessToken: tokenInfo.accessToken, adAccountId: account.selectedAdAccountId };
}
