/**
 * Self-contained error taxonomy for the TikTok integration. Kept separate
 * from lib/social/errors.ts and lib/youtube/errors.ts — same pattern.
 */
export type TiktokErrorCode =
  | "INVALID_REQUEST"
  | "TIKTOK_NOT_CONFIGURED"
  | "TIKTOK_NOT_CONNECTED"
  | "TIKTOK_OAUTH_ERROR"
  | "TIKTOK_TOKEN_EXPIRED"
  | "TIKTOK_RATE_LIMITED"
  | "TIKTOK_API_ERROR"
  | "STORAGE_ERROR"
  | "INTERNAL";

const DEFAULT_STATUS: Record<TiktokErrorCode, number> = {
  INVALID_REQUEST: 400,
  TIKTOK_NOT_CONFIGURED: 503,
  TIKTOK_NOT_CONNECTED: 409,
  TIKTOK_OAUTH_ERROR: 502,
  TIKTOK_TOKEN_EXPIRED: 401,
  TIKTOK_RATE_LIMITED: 429,
  TIKTOK_API_ERROR: 502,
  STORAGE_ERROR: 500,
  INTERNAL: 500,
};

/** Product-friendly copy — no secrets, no raw API payloads. */
export const TIKTOK_USER_MESSAGES: Record<TiktokErrorCode, string> = {
  INVALID_REQUEST: "That request wasn't valid.",
  TIKTOK_NOT_CONFIGURED:
    "TikTok isn't set up yet. Add the TikTok Login Kit credentials to connect an account.",
  TIKTOK_NOT_CONNECTED: "Connect TikTok to analyze your real video performance.",
  TIKTOK_OAUTH_ERROR: "The TikTok connection didn't complete. Please try connecting again.",
  TIKTOK_TOKEN_EXPIRED: "Your TikTok connection has expired. Reconnect TikTok to keep syncing.",
  TIKTOK_RATE_LIMITED: "TikTok is rate-limiting requests right now. Please wait and sync again.",
  TIKTOK_API_ERROR: "TikTok returned an error. Please try again shortly.",
  STORAGE_ERROR: "Could not read or write TikTok data.",
  INTERNAL: "Unexpected server error.",
};

export class TiktokError extends Error {
  readonly code: TiktokErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: TiktokErrorCode,
    message?: string,
    options: { status?: number; details?: unknown; cause?: unknown } = {},
  ) {
    super(message ?? TIKTOK_USER_MESSAGES[code], { cause: options.cause });
    this.name = "TiktokError";
    this.code = code;
    this.status = options.status ?? DEFAULT_STATUS[code];
    this.details = options.details;
  }
}

export function isTiktokError(value: unknown): value is TiktokError {
  return value instanceof TiktokError;
}

export function toTiktokErrorResponse(error: unknown): Response {
  if (isTiktokError(error)) {
    return Response.json(
      { error: { code: error.code, message: error.message, details: error.details ?? null } },
      { status: error.status },
    );
  }
  const message = error instanceof Error ? error.message : "Unexpected server error";
  console.error("[tiktok] unhandled error:", error);
  return Response.json({ error: { code: "INTERNAL", message, details: null } }, { status: 500 });
}
