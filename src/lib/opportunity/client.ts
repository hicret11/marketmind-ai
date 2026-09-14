import type {
  AnalyzeResponse,
  DiscoverResponse,
  DiscoveryQuery,
  EvidenceSnippet,
  ListLeadsResponse,
  OpportunityAnalysis,
  OpportunityConfigStatus,
  OutreachResponse,
  SaveLeadResponse,
  VerifiedBusiness,
} from "@/types/opportunity";

/** Browser-side helpers for the Opportunity Discovery API routes. */

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

async function request<T>(url: string, init?: RequestInit): Promise<T> {
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
    const err = (payload as { error?: { message?: string; code?: string } })
      ?.error;
    throw new ApiError(
      err?.message ?? `Request failed (${res.status}).`,
      err?.code ?? "UNKNOWN",
      res.status,
    );
  }
  return payload as T;
}

export function fetchOpportunityConfig(): Promise<OpportunityConfigStatus> {
  return request<OpportunityConfigStatus>("/api/opportunities/config");
}

export function runDiscovery(
  query: DiscoveryQuery,
): Promise<DiscoverResponse> {
  return request<DiscoverResponse>("/api/opportunities/discover", {
    method: "POST",
    body: JSON.stringify(query),
  });
}

export function runAnalysis(
  business: VerifiedBusiness,
  analyzeWebsites: boolean,
): Promise<AnalyzeResponse> {
  return request<AnalyzeResponse>("/api/opportunities/analyze", {
    method: "POST",
    body: JSON.stringify({ business, analyzeWebsites }),
  });
}

export function saveLead(body: unknown): Promise<SaveLeadResponse> {
  return request<SaveLeadResponse>("/api/crm/leads", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listLeads(): Promise<ListLeadsResponse> {
  return request<ListLeadsResponse>("/api/crm/leads");
}

export function runOutreach(
  business: VerifiedBusiness,
  analysis: OpportunityAnalysis,
  evidence: EvidenceSnippet[],
): Promise<OutreachResponse> {
  return request<OutreachResponse>("/api/opportunities/outreach", {
    method: "POST",
    body: JSON.stringify({ business, analysis, evidence }),
  });
}
