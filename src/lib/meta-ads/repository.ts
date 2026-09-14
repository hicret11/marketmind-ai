import { randomUUID } from "node:crypto";
import { createJsonArrayStore } from "@/lib/file-store";
import type { AdsChatSession, CampaignDraft, CreatedCampaignResult, MetaAdsAccount } from "@/types/meta-ads";

/**
 * Meta Ads data layer.
 *
 *   meta_ads_accounts    -> .data/meta-ads-accounts.json
 *   meta_ads_chat        -> .data/meta-ads-chat-sessions.json (conversation + its draft)
 *   meta_ads_campaigns   -> .data/meta-ads-created-campaigns.json (what MarketMind has created, always PAUSED)
 *
 * Tokens are NOT here — they live in a separate, server-only store
 * (.data/meta-ads-tokens.json), same pattern as every other platform module.
 */

interface TokenRecord {
  accountId: string;
  accessToken: string;
  expiresAt: string;
  obtainedAt: string;
}

const accountsStore = createJsonArrayStore<MetaAdsAccount>("meta-ads-accounts.json");
const tokensStore = createJsonArrayStore<TokenRecord>("meta-ads-tokens.json");
const chatStore = createJsonArrayStore<AdsChatSession>("meta-ads-chat-sessions.json");
const createdCampaignsStore = createJsonArrayStore<CreatedCampaignResult>("meta-ads-created-campaigns.json");

/* ------------------------------- Account --------------------------------- */

export async function getConnectedAccount(): Promise<MetaAdsAccount | null> {
  const accounts = await accountsStore.list();
  return accounts[0] ?? null;
}

export async function upsertAccount(account: Omit<MetaAdsAccount, "id"> & { id?: string }): Promise<MetaAdsAccount> {
  return accountsStore.mutate((accounts) => {
    const existingIndex = accounts.findIndex((a) => a.userId === account.userId);
    const id = account.id ?? accounts[existingIndex]?.id ?? randomUUID();
    const record: MetaAdsAccount = { ...account, id };
    if (existingIndex >= 0) accounts[existingIndex] = record;
    else accounts.push(record);
    return { items: accounts, result: record };
  });
}

export async function updateAccount(id: string, patch: Partial<MetaAdsAccount>): Promise<MetaAdsAccount | null> {
  return accountsStore.mutate((accounts) => {
    const index = accounts.findIndex((a) => a.id === id);
    if (index < 0) return { items: accounts, result: null };
    accounts[index] = { ...accounts[index], ...patch, id };
    return { items: accounts, result: accounts[index] };
  });
}

export async function disconnectAccount(id: string): Promise<void> {
  await accountsStore.mutate((accounts) => ({ items: accounts.filter((a) => a.id !== id), result: undefined }));
  await tokensStore.mutate((tokens) => ({ items: tokens.filter((t) => t.accountId !== id), result: undefined }));
}

/* -------------------------------- Tokens --------------------------------- */
/* Server-only. Never read outside this module + api-client callers.         */

export async function saveToken(record: Omit<TokenRecord, "obtainedAt">): Promise<void> {
  await tokensStore.mutate((tokens) => ({
    items: [...tokens.filter((t) => t.accountId !== record.accountId), { ...record, obtainedAt: new Date().toISOString() }],
    result: undefined,
  }));
}

export interface AccessTokenInfo {
  accessToken: string;
  expiresAt: string;
  expired: boolean;
}

export async function getAccessToken(accountId: string): Promise<AccessTokenInfo | null> {
  const tokens = await tokensStore.list();
  const record = tokens.find((t) => t.accountId === accountId);
  if (!record) return null;
  return { accessToken: record.accessToken, expiresAt: record.expiresAt, expired: new Date(record.expiresAt).getTime() < Date.now() };
}

/* ------------------------------ Chat / drafts ----------------------------- */

export async function listChatSessions(): Promise<AdsChatSession[]> {
  const sessions = await chatStore.list();
  return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getChatSession(id: string): Promise<AdsChatSession | null> {
  const sessions = await chatStore.list();
  return sessions.find((s) => s.id === id) ?? null;
}

export async function createChatSession(draft: CampaignDraft): Promise<AdsChatSession> {
  const now = new Date().toISOString();
  const session: AdsChatSession = { id: randomUUID(), createdAt: now, updatedAt: now, messages: [], draft };
  await chatStore.mutate((sessions) => ({ items: [session, ...sessions], result: undefined }));
  return session;
}

export async function updateChatSession(
  id: string,
  patch: Partial<Pick<AdsChatSession, "messages" | "draft">>,
): Promise<AdsChatSession | null> {
  return chatStore.mutate((sessions) => {
    const index = sessions.findIndex((s) => s.id === id);
    if (index < 0) return { items: sessions, result: null };
    sessions[index] = { ...sessions[index], ...patch, updatedAt: new Date().toISOString() };
    return { items: sessions, result: sessions[index] };
  });
}

/* --------------------------- Created campaigns ---------------------------- */

export async function recordCreatedCampaign(
  result: Omit<CreatedCampaignResult, "id" | "createdAt">,
): Promise<CreatedCampaignResult> {
  const record: CreatedCampaignResult = { ...result, id: randomUUID(), createdAt: new Date().toISOString() };
  await createdCampaignsStore.mutate((items) => ({ items: [record, ...items], result: undefined }));
  return record;
}

export async function listCreatedCampaigns(): Promise<CreatedCampaignResult[]> {
  return createdCampaignsStore.list();
}
