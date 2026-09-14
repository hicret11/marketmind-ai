/** Self-contained error taxonomy for the Company module (mirrors lib/social/errors.ts). */
export type CompanyErrorCode = "INVALID_REQUEST" | "NOT_FOUND" | "STORAGE_ERROR" | "INTERNAL";

const DEFAULT_STATUS: Record<CompanyErrorCode, number> = {
  INVALID_REQUEST: 400,
  NOT_FOUND: 404,
  STORAGE_ERROR: 500,
  INTERNAL: 500,
};

export class CompanyError extends Error {
  readonly code: CompanyErrorCode;
  readonly status: number;

  constructor(code: CompanyErrorCode, message: string, options: { status?: number; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "CompanyError";
    this.code = code;
    this.status = options.status ?? DEFAULT_STATUS[code];
  }
}

export function toCompanyErrorResponse(error: unknown): Response {
  if (error instanceof CompanyError) {
    return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Unexpected server error";
  console.error("[company] unhandled error:", error);
  return Response.json({ error: { code: "INTERNAL", message } }, { status: 500 });
}
