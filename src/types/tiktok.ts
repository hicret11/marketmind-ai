import type { CreativeLabels } from "./social";

/**
 * TikTok Login Kit / Display API integration types.
 *
 * Scopes requested: `user.info.basic`, `video.list` (read-only — MarketMind
 * never posts, edits, or deletes on TikTok). Mirrors the Instagram/YouTube
 * modules' hard rules:
 *  - Access/refresh tokens live in a SEPARATE store and never appear in
 *    client-facing shapes.
 *  - An unavailable field is `null` ("Not available") — never invented.
 *
 * With only `user.info.basic` + `video.list` granted, TikTok does NOT return
 * follower/following counts (that needs `user.info.stats`, not requested
 * here) — `followerCount` stays null until that scope is added.
 */

export type TiktokTokenStatus = "active" | "expired" | "revoked";

/** Public, client-safe account summary. Never carries a token. */
export interface TiktokAccount {
  id: string;
  /** TikTok's own user id for this app ("open_id"). */
  openId: string;
  /** Real display_name/username — only falls back to open_id when TikTok has returned neither. */
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  profileDeepLink: string | null;
  bioDescription: string | null;
  isVerified: boolean | null;
  /** Each null until its scope (user.info.stats) is granted — never guessed. */
  followerCount: number | null;
  followingCount: number | null;
  likesCount: number | null;
  videoCount: number | null;
  connectedAt: string;
  lastSyncAt: string | null;
  tokenStatus: TiktokTokenStatus;
  /** Scopes TikTok actually granted on the current token (comma-separated, as returned). */
  grantedScope: string;
}

/** One TikTok video, exactly as returned (missing fields => null). */
export interface TiktokVideoItem {
  id: string;
  accountId: string;
  /** TikTok's own video id. */
  videoId: string;
  title: string | null;
  videoDescription: string | null;
  createTime: string | null; // ISO, converted from TikTok's unix seconds
  durationSeconds: number | null;
  coverImageUrl: string | null;
  shareUrl: string | null;
  height: number | null;
  width: number | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  syncedAt: string;
  /** MarketMind AI creative labels — attached later, never from TikTok. */
  creative: CreativeLabels | null;
  creativeAnalyzedAt: string | null;
}

export type TiktokSyncStatus = "running" | "success" | "partial" | "error";

export interface TiktokSyncRun {
  id: string;
  accountId: string;
  startedAt: string;
  finishedAt: string | null;
  status: TiktokSyncStatus;
  videosSynced: number;
  warnings: string[];
  error: string | null;
}

export interface TiktokConfigStatus {
  appConfigured: boolean;
  missing: string[];
  redirectUri: string | null;
  requestedScopes: string[];
  connected: boolean;
  account: TiktokAccount | null;
  lastSync: TiktokSyncRun | null;
  /** Scopes requested by MarketMind but not present on the connected account's granted scope. */
  missingScopes: string[];
}

export interface TiktokSyncResponse {
  ok: boolean;
  run: TiktokSyncRun;
}
