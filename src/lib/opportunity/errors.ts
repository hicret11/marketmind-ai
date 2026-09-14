export type OpportunityErrorCode =
  | "INVALID_REQUEST"
  | "DISCOVERY_NOT_CONFIGURED"
  | "DISCOVERY_PROVIDER_ERROR"
  | "AI_NOT_CONFIGURED"
  | "AI_MODEL_UNAVAILABLE"
  | "AI_AUTH_ERROR"
  | "AI_RATE_LIMITED"
  | "AI_TIMEOUT"
  | "AI_INVALID_OUTPUT"
  | "AI_ERROR"
  | "CRM_ERROR"
  | "STORAGE_ERROR"
  | "INTERNAL";

const DEFAULT_STATUS: Record<OpportunityErrorCode, number> = {
  INVALID_REQUEST: 400,
  DISCOVERY_NOT_CONFIGURED: 503,
  DISCOVERY_PROVIDER_ERROR: 502,
  AI_NOT_CONFIGURED: 503,
  AI_MODEL_UNAVAILABLE: 503,
  AI_AUTH_ERROR: 502,
  AI_RATE_LIMITED: 429,
  AI_TIMEOUT: 504,
  AI_INVALID_OUTPUT: 502,
  AI_ERROR: 502,
  CRM_ERROR: 500,
  STORAGE_ERROR: 500,
  INTERNAL: 500,
};

/** Product-friendly copy — never names a vendor or an env var (see ConfigNotice for the dev-only hint). */
export const AI_USER_MESSAGES: Record<
  Extract<
    OpportunityErrorCode,
    | "AI_NOT_CONFIGURED"
    | "AI_MODEL_UNAVAILABLE"
    | "AI_AUTH_ERROR"
    | "AI_RATE_LIMITED"
    | "AI_TIMEOUT"
    | "AI_INVALID_OUTPUT"
  >,
  string
> = {
  AI_NOT_CONFIGURED:
    "AI Opportunity Intelligence is not connected. Connect an AI provider in Settings to generate partnership analysis.",
  AI_MODEL_UNAVAILABLE:
    "AI Opportunity Intelligence could not use the configured model. Please check the AI provider configuration.",
  AI_AUTH_ERROR: "AI Opportunity Intelligence could not authenticate.",
  AI_RATE_LIMITED:
    "AI analysis is temporarily unavailable due to provider limits. Please try again later.",
  AI_TIMEOUT: "AI analysis took too long. Please retry.",
  AI_INVALID_OUTPUT:
    "AI analysis could not be validated. No generated recommendation was saved.",
};

export class OpportunityError extends Error {
  readonly code: OpportunityErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: OpportunityErrorCode,
    message: string,
    options: { status?: number; details?: unknown; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "OpportunityError";
    this.code = code;
    this.status = options.status ?? DEFAULT_STATUS[code];
    this.details = options.details;
  }
}

export function isOpportunityError(value: unknown): value is OpportunityError {
  return value instanceof OpportunityError;
}

/** Serializes any thrown value into a JSON Response for a route handler. */
export function toErrorResponse(error: unknown): Response {
  if (isOpportunityError(error)) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        },
      },
      { status: error.status },
    );
  }

  const message =
    error instanceof Error ? error.message : "Unexpected server error";
  console.error("[opportunity] unhandled error:", error);
  return Response.json(
    { error: { code: "INTERNAL", message, details: null } },
    { status: 500 },
  );
}
