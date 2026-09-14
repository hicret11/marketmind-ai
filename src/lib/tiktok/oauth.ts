import { TIKTOK_SCOPES, tiktokClientKey, tiktokClientSecret, tiktokRedirectUri } from "./config";
import { TiktokError } from "./errors";

/**
 * Server-side TikTok Login Kit OAuth2 — Authorization Code flow for a WEB
 * app (this app is registered as "Web" in the TikTok Developer Portal, not
 * Desktop). Web apps authenticate the token exchange with `client_secret`
 * (a confidential client) and TikTok's Web flow validates the request via
 * `state` — PKCE (`code_challenge`/`code_verifier`) is a Desktop/mobile
 * public-client mechanism and is deliberately NOT used here.
 *
 *   authorize (browser) -> https://www.tiktok.com/v2/auth/authorize/
 *   code -> tokens        -> POST https://open.tiktokapis.com/v2/oauth/token/
 *   refresh access token  -> POST https://open.tiktokapis.com/v2/oauth/token/ (grant_type=refresh_token)
 *
 * The client secret and every token stay on the server.
 */

const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";

export interface ExchangedTokens {
  accessToken: string;
  refreshToken: string | null;
  openId: string | null;
  /** seconds until expiry, as returned by TikTok. */
  expiresIn: number;
  scope: string;
}

export interface RefreshedTokens {
  accessToken: string;
  expiresIn: number;
}

/** Safe (no secrets) diagnostics about a token-endpoint call, for logging. */
export interface TokenEndpointDiagnostics {
  httpStatus: number;
  tiktokErrorCode: string | null;
  tiktokErrorDescription: string | null;
  scope: string | null;
  openIdReturned: boolean;
}

export function buildAuthorizeUrl(state: string): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_key", tiktokClientKey());
  url.searchParams.set("redirect_uri", tiktokRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", TIKTOK_SCOPES.join(","));
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForTokens(
  code: string,
): Promise<{ tokens: ExchangedTokens; diagnostics: TokenEndpointDiagnostics }> {
  const body = new URLSearchParams({
    client_key: tiktokClientKey(),
    client_secret: tiktokClientSecret(),
    code,
    grant_type: "authorization_code",
    redirect_uri: tiktokRedirectUri(),
  });

  const { status, payload } = await postForm<{
    access_token?: string;
    refresh_token?: string;
    open_id?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  }>(body);

  const diagnostics: TokenEndpointDiagnostics = {
    httpStatus: status,
    tiktokErrorCode: payload?.error ?? null,
    tiktokErrorDescription: payload?.error_description ?? null,
    scope: payload?.scope ?? null,
    openIdReturned: Boolean(payload?.open_id),
  };

  if (!payload?.access_token) {
    throw new TiktokError(
      "TIKTOK_OAUTH_ERROR",
      payload?.error_description ? `TikTok OAuth error: ${payload.error_description}` : undefined,
      { status: status >= 400 && status < 500 ? 400 : 502, details: diagnostics },
    );
  }

  const tokens: ExchangedTokens = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    openId: payload.open_id ?? null,
    expiresIn: payload.expires_in ?? 86400,
    scope: payload.scope ?? "",
  };
  return { tokens, diagnostics };
}

export async function refreshAccessToken(refreshToken: string): Promise<RefreshedTokens> {
  const body = new URLSearchParams({
    client_key: tiktokClientKey(),
    client_secret: tiktokClientSecret(),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const { payload } = await postForm<{
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  }>(body);

  if (!payload?.access_token) {
    throw new TiktokError("TIKTOK_TOKEN_EXPIRED", "TikTok token refresh failed.");
  }
  return { accessToken: payload.access_token, expiresIn: payload.expires_in ?? 86400 };
}

async function postForm<T>(body: URLSearchParams): Promise<{ status: number; payload: (T & { error?: string; error_description?: string }) | null }> {
  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body,
      signal: AbortSignal.timeout(15000),
    });
  } catch (cause) {
    throw new TiktokError("TIKTOK_OAUTH_ERROR", "Network error reaching TikTok's token endpoint.", { cause });
  }
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string; error_description?: string })
    | null;
  return { status: response.status, payload };
}
