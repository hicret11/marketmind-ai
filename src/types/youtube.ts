import type { CreativeLabels } from "./social";

/**
 * YouTube Channel Intelligence types.
 *
 * Real integration via Google OAuth2 + the YouTube Data API v3 (read-only:
 * `youtube.readonly`). Mirrors the Instagram module's hard rules:
 *  - Access/refresh tokens live in a SEPARATE store and never appear in
 *    client-facing shapes.
 *  - An unavailable metric is `null` ("Not available") — never 0 or invented.
 *
 * Watch time (minutes) is intentionally NOT collected here: the Data API v3
 * doesn't expose it — that requires the separate YouTube Analytics API
 * `reports.query`, which is not wired up yet. `watchTimeMinutes` stays
 * `null` everywhere until that's built; it is never estimated from views.
 *
 * Content-type classification (Shorts vs Long-form) prefers YouTube's own
 * real `creatorContentType` dimension from the YouTube Analytics API
 * (`yt-analytics.readonly` scope) — the same signal YouTube Studio itself
 * uses. When that isn't available for a video (older sync, scope not yet
 * re-granted, or the report has no row for it), a conservative duration +
 * explicit "#shorts" self-tag heuristic is used instead. Aspect ratio is
 * never used as the primary or sole signal, and a video is never guessed
 * into "shorts" from duration alone above 60s without corroboration.
 */

/** MarketMind's own classification — always one of these two canonical values. */
export type YoutubeVideoFormat = "shorts" | "long_form";

/** Which real signal produced a video's `format` classification. */
export type YoutubeFormatSource = "creator_content_type" | "duration_heuristic";

export type YoutubeTokenStatus = "active" | "expired" | "revoked";

/** Public, client-safe channel summary. Never carries a token. */
export interface YoutubeChannel {
  id: string;
  /** YouTube's own channel id (e.g. "UCxxxxxxxx"). */
  channelId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  subscriberCount: number | null;
  /** Lifetime channel view count, as reported by YouTube. */
  viewCount: number | null;
  videoCount: number | null;
  connectedAt: string;
  lastSyncAt: string | null;
  tokenStatus: YoutubeTokenStatus;
}

/** One uploaded video, exactly as returned (missing fields => null). */
export interface YoutubeVideoItem {
  id: string;
  channelId: string;
  videoId: string;
  title: string;
  description: string | null;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  /** "shorts" | "long_form" — see the module doc comment for how this is derived. */
  format: YoutubeVideoFormat;
  /** Which real signal produced `format` for this video. */
  formatSource: YoutubeFormatSource;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  /** Not available via the Data API v3 — see module doc comment. Always null today. */
  watchTimeMinutes: null;
  syncedAt: string;
  /** MarketMind AI creative labels — attached later, never from YouTube. */
  creative: CreativeLabels | null;
  creativeAnalyzedAt: string | null;
}

export type YoutubeSyncStatus = "running" | "success" | "partial" | "error";

export interface YoutubeSyncRun {
  id: string;
  channelId: string;
  startedAt: string;
  finishedAt: string | null;
  status: YoutubeSyncStatus;
  videosSynced: number;
  warnings: string[];
  error: string | null;
}

export interface YoutubeConfigStatus {
  appConfigured: boolean;
  missing: string[];
  redirectUri: string | null;
  requestedScopes: string[];
  connected: boolean;
  channel: YoutubeChannel | null;
  lastSync: YoutubeSyncRun | null;
}

export interface YoutubeSyncResponse {
  ok: boolean;
  run: YoutubeSyncRun;
}
