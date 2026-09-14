import { mediaTypeLabel } from "@/components/social/social-ui";
import { getConnectedAccount, latestMediaInsightsMap, listMedia } from "./repository";
import { getConnectedChannel, listVideos as listYoutubeVideos } from "@/lib/youtube/repository";
import { getConnectedAccount as getTiktokAccount, listVideos as listTiktokVideos } from "@/lib/tiktok/repository";
import type { ContentPlatform, UnifiedContentItem } from "@/types/unified-content";

/**
 * Cross-platform content list for the Content Library / Content Calendar
 * "All" and per-platform tabs. Reads each platform's own repository as-is —
 * no recalculation, no new fetching. A platform with nothing connected
 * simply contributes zero items (never a placeholder row).
 */
export async function listUnifiedContent(
  platforms: ContentPlatform[] = ["instagram", "youtube", "tiktok"],
): Promise<UnifiedContentItem[]> {
  const items: UnifiedContentItem[] = [];

  if (platforms.includes("instagram")) items.push(...(await instagramItems()));
  if (platforms.includes("youtube")) items.push(...(await youtubeItems()));
  if (platforms.includes("tiktok")) items.push(...(await tiktokItems()));

  return items.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

async function instagramItems(): Promise<UnifiedContentItem[]> {
  const account = await getConnectedAccount();
  if (!account) return [];
  const media = await listMedia(account.id);
  const insights = await latestMediaInsightsMap(account.id);

  return media.map((m) => {
    const snap = insights.get(m.igMediaId);
    const metrics = snap?.metrics ?? {};
    return {
      id: `instagram:${m.igMediaId}`,
      platform: "instagram" as const,
      nativeId: m.igMediaId,
      title: m.caption,
      thumbnailUrl: m.thumbnailUrl ?? (m.mediaType === "IMAGE" ? m.mediaUrl : null),
      permalink: m.permalink,
      publishedAt: m.timestamp,
      contentType: mediaTypeLabel(m.mediaType, m.mediaProductType),
      metrics: {
        views: numOrNull(metrics.views),
        likes: m.likeCount,
        comments: m.commentsCount,
        shares: numOrNull(metrics.shares),
        saves: numOrNull(metrics.saved),
      },
    };
  });
}

async function youtubeItems(): Promise<UnifiedContentItem[]> {
  const channel = await getConnectedChannel();
  if (!channel) return [];
  const videos = await listYoutubeVideos(channel.id);

  return videos.map((v) => ({
    id: `youtube:${v.videoId}`,
    platform: "youtube" as const,
    nativeId: v.videoId,
    title: v.title,
    thumbnailUrl: v.thumbnailUrl,
    permalink: `https://www.youtube.com/watch?v=${v.videoId}`,
    publishedAt: v.publishedAt,
    contentType: v.format === "shorts" ? "Shorts" : v.format === "long_form" ? "Long-form" : "Video",
    metrics: {
      views: v.viewCount,
      likes: v.likeCount,
      comments: v.commentCount,
      shares: null,
      saves: null,
    },
  }));
}

async function tiktokItems(): Promise<UnifiedContentItem[]> {
  const account = await getTiktokAccount();
  if (!account) return [];
  const videos = await listTiktokVideos(account.id);

  return videos.map((v) => ({
    id: `tiktok:${v.videoId}`,
    platform: "tiktok" as const,
    nativeId: v.videoId,
    title: v.title ?? v.videoDescription,
    thumbnailUrl: v.coverImageUrl,
    permalink: v.shareUrl,
    publishedAt: v.createTime,
    contentType: "Video",
    metrics: {
      views: v.viewCount,
      likes: v.likeCount,
      comments: v.commentCount,
      shares: v.shareCount,
      saves: null,
    },
  }));
}

function numOrNull(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
