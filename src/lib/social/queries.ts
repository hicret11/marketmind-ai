import { computePerformance } from "./performance";
import {
  getConnectedAccount,
  getMediaById,
  latestMediaInsight,
  latestMediaInsightsMap,
  listMedia,
} from "./repository";
import type {
  PerformanceMetrics,
  SocialMediaInsightSnapshot,
  SocialMediaItem,
} from "@/types/social";

export interface MediaWithPerformance {
  media: SocialMediaItem;
  performance: PerformanceMetrics | null;
  latestInsight: SocialMediaInsightSnapshot | null;
}

/** Content-library rows: media + latest insight snapshot + deterministic rates. */
export async function listMediaWithPerformance(opts: {
  limit?: number;
  cursor?: string | null;
}): Promise<{ items: MediaWithPerformance[]; nextCursor: string | null }> {
  const account = await getConnectedAccount();
  if (!account) return { items: [], nextCursor: null };

  const all = await listMedia(account.id);
  const insights = await latestMediaInsightsMap(account.id);

  const limit = Math.min(60, Math.max(1, opts.limit ?? 24));
  const start = opts.cursor ? Math.max(0, parseInt(opts.cursor, 10) || 0) : 0;
  const slice = all.slice(start, start + limit);

  const items = slice.map((media) => {
    const snap = insights.get(media.igMediaId) ?? null;
    return {
      media,
      latestInsight: snap,
      performance: snap ? computePerformance(media.igMediaId, snap.metrics) : null,
    };
  });

  const nextCursor = start + limit < all.length ? String(start + limit) : null;
  return { items, nextCursor };
}

export async function getMediaDetail(id: string): Promise<MediaWithPerformance | null> {
  const media = await getMediaById(id);
  if (!media) return null;
  const snap = await latestMediaInsight(media.accountId, media.igMediaId);
  return {
    media,
    latestInsight: snap,
    performance: snap ? computePerformance(media.igMediaId, snap.metrics) : null,
  };
}
