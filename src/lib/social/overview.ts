import { OVERVIEW_WINDOW_DAYS } from "./config";
import { getConnectedAccount, latestAccountInsight, listMedia } from "./repository";
import type { OverviewResponse } from "@/types/social";

/**
 * "Last 30 Days" overview — real numbers only. Anything Instagram didn't
 * return is listed under `unavailable` and rendered as "Not available".
 */
export async function getOverview(): Promise<OverviewResponse> {
  const account = await getConnectedAccount();
  if (!account) {
    return {
      ok: true,
      connected: false,
      account: null,
      window: null,
      accountMetrics: null,
      totals: null,
      unavailable: [],
    };
  }

  const until = new Date();
  const since = new Date(until.getTime() - OVERVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString();

  const media = await listMedia(account.id);
  const inWindow = media.filter((m) => (m.timestamp ?? "") >= sinceIso);

  const snapshot = await latestAccountInsight(account.id);
  const accountMetrics = snapshot ? snapshot.metrics : null;
  const unavailable = snapshot
    ? [
        ...snapshot.unsupportedMetrics,
        ...Object.entries(snapshot.metrics)
          .filter(([, v]) => v === null)
          .map(([k]) => k),
      ]
    : ["account insights not synced yet"];

  return {
    ok: true,
    connected: true,
    account,
    window: { since: sinceIso, until: until.toISOString(), days: OVERVIEW_WINDOW_DAYS },
    accountMetrics,
    totals: {
      postsInWindow: inWindow.length,
      reels: inWindow.filter((m) => m.mediaProductType === "REELS").length,
      images: inWindow.filter((m) => m.mediaType === "IMAGE").length,
      carousels: inWindow.filter((m) => m.mediaType === "CAROUSEL_ALBUM").length,
    },
    unavailable: Array.from(new Set(unavailable)),
  };
}
