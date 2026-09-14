import {
  instagramAppId,
  instagramAppSecret,
  instagramGraphVersion,
  instagramRedirectUri,
  scopesForOAuth,
} from "../config";
import { SocialError } from "../errors";

/**
 * Server-side OAuth for "Instagram API with Instagram Login".
 *
 *   authorize (browser)  ->  https://www.instagram.com/oauth/authorize
 *   code -> short token   ->  POST https://api.instagram.com/oauth/access_token
 *   short -> long token   ->  GET  https://graph.instagram.com/access_token (ig_exchange_token)
 *   refresh long token    ->  GET  https://graph.instagram.com/refresh_access_token
 *
 * The client secret and every token stay on the server.
 */

const AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";
const TOKEN_URL = "https://api.instagram.com/oauth/access_token";

export interface ShortLivedToken {
  accessToken: string;
  userId: string;
  permissions: string[];
}

export interface LongLivedToken {
  accessToken: string;
  tokenType: string;
  /** seconds until expiry, as returned by Instagram. */
  expiresIn: number;
}

export function buildAuthorizeUrl(state: string): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", instagramAppId());
  url.searchParams.set("redirect_uri", instagramRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopesForOAuth().join(","));
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForToken(code: string): Promise<ShortLivedToken> {
  const body = new URLSearchParams({
    client_id: instagramAppId(),
    client_secret: instagramAppSecret(),
    grant_type: "authorization_code",
    redirect_uri: instagramRedirectUri(),
    code,
  });

  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(15000),
    });
  } catch (cause) {
    throw new SocialError("SOCIAL_OAUTH_ERROR", undefined, { cause });
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        access_token?: string;
        user_id?: number | string;
        permissions?: string[] | string;
        error_message?: string;
        error_type?: string;
      }
    | null;

  if (!response.ok || !payload?.access_token || payload.user_id == null) {
    throw new SocialError(
      "SOCIAL_OAUTH_ERROR",
      payload?.error_message
        ? `Instagram OAuth error: ${payload.error_message}`
        : undefined,
      { status: response.status >= 400 && response.status < 500 ? 400 : 502 },
    );
  }

  const permissions = Array.isArray(payload.permissions)
    ? payload.permissions
    : typeof payload.permissions === "string"
      ? payload.permissions.split(",").map((p) => p.trim()).filter(Boolean)
      : [];

  return {
    accessToken: payload.access_token,
    userId: String(payload.user_id),
    permissions,
  };
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string,
): Promise<LongLivedToken> {
  const url = new URL(
    `https://graph.instagram.com/${instagramGraphVersion()}/access_token`,
  );
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", instagramAppSecret());
  url.searchParams.set("access_token", shortLivedToken);

  const payload = await getJson<{
    access_token?: string;
    token_type?: string;
    expires_in?: number;
  }>(url.toString());

  if (!payload.access_token) {
    throw new SocialError("SOCIAL_OAUTH_ERROR", "Could not obtain a long-lived Instagram token.");
  }
  return {
    accessToken: payload.access_token,
    tokenType: payload.token_type ?? "bearer",
    expiresIn: payload.expires_in ?? 60 * 60 * 24 * 60,
  };
}

export async function refreshLongLivedToken(
  longLivedToken: string,
): Promise<LongLivedToken> {
  const url = new URL(
    `https://graph.instagram.com/${instagramGraphVersion()}/refresh_access_token`,
  );
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", longLivedToken);

  const payload = await getJson<{
    access_token?: string;
    token_type?: string;
    expires_in?: number;
  }>(url.toString());

  if (!payload.access_token) {
    throw new SocialError("SOCIAL_TOKEN_EXPIRED", "Instagram token refresh failed.");
  }
  return {
    accessToken: payload.access_token,
    tokenType: payload.token_type ?? "bearer",
    expiresIn: payload.expires_in ?? 60 * 60 * 24 * 60,
  };
}

async function getJson<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  } catch (cause) {
    throw new SocialError("SOCIAL_OAUTH_ERROR", undefined, { cause });
  }
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: { message?: string } })
    | null;
  if (!response.ok || !payload) {
    throw new SocialError(
      "SOCIAL_OAUTH_ERROR",
      payload?.error?.message
        ? `Instagram error: ${payload.error.message}`
        : undefined,
    );
  }
  return payload;
}
