/**
 * Self-contained error taxonomy for the Meta Ads integration. Kept separate
 * from lib/social/errors.ts (Instagram) — same pattern as every other
 * platform module in this app.
 */
export type MetaAdsErrorCode =
  | "INVALID_REQUEST"
  | "META_ADS_NOT_CONFIGURED"
  | "META_ADS_NOT_CONNECTED"
  | "META_ADS_OAUTH_ERROR"
  | "META_ADS_TOKEN_EXPIRED"
  | "META_ADS_MISSING_PERMISSIONS"
  | "META_ADS_NO_AD_ACCOUNT"
  | "META_ADS_API_ERROR"
  | "META_ADS_CREATIVE_NOT_ELIGIBLE"
  | "META_ADS_DRAFT_INVALID"
  | "META_ADS_AI_UNAVAILABLE"
  | "STORAGE_ERROR"
  | "INTERNAL";

const DEFAULT_STATUS: Record<MetaAdsErrorCode, number> = {
  INVALID_REQUEST: 400,
  META_ADS_NOT_CONFIGURED: 503,
  META_ADS_NOT_CONNECTED: 409,
  META_ADS_OAUTH_ERROR: 502,
  META_ADS_TOKEN_EXPIRED: 401,
  META_ADS_MISSING_PERMISSIONS: 403,
  META_ADS_NO_AD_ACCOUNT: 409,
  META_ADS_API_ERROR: 502,
  META_ADS_CREATIVE_NOT_ELIGIBLE: 422,
  META_ADS_DRAFT_INVALID: 422,
  META_ADS_AI_UNAVAILABLE: 503,
  STORAGE_ERROR: 500,
  INTERNAL: 500,
};

/** Product-friendly copy — no secrets, no raw API payloads. */
export const META_ADS_USER_MESSAGES: Record<MetaAdsErrorCode, string> = {
  INVALID_REQUEST: "That request wasn't valid.",
  META_ADS_NOT_CONFIGURED: "Meta Ads isn't set up yet. Add the Meta app credentials to connect an ad account.",
  META_ADS_NOT_CONNECTED: "Connect your Meta ad account to build and review campaigns.",
  META_ADS_OAUTH_ERROR: "The Meta Ads connection didn't complete. Please try connecting again.",
  META_ADS_TOKEN_EXPIRED: "Your Meta Ads connection has expired. Reconnect to keep building campaigns.",
  META_ADS_MISSING_PERMISSIONS: "Meta Ads connection requires additional permissions.",
  META_ADS_NO_AD_ACCOUNT: "No ad account is selected. Choose one of your Meta ad accounts first.",
  META_ADS_API_ERROR: "Meta returned an error. Please try again shortly.",
  META_ADS_CREATIVE_NOT_ELIGIBLE: "This Instagram post is not eligible for promotion.",
  META_ADS_DRAFT_INVALID: "This campaign draft is missing information Meta requires before it can be created.",
  META_ADS_AI_UNAVAILABLE: "MarketMind AI is temporarily unavailable. Your draft is still saved.",
  STORAGE_ERROR: "Could not read or write Ads Manager data.",
  INTERNAL: "Unexpected server error.",
};

export class MetaAdsError extends Error {
  readonly code: MetaAdsErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: MetaAdsErrorCode,
    message?: string,
    options: { status?: number; details?: unknown; cause?: unknown } = {},
  ) {
    super(message ?? META_ADS_USER_MESSAGES[code], { cause: options.cause });
    this.name = "MetaAdsError";
    this.code = code;
    this.status = options.status ?? DEFAULT_STATUS[code];
    this.details = options.details;
  }
}

export function isMetaAdsError(value: unknown): value is MetaAdsError {
  return value instanceof MetaAdsError;
}

export function toMetaAdsErrorResponse(error: unknown): Response {
  if (isMetaAdsError(error)) {
    return Response.json(
      { error: { code: error.code, message: error.message, details: error.details ?? null } },
      { status: error.status },
    );
  }
  const message = error instanceof Error ? error.message : "Unexpected server error";
  console.error("[meta-ads] unhandled error:", error);
  return Response.json({ error: { code: "INTERNAL", message, details: null } }, { status: 500 });
}
