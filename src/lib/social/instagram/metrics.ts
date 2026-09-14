import type {
  InstagramMediaProductType,
  InstagramMediaType,
} from "@/types/social";

/**
 * Media-type-aware metric configuration.
 *
 * The Instagram API only supports certain insight metrics per media type, and
 * the set changes over time. We request a conservative candidate list and the
 * client removes anything the API reports as unsupported (never guessing, never
 * converting "unsupported" to 0).
 */

const FEED_MEDIA_METRICS = [
  "reach",
  "likes",
  "comments",
  "saved",
  "shares",
  "total_interactions",
  "views",
  "profile_visits",
  "follows",
];

const REELS_MEDIA_METRICS = [
  "reach",
  "likes",
  "comments",
  "saved",
  "shares",
  "total_interactions",
  "views",
  "ig_reels_avg_watch_time",
  "ig_reels_video_view_total_time",
];

const STORY_MEDIA_METRICS = [
  "reach",
  "views",
  "replies",
  "shares",
  "total_interactions",
  "profile_visits",
  "follows",
  "navigation",
];

/** Candidate insight metrics for a given media item. */
export function metricsForMedia(
  mediaType: InstagramMediaType,
  productType: InstagramMediaProductType,
): string[] {
  if (productType === "REELS" || (mediaType === "VIDEO" && productType !== "STORY")) {
    return [...REELS_MEDIA_METRICS];
  }
  if (productType === "STORY") return [...STORY_MEDIA_METRICS];
  return [...FEED_MEDIA_METRICS];
}

/** Candidate account-level metrics (period=day, metric_type=total_value). */
export const ACCOUNT_METRICS = [
  "reach",
  "views",
  "total_interactions",
  "accounts_engaged",
  "profile_views",
  "profile_links_taps",
  "follower_count",
];

/**
 * Instagram's "unsupported metric" 400 error names the offending metrics in
 * plain text. Pull them out so we can retry with a valid subset.
 */
export function parseUnsupportedMetrics(errorMessage: string): string[] {
  const found = new Set<string>();
  // e.g. "(#100) The following metrics should not be queried together: ..."
  // e.g. "metric[0] must be one of the following values: ..."
  // e.g. "The Instagram account ... does not support the metric(s): saved, shares"
  const m = errorMessage.match(/metric\(s\):?\s*([a-z_,\s]+)/i);
  if (m) {
    m[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => found.add(s));
  }
  // Fallback: any known metric name explicitly quoted in the message.
  for (const known of [
    ...FEED_MEDIA_METRICS,
    ...REELS_MEDIA_METRICS,
    ...STORY_MEDIA_METRICS,
    ...ACCOUNT_METRICS,
  ]) {
    if (new RegExp(`\\b${known}\\b`).test(errorMessage) && /support|invalid|not.*allow/i.test(errorMessage)) {
      found.add(known);
    }
  }
  return Array.from(found);
}
