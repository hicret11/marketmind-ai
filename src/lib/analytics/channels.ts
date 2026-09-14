import { getSocialConfigStatus } from "@/lib/social/status";
import { getYoutubeConfigStatus } from "@/lib/youtube/status";
import { getTiktokConfigStatus } from "@/lib/tiktok/status";
import type { ChannelConnection } from "@/types/analytics";

/**
 * Channel connection cards. Instagram, YouTube and TikTok read their real,
 * existing config status. Meta Ads is an architecture-only placeholder — no
 * OAuth exists for it yet, so it always reports `connected: false,
 * implemented: false` rather than a fake status. Detailed per-platform
 * analysis stays under Social Analytics — this is only a compact summary.
 */
export async function getChannelConnections(): Promise<ChannelConnection[]> {
  const [social, youtube, tiktok] = await Promise.all([
    getSocialConfigStatus(),
    getYoutubeConfigStatus(),
    getTiktokConfigStatus(),
  ]);
  const ig = social.instagram;

  return [
    {
      id: "instagram",
      label: "Instagram",
      connected: ig.connected,
      detail: ig.connected && ig.account ? `@${ig.account.username}` : ig.appConfigured ? null : "Not configured",
      implemented: true,
    },
    {
      id: "youtube",
      label: "YouTube",
      connected: youtube.connected,
      detail: youtube.connected && youtube.channel ? youtube.channel.title : youtube.appConfigured ? null : "Not configured",
      implemented: true,
    },
    {
      id: "tiktok",
      label: "TikTok",
      connected: tiktok.connected,
      detail: tiktok.connected && tiktok.account ? tiktok.account.displayName : tiktok.appConfigured ? null : "Not configured",
      implemented: true,
    },
    { id: "meta_ads", label: "Meta Ads", connected: false, detail: null, implemented: false },
  ];
}
