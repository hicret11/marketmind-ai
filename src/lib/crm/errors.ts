/** Self-contained error taxonomy for the CRM module (mirrors lib/social/errors.ts). */
export type CrmErrorCode = "INVALID_REQUEST" | "NOT_FOUND" | "ALREADY_EXISTS" | "STORAGE_ERROR" | "INTERNAL";

const DEFAULT_STATUS: Record<CrmErrorCode, number> = {
  INVALID_REQUEST: 400,
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  STORAGE_ERROR: 500,
  INTERNAL: 500,
};

export class CrmError extends Error {
  readonly code: CrmErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: CrmErrorCode,
    message: string,
    options: { status?: number; details?: unknown; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "CrmError";
    this.code = code;
    this.status = options.status ?? DEFAULT_STATUS[code];
    this.details = options.details;
  }
}

export function toCrmErrorResponse(error: unknown): Response {
  if (error instanceof CrmError) {
    return Response.json(
      { error: { code: error.code, message: error.message, details: error.details ?? null } },
      { status: error.status },
    );
  }
  const message = error instanceof Error ? error.message : "Unexpected server error";
  console.error("[crm] unhandled error:", error);
  return Response.json({ error: { code: "INTERNAL", message, details: null } }, { status: 500 });
}
