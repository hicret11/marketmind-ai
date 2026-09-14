import { apiRequest } from "@/lib/http";
import type {
  CalendarEntry,
  MediaDetailResponse,
  MediaListResponse,
  OverviewResponse,
  PatternComparison,
  SocialConfigStatus,
  SocialInsightsResult,
  SyncResponse,
} from "@/types/social";
import type { ContentPlatform, UnifiedContentItem } from "@/types/unified-content";

export { ApiError } from "@/lib/http";

export function fetchSocialConfig(): Promise<SocialConfigStatus> {
  return apiRequest<SocialConfigStatus>("/api/social/config");
}

export function syncNow(): Promise<SyncResponse> {
  return apiRequest<SyncResponse>("/api/social/sync", { method: "POST" });
}

export interface LabelPendingResponse {
  ok: boolean;
  attempted: number;
  labelled: number;
  remaining: number;
}

/** Backfills MarketMind AI creative labels for already-synced posts that don't have one yet. */
export function labelPendingPosts(budget?: number): Promise<LabelPendingResponse> {
  return apiRequest<LabelPendingResponse>("/api/social/label-pending", {
    method: "POST",
    body: JSON.stringify(budget ? { budget } : {}),
  });
}

export function disconnectInstagram(): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>("/api/social/instagram/disconnect", { method: "POST" });
}

export function fetchOverview(): Promise<OverviewResponse> {
  return apiRequest<OverviewResponse>("/api/social/overview");
}

export function fetchMedia(cursor?: string | null): Promise<MediaListResponse> {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return apiRequest<MediaListResponse>(`/api/social/media${qs}`);
}

export function fetchMediaDetail(id: string): Promise<MediaDetailResponse> {
  return apiRequest<MediaDetailResponse>(`/api/social/media/${id}`);
}

export function fetchPatterns(): Promise<{
  ok: boolean;
  totalPosts: number;
  labelledPosts: number;
  comparisons: PatternComparison[];
}> {
  return apiRequest("/api/social/patterns");
}

export function generateInsights(): Promise<{ ok: boolean } & SocialInsightsResult> {
  return apiRequest("/api/social/insights", { method: "POST" });
}

export function fetchCalendar(): Promise<{
  ok: boolean;
  connected: boolean;
  entries: CalendarEntry[];
}> {
  return apiRequest("/api/social/calendar");
}

/** Cross-platform content (Instagram + YouTube + TikTok), for the Content Library/Calendar "All" and per-platform tabs. */
export function fetchUnifiedContent(
  platform?: ContentPlatform,
): Promise<{ ok: boolean; items: UnifiedContentItem[] }> {
  const qs = platform ? `?platform=${platform}` : "";
  return apiRequest(`/api/social/content${qs}`);
}

export function createCalendarEntry(input: {
  status: "draft" | "scheduled";
  date: string;
  caption?: string;
  mediaSourceUrl?: string;
}): Promise<{ ok: boolean; entry: CalendarEntry }> {
  return apiRequest("/api/social/calendar", { method: "POST", body: JSON.stringify(input) });
}
