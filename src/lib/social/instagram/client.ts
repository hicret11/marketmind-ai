import { instagramGraphVersion } from "../config";
import { SocialError } from "../errors";
import type {
  InstagramAccountType,
  InstagramMediaProductType,
  InstagramMediaType,
} from "@/types/social";
import { parseUnsupportedMetrics } from "./metrics";

/**
 * Thin, defensive wrapper over graph.instagram.com. Every method takes the
 * access token as an argument (the client never stores it). API errors map to
 * user-friendly SocialError codes; "no data / unsupported" is returned as
 * empty/null, never thrown and never faked.
 */

export interface IgAccount {
  igUserId: string;
  username: string;
  name: string | null;
  accountType: InstagramAccountType;
  profilePictureUrl: string | null;
  followersCount: number | null;
  mediaCount: number | null;
}

export interface IgMedia {
  id: string;
  caption: string | null;
  mediaType: InstagramMediaType;
  mediaProductType: InstagramMediaProductType;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  timestamp: string | null;
  username: string | null;
  likeCount: number | null;
  commentsCount: number | null;
}

export interface IgMediaPage {
  media: IgMedia[];
  nextCursor: string | null;
}

export interface IgInsightResult {
  metrics: Record<string, number | null>;
  unsupportedMetrics: string[];
}

const MEDIA_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_product_type",
  "media_url",
  "thumbnail_url",
  "permalink",
  "timestamp",
  "username",
  "like_count",
  "comments_count",
].join(",");

export class InstagramClient {
  private readonly base: string;

  constructor() {
    this.base = `https://graph.instagram.com/${instagramGraphVersion()}`;
  }

  async getAccount(accessToken: string): Promise<IgAccount> {
    const data = await this.get<{
      user_id?: string;
      id?: string;
      username?: string;
      name?: string;
      account_type?: string;
      profile_picture_url?: string;
      followers_count?: number;
      media_count?: number;
    }>("/me", accessToken, {
      fields:
        "user_id,username,name,account_type,profile_picture_url,followers_count,media_count",
    });

    const rawType = (data.account_type ?? "").toUpperCase();
    const accountType: InstagramAccountType =
      rawType === "BUSINESS" || rawType === "CREATOR"
        ? rawType
        : rawType === "PERSONAL" || rawType === "MEDIA_CREATOR"
          ? "PERSONAL"
          : "UNKNOWN";

    return {
      igUserId: String(data.user_id ?? data.id ?? ""),
      username: data.username ?? "",
      name: data.name ?? null,
      accountType,
      profilePictureUrl: data.profile_picture_url ?? null,
      followersCount: numOrNull(data.followers_count),
      mediaCount: numOrNull(data.media_count),
    };
  }

  async listMedia(
    accessToken: string,
    opts: { limit?: number; after?: string | null } = {},
  ): Promise<IgMediaPage> {
    const params: Record<string, string> = {
      fields: MEDIA_FIELDS,
      limit: String(opts.limit ?? 25),
    };
    if (opts.after) params.after = opts.after;

    const data = await this.get<{
      data?: Array<Record<string, unknown>>;
      paging?: { cursors?: { after?: string }; next?: string };
    }>("/me/media", accessToken, params);

    const media = (data.data ?? []).map((m) => this.mapMedia(m));
    const nextCursor =
      data.paging?.next && data.paging.cursors?.after ? data.paging.cursors.after : null;
    return { media, nextCursor };
  }

  /** Fetches media insights, retrying once without any metric the API rejects. */
  async getMediaInsights(
    accessToken: string,
    mediaId: string,
    candidateMetrics: string[],
  ): Promise<IgInsightResult> {
    return this.fetchInsights(`/${mediaId}/insights`, accessToken, candidateMetrics, {});
  }

  async getAccountInsights(
    accessToken: string,
    igUserId: string,
    candidateMetrics: string[],
    opts: { since: string; until: string; period?: string },
  ): Promise<IgInsightResult> {
    return this.fetchInsights(`/${igUserId}/insights`, accessToken, candidateMetrics, {
      period: opts.period ?? "day",
      metric_type: "total_value",
      since: String(Math.floor(new Date(opts.since).getTime() / 1000)),
      until: String(Math.floor(new Date(opts.until).getTime() / 1000)),
    });
  }

  /** True when the token can no longer be used (expired / revoked). */
  static isAuthError(error: unknown): boolean {
    return error instanceof SocialError && error.code === "SOCIAL_TOKEN_EXPIRED";
  }

