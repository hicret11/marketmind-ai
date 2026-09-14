import { NextResponse } from "next/server";
import { YoutubeApiClient } from "@/lib/youtube/api-client";
import { exchangeCodeForTokens } from "@/lib/youtube/oauth";
import { consumeOAuthState } from "@/lib/youtube/oauth-state";
import { saveToken, upsertChannel } from "@/lib/youtube/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectToApp(params: Record<string, string>): NextResponse {
  const base = process.env.APP_BASE_URL || "http://localhost:3000";
  const url = new URL("/social-media", base.replace(/\/$/, ""));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

/** Server-side OAuth callback: verify state, exchange code, store channel + token. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (error) {
    return redirectToApp({ yt_error: "denied", yt_detail: error });
  }
  if (!code || !state) {
    return redirectToApp({ yt_error: "invalid_callback" });
  }
  if (!(await consumeOAuthState(state))) {
    return redirectToApp({ yt_error: "state_mismatch" });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    const client = new YoutubeApiClient();
    const remote = await client.getMyChannel(tokens.accessToken);
    if (!remote) {
      return redirectToApp({ yt_error: "no_channel" });
    }

    const stored = await upsertChannel({
      channelId: remote.channelId,
      title: remote.title,
      description: remote.description,
      thumbnailUrl: remote.thumbnailUrl,
      subscriberCount: remote.subscriberCount,
      viewCount: remote.viewCount,
      videoCount: remote.videoCount,
      connectedAt: new Date().toISOString(),
      lastSyncAt: null,
      tokenStatus: "active",
    });

    if (!tokens.refreshToken) {
      // Should not normally happen with prompt=consent, but guard rather than
      // silently store a channel MarketMind can never refresh/sync again.
      return redirectToApp({ yt_error: "no_refresh_token" });
    }

    await saveToken({
      channelId: stored.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
    });

    return redirectToApp({ yt_connected: "1" });
  } catch (e) {
    console.error("[youtube] callback failed:", e);
    return redirectToApp({ yt_error: "oauth_failed" });
  }
}
