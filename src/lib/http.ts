/**
 * Small shared fetch helper for MarketMind's own JSON API routes (Notes,
 * Handbook, Chat). Deliberately not shared with Opportunity Discovery's
 * `lib/opportunity/client.ts` — that module stays untouched.
 */
export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("Network request failed.", "NETWORK", 0);
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (payload as { error?: { message?: string; code?: string } })?.error;
    throw new ApiError(
      err?.message ?? `Request failed (${res.status}).`,
      err?.code ?? "UNKNOWN",
      res.status,
    );
  }
  return payload as T;
}
