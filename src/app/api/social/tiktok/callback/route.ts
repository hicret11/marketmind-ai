import { NextResponse } from "next/server";
import { TiktokApiClient } from "@/lib/tiktok/api-client";
import { parseGrantedScope } from "@/lib/tiktok/config";
import { TiktokError } from "@/lib/tiktok/errors";
import { exchangeCodeForTokens, type TokenEndpointDiagnostics } from "@/lib/tiktok/oauth";
import { consumeOAuthState } from "@/lib/tiktok/oauth-state";
import { disconnectAccount, saveToken, upsertAccount } from "@/lib/tiktok/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Every exit from this route goes to a real Social Media page —
 * `/social-media` — and NEVER back to this callback path itself. There is no
 * code path in this file that constructs a redirect target from anything
 * other than the hardcoded string below, so a loop back to
 * /api/social/tiktok/callback is structurally impossible here.
 *
 * Web app flow (per TikTok Developer Portal app type): state is validated,
 * PKCE is NOT used — see lib/tiktok/oauth.ts.
 */
const APP_LANDING_PATH = "/social-media";

function redirectToApp(params: Record<string, string>): NextResponse {
  const base = process.env.APP_BASE_URL || "http://localhost:3000";
  const url = new URL(APP_LANDING_PATH, base.replace(/\/$/, ""));
  url.searchParams.set("platform", "tiktok");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  console.log(`[tiktok/callback] final redirect URL: ${url.toString()}`);
  return NextResponse.redirect(url);
}

/** Logs only safe fields — never access_token, refresh_token, or client_secret. */
function logTokenDiagnostics(d: TokenEndpointDiagnostics) {
  console.log(
    `[tiktok/callback] token endpoint HTTP status: ${d.httpStatus} | ` +
      `TikTok error code: ${d.tiktokErrorCode ?? "(none)"} | ` +
      `TikTok error_description: ${d.tiktokErrorDescription ?? "(none)"} | ` +
      `scope returned: ${d.scope ?? "(none)"} | ` +
      `open_id returned: ${d.openIdReturned ? "yes" : "no"}`,
  );
}

/** Server-side OAuth callback: verify state, exchange code, store account + token. */
export async function GET(request: Request) {
  console.log("[tiktok/callback] callback received");

  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  console.log(`[tiktok/callback] code received: ${code ? "yes" : "no"}`);

  if (error) {
    console.log(`[tiktok/callback] TikTok returned an error param: ${error} (${errorDescription ?? "no description"})`);
    return redirectToApp({ error: "denied", detail: errorDescription || error });
  }
  if (!code || !state) {
    console.log("[tiktok/callback] missing code or state in callback URL");
    return redirectToApp({ error: "invalid_callback" });
  }

  const stateValid = await consumeOAuthState(state);
  console.log(`[tiktok/callback] state valid: ${stateValid ? "yes" : "no"}`);
  if (!stateValid) {
    return redirectToApp({ error: "state_mismatch" });
  }

  let accountId: string | null = null;
  try {
    const { tokens, diagnostics } = await exchangeCodeForTokens(code);
    logTokenDiagnostics(diagnostics);

    if (!tokens.openId) {
      console.log("[tiktok/callback] token exchange returned no open_id — treating as failed");
      return redirectToApp({ error: "TOKEN_EXCHANGE_FAILED" });
    }
    console.log("[tiktok/callback] token exchange succeeded");

    if (!tokens.refreshToken) {
      // Don't persist a broken "connected" account with no way to refresh
      // its token — that would leave the UI showing "Connected" while every
      // sync fails, which just drives the user to keep retrying.
      console.log("[tiktok/callback] no refresh_token in response — not saving an account");
      return redirectToApp({ error: "no_refresh_token" });
    }

    const grantedScopes = parseGrantedScope(tokens.scope);
    const client = new TiktokApiClient();
    const profile = await client.getUserInfo(tokens.accessToken, grantedScopes);
    console.log(
      `[tiktok/callback] profile fetch: ${profile.ok ? "success" : "failed"} ` +
        `(status=${profile.httpStatus}, code=${profile.errorCode ?? "(none)"}, message=${profile.errorMessage ?? "(none)"}, fields=${profile.fieldsRequested})`,
    );
    const user = profile.data;

    const stored = await upsertAccount({
      openId: tokens.openId,
      // Never show the raw open_id as the account name when TikTok gave us a real one.
      displayName: user?.displayName ?? user?.username ?? tokens.openId,
      username: user?.username ?? null,
      avatarUrl: user?.avatarUrl ?? null,
      profileDeepLink: user?.profileDeepLink ?? null,
      bioDescription: user?.bioDescription ?? null,
      isVerified: user?.isVerified ?? null,
      followerCount: user?.followerCount ?? null,
      followingCount: user?.followingCount ?? null,
      likesCount: user?.likesCount ?? null,
      videoCount: user?.videoCount ?? null,
      connectedAt: new Date().toISOString(),
      lastSyncAt: null,
      tokenStatus: "active",
      grantedScope: tokens.scope,
    });
    accountId = stored.id;

    await saveToken({
      accountId: stored.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
    });
    console.log(`[tiktok/callback] token saved: yes (accountId=${stored.id})`);

    return redirectToApp({ connected: "1" });
  } catch (e) {
    // Never log the caught error object directly — it may wrap a raw TikTok
    // API response. Log only safe fields: our own message, plus the token
    // endpoint diagnostics already logged above when the throw came from
    // exchangeCodeForTokens. Never access_token/refresh_token/client_secret.
    const message = e instanceof Error ? e.message : "unknown error";
    console.log(`[tiktok/callback] token saved: no`);
    console.error(`[tiktok/callback] failed: ${message}`);
    if (e instanceof TiktokError && e.details) {
      console.error(`[tiktok/callback] safe error details: ${JSON.stringify(e.details)}`);
    }
    if (accountId) {
      // We created the account but failed before/while saving its token —
      // remove it rather than leave a stuck "connected but broken" record.
      await disconnectAccount(accountId).catch(() => {});
    }
    return redirectToApp({ error: "TOKEN_EXCHANGE_FAILED" });
  }
}
