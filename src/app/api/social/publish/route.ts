import { isPublishingEnabled } from "@/lib/social/config";
import { SocialError, toSocialErrorResponse } from "@/lib/social/errors";
import { getPublishingService } from "@/lib/social/publishing";
import {
  getAccessToken,
  getConnectedAccount,
  listCalendarEntries,
  updateCalendarEntry,
} from "@/lib/social/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Publish one calendar entry now. Only marks "published" on a real Instagram media id. */
export async function POST(request: Request) {
  try {
    if (!isPublishingEnabled()) {
      throw new SocialError("SOCIAL_PUBLISH_NOT_PERMITTED");
    }
    const body = (await request.json().catch(() => null)) as { entryId?: string } | null;
    const entryId = body?.entryId;
    if (!entryId) throw new SocialError("INVALID_REQUEST", "`entryId` is required.");

    const account = await getConnectedAccount();
    if (!account) throw new SocialError("SOCIAL_NOT_CONNECTED");

    const entry = (await listCalendarEntries(account.id)).find((e) => e.id === entryId);
    if (!entry) throw new SocialError("INVALID_REQUEST", "Calendar entry not found.", { status: 404 });
    if (!entry.mediaSourceUrl) {
      throw new SocialError("INVALID_REQUEST", "This entry has no media URL to publish.");
    }

    const token = await getAccessToken(account.id);
    if (!token || token.expired) throw new SocialError("SOCIAL_TOKEN_EXPIRED");

    const result = await getPublishingService().publish({
      accountId: account.id,
      igUserId: account.igUserId,
      accessToken: token.accessToken,
      mediaUrl: entry.mediaSourceUrl,
      caption: entry.caption,
      isVideo: /\.(mp4|mov|m4v)(\?|$)/i.test(entry.mediaSourceUrl),
    });

    const updated = await updateCalendarEntry(entry.id, {
      status: "published",
      igMediaId: result.igMediaId,
      publishError: null,
    });
    return Response.json({ ok: true, entry: updated });
  } catch (error) {
    return toSocialErrorResponse(error);
  }
}
