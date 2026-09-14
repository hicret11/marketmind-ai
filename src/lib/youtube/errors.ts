/**
 * Self-contained error taxonomy for the YouTube integration. Kept separate
 * from lib/social/errors.ts so this module doesn't reach into Social's
 * internals — same pattern as lib/social/errors.ts itself.
 */
export type YoutubeErrorCode =
  | "INVALID_REQUEST"
  | "YOUTUBE_NOT_CONFIGURED"
  | "YOUTUBE_NOT_CONNECTED"
  | "YOUTUBE_OAUTH_ERROR"
  | "YOUTUBE_TOKEN_EXPIRED"
  | "YOUTUBE_RATE_LIMITED"
  | "YOUTUBE_API_ERROR"
  | "STORAGE_ERROR"
  | "INTERNAL";

const DEFAULT_STATUS: Record<YoutubeErrorCode, number> = {
  INVALID_REQUEST: 400,
  YOUTUBE_NOT_CONFIGURED: 503,
  YOUTUBE_NOT_CONNECTED: 409,
  YOUTUBE_OAUTH_ERROR: 502,
  YOUTUBE_TOKEN_EXPIRED: 401,
  YOUTUBE_RATE_LIMITED: 429,
  YOUTUBE_API_ERROR: 502,
  STORAGE_ERROR: 500,
  INTERNAL: 500,
};

/** Product-friendly copy — no secrets, no raw API payloads. */
export const YOUTUBE_USER_MESSAGES: Record<YoutubeErrorCode, string> = {
  INVALID_REQUEST: "That request wasn't valid.",
  YOUTUBE_NOT_CONFIGURED:
    "YouTube isn't set up yet. Add the Google OAuth credentials to connect a channel.",
  YOUTUBE_NOT_CONNECTED: "Connect YouTube to analyze your real channel and video performance.",
  YOUTUBE_OAUTH_ERROR: "The YouTube connection didn't complete. Please try connecting again.",
  YOUTUBE_TOKEN_EXPIRED: "Your YouTube connection has expired. Reconnect YouTube to keep syncing.",
  YOUTUBE_RATE_LIMITED: "YouTube is rate-limiting requests right now. Please wait and sync again.",
  YOUTUBE_API_ERROR: "YouTube returned an error. Please try again shortly.",
  STORAGE_ERROR: "Could not read or write YouTube data.",
  INTERNAL: "Unexpected server error.",
};

export class YoutubeError extends Error {
  readonly code: YoutubeErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: YoutubeErrorCode,
    message?: string,
    options: { status?: number; details?: unknown; cause?: unknown } = {},
  ) {
    super(message ?? YOUTUBE_USER_MESSAGES[code], { cause: options.cause });
    this.name = "YoutubeError";
    this.code = code;
    this.status = options.status ?? DEFAULT_STATUS[code];
    this.details = options.details;
  }
}

export function isYoutubeError(value: unknown): value is YoutubeError {
  return value instanceof YoutubeError;
}

export function toYoutubeErrorResponse(error: unknown): Response {
  if (isYoutubeError(error)) {
    return Response.json(
      { error: { code: error.code, message: error.message, details: error.details ?? null } },
      { status: error.status },
    );
  }
  const message = error instanceof Error ? error.message : "Unexpected server error";
  console.error("[youtube] unhandled error:", error);
  return Response.json({ error: { code: "INTERNAL", message, details: null } }, { status: 500 });
}
