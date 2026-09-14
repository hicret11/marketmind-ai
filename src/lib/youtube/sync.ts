import { analyzeVideoCreative } from "@/lib/social/video-creative";
import { getCreatorContentTypes } from "./analytics-api";
import { YoutubeApiClient } from "./api-client";
import { YOUTUBE_MAX_VIDEOS, YOUTUBE_SHORTS_MAX_SECONDS, YOUTUBE_SHORTS_MAX_SECONDS_WITH_TAG } from "./config";
import { YoutubeError } from "./errors";
import { refreshAccessToken } from "./oauth";
import {
  finishSyncRun,
  getAccessToken,
  getConnectedChannel,
  listVideos,
  saveToken,
  setVideoCreative,
  startSyncRun,
  updateChannel,
  upsertVideo,
} from "./repository";
import type { YoutubeFormatSource, YoutubeSyncRun, YoutubeVideoFormat } from "@/types/youtube";

/**
 * One synchronization run: pull the real channel + real uploaded-video stats
 * from YouTube. Watch time is never collected/estimated here — see the
 * module doc comment in types/youtube.ts.
 */

const client = new YoutubeApiClient();
const CREATIVE_ANALYSIS_BUDGET = 12; // new videos to label per sync run (AI cost control)
const HASHTAG_SHORTS = /#shorts\b/i;

/**
 * Safe fallback ONLY — real `creatorContentType` (from the YouTube Analytics
 * API) is always tried first in runSync() below. See config.ts for the
 * exact rules; this never uses aspect ratio and never guesses "shorts" from
 * duration alone above 60s without the creator's own "#shorts" tag.
 */
function classifyByDurationHeuristic(
  durationSeconds: number | null,
  title: string,
  description: string | null,
): YoutubeVideoFormat {
  const selfTagged = HASHTAG_SHORTS.test(title) || (description != null && HASHTAG_SHORTS.test(description));
  if (durationSeconds != null) {
    if (durationSeconds <= YOUTUBE_SHORTS_MAX_SECONDS) return "shorts";
    if (durationSeconds <= YOUTUBE_SHORTS_MAX_SECONDS_WITH_TAG && selfTagged) return "shorts";
    return "long_form";
  }
  return selfTagged ? "shorts" : "long_form";
}

export interface LabelPendingResult {
  attempted: number;
  labelled: number;
  remaining: number;
}

/** Labels up to `budget` already-synced videos that don't have creative labels yet. */
export async function labelPendingCreative(channelId: string, budget: number): Promise<LabelPendingResult> {
  const stored = await listVideos(channelId);
  const needsLabels = stored.filter((v) => !v.creative);
  const batch = needsLabels.slice(0, budget);

  let labelled = 0;
  for (const v of batch) {
    const result = await analyzeVideoCreative({
      platform: "youtube",
      title: v.title,
      description: v.description,
      thumbnailUrl: v.thumbnailUrl,
      formatLabel: v.format === "shorts" ? "Shorts" : v.format === "long_form" ? "Long-form" : "Video",
    });
    if (result.available && result.labels) {
      await setVideoCreative(v.id, result.labels);
      labelled += 1;
    }
  }
  return { attempted: batch.length, labelled, remaining: needsLabels.length - batch.length };
}

