import { env } from "@/lib/opportunity/env";

/**
 * YouTube integration configuration — all from environment variables.
 *
 * Google OAuth2, "installed"/"web" app flow, fully server-side. Read-only:
 * MarketMind never uploads, edits or deletes anything on YouTube.
 *
 * With no credentials the feature reports "not configured"; with credentials
 * but no connected channel it reports "not connected". It never shows sample
 * metrics.
 */

/** Read-only access to the channel's own videos/stats (YouTube Data API v3). */
export const YOUTUBE_DATA_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
/**
 * Read-only access to the channel's own YouTube Analytics reports — used
 * ONLY to read the real `creatorContentType` dimension (Shorts vs
 * Video-on-demand vs Live), never watch time or any other metric today.
 */
export const YOUTUBE_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/yt-analytics.readonly";
/** Requested together at connect time (space-separated per the OAuth spec). */
export const YOUTUBE_SCOPES = [YOUTUBE_DATA_SCOPE, YOUTUBE_ANALYTICS_SCOPE];

export function youtubeClientId(): string {
  return env("YOUTUBE_CLIENT_ID");
}

export function youtubeClientSecret(): string {
  return env("YOUTUBE_CLIENT_SECRET");
}

export function youtubeRedirectUri(): string {
  const explicit = env("YOUTUBE_REDIRECT_URI");
  if (explicit) return explicit;
  const base = env("APP_BASE_URL") || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/social/youtube/callback`;
}

export function isYoutubeAppConfigured(): boolean {
  return Boolean(youtubeClientId() && youtubeClientSecret() && youtubeRedirectUri());
}

export function youtubeMissingConfig(): string[] {
  const missing: string[] = [];
  if (!youtubeClientId()) missing.push("YOUTUBE_CLIENT_ID");
  if (!youtubeClientSecret()) missing.push("YOUTUBE_CLIENT_SECRET");
  if (!env("YOUTUBE_REDIRECT_URI") && !env("APP_BASE_URL")) {
    missing.push("YOUTUBE_REDIRECT_URI (or APP_BASE_URL)");
  }
  return missing;
}

/** Bound on how many uploaded videos MarketMind pulls per sync (API-cost control). */
export const YOUTUBE_MAX_VIDEOS = 100;

/**
 * Fallback duration heuristic — used ONLY when YouTube's own real
 * `creatorContentType` isn't available for a video (see lib/youtube/sync.ts).
 * Never guessed aggressively:
 *  - At or under this duration alone is enough to call it a Short (matches
 *    YouTube's original, strict Shorts definition — very low false-positive
 *    rate).
 *  - Above that, up to YOUTUBE_SHORTS_MAX_SECONDS_WITH_TAG, is only called a
 *    Short when the title/description also explicitly self-tags "#shorts" —
 *    real creator-provided metadata, not a guess.
 *  - Anything else (including unknown duration with no #shorts tag) is
 *    Long-form. Aspect ratio is never used as a signal here.
 */
export const YOUTUBE_SHORTS_MAX_SECONDS = 60;
export const YOUTUBE_SHORTS_MAX_SECONDS_WITH_TAG = 180;
