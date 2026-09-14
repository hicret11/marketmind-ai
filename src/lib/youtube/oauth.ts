import { YOUTUBE_SCOPES, youtubeClientId, youtubeClientSecret, youtubeRedirectUri } from "./config";
import { YoutubeError } from "./errors";

/**
 * Server-side Google OAuth2 (Authorization Code, offline access) for the
 * YouTube Data API.
 *
 *   authorize (browser) -> https://accounts.google.com/o/oauth2/v2/auth
 *   code -> tokens        -> POST https://oauth2.googleapis.com/token
 *   refresh access token  -> POST https://oauth2.googleapis.com/token (grant_type=refresh_token)
 *
 * The client secret and every token stay on the server.
 */

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface ExchangedTokens {
  accessToken: string;
  refreshToken: string | null;
  /** seconds until expiry, as returned by Google. */
  expiresIn: number;
  scope: string;
}

export interface RefreshedTokens {
  accessToken: string;
  expiresIn: number;
}

export function buildAuthorizeUrl(state: string): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", youtubeClientId());
  url.searchParams.set("redirect_uri", youtubeRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", YOUTUBE_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  // Forces Google to re-issue a refresh_token even on a repeat consent —
  // otherwise reconnecting an account that revoked access would leave us
  // without one.
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForTokens(code: string): Promise<ExchangedTokens> {
  const body = new URLSearchParams({
    code,
    client_id: youtubeClientId(),
    client_secret: youtubeClientSecret(),
    redirect_uri: youtubeRedirectUri(),
    grant_type: "authorization_code",
  });

  const payload = await postForm<{
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  }>(body);

  if (!payload.access_token) {
    throw new YoutubeError(
      "YOUTUBE_OAUTH_ERROR",
      payload.error_description ? `Google OAuth error: ${payload.error_description}` : undefined,
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    expiresIn: payload.expires_in ?? 3600,
    scope: payload.scope ?? "",
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<RefreshedTokens> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: youtubeClientId(),
    client_secret: youtubeClientSecret(),
    grant_type: "refresh_token",
  });

  const payload = await postForm<{
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  }>(body);

  if (!payload.access_token) {
    throw new YoutubeError("YOUTUBE_TOKEN_EXPIRED", "YouTube token refresh failed.");
  }
  return { accessToken: payload.access_token, expiresIn: payload.expires_in ?? 3600 };
}

async function postForm<T>(body: URLSearchParams): Promise<T> {
  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(15000),
    });
  } catch (cause) {
    throw new YoutubeError("YOUTUBE_OAUTH_ERROR", undefined, { cause });
  }
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string; error_description?: string })
    | null;
  if (!response.ok || !payload) {
    throw new YoutubeError(
      "YOUTUBE_OAUTH_ERROR",
      payload?.error_description ? `Google OAuth error: ${payload.error_description}` : undefined,
      { status: response.status >= 400 && response.status < 500 ? 400 : 502 },
    );
  }
  return payload;
}
