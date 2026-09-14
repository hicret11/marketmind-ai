import { SocialError } from "./errors";
import {
  createCalendarEntry,
  getConnectedAccount,
  listCalendarEntries,
  listMedia,
} from "./repository";
import type { CalendarEntry } from "@/types/social";

/**
 * The real Social Media Calendar.
 *
 * Historical dates are populated automatically from synced published Instagram
 * posts (status "published") — the user never re-creates a past post by hand.
 * Future content the user adds is "draft" or "scheduled".
 */

function isoDate(timestamp: string | null): string {
  if (!timestamp) return "";
  return timestamp.slice(0, 10);
}

export async function getCalendar(): Promise<{
  connected: boolean;
  entries: CalendarEntry[];
}> {
  const account = await getConnectedAccount();
  if (!account) return { connected: false, entries: [] };

  const media = await listMedia(account.id);
  const published: CalendarEntry[] = media.map((m) => ({
    id: `pub_${m.id}`,
    accountId: account.id,
    status: "published",
    date: isoDate(m.timestamp),
    caption: m.caption,
    mediaType: m.mediaType,
    mediaProductType: m.mediaProductType,
    thumbnailUrl: m.thumbnailUrl ?? m.mediaUrl,
    permalink: m.permalink,
    igMediaId: m.igMediaId,
    mediaSourceUrl: null,
    createdAt: m.syncedAt,
    updatedAt: m.syncedAt,
    publishError: null,
  }));

  const manual = await listCalendarEntries(account.id);

  const entries = [...published, ...manual].sort((a, b) => b.date.localeCompare(a.date));
  return { connected: true, entries };
}

export interface NewCalendarEntryInput {
  status: "draft" | "scheduled";
  date: string;
  caption?: string;
  mediaSourceUrl?: string;
}

export async function addCalendarEntry(input: NewCalendarEntryInput): Promise<CalendarEntry> {
  const account = await getConnectedAccount();
  if (!account) throw new SocialError("SOCIAL_NOT_CONNECTED");

  if (!input.date || Number.isNaN(Date.parse(input.date))) {
    throw new SocialError("INVALID_REQUEST", "A valid date is required.");
  }
  if (input.status === "scheduled" && !input.mediaSourceUrl) {
    throw new SocialError(
      "INVALID_REQUEST",
      "A scheduled post needs a publicly reachable media URL (Instagram publishing fetches it by URL).",
    );
  }

  return createCalendarEntry({
    accountId: account.id,
    status: input.status,
    date: new Date(input.date).toISOString(),
    caption: input.caption?.trim() ? input.caption.trim() : null,
    mediaType: null,
    mediaProductType: null,
    thumbnailUrl: input.mediaSourceUrl ?? null,
    permalink: null,
    igMediaId: null,
    mediaSourceUrl: input.mediaSourceUrl ?? null,
    publishError: null,
  });
}
