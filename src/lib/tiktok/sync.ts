import { analyzeVideoCreative } from "@/lib/social/video-creative";
import { TiktokApiClient, type TtVideo } from "./api-client";
import { TIKTOK_MAX_VIDEOS, TIKTOK_VIDEO_FIELDS, effectiveGrantedScopes, missingTiktokScopes } from "./config";
import { TiktokError } from "./errors";
import { refreshAccessToken } from "./oauth";
import {
  finishSyncRun,
  getAccessToken,
  getConnectedAccount,
  listVideos,
  saveToken,
  setVideoCreative,
  startSyncRun,
  updateAccount,
  upsertVideo,
} from "./repository";
import type { TiktokSyncRun } from "@/types/tiktok";

/**
 * One synchronization run: pull the real profile + real video stats from
 * TikTok's Display API v2. Fields TikTok doesn't return (or that the
 * connected token's scope doesn't unlock) are stored as null, never guessed.
 */

const client = new TiktokApiClient();
const CREATIVE_ANALYSIS_BUDGET = 12; // new videos to label per sync run (AI cost control)

export interface LabelPendingResult {
  attempted: number;
  labelled: number;
  remaining: number;
}

/** Labels up to `budget` already-synced videos that don't have creative labels yet. */
export async function labelPendingCreative(accountId: string, budget: number): Promise<LabelPendingResult> {
  const stored = await listVideos(accountId);
  const needsLabels = stored.filter((v) => !v.creative);
  const batch = needsLabels.slice(0, budget);

  let labelled = 0;
  for (const v of batch) {
    const result = await analyzeVideoCreative({
      platform: "tiktok",
      title: v.title,
      description: v.videoDescription,
      thumbnailUrl: v.coverImageUrl,
      formatLabel: "Video",
    });
    if (result.available && result.labels) {
      await setVideoCreative(v.id, result.labels);
      labelled += 1;
    }
  }
  return { attempted: batch.length, labelled, remaining: needsLabels.length - batch.length };
}

