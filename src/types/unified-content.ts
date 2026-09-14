/**
 * Read-only, cross-platform view over Instagram/YouTube/TikTok content, used
 * ONLY by the Content Library and Content Calendar pages' "All" and
 * per-platform tabs. Each platform's own repository stays the single source
 * of truth and its own calculations are untouched — this is a normalization
 * layer built purely from already-stored real fields, never a recompute.
 */

export type ContentPlatform = "instagram" | "youtube" | "tiktok";

export interface UnifiedContentItem {
  /** Stable, unique across all platforms: `${platform}:${nativeId}`. */
  id: string;
  platform: ContentPlatform;
  nativeId: string;
  title: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  /** ISO timestamp of the real publish date, or null if unknown. */
  publishedAt: string | null;
  /** e.g. "Reel", "Post", "Story", "Shorts", "Long-form", "Video". */
  contentType: string;
  metrics: {
    views: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saves: number | null;
  };
}
