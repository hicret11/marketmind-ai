import { YoutubeError } from "./errors";

/**
 * Thin, defensive wrapper over the YouTube Data API v3. The client never
 * stores the access token — it's passed in on every call. "No data" is
 * returned as null/empty, never thrown and never faked.
 */

export interface YtChannel {
  channelId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  subscriberCount: number | null;
  viewCount: number | null;
  videoCount: number | null;
  uploadsPlaylistId: string | null;
}

export interface YtVideoRef {
  videoId: string;
  title: string;
  description: string | null;
  publishedAt: string | null;
  thumbnailUrl: string | null;
}

export interface YtVideoStats {
  videoId: string;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  durationSeconds: number | null;
}

const BASE = "https://www.googleapis.com/youtube/v3";

export class YoutubeApiClient {
  /** The authenticated user's own channel ("mine=true"). */
  async getMyChannel(accessToken: string): Promise<YtChannel | null> {
    const data = await this.get<{
      items?: Array<{
        id?: string;
        snippet?: { title?: string; description?: string; thumbnails?: Record<string, { url?: string }> };
        statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string; hiddenSubscriberCount?: boolean };
        contentDetails?: { relatedPlaylists?: { uploads?: string } };
      }>;
    }>("/channels", accessToken, { part: "snippet,statistics,contentDetails", mine: "true" });

    const item = data.items?.[0];
    if (!item) return null;

    return {
      channelId: String(item.id ?? ""),
      title: item.snippet?.title ?? "",
      description: strOrNull(item.snippet?.description),
      thumbnailUrl:
        item.snippet?.thumbnails?.default?.url ?? item.snippet?.thumbnails?.medium?.url ?? null,
      subscriberCount: item.statistics?.hiddenSubscriberCount
        ? null
        : numOrNull(item.statistics?.subscriberCount),
      viewCount: numOrNull(item.statistics?.viewCount),
      videoCount: numOrNull(item.statistics?.videoCount),
      uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads ?? null,
    };
  }

  /** Paginated list of a playlist's video refs (used with the channel's "uploads" playlist). */
  async listPlaylistVideos(
    accessToken: string,
    playlistId: string,
    opts: { pageToken?: string | null } = {},
  ): Promise<{ videos: YtVideoRef[]; nextPageToken: string | null }> {
    const params: Record<string, string> = {
      part: "snippet,contentDetails",
      playlistId,
      maxResults: "50",
    };
    if (opts.pageToken) params.pageToken = opts.pageToken;

    const data = await this.get<{
      items?: Array<{
        contentDetails?: { videoId?: string; videoPublishedAt?: string };
        snippet?: { title?: string; description?: string; publishedAt?: string; thumbnails?: Record<string, { url?: string }> };
      }>;
      nextPageToken?: string;
    }>("/playlistItems", accessToken, params);

    const videos = (data.items ?? [])
      .map((it) => ({
        videoId: String(it.contentDetails?.videoId ?? ""),
        title: it.snippet?.title ?? "",
        description: strOrNull(it.snippet?.description),
        publishedAt: it.contentDetails?.videoPublishedAt ?? it.snippet?.publishedAt ?? null,
        thumbnailUrl:
          it.snippet?.thumbnails?.default?.url ?? it.snippet?.thumbnails?.medium?.url ?? null,
      }))
      .filter((v) => v.videoId);

    return { videos, nextPageToken: data.nextPageToken ?? null };
  }

  /** Real view/like/comment counts + duration for up to 50 video ids at a time. */
  async getVideoStats(accessToken: string, videoIds: string[]): Promise<YtVideoStats[]> {
    if (videoIds.length === 0) return [];
    const data = await this.get<{
      items?: Array<{
        id?: string;
        statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
        contentDetails?: { duration?: string };
      }>;
    }>("/videos", accessToken, { part: "statistics,contentDetails", id: videoIds.join(",") });

    return (data.items ?? []).map((it) => ({
      videoId: String(it.id ?? ""),
      viewCount: numOrNull(it.statistics?.viewCount),
      likeCount: numOrNull(it.statistics?.likeCount),
      commentCount: numOrNull(it.statistics?.commentCount),
      durationSeconds: parseIso8601Duration(it.contentDetails?.duration),
    }));
  }

  private async get<T>(path: string, accessToken: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`${BASE}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(20000),
      });
    } catch (cause) {
      if (cause instanceof Error && cause.name === "TimeoutError") {
        throw new YoutubeError("YOUTUBE_API_ERROR", "YouTube request timed out.", { cause });
      }
      throw new YoutubeError("YOUTUBE_API_ERROR", undefined, { cause });
    }

    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string; code?: number; status?: string } }
      | Record<string, unknown>
      | null;

    if (!response.ok) {
      const err = (payload as { error?: { message?: string; code?: number; status?: string } })?.error;
      if (response.status === 401) {
        throw new YoutubeError("YOUTUBE_TOKEN_EXPIRED", undefined, { cause: err });
      }
      if (response.status === 429 || err?.status === "RESOURCE_EXHAUSTED") {
        throw new YoutubeError("YOUTUBE_RATE_LIMITED", undefined, { cause: err });
      }
      throw new YoutubeError(
        "YOUTUBE_API_ERROR",
        err?.message ? `YouTube: ${err.message}` : undefined,
        { details: { httpStatus: response.status, code: err?.code } },
      );
    }

    return (payload ?? {}) as T;
  }
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function numOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/** Parses YouTube's ISO 8601 duration (e.g. "PT1M30S") into whole seconds, or null if unparseable. */
function parseIso8601Duration(value: string | undefined): number | null {
  if (!value) return null;
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!m) return null;
  const hours = Number(m[1] ?? 0);
  const minutes = Number(m[2] ?? 0);
  const seconds = Number(m[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}
