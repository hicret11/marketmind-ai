import { env } from "@/lib/opportunity/env";

/**
 * Meta Ads (Marketing API) configuration.
 *
 * Uses Facebook Login for Business — a DIFFERENT product from Instagram's
 * own "Instagram API with Instagram Login" connection (lib/social/config.ts,
 * untouched). Reuses the same Meta App credentials where possible (a Meta
 * App id/secret is app-level, not product-specific) by falling back to
 * INSTAGRAM_APP_ID/INSTAGRAM_APP_SECRET when no dedicated META_ADS_* value
 * is set — but never touches Instagram's own connection/tokens.
 *
 * With no credentials the feature reports "not configured"; with credentials
 * but no connected account it reports "not connected". It never shows
 * sample campaigns or metrics.
 */

export const DEFAULT_GRAPH_VERSION = "v23.0";

/**
 * Only what the Marketing API's own required flows need — no
 * business_management unless the account graph genuinely needs it (kept
 * here in case a Business Manager–owned ad account requires it; the app
 * only ever asks for what read/write actually needs).
 */
export const META_ADS_SCOPES = ["ads_read", "ads_management"];

export function metaAdsGraphVersion(): string {
  return env("META_ADS_GRAPH_VERSION") || DEFAULT_GRAPH_VERSION;
}

export function metaAdsAppId(): string {
  return env("META_ADS_APP_ID") || env("INSTAGRAM_APP_ID");
}

export function metaAdsAppSecret(): string {
  return env("META_ADS_APP_SECRET") || env("INSTAGRAM_APP_SECRET");
}

export function metaAdsRedirectUri(): string {
  const explicit = env("META_ADS_REDIRECT_URI");
  if (explicit) return explicit;
  const base = env("APP_BASE_URL") || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/ads/meta/callback`;
}

/** True if the OAuth (Facebook Login for Business) path specifically is configured. */
export function isMetaAdsOAuthConfigured(): boolean {
  return Boolean(metaAdsAppId() && metaAdsAppSecret() && metaAdsRedirectUri());
}

/** True if EITHER connection path — static token or OAuth — is configured. */
export function isMetaAdsAppConfigured(): boolean {
  return isMetaAdsStaticModeConfigured() || isMetaAdsOAuthConfigured();
}

/** What's missing to configure at least one path — prefers explaining the simpler static-token path first. */
export function metaAdsMissingConfig(): string[] {
  if (isMetaAdsStaticModeConfigured() || isMetaAdsOAuthConfigured()) return [];
  return metaAdsStaticModeMissing();
}

/** Parses a granted-scope string (comma-separated, as Facebook returns it) into a list. */
export function parseGrantedScope(grantedScope: string | null | undefined): string[] {
  if (!grantedScope) return [];
  return grantedScope
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Which of the scopes MarketMind needs are NOT present — never silently ignored. */
export function missingMetaAdsScopes(grantedScope: string | null | undefined): string[] {
  const granted = new Set(parseGrantedScope(grantedScope));
  return META_ADS_SCOPES.filter((s) => !granted.has(s));
}

/** Bound on how many historical campaigns MarketMind reads per request. */
export const META_ADS_MAX_CAMPAIGNS = 50;

/* -------------------------------------------------------------------------- */
/* Static-token mode                                                          */
/* -------------------------------------------------------------------------- */
/**
 * A real, simpler alternative to the OAuth flow above for a single business's
 * own ad account: a long-lived Meta System User token (generated once in
 * Business Settings, with ads_read/ads_management assigned directly to it)
 * plus that ad account's id, both server-side env vars. This is a genuinely
 * production-viable pattern — a personal system-user token scoped to one ad
 * account doesn't need Meta App Review the way a public OAuth consent flow
 * eventually would. When both are present and don't look like placeholder
 * values, this mode is used instead of the OAuth-connected account.
 */

const PLACEHOLDER_MARKERS = ["your", "alacağın", "aldığın", "example", "xxxx", "changeme"];

function looksLikePlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((m) => lower.includes(m));
}

export function metaAdsStaticAccessToken(): string {
  return env("META_ADS_ACCESS_TOKEN");
}

export function metaAdsStaticAdAccountId(): string {
  return env("META_AD_ACCOUNT_ID");
}

/** True only when both values are present AND look like real Meta values, not leftover placeholders. */
export function isMetaAdsStaticModeConfigured(): boolean {
  const token = metaAdsStaticAccessToken();
  const adAccountId = metaAdsStaticAdAccountId();
  if (!token || !adAccountId) return false;
  if (looksLikePlaceholder(token) || looksLikePlaceholder(adAccountId)) return false;
  // Real Meta ad account ids are "act_" followed by digits; real user/system
  // tokens are long. Reject anything that's clearly still a template value
  // (e.g. the literal "act_" with nothing after it).
  if (!/^act_\d+$/.test(adAccountId)) return false;
  if (token.length < 40) return false;
  return true;
}

export function metaAdsStaticModeMissing(): string[] {
  const missing: string[] = [];
  const token = metaAdsStaticAccessToken();
  const adAccountId = metaAdsStaticAdAccountId();
  if (!token || looksLikePlaceholder(token) || token.length < 40) {
    missing.push("META_ADS_ACCESS_TOKEN (a real long-lived Meta token, not the placeholder)");
  }
  if (!adAccountId || looksLikePlaceholder(adAccountId) || !/^act_\d+$/.test(adAccountId)) {
    missing.push("META_AD_ACCOUNT_ID (the real ad account id, e.g. act_1234567890)");
  }
  return missing;
}
