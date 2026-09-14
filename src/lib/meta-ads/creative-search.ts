import { getConnectedAccount as getInstagramAccount, listMedia } from "@/lib/social/repository";
import type { SocialMediaItem } from "@/types/social";
import type { CampaignCreativeSelection } from "@/types/meta-ads";

/**
 * Searches MarketMind's already-synced Instagram content (read-only — never
 * modifies lib/social/*) so a campaign draft can reference an EXISTING post
 * instead of asking for a new upload. Matches by publish date, caption
 * text, media type, or the real Instagram media id.
 */

export interface CreativeSearchResult {
  media: SocialMediaItem;
  matchedOn: string; // e.g. "published Aug 28, 2026", "caption contains 'flowers'"
}

function toSelection(m: SocialMediaItem): CampaignCreativeSelection {
  return {
    source: "existing_instagram_post",
    igMediaId: m.igMediaId,
    caption: m.caption,
    mediaType: m.mediaProductType === "REELS" ? "Reel" : m.mediaType,
    permalink: m.permalink,
    thumbnailUrl: m.thumbnailUrl ?? (m.mediaType === "IMAGE" ? m.mediaUrl : null),
    timestamp: m.timestamp,
  };
}

export function toCreativeSelection(m: SocialMediaItem): CampaignCreativeSelection {
  return toSelection(m);
}

/**
 * Free-text + optional structured search over synced Instagram media.
 * `query` may mention a date ("August 28", "2026-08-28"), a media type
 * ("reel", "carousel", "image"), or caption words — all matched against the
 * REAL synced fields, nothing guessed.
 */
export async function searchInstagramContent(query: string, limit = 8): Promise<CreativeSearchResult[]> {
  const account = await getInstagramAccount();
  if (!account) return [];
  const media = await listMedia(account.id);

  const q = query.trim().toLowerCase();
  if (!q) return media.slice(0, limit).map((m) => ({ media: m, matchedOn: "most recent" }));

  const dateMatch = parseLooseDateQuery(q);
  const results: CreativeSearchResult[] = [];

  for (const m of media) {
    if (m.igMediaId === query.trim()) {
      results.push({ media: m, matchedOn: `Instagram media id ${m.igMediaId}` });
      continue;
    }
    if (dateMatch && m.timestamp?.slice(0, 10) === dateMatch) {
      results.push({ media: m, matchedOn: `published ${formatDate(m.timestamp)}` });
      continue;
    }
    if (q.includes("reel") && m.mediaProductType === "REELS") {
      results.push({ media: m, matchedOn: "media type: Reel" });
      continue;
    }
    if ((q.includes("carousel") || q.includes("album")) && m.mediaType === "CAROUSEL_ALBUM") {
      results.push({ media: m, matchedOn: "media type: Carousel" });
      continue;
    }
    if (q.includes("image") && m.mediaType === "IMAGE") {
      results.push({ media: m, matchedOn: "media type: Image" });
      continue;
    }
    if (m.caption && m.caption.toLowerCase().includes(q)) {
      results.push({ media: m, matchedOn: `caption contains "${query.trim()}"` });
    }
  }

  return results.slice(0, limit);
}

export async function findByIgMediaId(igMediaId: string): Promise<SocialMediaItem | null> {
  const account = await getInstagramAccount();
  if (!account) return null;
  const media = await listMedia(account.id);
  return media.find((m) => m.igMediaId === igMediaId) ?? null;
}

/** Parses "August 28", "Aug 28 2026", "2026-08-28" into "YYYY-MM-DD" — returns null if it doesn't look like a date. */
function parseLooseDateQuery(q: string): string | null {
  const isoMatch = q.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];

  const months = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];
  const m = q.match(new RegExp(`(${months.join("|")})\\.?\\s+(\\d{1,2})(?:,?\\s*(\\d{4}))?`, "i"));
  if (!m) return null;
  const monthIndex = months.indexOf(m[1].toLowerCase());
  const day = m[2].padStart(2, "0");
  const year = m[3] ?? String(new Date().getFullYear());
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${day}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "an unknown date";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}