export async function runSync(): Promise<TiktokSyncRun> {
  const account = await getConnectedAccount();
  if (!account) throw new TiktokError("TIKTOK_NOT_CONNECTED");

  const run = await startSyncRun(account.id);
  const warnings: string[] = [];
  let videosSynced = 0;

  try {
    const accessToken = await resolveUsableToken(account.id);
    const grantedScopes = effectiveGrantedScopes(account.grantedScope);
    const missingScopes = missingTiktokScopes(account.grantedScope);
    if (missingScopes.length > 0) {
      warnings.push(
        `Reconnect TikTok to grant the newly added permissions (missing: ${missingScopes.join(", ")}).`,
      );
    }

    // ---- Profile ----------------------------------------------------------
    const profile = await client.getUserInfo(accessToken, grantedScopes);
    console.log(
      `[tiktok/sync] PROFILE: status=${profile.httpStatus} code=${profile.errorCode ?? "(none)"} ` +
        `message=${profile.errorMessage ?? "(none)"} fields=${profile.fieldsRequested}`,
    );
    if (profile.ok && profile.data) {
      const p = profile.data;
      await updateAccount(account.id, {
        displayName: p.displayName ?? p.username ?? account.displayName,
        username: p.username ?? account.username,
        avatarUrl: p.avatarUrl ?? account.avatarUrl,
        profileDeepLink: p.profileDeepLink ?? account.profileDeepLink,
        bioDescription: p.bioDescription ?? account.bioDescription,
        isVerified: p.isVerified ?? account.isVerified,
        followerCount: p.followerCount ?? account.followerCount,
        followingCount: p.followingCount ?? account.followingCount,
        likesCount: p.likesCount ?? account.likesCount,
        videoCount: p.videoCount ?? account.videoCount,
      });
    } else {
      // Real, exact TikTok error — never the generic fallback copy — so the
      // account stays connected and the user sees what actually happened.
      warnings.push(
        `Profile refresh failed: ${profile.errorMessage ?? `HTTP ${profile.httpStatus}`}` +
          (profile.errorCode ? ` (${profile.errorCode})` : "") +
          " — kept the previously stored profile.",
      );
    }

    // ---- Videos -------------------------------------------------------------
    if (!grantedScopes.includes("video.list")) {
      warnings.push("The video.list permission was not granted — reconnect TikTok to sync videos.");
    } else {
      const collected: TtVideo[] = [];
      let cursor: number | null = null;
      let page = 0;
      do {
        page += 1;
        const result = await client.listVideos(accessToken, { cursor });
        console.log(
          `[tiktok/sync] VIDEO LIST (page ${page}): status=${result.httpStatus} code=${result.errorCode ?? "(none)"} ` +
            `message=${result.errorMessage ?? "(none)"} fields=${result.fieldsRequested} ` +
            `has_more=${result.data?.hasMore ?? "(n/a)"} count=${result.data?.videos.length ?? 0}`,
        );

        if (!result.ok || !result.data) {
          // Per spec: if profile succeeded but videos fail, keep the account
          // connected and surface the EXACT TikTok error — never the generic
          // "please try again" copy.
          throw new TiktokError(
            "TIKTOK_API_ERROR",
            `TikTok video sync failed: ${result.errorMessage ?? `HTTP ${result.httpStatus}`}` +
              (result.errorCode ? ` (${result.errorCode})` : ""),
            { details: { httpStatus: result.httpStatus, code: result.errorCode, fields: TIKTOK_VIDEO_FIELDS } },
          );
        }

        collected.push(...result.data.videos);
        cursor = result.data.hasMore ? result.data.nextCursor : null;
      } while (cursor && collected.length < TIKTOK_MAX_VIDEOS);

      for (const v of collected.slice(0, TIKTOK_MAX_VIDEOS)) {
        // Upsert by TikTok's own video id — never duplicates (see
        // repository.upsertVideo's accountId+videoId match).
        await upsertVideo({
          accountId: account.id,
          videoId: v.videoId,
          title: v.title,
          videoDescription: v.videoDescription,
          createTime: v.createTime,
          durationSeconds: v.durationSeconds,
          coverImageUrl: v.coverImageUrl,
          shareUrl: v.shareUrl,
          height: v.height,
          width: v.width,
          viewCount: v.viewCount,
          likeCount: v.likeCount,
          commentCount: v.commentCount,
          shareCount: v.shareCount,
          syncedAt: new Date().toISOString(),
          creative: null,
          creativeAnalyzedAt: null,
        });
        videosSynced += 1;
      }
    }

    // Creative labelling for new videos (bounded, best-effort).
    const labelResult = await labelPendingCreative(account.id, CREATIVE_ANALYSIS_BUDGET);
    if (labelResult.attempted > 0 && labelResult.labelled === 0) {
      warnings.push("Creative analysis was skipped (AI unavailable). Metrics and content still synced.");
    }

    await updateAccount(account.id, { lastSyncAt: new Date().toISOString(), tokenStatus: "active" });
    const finished = await finishSyncRun(run.id, {
      status: warnings.length > 0 ? "partial" : "success",
      videosSynced,
      warnings,
    });
    return finished ?? run;
  } catch (error) {
    if (error instanceof TiktokError && error.code === "TIKTOK_TOKEN_EXPIRED") {
      await updateAccount(account.id, { tokenStatus: "expired" });
    }
    // The account is deliberately left connected here (only tokenStatus
    // above changes it) — a sync failure is not a disconnect.
    const finished = await finishSyncRun(run.id, {
      status: "error",
      videosSynced,
      warnings,
      error: error instanceof Error ? error.message : "Sync failed.",
    });
    if (error instanceof TiktokError) throw error;
    throw new TiktokError("TIKTOK_API_ERROR", "Sync failed.", { cause: error, details: finished });
  }
}

/** Returns a usable access token, refreshing a near/expired token in place. */
async function resolveUsableToken(accountId: string): Promise<string> {
  const info = await getAccessToken(accountId);
  if (!info) throw new TiktokError("TIKTOK_NOT_CONNECTED");

  const msLeft = new Date(info.expiresAt).getTime() - Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  if (msLeft > fiveMinutes) return info.accessToken;

  if (!info.refreshToken) {
    if (msLeft > 0) return info.accessToken;
    throw new TiktokError("TIKTOK_TOKEN_EXPIRED", "No refresh token stored — reconnect TikTok.");
  }

  try {
    const refreshed = await refreshAccessToken(info.refreshToken);
    await saveToken({
      accountId,
      accessToken: refreshed.accessToken,
      expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
    });
    return refreshed.accessToken;
  } catch {
    if (msLeft > 0) return info.accessToken;
    throw new TiktokError("TIKTOK_TOKEN_EXPIRED");
  }
}
