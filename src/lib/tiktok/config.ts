import { env } from "@/lib/opportunity/env";

/**
 * TikTok integration configuration — all from environment variables.
 *
 * TikTok Login Kit (OAuth 2.0 + PKCE), fully server-side. Read-only:
 * MarketMind never posts, edits or deletes anything on TikTok.
 *
 * With no credentials the feature reports "not configured"; with credentials
 * but no connected account it reports "not connected". It never shows sample
 * metrics.
 */

export const TIKTOK_SCOPES = ["user.info.basic", "user.info.profile", "user.info.stats", "video.list"];

/**
 * Which `/user/info/` fields each scope unlocks. Used to build the `fields`
 * request dynamically from the scopes actually granted on the stored token —
 * never requesting a field whose scope wasn't granted (TikTok errors the
 * whole call if you do), and never silently pretending a field is
 * "unavailable data" when it's really a missing permission.
 */
export const TIKTOK_USER_FIELDS_BY_SCOPE: Record<string, string[]> = {
  "user.info.basic": ["open_id", "avatar_url", "display_name"],
  "user.info.profile": ["username", "profile_deep_link", "bio_description", "is_verified"],
  "user.info.stats": ["follower_count", "following_count", "likes_count", "video_count"],
};

/**
 * Parses TikTok's returned/stored scope string (comma or space-separated)
 * into a list. Accepts null/undefined defensively — an account connected
 * before `grantedScope` existed on the stored record reads back as
 * undefined here, and the safe reading of "we don't know what was granted"
 * is "treat it as granting nothing" (see missingTiktokScopes below).
 */
export function parseGrantedScope(grantedScope: string | null | undefined): string[] {
  if (!grantedScope) return [];
  return grantedScope
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Which of MarketMind's requested scopes are NOT present on the granted scope — never silently ignored. */
export function missingTiktokScopes(grantedScope: string | null | undefined): string[] {
  const granted = new Set(parseGrantedScope(grantedScope));
  return TIKTOK_SCOPES.filter((s) => !granted.has(s));
}

/**
 * The two scopes MarketMind has ALWAYS required for a successful connection,
 * even before user.info.profile/user.info.stats existed as requested scopes.
 */
const LEGACY_BASELINE_SCOPES = ["user.info.basic", "video.list"];

/**
 * Scopes to actually use when deciding which API fields to request. An
 * account connected before `grantedScope` was recorded reads back as
 * undefined — rather than treating that as "zero scopes" (which would send
 * an empty `fields` param and break even the basic profile/video calls that
 * clearly already work for it), fall back to the baseline scopes every past
 * connection required. This is never used to claim the newer scopes are
 * granted — only status.ts's missingTiktokScopes (using the raw value) does
 * that, and it correctly still prompts reconnect for the real new scopes.
 */
export function effectiveGrantedScopes(grantedScope: string | null | undefined): string[] {
  const parsed = parseGrantedScope(grantedScope);
  return parsed.length > 0 ? parsed : LEGACY_BASELINE_SCOPES;
}

export function tiktokClientKey(): string {
  return env("TIKTOK_CLIENT_KEY");
}

export function tiktokClientSecret(): string {
  return env("TIKTOK_CLIENT_SECRET");
}

export function tiktokRedirectUri(): string {
  const explicit = env("TIKTOK_REDIRECT_URI");
  if (explicit) return explicit;
  const base = env("APP_BASE_URL") || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/social/tiktok/callback`;
}

export function isTiktokAppConfigured(): boolean {
  return Boolean(tiktokClientKey() && tiktokClientSecret() && tiktokRedirectUri());
}

export function tiktokMissingConfig(): string[] {
  const missing: string[] = [];
  if (!tiktokClientKey()) missing.push("TIKTOK_CLIENT_KEY");
  if (!tiktokClientSecret()) missing.push("TIKTOK_CLIENT_SECRET");
  if (!env("TIKTOK_REDIRECT_URI") && !env("APP_BASE_URL")) {
    missing.push("TIKTOK_REDIRECT_URI (or APP_BASE_URL)");
  }
  return missing;
}

/** Bound on how many videos MarketMind pulls per sync (API-cost control). */
export const TIKTOK_MAX_VIDEOS = 100;

/** Fields requested from TikTok's `/v2/video/list/` endpoint. */
export const TIKTOK_VIDEO_FIELDS = [
  "id",
  "title",
  "video_description",
  "create_time",
  "duration",
  "cover_image_url",
  "share_url",
  "view_count",
  "like_count",
  "comment_count",
  "share_count",
].join(",");
