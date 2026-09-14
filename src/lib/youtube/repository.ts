import { randomUUID } from "node:crypto";
import { createJsonArrayStore } from "@/lib/file-store";
import type { YoutubeChannel, YoutubeSyncRun, YoutubeVideoItem } from "@/types/youtube";

/**
 * YouTube data layer.
 *
 *   youtube_channels   -> .data/youtube-channels.json
 *   youtube_videos     -> .data/youtube-videos.json
 *   youtube_sync_runs  -> .data/youtube-sync-runs.json
 *
 * Tokens are NOT here — they live in a separate, server-only store
 * (.data/youtube-tokens.json) that is never read by any response path,
 * mirroring lib/social/repository.ts.
 */

interface TokenRecord {
  channelId: string;
  accessToken: string;
  /** null until Google grants one (only issued on first consent, or a forced re-consent). */
  refreshToken: string | null;
  /** ISO timestamp. */
  expiresAt: string;
  obtainedAt: string;
}

const channelsStore = createJsonArrayStore<YoutubeChannel>("youtube-channels.json");
const tokensStore = createJsonArrayStore<TokenRecord>("youtube-tokens.json");
const videosStore = createJsonArrayStore<YoutubeVideoItem>("youtube-videos.json");
const syncRunsStore = createJsonArrayStore<YoutubeSyncRun>("youtube-sync-runs.json");

/* ------------------------------- Channel --------------------------------- */

export async function getConnectedChannel(): Promise<YoutubeChannel | null> {
  const channels = await channelsStore.list();
  return channels[0] ?? null;
}

export async function getChannelById(id: string): Promise<YoutubeChannel | null> {
  const channels = await channelsStore.list();
  return channels.find((c) => c.id === id) ?? null;
}

export async function upsertChannel(
  channel: Omit<YoutubeChannel, "id"> & { id?: string },
): Promise<YoutubeChannel> {
  return channelsStore.mutate((channels) => {
    const existingIndex = channels.findIndex((c) => c.channelId === channel.channelId);
    const id = channel.id ?? channels[existingIndex]?.id ?? randomUUID();
    const record: YoutubeChannel = { ...channel, id };
    if (existingIndex >= 0) channels[existingIndex] = record;
    else channels.push(record);
    return { items: channels, result: record };
  });
}

export async function updateChannel(
  id: string,
  patch: Partial<YoutubeChannel>,
): Promise<YoutubeChannel | null> {
  return channelsStore.mutate((channels) => {
    const index = channels.findIndex((c) => c.id === id);
    if (index < 0) return { items: channels, result: null };
    channels[index] = { ...channels[index], ...patch, id };
    return { items: channels, result: channels[index] };
  });
}

export async function disconnectChannel(id: string): Promise<void> {
  await channelsStore.mutate((channels) => ({
    items: channels.filter((c) => c.id !== id),
    result: undefined,
  }));
  await tokensStore.mutate((tokens) => ({
    items: tokens.filter((t) => t.channelId !== id),
    result: undefined,
  }));
}

/* -------------------------------- Tokens --------------------------------- */
/* Server-only. Nothing outside this module + sync should import.            */

export async function saveToken(
  record: Omit<TokenRecord, "obtainedAt" | "refreshToken"> & { refreshToken?: string | null },
): Promise<void> {
  await tokensStore.mutate((tokens) => {
    const existing = tokens.find((t) => t.channelId === record.channelId);
    return {
      items: [
        ...tokens.filter((t) => t.channelId !== record.channelId),
        {
          channelId: record.channelId,
          accessToken: record.accessToken,
          // Google only re-issues a refresh_token on (re-)consent — keep the
          // existing one on a plain access-token refresh.
          refreshToken: record.refreshToken ?? existing?.refreshToken ?? null,
          expiresAt: record.expiresAt,
          obtainedAt: new Date().toISOString(),
        },
      ],
      result: undefined,
    };
  });
}

export interface AccessTokenInfo {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
  expired: boolean;
}

export async function getAccessToken(channelId: string): Promise<AccessTokenInfo | null> {
  const tokens = await tokensStore.list();
  const record = tokens.find((t) => t.channelId === channelId);
  if (!record) return null;
  return {
    accessToken: record.accessToken,
    refreshToken: record.refreshToken,
    expiresAt: record.expiresAt,
    expired: new Date(record.expiresAt).getTime() < Date.now(),
  };
}

/* -------------------------------- Videos ---------------------------------- */

export async function listVideos(channelId: string): Promise<YoutubeVideoItem[]> {
  const videos = await videosStore.list();
  return videos
    .filter((v) => v.channelId === channelId)
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

export async function upsertVideo(
  item: Omit<YoutubeVideoItem, "id"> & { id?: string },
): Promise<YoutubeVideoItem> {
  return videosStore.mutate((videos) => {
    const index = videos.findIndex((v) => v.channelId === item.channelId && v.videoId === item.videoId);
    const id = item.id ?? videos[index]?.id ?? randomUUID();
    // Preserve existing creative labels unless the caller supplied new ones.
    const creative = item.creative ?? videos[index]?.creative ?? null;
    const creativeAnalyzedAt = item.creative ? item.creativeAnalyzedAt : (videos[index]?.creativeAnalyzedAt ?? null);
    const record: YoutubeVideoItem = { ...item, id, creative, creativeAnalyzedAt };
    if (index >= 0) videos[index] = record;
    else videos.push(record);
    return { items: videos, result: record };
  });
}

export async function setVideoCreative(
  id: string,
  creative: YoutubeVideoItem["creative"],
): Promise<void> {
  await videosStore.mutate((videos) => {
    const index = videos.findIndex((v) => v.id === id);
    if (index >= 0) {
      videos[index] = { ...videos[index], creative, creativeAnalyzedAt: new Date().toISOString() };
    }
    return { items: videos, result: undefined };
  });
}

/* ------------------------------ Sync runs ------------------------------ */

export async function startSyncRun(channelId: string): Promise<YoutubeSyncRun> {
  const run: YoutubeSyncRun = {
    id: randomUUID(),
    channelId,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: "running",
    videosSynced: 0,
    warnings: [],
    error: null,
  };
  await syncRunsStore.mutate((runs) => ({ items: [run, ...runs], result: undefined }));
  return run;
}

export async function finishSyncRun(
  id: string,
  patch: Partial<YoutubeSyncRun>,
): Promise<YoutubeSyncRun | null> {
  return syncRunsStore.mutate((runs) => {
    const index = runs.findIndex((r) => r.id === id);
    if (index < 0) return { items: runs, result: null };
    runs[index] = { ...runs[index], ...patch, finishedAt: patch.finishedAt ?? new Date().toISOString() };
    return { items: runs, result: runs[index] };
  });
}

export async function latestSyncRun(channelId: string): Promise<YoutubeSyncRun | null> {
  const runs = await syncRunsStore.list();
  return runs.filter((r) => r.channelId === channelId).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null;
}
