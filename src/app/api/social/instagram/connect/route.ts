import { NextResponse } from "next/server";
import { isInstagramAppConfigured } from "@/lib/social/config";
import { SOCIAL_USER_MESSAGES } from "@/lib/social/errors";
import { buildAuthorizeUrl } from "@/lib/social/instagram/oauth";
import { issueOAuthState } from "@/lib/social/oauth-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kicks off server-side Instagram OAuth by redirecting the browser to Instagram. */
export async function GET() {
  if (!isInstagramAppConfigured()) {
    return NextResponse.json(
      { error: { code: "SOCIAL_NOT_CONFIGURED", message: SOCIAL_USER_MESSAGES.SOCIAL_NOT_CONFIGURED } },
      { status: 503 },
    );
  }
  const state = await issueOAuthState();
  return NextResponse.redirect(buildAuthorizeUrl(state));
}
