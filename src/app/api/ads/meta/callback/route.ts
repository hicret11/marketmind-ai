import { NextResponse } from "next/server";
import { metaAdsGraphVersion } from "@/lib/meta-ads/config";
import { exchangeCodeForToken, exchangeForLongLivedToken } from "@/lib/meta-ads/oauth";
import { consumeOAuthState } from "@/lib/meta-ads/oauth-state";
import { saveToken, upsertAccount } from "@/lib/meta-ads/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_LANDING_PATH = "/ads-manager";

function redirectToApp(params: Record<string, string>): NextResponse {
  const base = process.env.APP_BASE_URL || "http://localhost:3000";
  const url = new URL(APP_LANDING_PATH, base.replace(/\/$/, ""));
  url.searchParams.set("platform", "meta");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

async function fetchFacebookUser(accessToken: string): Promise<{ id: string; name: string | null }> {
  const url = new URL(`https://graph.facebook.com/${metaAdsGraphVersion()}/me`);
  url.searchParams.set("fields", "id,name");
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const payload = (await res.json().catch(() => null)) as { id?: string; name?: string } | null;
  return { id: payload?.id ?? "", name: payload?.name ?? null };
}

/** Server-side OAuth callback: verify state, exchange code, store account + token. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (error) {
    return redirectToApp({ error: "denied", detail: errorDescription || error });
  }
  if (!code || !state) {
    return redirectToApp({ error: "invalid_callback" });
  }
  if (!(await consumeOAuthState(state))) {
    return redirectToApp({ error: "state_mismatch" });
  }

  try {
    const short = await exchangeCodeForToken(code);
    const long = await exchangeForLongLivedToken(short.accessToken);
    const fbUser = await fetchFacebookUser(long.accessToken);

    if (!fbUser.id) {
      return redirectToApp({ error: "oauth_failed" });
    }

    const stored = await upsertAccount({
      userId: fbUser.id,
      userName: fbUser.name,
      connectedAt: new Date().toISOString(),
      tokenStatus: "active",
      grantedScope: short.scope,
      selectedAdAccountId: null,
    });

    await saveToken({
      accountId: stored.id,
      accessToken: long.accessToken,
      expiresAt: new Date(Date.now() + long.expiresIn * 1000).toISOString(),
    });

    return redirectToApp({ connected: "1" });
  } catch (e) {
    console.error("[meta-ads/callback] failed:", e instanceof Error ? e.message : "unknown error");
    return redirectToApp({ error: "oauth_failed" });
  }
}
