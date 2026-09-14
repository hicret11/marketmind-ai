import { resolveAiProvider } from "@/lib/opportunity/ai/provider";
import {
  instagramGraphVersion,
  instagramMissingConfig,
  instagramRedirectUri,
  isInstagramAppConfigured,
  isPublishingEnabled,
  scopesForOAuth,
} from "./config";
import { getConnectedAccount, latestSyncRun } from "./repository";
import type { SocialConfigStatus } from "@/types/social";

/** The full, token-free status the UI and Chat both read. */
export async function getSocialConfigStatus(): Promise<SocialConfigStatus> {
  const appConfigured = isInstagramAppConfigured();
  const account = await getConnectedAccount();
  const lastSync = account ? await latestSyncRun(account.id) : null;
  const aiProvider = resolveAiProvider();

  return {
    instagram: {
      appConfigured,
      missing: instagramMissingConfig(),
      redirectUri: appConfigured ? instagramRedirectUri() : null,
      requestedScopes: scopesForOAuth(),
      graphVersion: instagramGraphVersion(),
      connected: Boolean(account),
      account: account ?? null,
      lastSync: lastSync ?? null,
      publishingEnabled: isPublishingEnabled(),
    },
    ai: {
      configured: Boolean(aiProvider),
      model: aiProvider?.model ?? null,
    },
  };
}
