import { apiRequest } from "@/lib/http";
import type { GenericPatternComparison } from "@/lib/social/pattern-engine";
import type { CreativeInsightsResult } from "@/types/creative-insights";
import type { TiktokConfigStatus, TiktokSyncResponse, TiktokVideoItem } from "@/types/tiktok";

export { ApiError } from "@/lib/http";

export function fetchTiktokStatus(): Promise<TiktokConfigStatus> {
  return apiRequest<TiktokConfigStatus>("/api/social/tiktok/status");
}

export function fetchTiktokVideos(): Promise<{ ok: boolean; videos: TiktokVideoItem[] }> {
  return apiRequest("/api/social/tiktok/videos");
}

export function syncTiktokNow(): Promise<TiktokSyncResponse> {
  return apiRequest<TiktokSyncResponse>("/api/social/tiktok/sync", { method: "POST" });
}

export function disconnectTiktok(): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>("/api/social/tiktok/disconnect", { method: "POST" });
}

export function fetchTiktokPatterns(): Promise<{
  ok: boolean;
  totalVideos: number;
  labelledVideos: number;
  comparisons: GenericPatternComparison[];
}> {
  return apiRequest("/api/social/tiktok/patterns");
}

export function labelPendingTiktokVideos(budget?: number): Promise<{
  ok: boolean;
  attempted: number;
  labelled: number;
  remaining: number;
}> {
  return apiRequest("/api/social/tiktok/label-pending", {
    method: "POST",
    body: JSON.stringify(budget ? { budget } : {}),
  });
}

export function generateTiktokInsights(): Promise<{ ok: boolean } & CreativeInsightsResult> {
  return apiRequest("/api/social/tiktok/insights", { method: "POST" });
}
