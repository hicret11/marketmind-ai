import { instagramGraphVersion, isPublishingEnabled } from "./config";
import { SocialError } from "./errors";
import {
  getAccessToken,
  getConnectedAccount,
  listDueScheduledEntries,
  updateCalendarEntry,
} from "./repository";
import type { CalendarEntry } from "@/types/social";

/**
 * Real Instagram Content Publishing — architecture prepared, not faked.
 *
 * Publishing needs the `instagram_business_content_publish` permission, which
 * requires Meta App Review. Until it is granted + `INSTAGRAM_ENABLE_PUBLISHING`
 * is set, every publish attempt throws SOCIAL_PUBLISH_NOT_PERMITTED and the UI
 * shows "Publishing requires Instagram content publishing permission".
 *
 * When enabled, the real flow is:
 *   POST /{ig-user-id}/media           -> creation_id (container)
 *   poll GET /{creation-id}?fields=status_code  (until FINISHED)
 *   POST /{ig-user-id}/media_publish   -> real media id
 * A post is only marked "published" after Instagram returns a media id.
 */

export interface PublishResult {
  igMediaId: string;
  permalink: string | null;
}

export interface PublishingService {
  readonly enabled: boolean;
  publish(input: {
    accountId: string;
    igUserId: string;
    accessToken: string;
    mediaUrl: string;
    caption: string | null;
    isVideo: boolean;
  }): Promise<PublishResult>;
}

class InstagramPublishingService implements PublishingService {
  get enabled(): boolean {
    return isPublishingEnabled();
  }

  async publish(input: {
    accountId: string;
    igUserId: string;
    accessToken: string;
    mediaUrl: string;
    caption: string | null;
    isVideo: boolean;
  }): Promise<PublishResult> {
    if (!this.enabled) throw new SocialError("SOCIAL_PUBLISH_NOT_PERMITTED");

    const base = `https://graph.instagram.com/${instagramGraphVersion()}`;

    // 1. Create container
    const createBody = new URLSearchParams({ access_token: input.accessToken });
    if (input.isVideo) {
      createBody.set("media_type", "REELS");
      createBody.set("video_url", input.mediaUrl);
    } else {
      createBody.set("image_url", input.mediaUrl);
    }
    if (input.caption) createBody.set("caption", input.caption);

    const container = await postJson<{ id?: string }>(
      `${base}/${input.igUserId}/media`,
      createBody,
    );
    if (!container.id) throw new SocialError("SOCIAL_API_ERROR", "Instagram did not return a media container id.");

    // 2. Wait for processing (videos especially)
    await waitForContainer(base, container.id, input.accessToken);

    // 3. Publish
    const published = await postJson<{ id?: string }>(
      `${base}/${input.igUserId}/media_publish`,
      new URLSearchParams({
        creation_id: container.id,
        access_token: input.accessToken,
      }),
    );
    if (!published.id) {
      throw new SocialError("SOCIAL_API_ERROR", "Instagram did not confirm publication.");
    }

    return { igMediaId: published.id, permalink: null };
  }
}

async function waitForContainer(
  base: string,
  containerId: string,
  accessToken: string,
): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const status = await getJson<{ status_code?: string; status?: string }>(
      `${base}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`,
    );
    const code = status.status_code ?? status.status;
    if (code === "FINISHED") return;
    if (code === "ERROR" || code === "EXPIRED") {
      throw new SocialError("SOCIAL_API_ERROR", `Media container ${code}.`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new SocialError("SOCIAL_API_ERROR", "Timed out waiting for Instagram to process the media.");
}

async function postJson<T>(url: string, body: URLSearchParams): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(30000),
  });
  const payload = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!res.ok || !payload) {
    throw new SocialError(
      "SOCIAL_API_ERROR",
      payload?.error?.message ? `Instagram: ${payload.error.message}` : undefined,
    );
  }
  return payload;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const payload = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!res.ok || !payload) {
    throw new SocialError(
      "SOCIAL_API_ERROR",
      payload?.error?.message ? `Instagram: ${payload.error.message}` : undefined,
    );
  }
  return payload;
}

export function getPublishingService(): PublishingService {
  return new InstagramPublishingService();
}

/**
 * Entry point for a server-side scheduler/cron (NOT the browser). Publishes any
 * scheduled calendar entries whose time has arrived. Marks "published" only on
 * a real Instagram media id; on failure records the error and leaves status.
 */
export async function runDueScheduledPosts(): Promise<{
  attempted: number;
  published: number;
  failed: number;
  results: Array<{ entryId: string; ok: boolean; error?: string }>;
}> {
  const service = getPublishingService();
  const account = await getConnectedAccount();
  const results: Array<{ entryId: string; ok: boolean; error?: string }> = [];

  if (!account) return { attempted: 0, published: 0, failed: 0, results };
  if (!service.enabled) {
    return { attempted: 0, published: 0, failed: 0, results };
  }

  const token = await getAccessToken(account.id);
  if (!token || token.expired) {
    return { attempted: 0, published: 0, failed: 0, results };
  }

  const due = await listDueScheduledEntries(new Date().toISOString());
  let published = 0;
  let failed = 0;

  for (const entry of due) {
    if (!entry.mediaSourceUrl) {
      failed += 1;
      results.push({ entryId: entry.id, ok: false, error: "No media URL." });
      await updateCalendarEntry(entry.id, { publishError: "No media URL." });
      continue;
    }
    try {
      const result = await service.publish({
        accountId: account.id,
        igUserId: account.igUserId,
        accessToken: token.accessToken,
        mediaUrl: entry.mediaSourceUrl,
        caption: entry.caption,
        isVideo: /\.(mp4|mov|m4v)(\?|$)/i.test(entry.mediaSourceUrl),
      });
      await updateCalendarEntry(entry.id, {
        status: "published",
        igMediaId: result.igMediaId,
        publishError: null,
      });
      published += 1;
      results.push({ entryId: entry.id, ok: true });
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Publish failed.";
      await updateCalendarEntry(entry.id, { publishError: message });
      results.push({ entryId: entry.id, ok: false, error: message });
    }
  }

  return { attempted: due.length, published, failed, results };
}

export function assertPublishingConfigured(entry: CalendarEntry): void {
  if (!isPublishingEnabled()) {
    throw new SocialError("SOCIAL_PUBLISH_NOT_PERMITTED");
  }
  if (!entry.mediaSourceUrl) {
    throw new SocialError("INVALID_REQUEST", "This entry has no media URL to publish.");
  }
}
