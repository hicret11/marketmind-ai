import { TIKTOK_SCOPES, isTiktokAppConfigured, missingTiktokScopes, tiktokMissingConfig, tiktokRedirectUri } from "./config";
import { getConnectedAccount, latestSyncRun } from "./repository";
import type { TiktokConfigStatus } from "@/types/tiktok";

/** The full, token-free status the UI reads. */
export async function getTiktokConfigStatus(): Promise<TiktokConfigStatus> {
  const appConfigured = isTiktokAppConfigured();
  const account = await getConnectedAccount();
  const lastSync = account ? await latestSyncRun(account.id) : null;

  return {
    appConfigured,
    missing: tiktokMissingConfig(),
    redirectUri: appConfigured ? tiktokRedirectUri() : null,
    requestedScopes: TIKTOK_SCOPES,
    connected: Boolean(account),
    account: account ?? null,
    lastSync: lastSync ?? null,
    // Never silently continue on a missing scope — surfaced so the UI can
    // tell the user exactly what to do ("Reconnect TikTok...").
    missingScopes: account ? missingTiktokScopes(account.grantedScope) : [],
  };
}
