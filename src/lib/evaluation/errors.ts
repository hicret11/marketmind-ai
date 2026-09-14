/** Self-contained error taxonomy for the Evaluation Lab (mirrors lib/social/errors.ts). */
export type EvalErrorCode =
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "MODEL_NOT_CONFIGURED"
  | "MODEL_UNAVAILABLE"
  | "PROVIDER_ERROR"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "INVALID_OUTPUT"
  | "STORAGE_ERROR"
  | "INTERNAL";

const DEFAULT_STATUS: Record<EvalErrorCode, number> = {
  INVALID_REQUEST: 400,
  NOT_FOUND: 404,
  MODEL_NOT_CONFIGURED: 503,
  MODEL_UNAVAILABLE: 503,
  PROVIDER_ERROR: 502,
  RATE_LIMITED: 429,
  TIMEOUT: 504,
  INVALID_OUTPUT: 502,
  STORAGE_ERROR: 500,
  INTERNAL: 500,
};

export class EvalError extends Error {
  readonly code: EvalErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: EvalErrorCode,
    message: string,
    options: { status?: number; details?: unknown; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "EvalError";
    this.code = code;
    this.status = options.status ?? DEFAULT_STATUS[code];
    this.details = options.details;
  }
}

export function isEvalError(value: unknown): value is EvalError {
  return value instanceof EvalError;
}

export function toEvalErrorResponse(error: unknown): Response {
  if (isEvalError(error)) {
    return Response.json(
      { error: { code: error.code, message: error.message, details: error.details ?? null } },
      { status: error.status },
    );
  }
  const message = error instanceof Error ? error.message : "Unexpected server error";
  console.error("[evaluation] unhandled error:", error);
  return Response.json({ error: { code: "INTERNAL", message, details: null } }, { status: 500 });
}
