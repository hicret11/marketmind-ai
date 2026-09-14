import { NextResponse } from "next/server";
import { isYoutubeAppConfigured } from "@/lib/youtube/config";
import { YOUTUBE_USER_MESSAGES } from "@/lib/youtube/errors";
import { buildAuthorizeUrl } from "@/lib/youtube/oauth";
import { issueOAuthState } from "@/lib/youtube/oauth-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kicks off server-side Google OAuth by redirecting the browser to Google. */
export async function GET() {
  if (!isYoutubeAppConfigured()) {
    return NextResponse.json(
      { error: { code: "YOUTUBE_NOT_CONFIGURED", message: YOUTUBE_USER_MESSAGES.YOUTUBE_NOT_CONFIGURED } },
      { status: 503 },
    );
  }
  const state = await issueOAuthState();
  return NextResponse.redirect(buildAuthorizeUrl(state));
}
