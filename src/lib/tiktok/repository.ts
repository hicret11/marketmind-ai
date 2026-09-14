import { randomUUID } from "node:crypto";
import { createJsonArrayStore } from "@/lib/file-store";
import type { TiktokAccount, TiktokSyncRun, TiktokVideoItem } from "@/types/tiktok";

/**
 * TikTok data layer.
 *
 *   tiktok_accounts   -> .data/tiktok-accounts.json
 *   tiktok_videos     -> .data/tiktok-videos.json
 *   tiktok_sync_runs  -> .data/tiktok-sync-runs.json
 *
 * Tokens are NOT here — they live in a separate, server-only store
 * (.data/tiktok-tokens.json) that is never read by any response path,
 * mirroring lib/social/repository.ts and lib/youtube/repository.ts.
 */

interface TokenRecord {
  accountId: string;
  accessToken: string;
  /** null until TikTok grants one. */
  refreshToken: string | null;
  /** ISO timestamp. */
  expiresAt: string;
  obtainedAt: string;
}

const accountsStore = createJsonArrayStore<TiktokAccount>("tiktok-accounts.json");
const tokensStore = createJsonArrayStore<TokenRecord>("tiktok-tokens.json");
const videosStore = createJsonArrayStore<TiktokVideoItem>("tiktok-videos.json");
const syncRunsStore = createJsonArrayStore<TiktokSyncRun>("tiktok-sync-runs.json");

/* ------------------------------- Account --------------------------------- */

export async function getConnectedAccount(): Promise<TiktokAccount | null> {
  const accounts = await accountsStore.list();
  return accounts[0] ?? null;
}

export async function getAccountById(id: string): Promise<TiktokAccount | null> {
  const accounts = await accountsStore.list();
  return accounts.find((a) => a.id === id) ?? null;
}

export async function upsertAccount(
  account: Omit<TiktokAccount, "id"> & { id?: string },
): Promise<TiktokAccount> {
  return accountsStore.mutate((accounts) => {
    const existingIndex = accounts.findIndex((a) => a.openId === account.openId);
    const id = account.id ?? accounts[existingIndex]?.id ?? randomUUID();
    const record: TiktokAccount = { ...account, id };
    if (existingIndex >= 0) accounts[existingIndex] = record;
    else accounts.push(record);
    return { items: accounts, result: record };
  });
}

export async function updateAccount(
  id: string,
  patch: Partial<TiktokAccount>,
): Promise<TiktokAccount | null> {
  return accountsStore.mutate((accounts) => {
    const index = accounts.findIndex((a) => a.id === id);
    if (index < 0) return { items: accounts, result: null };
    accounts[index] = { ...accounts[index], ...patch, id };
    return { items: accounts, result: accounts[index] };
  });
}

export async function disconnectAccount(id: string): Promise<void> {
  await accountsStore.mutate((accounts) => ({
    items: accounts.filter((a) => a.id !== id),
    result: undefined,
  }));
  await tokensStore.mutate((tokens) => ({
    items: tokens.filter((t) => t.accountId !== id),
    result: undefined,
  }));
}

/* -------------------------------- Tokens --------------------------------- */
/* Server-only. Nothing outside this module + sync should import.            */

export async function saveToken(
  record: Omit<TokenRecord, "obtainedAt" | "refreshToken"> & { refreshToken?: string | null },
): Promise<void> {
  await tokensStore.mutate((tokens) => {
    const existing = tokens.find((t) => t.accountId === record.accountId);
    return {
      items: [
        ...tokens.filter((t) => t.accountId !== record.accountId),
        {
          accountId: record.accountId,
          accessToken: record.accessToken,
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

export async function getAccessToken(accountId: string): Promise<AccessTokenInfo | null> {
  const tokens = await tokensStore.list();
  const record = tokens.find((t) => t.accountId === accountId);
  if (!record) return null;
  return {
    accessToken: record.accessToken,
    refreshToken: record.refreshToken,
    expiresAt: record.expiresAt,
    expired: new Date(record.expiresAt).getTime() < Date.now(),
  };
}

/* -------------------------------- Videos ---------------------------------- */

export async function listVideos(accountId: string): Promise<TiktokVideoItem[]> {
  const videos = await videosStore.list();
  return videos
    .filter((v) => v.accountId === accountId)
    .sort((a, b) => (b.createTime ?? "").localeCompare(a.createTime ?? ""));
}

export async function upsertVideo(
  item: Omit<TiktokVideoItem, "id"> & { id?: string },
): Promise<TiktokVideoItem> {
  return videosStore.mutate((videos) => {
    const index = videos.findIndex((v) => v.accountId === item.accountId && v.videoId === item.videoId);
    const id = item.id ?? videos[index]?.id ?? randomUUID();
    // Preserve existing creative labels unless the caller supplied new ones.
    const creative = item.creative ?? videos[index]?.creative ?? null;
    const creativeAnalyzedAt = item.creative ? item.creativeAnalyzedAt : (videos[index]?.creativeAnalyzedAt ?? null);
    const record: TiktokVideoItem = { ...item, id, creative, creativeAnalyzedAt };
    if (index >= 0) videos[index] = record;
    else videos.push(record);
    return { items: videos, result: record };
  });
}

export async function setVideoCreative(
  id: string,
  creative: TiktokVideoItem["creative"],
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

export async function startSyncRun(accountId: string): Promise<TiktokSyncRun> {
  const run: TiktokSyncRun = {
    id: randomUUID(),
    accountId,
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
  patch: Partial<TiktokSyncRun>,
): Promise<TiktokSyncRun | null> {
  return syncRunsStore.mutate((runs) => {
    const index = runs.findIndex((r) => r.id === id);
    if (index < 0) return { items: runs, result: null };
    runs[index] = { ...runs[index], ...patch, finishedAt: patch.finishedAt ?? new Date().toISOString() };
    return { items: runs, result: runs[index] };
  });
}

export async function latestSyncRun(accountId: string): Promise<TiktokSyncRun | null> {
  const runs = await syncRunsStore.list();
  return runs.filter((r) => r.accountId === accountId).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null;
}
