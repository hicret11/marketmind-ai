import { apiRequest } from "@/lib/http";
import type { GenericPatternComparison } from "@/lib/social/pattern-engine";
import type { CreativeInsightsResult } from "@/types/creative-insights";
import type { YoutubeConfigStatus, YoutubeSyncResponse, YoutubeVideoItem } from "@/types/youtube";

export { ApiError } from "@/lib/http";

export function fetchYoutubeConfig(): Promise<YoutubeConfigStatus> {
  return apiRequest<YoutubeConfigStatus>("/api/social/youtube/status");
}

export function fetchYoutubeVideos(): Promise<{ ok: boolean; videos: YoutubeVideoItem[] }> {
  return apiRequest("/api/social/youtube/videos");
}

export function syncYoutubeNow(): Promise<YoutubeSyncResponse> {
  return apiRequest<YoutubeSyncResponse>("/api/social/youtube/sync", { method: "POST" });
}

export function disconnectYoutube(): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>("/api/social/youtube/disconnect", { method: "POST" });
}

export function fetchYoutubePatterns(format?: "shorts" | "long_form"): Promise<{
  ok: boolean;
  totalVideos: number;
  labelledVideos: number;
  shortsCount: number;
  longFormCount: number;
  comparisons: GenericPatternComparison[];
}> {
  const qs = format ? `?format=${format}` : "";
  return apiRequest(`/api/social/youtube/patterns${qs}`);
}

export function labelPendingYoutubeVideos(budget?: number): Promise<{
  ok: boolean;
  attempted: number;
  labelled: number;
  remaining: number;
}> {
  return apiRequest("/api/social/youtube/label-pending", {
    method: "POST",
    body: JSON.stringify(budget ? { budget } : {}),
  });
}

export function generateYoutubeInsights(
  format?: "shorts" | "long_form",
): Promise<{ ok: boolean } & CreativeInsightsResult> {
  const qs = format ? `?format=${format}` : "";
  return apiRequest(`/api/social/youtube/insights${qs}`, { method: "POST" });
}