  private async fetchInsights(
    path: string,
    accessToken: string,
    candidateMetrics: string[],
    extraParams: Record<string, string>,
  ): Promise<IgInsightResult> {
    const unsupported = new Set<string>();
    let metrics = [...candidateMetrics];

    for (let attempt = 0; attempt < 3 && metrics.length > 0; attempt += 1) {
      try {
        const data = await this.get<{
          data?: Array<{
            name?: string;
            values?: Array<{ value?: number }>;
            total_value?: { value?: number };
          }>;
        }>(path, accessToken, { metric: metrics.join(","), ...extraParams });

        const result: Record<string, number | null> = {};
        for (const wanted of candidateMetrics) {
          if (unsupported.has(wanted)) {
            result[wanted] = null;
            continue;
          }
          const row = (data.data ?? []).find((d) => d.name === wanted);
          const value =
            row?.total_value?.value ??
            row?.values?.reduce((sum, v) => sum + (v.value ?? 0), 0);
          result[wanted] = typeof value === "number" ? value : null;
        }
        return { metrics: result, unsupportedMetrics: Array.from(unsupported) };
      } catch (error) {
        if (
          error instanceof SocialError &&
          error.code === "SOCIAL_API_ERROR" &&
          typeof error.message === "string"
        ) {
          const bad = parseUnsupportedMetrics(error.message);
          if (bad.length > 0) {
            bad.forEach((b) => unsupported.add(b));
            metrics = metrics.filter((m) => !unsupported.has(m));
            continue;
          }
        }
        if (error instanceof SocialError && error.code === "SOCIAL_TOKEN_EXPIRED") throw error;
        // Any other error -> treat this insight fetch as "no data available".
        break;
      }
    }

    const nulled: Record<string, number | null> = {};
    for (const m of candidateMetrics) nulled[m] = null;
    return { metrics: nulled, unsupportedMetrics: candidateMetrics.slice() };
  }

  private mapMedia(m: Record<string, unknown>): IgMedia {
    const mt = String(m.media_type ?? "").toUpperCase();
    const pt = String(m.media_product_type ?? "").toUpperCase();
    return {
      id: String(m.id ?? ""),
      caption: strOrNull(m.caption),
      mediaType: (["IMAGE", "VIDEO", "CAROUSEL_ALBUM"].includes(mt)
        ? mt
        : "UNKNOWN") as InstagramMediaType,
      mediaProductType: (["FEED", "REELS", "STORY", "AD"].includes(pt)
        ? pt
        : "UNKNOWN") as InstagramMediaProductType,
      mediaUrl: strOrNull(m.media_url),
      thumbnailUrl: strOrNull(m.thumbnail_url),
      permalink: strOrNull(m.permalink),
      timestamp: strOrNull(m.timestamp),
      username: strOrNull(m.username),
      likeCount: numOrNull(m.like_count),
      commentsCount: numOrNull(m.comments_count),
    };
  }

  private async get<T>(
    path: string,
    accessToken: string,
    params: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set("access_token", accessToken);

    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    } catch (cause) {
      if (cause instanceof Error && cause.name === "TimeoutError") {
        throw new SocialError("SOCIAL_API_ERROR", "Instagram request timed out.", { cause });
      }
      throw new SocialError("SOCIAL_API_ERROR", undefined, { cause });
    }

    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string; code?: number; type?: string; error_subcode?: number } }
      | Record<string, unknown>
      | null;

    if (!response.ok) {
      const err = (payload as { error?: { message?: string; code?: number; error_subcode?: number } })
        ?.error;
      const code = err?.code;
      const subcode = err?.error_subcode;
      if (response.status === 429 || code === 4 || code === 17 || code === 32 || code === 613) {
        throw new SocialError("SOCIAL_RATE_LIMITED", undefined, { cause: err });
      }
      if (
        response.status === 401 ||
        code === 190 ||
        code === 10 ||
        code === 200 ||
        subcode === 458 ||
        subcode === 460 ||
        subcode === 463
      ) {
        throw new SocialError("SOCIAL_TOKEN_EXPIRED", undefined, { cause: err });
      }
      throw new SocialError(
        "SOCIAL_API_ERROR",
        err?.message ? `Instagram: ${err.message}` : undefined,
        { details: { httpStatus: response.status, code, subcode } },
      );
    }

    return (payload ?? {}) as T;
  }
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