export async function runSync(): Promise<YoutubeSyncRun> {
  const channel = await getConnectedChannel();
  if (!channel) throw new YoutubeError("YOUTUBE_NOT_CONNECTED");

  const run = await startSyncRun(channel.id);
  const warnings: string[] = [];
  let videosSynced = 0;

  try {
    const accessToken = await resolveUsableToken(channel.id);

    const remote = await client.getMyChannel(accessToken);
    if (!remote) throw new YoutubeError("YOUTUBE_API_ERROR", "Could not read the connected YouTube channel.");

    await updateChannel(channel.id, {
      title: remote.title,
      description: remote.description,
      thumbnailUrl: remote.thumbnailUrl,
      subscriberCount: remote.subscriberCount,
      viewCount: remote.viewCount,
      videoCount: remote.videoCount,
    });

    if (remote.uploadsPlaylistId) {
      const refs: Array<{
        videoId: string;
        title: string;
        description: string | null;
        publishedAt: string | null;
        thumbnailUrl: string | null;
      }> = [];
      let pageToken: string | null = null;
      do {
        const page = await client.listPlaylistVideos(accessToken, remote.uploadsPlaylistId, { pageToken });
        refs.push(...page.videos);
        pageToken = page.nextPageToken;
      } while (pageToken && refs.length < YOUTUBE_MAX_VIDEOS);

      const bounded = refs.slice(0, YOUTUBE_MAX_VIDEOS);

      // videos.list accepts up to 50 ids per call.
      const statsById = new Map<
        string,
        { viewCount: number | null; likeCount: number | null; commentCount: number | null; durationSeconds: number | null }
      >();
      for (let i = 0; i < bounded.length; i += 50) {
        const batch = bounded.slice(i, i + 50);
        try {
          const stats = await client.getVideoStats(accessToken, batch.map((v) => v.videoId));
          for (const s of stats) statsById.set(s.videoId, s);
        } catch (error) {
          if (error instanceof YoutubeError && error.code === "YOUTUBE_TOKEN_EXPIRED") throw error;
          warnings.push(
            `Stats unavailable for a batch of ${batch.length} video(s): ${
              error instanceof Error ? error.message : "unknown error"
            }`,
          );
        }
      }

      // Real classification first: YouTube's own creatorContentType, via the
      // Analytics API. Best-effort — an empty/partial map (missing scope on
      // an older connection, or no report rows yet) falls back per-video to
      // the duration heuristic below, never a hard failure.
      let creatorTypes = new Map<string, "shorts" | "long_form">();
      try {
        for (let i = 0; i < bounded.length; i += 50) {
          const batch = bounded.slice(i, i + 50);
          const types = await getCreatorContentTypes(accessToken, batch.map((v) => v.videoId));
          creatorTypes = new Map([...creatorTypes, ...types]);
        }
      } catch {
        // Never fail the sync over this — duration heuristic covers every video.
      }
      if (bounded.length > 0 && creatorTypes.size === 0) {
        warnings.push(
          "Real YouTube content-type data (Shorts vs Long-form) wasn't available — used the duration-based fallback instead. Reconnect YouTube to grant the Analytics scope for exact classification.",
        );
      } else if (creatorTypes.size < bounded.length) {
        warnings.push(
          `Real YouTube content-type data covered ${creatorTypes.size} of ${bounded.length} video(s); the rest used the duration-based fallback.`,
        );
      }

      for (const ref of bounded) {
        const stats = statsById.get(ref.videoId);
        const durationSeconds = stats?.durationSeconds ?? null;
        const fromAnalytics = creatorTypes.get(ref.videoId);
        const format: YoutubeVideoFormat = fromAnalytics ?? classifyByDurationHeuristic(durationSeconds, ref.title, ref.description);
        const formatSource: YoutubeFormatSource = fromAnalytics ? "creator_content_type" : "duration_heuristic";
        await upsertVideo({
          channelId: channel.id,
          videoId: ref.videoId,
          title: ref.title,
          description: ref.description,
          publishedAt: ref.publishedAt,
          thumbnailUrl: ref.thumbnailUrl,
          durationSeconds,
          format,
          formatSource,
          viewCount: stats?.viewCount ?? null,
          likeCount: stats?.likeCount ?? null,
          commentCount: stats?.commentCount ?? null,
          watchTimeMinutes: null,
          syncedAt: new Date().toISOString(),
          creative: null,
          creativeAnalyzedAt: null,
        });
        videosSynced += 1;
      }
    } else {
      warnings.push("This channel has no uploads playlist reported by YouTube (no public videos found).");
    }

    // Creative labelling for new videos (bounded, best-effort).
    const labelResult = await labelPendingCreative(channel.id, CREATIVE_ANALYSIS_BUDGET);
    if (labelResult.attempted > 0 && labelResult.labelled === 0) {
      warnings.push("Creative analysis was skipped (AI unavailable). Metrics and content still synced.");
    }

    await updateChannel(channel.id, { lastSyncAt: new Date().toISOString(), tokenStatus: "active" });
    const finished = await finishSyncRun(run.id, {
      status: warnings.length > 0 ? "partial" : "success",
      videosSynced,
      warnings,
    });
    return finished ?? run;
  } catch (error) {
    if (error instanceof YoutubeError && error.code === "YOUTUBE_TOKEN_EXPIRED") {
      await updateChannel(channel.id, { tokenStatus: "expired" });
    }
    const finished = await finishSyncRun(run.id, {
      status: "error",
      videosSynced,
      warnings,
      error: error instanceof Error ? error.message : "Sync failed.",
    });
    if (error instanceof YoutubeError) throw error;
    throw new YoutubeError("YOUTUBE_API_ERROR", "Sync failed.", { cause: error, details: finished });
  }
}

/** Returns a usable access token, refreshing a near/expired token in place. */
async function resolveUsableToken(channelId: string): Promise<string> {
  const info = await getAccessToken(channelId);
  if (!info) throw new YoutubeError("YOUTUBE_NOT_CONNECTED");

  const msLeft = new Date(info.expiresAt).getTime() - Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  if (msLeft > fiveMinutes) return info.accessToken;

  if (!info.refreshToken) {
    if (msLeft > 0) return info.accessToken; // still valid for now
    throw new YoutubeError("YOUTUBE_TOKEN_EXPIRED", "No refresh token stored — reconnect YouTube.");
  }

  try {
    const refreshed = await refreshAccessToken(info.refreshToken);
    await saveToken({
      channelId,
      accessToken: refreshed.accessToken,
      expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
    });
    return refreshed.accessToken;
  } catch {
    if (msLeft > 0) return info.accessToken;
    throw new YoutubeError("YOUTUBE_TOKEN_EXPIRED");
  }
}
