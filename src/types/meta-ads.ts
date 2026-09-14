/**
 * Ads Manager — Meta Ads integration types.
 *
 * SAFETY RULE (see lib/meta-ads/): MarketMind never creates or edits a
 * campaign/ad set/ad in any delivering state. Everything MarketMind creates
 * via the Meta Marketing API is created PAUSED — activation is always a
 * manual step the user takes inside Meta Ads Manager itself.
 *
 * Real Meta Marketing API integration (Graph API), separate from the
 * Instagram "Instagram API with Instagram Login" connection — that one
 * cannot read/write ads. This uses Facebook Login for Business
 * (ads_read, ads_management, business_management scopes).
 *
 * Hard rules (same as every other platform module here):
 *  - Access/refresh tokens live in a SEPARATE store, never in these
 *    client-facing shapes.
 *  - An unavailable/unfetched field is `null` — never invented.
 */

export type MetaAdsTokenStatus = "active" | "expired" | "revoked";

/** Public, client-safe connection summary. Never carries a token. */
export interface MetaAdsAccount {
  id: string;
  /** The Facebook user who connected (for display only). */
  userId: string;
  userName: string | null;
  connectedAt: string;
  tokenStatus: MetaAdsTokenStatus;
  /** Scopes actually granted, exactly as Facebook returned them. */
  grantedScope: string;
  /** The ad account currently selected for campaign creation (ids look like "act_123..."). */
  selectedAdAccountId: string | null;
}

/** One ad account the connected user can act on (from GET /me/adaccounts). */
export interface MetaAdAccountRef {
  id: string; // "act_123..."
  name: string;
  currency: string | null;
  accountStatus: number | null;
  timezoneName: string | null;
}

export interface MetaAdsConfigStatus {
  appConfigured: boolean;
  missing: string[];
  redirectUri: string | null;
  requestedScopes: string[];
  connected: boolean;
  account: MetaAdsAccount | null;
  /** Only populated when Meta's own introspection returned real granted-scope data — never guessed. */
  missingScopes: string[];
  /**
   * Meta's own real error text when the connection is broken for a reason
   * that ISN'T a specific missing scope (e.g. an app-level block) — shown
   * verbatim instead of a fabricated permission list.
   */
  connectionError: string | null;
  adAccounts: MetaAdAccountRef[];
}

/* -------------------------------------------------------------------------- */
/* Campaign draft — built conversationally, validated in code, never          */
/* sent to Meta until the user explicitly approves it.                        */
/* -------------------------------------------------------------------------- */

/** A small, real subset of Meta's campaign objectives (ODAX). */
export type MetaObjective =
  | "OUTCOME_TRAFFIC"
  | "OUTCOME_ENGAGEMENT"
  | "OUTCOME_AWARENESS"
  | "OUTCOME_LEADS"
  | "OUTCOME_SALES";

/** Real Meta call-to-action button types this draft can map to. */
export type MetaCallToActionType =
  | "LEARN_MORE"
  | "SHOP_NOW"
  | "SIGN_UP"
  | "SEND_MESSAGE"
  | "SUBSCRIBE"
  | "WATCH_MORE"
  | "GET_OFFER";

export interface CampaignCreativeSelection {
  source: "existing_instagram_post";
  /** The real synced Instagram media id (types/social.ts SocialMediaItem.igMediaId). */
  igMediaId: string;
  /** For display only — a snapshot of the post at the time it was chosen. */
  caption: string | null;
  mediaType: string | null;
  permalink: string | null;
  thumbnailUrl: string | null;
  timestamp: string | null;
}

export interface CampaignDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
  campaignName: string | null;
  objective: MetaObjective | null;
  dailyBudget: number | null; // in the ad account's currency, major units (e.g. 5 = $5.00)
  currency: string | null;
  startDate: string | null; // ISO date
  endDate: string | null; // ISO date
  durationDays: number | null;
  countries: string[]; // ISO 3166-1 alpha-2
  ageMin: number | null;
  ageMax: number | null;
  interests: string[]; // free-text targeting interests as requested; resolved against Meta's Targeting Search at creation time
  placements: "automatic" | string[] | null;
  creative: CampaignCreativeSelection | null;
  /** What the user asked for (e.g. "Create Yours") — MarketMind's own creative-label vocabulary, not necessarily a real Meta button. */
  ctaLabel: string | null;
  /** The real Meta button type this maps to — always shown alongside ctaLabel, never silently substituted. */
  metaCallToActionType: MetaCallToActionType | null;
  destinationUrl: string | null;
  /** Fields still needed before this draft can be approved. */
  missingFields: string[];
  /** Non-blocking validation notes (e.g. "Budget is unusually low"). */
  warnings: string[];
}

export interface AdsChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface AdsChatSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: AdsChatMessage[];
  draft: CampaignDraft;
}

/* -------------------------------------------------------------------------- */
/* Created campaign result — always PAUSED                                    */
/* -------------------------------------------------------------------------- */

export type CreatedCampaignStatus = "PAUSED";

export interface CreatedCampaignResult {
  id: string;
  draftId: string;
  createdAt: string;
  status: CreatedCampaignStatus;
  campaignId: string;
  adSetId: string;
  adCreativeId: string;
  adId: string;
  adAccountId: string;
}

/* -------------------------------------------------------------------------- */
/* Campaign history + real performance metrics                                */
/* -------------------------------------------------------------------------- */

export interface MetaCampaignSummary {
  id: string;
  name: string;
  status: string; // real Meta status string (ACTIVE/PAUSED/ARCHIVED/...)
  objective: string | null;
  /** Every metric below is null when Meta doesn't return it — never 0-as-missing. */
  spend: number | null;
  impressions: number | null;
  reach: number | null;
  clicks: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  conversions: number | null;
  /** Real Meta ROAS action-value field — null unless a purchase/value action is configured and reported. */
  roas: number | null;
  currency: string | null;
}
