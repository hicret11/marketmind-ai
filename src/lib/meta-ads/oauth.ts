import { META_ADS_SCOPES, metaAdsAppId, metaAdsAppSecret, metaAdsGraphVersion, metaAdsRedirectUri } from "./config";
import { MetaAdsError } from "./errors";

/**
 * Server-side Facebook Login for Business (Authorization Code flow) for the
 * Meta Marketing API. This is NOT the Instagram "Instagram API with
 * Instagram Login" flow (lib/social/instagram/oauth.ts, untouched) — it's a
 * separate product with its own scopes (ads_read, ads_management).
 *
 *   authorize (browser) -> https://www.facebook.com/{v}/dialog/oauth
 *   code -> short-lived token -> GET https://graph.facebook.com/{v}/oauth/access_token
 *   short -> long-lived token -> GET https://graph.facebook.com/{v}/oauth/access_token (fb_exchange_token)
 *
 * The app secret and every token stay on the server.
 */

export interface ExchangedTokens {
  accessToken: string;
  /** seconds until expiry, as returned by Facebook. */
  expiresIn: number;
}

function authorizeUrl(): string {
  return `https://www.facebook.com/${metaAdsGraphVersion()}/dialog/oauth`;
}
function tokenUrl(): string {
  return `https://graph.facebook.com/${metaAdsGraphVersion()}/oauth/access_token`;
}

export function buildAuthorizeUrl(state: string): string {
  const url = new URL(authorizeUrl());
  url.searchParams.set("client_id", metaAdsAppId());
  url.searchParams.set("redirect_uri", metaAdsRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", META_ADS_SCOPES.join(","));
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForToken(code: string): Promise<ExchangedTokens & { scope: string }> {
  const url = new URL(tokenUrl());
  url.searchParams.set("client_id", metaAdsAppId());
  url.searchParams.set("client_secret", metaAdsAppSecret());
  url.searchParams.set("redirect_uri", metaAdsRedirectUri());
  url.searchParams.set("code", code);

  const payload = await getJson<{
    access_token?: string;
    token_type?: string;
    expires_in?: number;
  }>(url.toString());

  if (!payload.access_token) {
    throw new MetaAdsError("META_ADS_OAUTH_ERROR", "Meta did not return an access token.");
  }

  // Facebook doesn't echo the granted scope on this endpoint — read it back
  // explicitly via /me/permissions so we know exactly what was granted,
  // never assuming the full requested list was approved.
  const scope = await fetchGrantedScope(payload.access_token);

  return { accessToken: payload.access_token, expiresIn: payload.expires_in ?? 3600, scope };
}

/** Exchanges a short-lived user token for a long-lived one (~60 days). */
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<ExchangedTokens> {
  const url = new URL(tokenUrl());
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", metaAdsAppId());
  url.searchParams.set("client_secret", metaAdsAppSecret());
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const payload = await getJson<{ access_token?: string; expires_in?: number }>(url.toString());
  if (!payload.access_token) {
    throw new MetaAdsError("META_ADS_OAUTH_ERROR", "Could not obtain a long-lived Meta Ads token.");
  }
  return { accessToken: payload.access_token, expiresIn: payload.expires_in ?? 60 * 24 * 60 * 60 };
}

async function fetchGrantedScope(accessToken: string): Promise<string> {
  try {
    const url = new URL(`https://graph.facebook.com/${metaAdsGraphVersion()}/me/permissions`);
    url.searchParams.set("access_token", accessToken);
    const payload = await getJson<{ data?: Array<{ permission?: string; status?: string }> }>(url.toString());
    return (payload.data ?? [])
      .filter((p) => p.status === "granted" && p.permission)
      .map((p) => p.permission as string)
      .join(",");
  } catch {
    // Best-effort — if this fails, the caller ends up with an empty granted
    // scope, which correctly surfaces as "missing permissions" rather than
    // assuming success.
    return "";
  }
}

async function getJson<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  } catch (cause) {
    throw new MetaAdsError("META_ADS_OAUTH_ERROR", undefined, { cause });
  }
  const payload = (await response.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!response.ok || !payload) {
    throw new MetaAdsError(
      "META_ADS_OAUTH_ERROR",
      payload?.error?.message ? `Meta error: ${payload.error.message}` : undefined,
    );
  }
  return payload;
}
