import { NextResponse } from "next/server";
import { REQUESTED_SCOPES } from "@/lib/social/config";
import { InstagramClient } from "@/lib/social/instagram/client";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
} from "@/lib/social/instagram/oauth";
import { consumeOAuthState } from "@/lib/social/oauth-state";
import { saveToken, upsertAccount } from "@/lib/social/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectToApp(params: Record<string, string>): NextResponse {
  const base = process.env.APP_BASE_URL || "http://localhost:3000";
  const url = new URL("/social-media", base.replace(/\/$/, ""));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

/** Server-side OAuth callback: verify state, exchange code, store account + token. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const errorReason = url.searchParams.get("error_description") || url.searchParams.get("error_reason");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (error) {
    return redirectToApp({ ig_error: "denied", ig_detail: errorReason || error });
  }
  if (!code || !state) {
    return redirectToApp({ ig_error: "invalid_callback" });
  }
  if (!(await consumeOAuthState(state))) {
    return redirectToApp({ ig_error: "state_mismatch" });
  }

  try {
    const short = await exchangeCodeForToken(code);
    const long = await exchangeForLongLivedToken(short.accessToken);

    const client = new InstagramClient();
    const account = await client.getAccount(long.accessToken);

    if (account.accountType !== "BUSINESS" && account.accountType !== "CREATOR") {
      return redirectToApp({ ig_error: "account_type", ig_username: account.username || "" });
    }

    const stored = await upsertAccount({
      platform: "instagram",
      igUserId: account.igUserId,
      username: account.username,
      name: account.name,
      accountType: account.accountType,
      profilePictureUrl: account.profilePictureUrl,
      followersCount: account.followersCount,
      mediaCount: account.mediaCount,
      connectedAt: new Date().toISOString(),
      lastSyncAt: null,
      tokenStatus: "active",
    });

    await saveToken({
      accountId: stored.id,
      accessToken: long.accessToken,
      tokenType: long.tokenType,
      expiresAt: new Date(Date.now() + long.expiresIn * 1000).toISOString(),
      scopes: short.permissions.length > 0 ? short.permissions : REQUESTED_SCOPES,
    });

    return redirectToApp({ ig_connected: "1" });
  } catch (e) {
    console.error("[social] instagram callback failed:", e);
    return redirectToApp({ ig_error: "oauth_failed" });
  }
}
