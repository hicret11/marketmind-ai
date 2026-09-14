import { getConnectedAccount, listVideos } from "@/lib/tiktok/repository";
import type { TiktokPerformanceSummary } from "@/types/analytics";

/**
 * TikTok Performance for the central Analytics module — a compact summary
 * only. Detailed analysis (per-video, creative-label comparisons) lives
 * under Social Analytics; this reads the same repository, never recomputes.
 */
export async function getTiktokPerformance(): Promise<TiktokPerformanceSummary> {
  const account = await getConnectedAccount();
  if (!account) {
    return { connected: false, displayName: null, videosAnalyzed: 0, totalViews: null, avgEngagementRate: null };
  }

  const videos = await listVideos(account.id);
  const views = videos.map((v) => v.viewCount).filter((v): v is number => v != null);
  const totalViews = views.length > 0 ? views.reduce((a, b) => a + b, 0) : null;

  const rates = videos
    .map((v) => {
      if (v.viewCount == null || v.viewCount <= 0 || v.likeCount == null || v.commentCount == null || v.shareCount == null) {
        return null;
      }
      return (v.likeCount + v.commentCount + v.shareCount) / v.viewCount;
    })
    .filter((r): r is number => r != null);
  const avgEngagementRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null;

  return {
    connected: true,
    displayName: account.displayName,
    videosAnalyzed: videos.length,
    totalViews,
    avgEngagementRate,
  };
}
