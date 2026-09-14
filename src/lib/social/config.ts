import { env } from "@/lib/opportunity/env";

/**
 * Instagram integration configuration — all from environment variables.
 *
 * Login approach: "Instagram API with Instagram Login" (direct
 * graph.instagram.com, not Facebook Login). OAuth is fully server-side.
 *
 * Nothing here fabricates data — with no app credentials the feature reports
 * "not configured"; with credentials but no connected account it reports
 * "not connected". It never shows sample metrics.
 */

export const DEFAULT_GRAPH_VERSION = "v23.0";

/** Permissions MarketMind requests at OAuth time (organic social intelligence). */
export const REQUESTED_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_insights",
];

/**
 * Publishing scope — architecture is prepared for it, but it needs Meta App
 * Review, so it's only requested when explicitly enabled.
 */
export const PUBLISH_SCOPE = "instagram_business_content_publish";

export function instagramGraphVersion(): string {
  return env("INSTAGRAM_GRAPH_VERSION") || DEFAULT_GRAPH_VERSION;
}

export function instagramAppId(): string {
  return env("INSTAGRAM_APP_ID");
}

export function instagramAppSecret(): string {
  return env("INSTAGRAM_APP_SECRET");
}

export function instagramRedirectUri(): string {
  const explicit = env("INSTAGRAM_REDIRECT_URI");
  if (explicit) return explicit;
  const base = env("APP_BASE_URL") || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/social/instagram/callback`;
}

export function isInstagramAppConfigured(): boolean {
  return Boolean(instagramAppId() && instagramAppSecret() && instagramRedirectUri());
}

export function instagramMissingConfig(): string[] {
  const missing: string[] = [];
  if (!instagramAppId()) missing.push("INSTAGRAM_APP_ID");
  if (!instagramAppSecret()) missing.push("INSTAGRAM_APP_SECRET");
  if (!env("INSTAGRAM_REDIRECT_URI") && !env("APP_BASE_URL")) {
    missing.push("INSTAGRAM_REDIRECT_URI (or APP_BASE_URL)");
  }
  return missing;
}

/** Publishing is only "on" if the operator opts in AND the app is configured. */
export function isPublishingEnabled(): boolean {
  return isInstagramAppConfigured() && env("INSTAGRAM_ENABLE_PUBLISHING") === "true";
}

export function scopesForOAuth(): string[] {
  return isPublishingEnabled() ? [...REQUESTED_SCOPES, PUBLISH_SCOPE] : [...REQUESTED_SCOPES];
}

/** Secret a cron/worker must present to trigger scheduled publishing. */
export function cronSecret(): string {
  return env("SOCIAL_CRON_SECRET");
}

/** Bounds for content-intelligence image fetches (keep it cheap + safe). */
export const CONTENT_IMAGE_MAX_BYTES = 4_000_000;
export const CONTENT_ANALYSIS_MAX_IMAGES = 2;

/** Minimum posts per group before a pattern comparison is allowed to draw a conclusion. */
export const PATTERN_MIN_SAMPLE = 3;

/** Rolling window for the overview + insights. */
export const OVERVIEW_WINDOW_DAYS = 30;
