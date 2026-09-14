import { randomUUID } from "node:crypto";
import { createJsonArrayStore } from "@/lib/file-store";
import type {
  CalendarEntry,
  SocialAccount,
  SocialAccountInsightSnapshot,
  SocialMediaInsightSnapshot,
  SocialMediaItem,
  SocialSyncRun,
} from "@/types/social";

/**
 * Social Media data layer.
 *
 *   social_accounts          -> .data/social-accounts.json
 *   social_media             -> .data/social-media.json
 *   social_media_insights    -> .data/social-media-insights.json   (time-stamped snapshots)
 *   social_account_insights  -> .data/social-account-insights.json (time-stamped snapshots)
 *   social_sync_runs         -> .data/social-sync-runs.json
 *   social_calendar          -> .data/social-calendar.json         (manual draft/scheduled entries)
 *
 * Tokens are NOT here — they live in a separate, server-only store
 * (.data/social-tokens.json) that is never read by any response path.
 *
 * File-based because MarketMind's Supabase layer isn't configured. The public
 * surface (getAccount / listMedia / ...) is what a Supabase implementation
 * would re-implement later.
 */

interface TokenRecord {
  accountId: string;
  accessToken: string;
  tokenType: string;
  /** ISO timestamp. */
  expiresAt: string;
  obtainedAt: string;
  scopes: string[];
}

const accountsStore = createJsonArrayStore<SocialAccount>("social-accounts.json");
const tokensStore = createJsonArrayStore<TokenRecord>("social-tokens.json");
const mediaStore = createJsonArrayStore<SocialMediaItem>("social-media.json");
const mediaInsightsStore = createJsonArrayStore<SocialMediaInsightSnapshot>(
  "social-media-insights.json",
);
const accountInsightsStore = createJsonArrayStore<SocialAccountInsightSnapshot>(
  "social-account-insights.json",
);
const syncRunsStore = createJsonArrayStore<SocialSyncRun>("social-sync-runs.json");
const calendarStore = createJsonArrayStore<CalendarEntry>("social-calendar.json");

/* ------------------------------- Accounts -------------------------------- */

export async function getConnectedAccount(): Promise<SocialAccount | null> {
  const accounts = await accountsStore.list();
  return accounts.find((a) => a.platform === "instagram") ?? null;
}

export async function getAccountById(id: string): Promise<SocialAccount | null> {
  const accounts = await accountsStore.list();
  return accounts.find((a) => a.id === id) ?? null;
}

export async function upsertAccount(
  account: Omit<SocialAccount, "id"> & { id?: string },
): Promise<SocialAccount> {
  return accountsStore.mutate((accounts) => {
    const existingIndex = accounts.findIndex(
      (a) => a.platform === account.platform && a.igUserId === account.igUserId,
    );
    const id = account.id ?? accounts[existingIndex]?.id ?? randomUUID();
    const record: SocialAccount = { ...account, id };
    if (existingIndex >= 0) accounts[existingIndex] = record;
    else accounts.push(record);
    return { items: accounts, result: record };
  });
}

export async function updateAccount(
  id: string,
  patch: Partial<SocialAccount>,
): Promise<SocialAccount | null> {
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
/* Server-only. Nothing outside this module + sync/publishing should import.  */

export async function saveToken(record: Omit<TokenRecord, "obtainedAt">): Promise<void> {
  await tokensStore.mutate((tokens) => ({
    items: [
      ...tokens.filter((t) => t.accountId !== record.accountId),
      { ...record, obtainedAt: new Date().toISOString() },
    ],
    result: undefined,
  }));
}

export interface AccessTokenInfo {
  accessToken: string;
  expiresAt: string;
  scopes: string[];
  expired: boolean;
}

export async function getAccessToken(accountId: string): Promise<AccessTokenInfo | null> {
  const tokens = await tokensStore.list();
  const record = tokens.find((t) => t.accountId === accountId);
  if (!record) return null;
  return {
    accessToken: record.accessToken,
    expiresAt: record.expiresAt,
    scopes: record.scopes,
    expired: new Date(record.expiresAt).getTime() < Date.now(),
  };
}

/* -------------------------------- Media ---------------------------------- */

export async function listMedia(accountId: string): Promise<SocialMediaItem[]> {
  const media = await mediaStore.list();
  return media
    .filter((m) => m.accountId === accountId)
    .sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""));
}

export async function getMediaByIgId(
  accountId: string,
  igMediaId: string,
): Promise<SocialMediaItem | null> {
  const media = await mediaStore.list();
  return media.find((m) => m.accountId === accountId && m.igMediaId === igMediaId) ?? null;
}

export async function getMediaById(id: string): Promise<SocialMediaItem | null> {
  const media = await mediaStore.list();
  return media.find((m) => m.id === id) ?? null;
}

