import { apiRequest } from "@/lib/http";
import type { AdsChatSession, CampaignDraft, CreatedCampaignResult, MetaAdsConfigStatus, MetaCampaignSummary } from "@/types/meta-ads";
import type { CreativeSearchResult } from "./creative-search";

export { ApiError } from "@/lib/http";

export function fetchMetaAdsStatus(): Promise<MetaAdsConfigStatus> {
  return apiRequest<MetaAdsConfigStatus>("/api/ads/meta/status");
}

export function disconnectMetaAds(): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>("/api/ads/meta/disconnect", { method: "POST" });
}

export function selectMetaAdAccount(adAccountId: string): Promise<{ ok: boolean }> {
  return apiRequest("/api/ads/meta/select-account", { method: "POST", body: JSON.stringify({ adAccountId }) });
}

export function fetchMetaCampaigns(): Promise<{ ok: boolean; campaigns: MetaCampaignSummary[] }> {
  return apiRequest("/api/ads/meta/campaigns");
}

export interface ChatTurnResponse {
  ok: boolean;
  available: boolean;
  reason?: string | null;
  session: AdsChatSession;
  creativeCandidates?: CreativeSearchResult[];
}

export function sendAdsChatMessage(message: string, sessionId?: string): Promise<ChatTurnResponse> {
  return apiRequest("/api/ads/meta/chat", { method: "POST", body: JSON.stringify({ message, sessionId }) });
}

export function fetchAdsChatSession(id: string): Promise<{ ok: boolean; session: AdsChatSession }> {
  return apiRequest(`/api/ads/meta/chat/${id}`);
}

export function listAdsChatSessions(): Promise<{ ok: boolean; sessions: AdsChatSession[] }> {
  return apiRequest("/api/ads/meta/chat");
}

export function patchDraft(sessionId: string, patch: Partial<CampaignDraft>): Promise<{ ok: boolean; session: AdsChatSession }> {
  return apiRequest(`/api/ads/meta/chat/${sessionId}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function searchInstagramCreatives(query: string): Promise<{ ok: boolean; results: CreativeSearchResult[] }> {
  return apiRequest(`/api/ads/meta/creative-search?q=${encodeURIComponent(query)}`);
}

export function createPausedCampaignFromSession(sessionId: string): Promise<{ ok: boolean; result: CreatedCampaignResult }> {
  return apiRequest("/api/ads/meta/campaigns/create", { method: "POST", body: JSON.stringify({ sessionId }) });
}
