import { MetaAdsApiClient } from "./api-client";
import {
  META_ADS_SCOPES,
  isMetaAdsAppConfigured,
  isMetaAdsStaticModeConfigured,
  metaAdsAppId,
  metaAdsAppSecret,
  metaAdsMissingConfig,
  metaAdsRedirectUri,
} from "./config";
import { getConnectedAccount } from "./repository";
import { resolveMetaAdsAccess } from "./token-resolver";
import type { MetaAdsConfigStatus } from "@/types/meta-ads";

/**
 * The full, token-free status the UI reads. Never fabricates a connection,
 * an ad account list, or a missing-permission name — `missingScopes` is
 * populated ONLY when Meta's own introspection returned real granted-scope
 * data; otherwise Meta's real error text is surfaced via `connectionError`.
 */
export async function getMetaAdsConfigStatus(): Promise<MetaAdsConfigStatus> {
  const appConfigured = isMetaAdsAppConfigured();
  const access = await resolveMetaAdsAccess();

  if (!access) {
    return {
      appConfigured,
      missing: metaAdsMissingConfig(),
      redirectUri: appConfigured ? metaAdsRedirectUri() : null,
      requestedScopes: META_ADS_SCOPES,
      connected: false,
      account: null,
      missingScopes: [],
      connectionError: null,
      adAccounts: [],
    };
  }

  const client = new MetaAdsApiClient();
  const inspection = await client.inspectTokenAccess(access.accessToken, metaAdsAppId(), metaAdsAppSecret());

  // Only computed when we have REAL granted-scope data — see inspectTokenAccess.
  const missingScopes = inspection.scopesKnown
    ? META_ADS_SCOPES.filter((s) => !inspection.grantedScopes.includes(s))
    : [];

  let adAccounts: MetaAdsConfigStatus["adAccounts"] = [];
  let listError: string | null = null;
  try {
    adAccounts = await client.listAdAccounts(access.accessToken);
  } catch (error) {
    listError = error instanceof Error ? error.message : "Could not read ad accounts.";
  }

  // The real, user-facing reason the connection isn't fully working, if any
  // — Meta's own text, never a guessed permission name.
  const connectionError = !inspection.scopesKnown ? inspection.rawMessage : listError;

  if (access.mode === "static") {
    const selected = adAccounts.find((a) => a.id === access.adAccountId);
    return {
      appConfigured,
      missing: [],
      redirectUri: null,
      requestedScopes: META_ADS_SCOPES,
      connected: adAccounts.length > 0,
      account: {
        id: "static",
        userId: "static",
        userName: selected?.name ?? access.adAccountId,
        connectedAt: new Date(0).toISOString(),
        tokenStatus: connectionError ? "revoked" : "active",
        grantedScope: inspection.scopesKnown ? inspection.grantedScopes.join(",") : "",
        selectedAdAccountId: access.adAccountId,
      },
      missingScopes,
      connectionError,
      adAccounts,
    };
  }

  const oauthAccount = await getConnectedAccount();
  return {
    appConfigured,
    missing: metaAdsMissingConfig(),
    redirectUri: appConfigured ? metaAdsRedirectUri() : null,
    requestedScopes: META_ADS_SCOPES,
    connected: Boolean(oauthAccount) && adAccounts.length > 0,
    account: oauthAccount ?? null,
    missingScopes,
    connectionError,
    adAccounts,
  };
}

export { isMetaAdsStaticModeConfigured };
