import { NextResponse } from "next/server";
import { isTiktokAppConfigured } from "@/lib/tiktok/config";
import { TIKTOK_USER_MESSAGES } from "@/lib/tiktok/errors";
import { buildAuthorizeUrl } from "@/lib/tiktok/oauth";
import { issueOAuthState } from "@/lib/tiktok/oauth-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kicks off server-side TikTok Login Kit OAuth (Web flow) by redirecting the browser to TikTok. */
export async function GET() {
  if (!isTiktokAppConfigured()) {
    return NextResponse.json(
      { error: { code: "TIKTOK_NOT_CONFIGURED", message: TIKTOK_USER_MESSAGES.TIKTOK_NOT_CONFIGURED } },
      { status: 503 },
    );
  }
  const state = await issueOAuthState();
  return NextResponse.redirect(buildAuthorizeUrl(state));
}
