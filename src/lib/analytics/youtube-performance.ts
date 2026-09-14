import { getConnectedChannel, listVideos } from "@/lib/youtube/repository";
import type { YoutubePerformanceSummary } from "@/types/analytics";

/**
 * YouTube Performance for the Analytics module. Reads the YouTube module's
 * own repository as-is — no new fetching or scoring, only aggregation. Lives
 * under lib/analytics/ (not lib/youtube/) since — unlike CRM/Evaluation —
 * this read-model has no other consumer yet.
 *
 * Note: no date-range filtering here. Stored videos only carry their
 * `publishedAt` (when the video went live), not a history of view counts over
 * time — so a range filter could only include/exclude whole videos by
 * publish date, not show real "views in the last 7 days". Rather than
 * pretend that's the same thing, this always reports all synced videos.
 */
export async function getYoutubePerformance(): Promise<YoutubePerformanceSummary> {
  const channel = await getConnectedChannel();
  if (!channel) {
    return {
      connected: false,
      channelTitle: null,
      subscriberCount: null,
      lifetimeViews: null,
      videosAnalyzed: 0,
      avgViewsPerVideo: null,
      avgLikesPerVideo: null,
      avgCommentsPerVideo: null,
      watchTimeAvailable: false,
    };
  }

  const videos = await listVideos(channel.id);
  const views = videos.map((v) => v.viewCount).filter((v): v is number => v != null);
  const likes = videos.map((v) => v.likeCount).filter((v): v is number => v != null);
  const comments = videos.map((v) => v.commentCount).filter((v): v is number => v != null);

  return {
    connected: true,
    channelTitle: channel.title,
    subscriberCount: channel.subscriberCount,
    lifetimeViews: channel.viewCount,
    videosAnalyzed: videos.length,
    avgViewsPerVideo: average(views),
    avgLikesPerVideo: average(likes),
    avgCommentsPerVideo: average(comments),
    watchTimeAvailable: false,
  };
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