export async function upsertMedia(
  item: Omit<SocialMediaItem, "id"> & { id?: string },
): Promise<SocialMediaItem> {
  return mediaStore.mutate((media) => {
    const index = media.findIndex(
      (m) => m.accountId === item.accountId && m.igMediaId === item.igMediaId,
    );
    const id = item.id ?? media[index]?.id ?? randomUUID();
    // Preserve existing creative labels unless the caller supplied new ones.
    const creative = item.creative ?? media[index]?.creative ?? null;
    const creativeAnalyzedAt = item.creative
      ? item.creativeAnalyzedAt
      : (media[index]?.creativeAnalyzedAt ?? null);
    const record: SocialMediaItem = { ...item, id, creative, creativeAnalyzedAt };
    if (index >= 0) media[index] = record;
    else media.push(record);
    return { items: media, result: record };
  });
}

export async function setMediaCreative(
  id: string,
  creative: SocialMediaItem["creative"],
): Promise<void> {
  await mediaStore.mutate((media) => {
    const index = media.findIndex((m) => m.id === id);
    if (index >= 0) {
      media[index] = {
        ...media[index],
        creative,
        creativeAnalyzedAt: new Date().toISOString(),
      };
    }
    return { items: media, result: undefined };
  });
}

/* ---------------------------- Insight snapshots ------------------------- */

export async function addMediaInsightSnapshot(
  snapshot: Omit<SocialMediaInsightSnapshot, "id">,
): Promise<SocialMediaInsightSnapshot> {
  const record: SocialMediaInsightSnapshot = { ...snapshot, id: randomUUID() };
  await mediaInsightsStore.mutate((rows) => ({ items: [...rows, record], result: undefined }));
  return record;
}

export async function latestMediaInsight(
  accountId: string,
  igMediaId: string,
): Promise<SocialMediaInsightSnapshot | null> {
  const rows = await mediaInsightsStore.list();
  return (
    rows
      .filter((r) => r.accountId === accountId && r.igMediaId === igMediaId)
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0] ?? null
  );
}

export async function latestMediaInsightsMap(
  accountId: string,
): Promise<Map<string, SocialMediaInsightSnapshot>> {
  const rows = (await mediaInsightsStore.list())
    .filter((r) => r.accountId === accountId)
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  const map = new Map<string, SocialMediaInsightSnapshot>();
  for (const row of rows) map.set(row.igMediaId, row); // later = newer wins
  return map;
}

export async function addAccountInsightSnapshot(
  snapshot: Omit<SocialAccountInsightSnapshot, "id">,
): Promise<SocialAccountInsightSnapshot> {
  const record: SocialAccountInsightSnapshot = { ...snapshot, id: randomUUID() };
  await accountInsightsStore.mutate((rows) => ({ items: [...rows, record], result: undefined }));
  return record;
}

export async function latestAccountInsight(
  accountId: string,
): Promise<SocialAccountInsightSnapshot | null> {
  const rows = await accountInsightsStore.list();
  return (
    rows
      .filter((r) => r.accountId === accountId)
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0] ?? null
  );
}

/* ------------------------------ Sync runs ------------------------------ */

export async function startSyncRun(accountId: string): Promise<SocialSyncRun> {
  const run: SocialSyncRun = {
    id: randomUUID(),
    accountId,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: "running",
    mediaSynced: 0,
    mediaInsightsSynced: 0,
    accountInsightsSynced: 0,
    warnings: [],
    error: null,
  };
  await syncRunsStore.mutate((runs) => ({ items: [run, ...runs], result: undefined }));
  return run;
}

export async function finishSyncRun(
  id: string,
  patch: Partial<SocialSyncRun>,
): Promise<SocialSyncRun | null> {
  return syncRunsStore.mutate((runs) => {
    const index = runs.findIndex((r) => r.id === id);
    if (index < 0) return { items: runs, result: null };
    runs[index] = {
      ...runs[index],
      ...patch,
      finishedAt: patch.finishedAt ?? new Date().toISOString(),
    };
    return { items: runs, result: runs[index] };
  });
}

export async function latestSyncRun(accountId: string): Promise<SocialSyncRun | null> {
  const runs = await syncRunsStore.list();
  return (
    runs
      .filter((r) => r.accountId === accountId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null
  );
}

/* ------------------------------ Calendar ------------------------------- */

export async function listCalendarEntries(accountId: string): Promise<CalendarEntry[]> {
  const entries = await calendarStore.list();
  return entries.filter((e) => e.accountId === accountId);
}

export async function createCalendarEntry(
  entry: Omit<CalendarEntry, "id" | "createdAt" | "updatedAt">,
): Promise<CalendarEntry> {
  const now = new Date().toISOString();
  const record: CalendarEntry = { ...entry, id: randomUUID(), createdAt: now, updatedAt: now };
  await calendarStore.mutate((entries) => ({ items: [record, ...entries], result: undefined }));
  return record;
}

export async function updateCalendarEntry(
  id: string,
  patch: Partial<CalendarEntry>,
): Promise<CalendarEntry | null> {
  return calendarStore.mutate((entries) => {
    const index = entries.findIndex((e) => e.id === id);
    if (index < 0) return { items: entries, result: null };
    entries[index] = { ...entries[index], ...patch, id, updatedAt: new Date().toISOString() };
    return { items: entries, result: entries[index] };
  });
}

export async function listDueScheduledEntries(nowIso: string): Promise<CalendarEntry[]> {
  const entries = await calendarStore.list();
  return entries.filter((e) => e.status === "scheduled" && e.date <= nowIso);
}
