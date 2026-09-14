import { YOUTUBE_SCOPES, isYoutubeAppConfigured, youtubeMissingConfig, youtubeRedirectUri } from "./config";
import { getConnectedChannel, latestSyncRun } from "./repository";
import type { YoutubeConfigStatus } from "@/types/youtube";

/** The full, token-free status the UI reads. */
export async function getYoutubeConfigStatus(): Promise<YoutubeConfigStatus> {
  const appConfigured = isYoutubeAppConfigured();
  const channel = await getConnectedChannel();
  const lastSync = channel ? await latestSyncRun(channel.id) : null;

  return {
    appConfigured,
    missing: youtubeMissingConfig(),
    redirectUri: appConfigured ? youtubeRedirectUri() : null,
    requestedScopes: YOUTUBE_SCOPES,
    connected: Boolean(channel),
    channel: channel ?? null,
    lastSync: lastSync ?? null,
  };
}
