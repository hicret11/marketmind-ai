/**
 * Self-contained error taxonomy for the Social Media integration. Kept
 * separate from lib/opportunity/errors.ts so the Social module doesn't reach
 * into Opportunity Discovery's internals.
 */
export type SocialErrorCode =
  | "INVALID_REQUEST"
  | "SOCIAL_NOT_CONFIGURED"
  | "SOCIAL_NOT_CONNECTED"
  | "SOCIAL_OAUTH_ERROR"
  | "SOCIAL_ACCOUNT_TYPE"
  | "SOCIAL_TOKEN_EXPIRED"
  | "SOCIAL_RATE_LIMITED"
  | "SOCIAL_API_ERROR"
  | "SOCIAL_PUBLISH_NOT_PERMITTED"
  | "SOCIAL_AI_UNAVAILABLE"
  | "STORAGE_ERROR"
  | "INTERNAL";

const DEFAULT_STATUS: Record<SocialErrorCode, number> = {
  INVALID_REQUEST: 400,
  SOCIAL_NOT_CONFIGURED: 503,
  SOCIAL_NOT_CONNECTED: 409,
  SOCIAL_OAUTH_ERROR: 502,
  SOCIAL_ACCOUNT_TYPE: 422,
  SOCIAL_TOKEN_EXPIRED: 401,
  SOCIAL_RATE_LIMITED: 429,
  SOCIAL_API_ERROR: 502,
  SOCIAL_PUBLISH_NOT_PERMITTED: 403,
  SOCIAL_AI_UNAVAILABLE: 503,
  STORAGE_ERROR: 500,
  INTERNAL: 500,
};

/** Product-friendly copy — no secrets, no raw API payloads. */
export const SOCIAL_USER_MESSAGES: Record<SocialErrorCode, string> = {
  INVALID_REQUEST: "That request wasn't valid.",
  SOCIAL_NOT_CONFIGURED:
    "Instagram isn't set up yet. Add the Instagram app credentials to connect an account.",
  SOCIAL_NOT_CONNECTED:
    "Connect Instagram to analyze your real content and performance.",
  SOCIAL_OAUTH_ERROR: "The Instagram connection didn't complete. Please try connecting again.",
  SOCIAL_ACCOUNT_TYPE:
    "MarketMind Insights requires an Instagram Professional account (Business or Creator).",
  SOCIAL_TOKEN_EXPIRED:
    "Your Instagram connection has expired. Reconnect Instagram to keep syncing.",
  SOCIAL_RATE_LIMITED:
    "Instagram is rate-limiting requests right now. Please wait a little and sync again.",
  SOCIAL_API_ERROR: "Instagram returned an error. Please try again shortly.",
  SOCIAL_PUBLISH_NOT_PERMITTED:
    "Publishing requires Instagram content publishing permission, which isn't granted for this app yet.",
  SOCIAL_AI_UNAVAILABLE:
    "MarketMind AI is temporarily unavailable. Your synced Instagram data is still accessible.",
  STORAGE_ERROR: "Could not read or write social data.",
  INTERNAL: "Unexpected server error.",
};

export class SocialError extends Error {
  readonly code: SocialErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: SocialErrorCode,
    message?: string,
    options: { status?: number; details?: unknown; cause?: unknown } = {},
  ) {
    super(message ?? SOCIAL_USER_MESSAGES[code], { cause: options.cause });
    this.name = "SocialError";
    this.code = code;
    this.status = options.status ?? DEFAULT_STATUS[code];
    this.details = options.details;
  }
}

export function isSocialError(value: unknown): value is SocialError {
  return value instanceof SocialError;
}

export function toSocialErrorResponse(error: unknown): Response {
  if (isSocialError(error)) {
    return Response.json(
      { error: { code: error.code, message: error.message, details: error.details ?? null } },
      { status: error.status },
    );
  }
  const message = error instanceof Error ? error.message : "Unexpected server error";
  console.error("[social] unhandled error:", error);
  return Response.json(
    { error: { code: "INTERNAL", message, details: null } },
    { status: 500 },
  );
}
