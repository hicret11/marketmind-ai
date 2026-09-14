/**
 * Thin wrapper over the YouTube Analytics API (`reports.query`) — used for
 * exactly one thing: reading the real `creatorContentType` dimension
 * (SHORTS | VIDEO_ON_DEMAND | LIVE_STREAM | STORY) that YouTube itself
 * assigns to each video. This is the same signal YouTube Studio uses to
 * classify Shorts — never a guess from duration or aspect ratio.
 *
 * Best-effort by design: this requires the `yt-analytics.readonly` scope,
 * which existing connections made before this scope was added won't have
 * until the user reconnects. Any failure (missing scope, no rows, API
 * error) returns an empty map rather than throwing — callers fall back to
 * the duration heuristic in lib/youtube/sync.ts.
 */

const REPORTS_URL = "https://youtubeanalytics.googleapis.com/v2/reports";

export type CreatorContentType = "shorts" | "long_form";

/**
 * Looks up creatorContentType for up to `videoIds`. Returns a map of only
 * the videos YouTube actually returned a row for — never guesses for the
 * rest.
 */
export async function getCreatorContentTypes(
  accessToken: string,
  videoIds: string[],
): Promise<Map<string, CreatorContentType>> {
  const result = new Map<string, CreatorContentType>();
  if (videoIds.length === 0) return result;

  const url = new URL(REPORTS_URL);
  url.searchParams.set("ids", "channel==MINE");
  // Wide, fixed date range: creatorContentType is a property of the video
  // itself, not of a viewing period, so the range only needs to cover every
  // video's lifetime-to-date.
  url.searchParams.set("startDate", "2005-01-01");
  url.searchParams.set("endDate", new Date().toISOString().slice(0, 10));
  url.searchParams.set("metrics", "views");
  url.searchParams.set("dimensions", "video,creatorContentType");
  url.searchParams.set("filters", `video==${videoIds.join(",")}`);
  url.searchParams.set("maxResults", "200");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    return result; // network/timeout — best-effort, fall back silently
  }

  if (!response.ok) {
    // Most commonly: insufficient scope (403) for a connection made before
    // this scope existed, or the API not yet enabled. Either way, the
    // duration-heuristic fallback handles every video instead.
    return result;
  }

  const payload = (await response.json().catch(() => null)) as {
    columnHeaders?: Array<{ name?: string }>;
    rows?: Array<Array<string | number>>;
  } | null;
  if (!payload?.rows || !payload.columnHeaders) return result;

  const videoIdx = payload.columnHeaders.findIndex((c) => c.name === "video");
  const typeIdx = payload.columnHeaders.findIndex((c) => c.name === "creatorContentType");
  if (videoIdx < 0 || typeIdx < 0) return result;

  for (const row of payload.rows) {
    const id = String(row[videoIdx] ?? "");
    const rawType = String(row[typeIdx] ?? "").toUpperCase();
    if (!id) continue;
    if (rawType === "SHORTS") result.set(id, "shorts");
    else if (rawType === "VIDEO_ON_DEMAND" || rawType === "LIVE_STREAM") result.set(id, "long_form");
    // "STORY" (deprecated YouTube Stories) or anything unrecognized is left
    // unset — falls back to the duration heuristic rather than guessing.
  }

  return result;
}
