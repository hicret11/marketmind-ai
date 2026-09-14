import { NextResponse } from "next/server";
import { isMetaAdsAppConfigured } from "@/lib/meta-ads/config";
import { META_ADS_USER_MESSAGES } from "@/lib/meta-ads/errors";
import { buildAuthorizeUrl } from "@/lib/meta-ads/oauth";
import { issueOAuthState } from "@/lib/meta-ads/oauth-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kicks off server-side Facebook Login for Business by redirecting the browser to Meta. */
export async function GET() {
  if (!isMetaAdsAppConfigured()) {
    return NextResponse.json(
      { error: { code: "META_ADS_NOT_CONFIGURED", message: META_ADS_USER_MESSAGES.META_ADS_NOT_CONFIGURED } },
      { status: 503 },
    );
  }
  const state = await issueOAuthState();
  return NextResponse.redirect(buildAuthorizeUrl(state));
}
