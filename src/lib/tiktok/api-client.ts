import { TIKTOK_USER_FIELDS_BY_SCOPE, TIKTOK_VIDEO_FIELDS } from "./config";
import { TiktokError } from "./errors";

/**
 * Thin, defensive wrapper over the TikTok Display API v2. The client never
 * stores the access token — it's passed in on every call.
 *
 * Every call returns a `TiktokApiResult<T>` rather than throwing for
 * ordinary API-level errors (bad scope, expired token, etc.) — the caller
 * (lib/tiktok/sync.ts) needs the raw HTTP status + TikTok error code/message
 * to log real diagnostics and to decide what to do (e.g. "profile failed,
 * keep videos going" / "videos failed, keep the account connected"). A
 * thrown TiktokError is reserved for genuine network failures.
 */

export interface TiktokApiResult<T> {
  ok: boolean;
  httpStatus: number;
  data: T | null;
  errorCode: string | null;
  errorMessage: string | null;
  /** The exact `fields` requested — for diagnostics only. */
  fieldsRequested: string;
}

export interface TtUser {
  openId: string;
  /** Real display name — never fall back to open_id here; that's a UI-layer decision. */
  displayName: string | null;
  avatarUrl: string | null;
  /** Fields below require `user.info.profile` / `user.info.stats` — null if that scope wasn't granted. */
  username: string | null;
  profileDeepLink: string | null;
  bioDescription: string | null;
  isVerified: boolean | null;
  followerCount: number | null;
  followingCount: number | null;
  likesCount: number | null;
  videoCount: number | null;
}

export interface TtVideo {
  videoId: string;
  title: string | null;
  videoDescription: string | null;
  createTime: string | null; // ISO
  durationSeconds: number | null;
  coverImageUrl: string | null;
  shareUrl: string | null;
  height: number | null;
  width: number | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
}

const BASE = "https://open.tiktokapis.com/v2";

export class TiktokApiClient {
  /** The authenticated user's own profile, using only fields the granted scopes actually unlock. */
  async getUserInfo(accessToken: string, grantedScopes: string[]): Promise<TiktokApiResult<TtUser>> {
    const fields = Object.entries(TIKTOK_USER_FIELDS_BY_SCOPE)
      .filter(([scope]) => grantedScopes.includes(scope))
      .flatMap(([, fieldNames]) => fieldNames)
      .join(",");

    const result = await this.get<{
      data?: {
        user?: {
          open_id?: string;
          display_name?: string;
          avatar_url?: string;
          username?: string;
          profile_deep_link?: string;
          bio_description?: string;
          is_verified?: boolean;
          follower_count?: number;
          following_count?: number;
          likes_count?: number;
          video_count?: number;
        };
      };
    }>("/user/info/", accessToken, { fields });

    const user = result.data?.data?.user;
    const data: TtUser | null =
      user?.open_id
        ? {
            openId: user.open_id,
            displayName: strOrNull(user.display_name),
            avatarUrl: strOrNull(user.avatar_url),
            username: strOrNull(user.username),
            profileDeepLink: strOrNull(user.profile_deep_link),
            bioDescription: strOrNull(user.bio_description),
            isVerified: typeof user.is_verified === "boolean" ? user.is_verified : null,
            followerCount: numOrNull(user.follower_count),
            followingCount: numOrNull(user.following_count),
            likesCount: numOrNull(user.likes_count),
            videoCount: numOrNull(user.video_count),
          }
        : null;

    return { ...result, data, fieldsRequested: fields };
  }

  /** Paginated list of the user's own videos (`video.list` scope). */
  async listVideos(
    accessToken: string,
    opts: { cursor?: number | null } = {},
  ): Promise<TiktokApiResult<{ videos: TtVideo[]; nextCursor: number | null; hasMore: boolean }>> {
    const body: Record<string, unknown> = { max_count: 20 };
    if (opts.cursor) body.cursor = opts.cursor;

    const result = await this.post<{
      data?: {
        videos?: Array<Record<string, unknown>>;
        cursor?: number;
        has_more?: boolean;
      };
    }>("/video/list/", accessToken, { fields: TIKTOK_VIDEO_FIELDS }, body);

    const videos = (result.data?.data?.videos ?? []).map((v) => this.mapVideo(v));
    const data = result.ok
      ? {
          videos,
          nextCursor: result.data?.data?.cursor ?? null,
          hasMore: Boolean(result.data?.data?.has_more),
        }
      : null;

    return { ...result, data, fieldsRequested: TIKTOK_VIDEO_FIELDS };
  }

  private mapVideo(v: Record<string, unknown>): TtVideo {
    const createTimeSec = numOrNull(v.create_time);
    return {
      videoId: String(v.id ?? ""),
      title: strOrNull(v.title),
      videoDescription: strOrNull(v.video_description),
      createTime: createTimeSec != null ? new Date(createTimeSec * 1000).toISOString() : null,
      durationSeconds: numOrNull(v.duration),
      coverImageUrl: strOrNull(v.cover_image_url),
      shareUrl: strOrNull(v.share_url),
      height: numOrNull(v.height),
      width: numOrNull(v.width),
      viewCount: numOrNull(v.view_count),
      likeCount: numOrNull(v.like_count),
      commentCount: numOrNull(v.comment_count),
      shareCount: numOrNull(v.share_count),
    };
  }

  /**
   * GETs a Display API endpoint (`/user/info/` — TikTok does NOT accept POST
   * here; that previously produced a plain HTTP 404). `fields` goes in the
   * query string; there is no request body.
   */
  private async get<T>(
    path: string,
    accessToken: string,
    query: Record<string, string>,
  ): Promise<Omit<TiktokApiResult<T>, "fieldsRequested" | "data"> & { data: T | null }> {
    const url = new URL(`${BASE}${path}`);
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
    return this.request<T>(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(20000),
    });
  }

  /**
   * POSTs to a Display API endpoint (`/video/list/`). `fields` is sent as a
   * query parameter (TikTok's own convention for this endpoint); `body` is
   * the JSON payload (pagination params, etc.).
   */
  private async post<T>(
    path: string,
    accessToken: string,
    query: Record<string, string>,
    body: Record<string, unknown>,
  ): Promise<Omit<TiktokApiResult<T>, "fieldsRequested" | "data"> & { data: T | null }> {
    const url = new URL(`${BASE}${path}`);
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
    return this.request<T>(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
  }

  /** Shared fetch + response parsing. Only throws for a genuine network/timeout failure. */
  private async request<T>(
    url: URL,
    init: RequestInit,
  ): Promise<Omit<TiktokApiResult<T>, "fieldsRequested" | "data"> & { data: T | null }> {
    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (cause) {
      if (cause instanceof Error && cause.name === "TimeoutError") {
        throw new TiktokError("TIKTOK_API_ERROR", "TikTok request timed out.", { cause });
      }
      throw new TiktokError("TIKTOK_API_ERROR", undefined, { cause });
    }

    const payload = (await response.json().catch(() => null)) as
      | { data?: unknown; error?: { code?: string; message?: string; log_id?: string } }
      | null;

    const err = payload?.error;
    // TikTok returns HTTP 200 with an `error.code` field for API-level errors.
    const apiErrorCode = err?.code && err.code !== "ok" ? err.code : null;
    const ok = response.ok && !apiErrorCode;

    return {
      ok,
      httpStatus: response.status,
      data: ok ? ((payload ?? {}) as T) : null,
      errorCode: apiErrorCode,
      errorMessage: err?.message ?? (ok ? null : `HTTP ${response.status}`),
    };
  }
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
