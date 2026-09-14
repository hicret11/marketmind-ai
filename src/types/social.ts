/**
 * Instagram Social Media Intelligence types.
 *
 * MarketMind currently supports ONE real integration: the Sing My Birthday
 * Instagram Professional account, via the official "Instagram API with
 * Instagram Login". No TikTok, no simulated metrics.
 *
 * Hard rules encoded here:
 *  - VERIFIED Instagram data (media fields, insight metrics) is kept separate
 *    from MarketMind AI ANALYSIS (creative labels, interpretations).
 *  - Access tokens live in a SEPARATE store and never appear in these
 *    client-facing shapes.
 *  - An unavailable metric is `null` ("Not available") — never 0.
 */

export type SocialPlatform = "instagram";

export type InstagramAccountType = "BUSINESS" | "CREATOR" | "PERSONAL" | "UNKNOWN";

export type InstagramMediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "UNKNOWN";

export type InstagramMediaProductType =
  | "FEED"
  | "REELS"
  | "STORY"
  | "AD"
  | "UNKNOWN";

/** Public, client-safe account summary. Never carries a token. */
export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  /** Instagram-scoped user id from the API. */
  igUserId: string;
  username: string;
  name: string | null;
  accountType: InstagramAccountType;
  profilePictureUrl: string | null;
  followersCount: number | null;
  mediaCount: number | null;
  connectedAt: string;
  lastSyncAt: string | null;
  /** "active" | "expired" | "revoked" — derived, never the token itself. */
  tokenStatus: "active" | "expired" | "revoked";
}

/** One published Instagram media item, exactly as returned (missing fields => null). */
export interface SocialMediaItem {
  id: string;
  accountId: string;
  igMediaId: string;
  caption: string | null;
  mediaType: InstagramMediaType;
  mediaProductType: InstagramMediaProductType;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  timestamp: string | null;
  username: string | null;
  likeCount: number | null;
  commentsCount: number | null;
  syncedAt: string;
  /** MarketMind AI creative labels — attached later, never from Instagram. */
  creative: CreativeLabels | null;
  creativeAnalyzedAt: string | null;
}

/** A time-stamped snapshot of a media item's insight metrics (availability is time-limited upstream). */
export interface SocialMediaInsightSnapshot {
  id: string;
  accountId: string;
  igMediaId: string;
  capturedAt: string;
  syncRunId: string;
  /** metric name -> value, or null when Instagram did not return it. */
  metrics: Record<string, number | null>;
  /** Metrics MarketMind asked for but the API reported as unsupported for this media. */
  unsupportedMetrics: string[];
}

export interface SocialAccountInsightSnapshot {
  id: string;
  accountId: string;
  capturedAt: string;
  syncRunId: string;
  period: string;
  since: string | null;
  until: string | null;
  metrics: Record<string, number | null>;
  unsupportedMetrics: string[];
}

export type SyncRunStatus = "running" | "success" | "partial" | "error";

export interface SocialSyncRun {
  id: string;
  accountId: string;
  startedAt: string;
  finishedAt: string | null;
  status: SyncRunStatus;
  mediaSynced: number;
  mediaInsightsSynced: number;
  accountInsightsSynced: number;
  warnings: string[];
  error: string | null;
}

/* -------------------------------------------------------------------------- */
/* MarketMind AI creative analysis (NOT performance data)                      */
/* -------------------------------------------------------------------------- */

export type LabelValue = string; // includes "Unknown" / "Not detected"

export interface CreativeLabels {
  contentFormat: LabelValue; // "Reel" | "Image" | "Carousel" | "Story" | "Unknown"
  creativeType: LabelValue; // "Reaction UGC" | "Product Demo" | "POV" | "Meme" | "Static Product" | "Storytelling" | "Educational" | "Unknown"
  hookType: LabelValue; // "POV" | "Question" | "Statement" | "Visual Reveal" | "Reaction" | "Unknown"
  primaryEmotion: LabelValue; // "Joy" | "Surprise" | "Emotional" | "Funny" | "Romantic" | "Unknown"
  contentTheme: LabelValue;
  ctaType: LabelValue; // "Create Yours" | "Link in Bio" | "Learn More" | "None" | "Unknown"
  productVisible: LabelValue; // "Yes" | "No" | "Unknown"
  humanReaction: LabelValue; // "Yes" | "No" | "Unknown"
  personalizationVisible: LabelValue; // "Yes" | "No" | "Unknown"
  textOverlay: LabelValue; // "Yes" | "No" | "Unknown"
  estimatedVideoStyle: LabelValue; // "UGC/handheld" | "Studio" | "Animation/graphics" | "Slideshow" | "N/A" | "Unknown"
  confidence: "low" | "medium" | "high";
  analyzedInputs: string[]; // e.g. ["caption", "thumbnail-image", "metadata"]
}

/* -------------------------------------------------------------------------- */
/* Deterministic performance metrics (computed in code, documented formulas)   */
/* -------------------------------------------------------------------------- */

export interface PerformanceMetrics {
  igMediaId: string;
  /** Raw metrics carried through from the insight snapshot for reference. */
  raw: Record<string, number | null>;
  /** total_interactions / reach — "interactions per person reached". null if denominator missing. */
  interactionRate: number | null;
  /** saved / reach. */
  saveRate: number | null;
  /** shares / reach. */
  shareRate: number | null;
  /** comments_count / reach. */
  commentRate: number | null;
  /** total_interactions / views — for video/Reels where reach may be absent. */
  viewToInteractionRate: number | null;
  formulaNotes: Record<string, string>;
}

/* -------------------------------------------------------------------------- */
/* Pattern comparison + AI insights                                            */
/* -------------------------------------------------------------------------- */

export interface PatternGroupStat {
  label: string;
  posts: number;
  avgViews: number | null;
  avgReach: number | null;
  avgInteractionRate: number | null;
  avgSaveRate: number | null;
  avgShareRate: number | null;
}

export interface PatternComparison {
  dimension: string; // e.g. "creativeType", "hookType", "contentFormat"
  groups: PatternGroupStat[];
  sufficientData: boolean;
  minSample: number;
  note: string;
}

export interface SocialAiInsight {
  finding: string;
  interpretation: string;
  recommendation: string;
  suggestedExperiment: string;
  kpi: string;
}

export interface SocialInsightsResult {
  available: boolean;
  reason: string | null;
  model: string | null;
  generatedAt: string | null;
  insights: SocialAiInsight[];
  basedOn: {
    postsAnalyzed: number;
    comparisonsUsed: number;
  } | null;
}

/* -------------------------------------------------------------------------- */
/* Calendar + publishing                                                       */
/* -------------------------------------------------------------------------- */

export type CalendarEntryStatus = "published" | "scheduled" | "draft";

export interface CalendarEntry {
  id: string;
  accountId: string;
  status: CalendarEntryStatus;
  date: string; // ISO date the post is/was published or scheduled for
  caption: string | null;
  mediaType: InstagramMediaType | null;
  mediaProductType: InstagramMediaProductType | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  /** For published entries, the real Instagram media id. */
  igMediaId: string | null;
  /** For scheduled/draft entries created in MarketMind. */
  mediaSourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
  publishError: string | null;
}

/* -------------------------------------------------------------------------- */
/* Config / status                                                             */
/* -------------------------------------------------------------------------- */

export interface SocialConfigStatus {
  instagram: {
    /** App ID + secret + redirect URI present in the environment. */
    appConfigured: boolean;
    missing: string[];
    redirectUri: string | null;
    /** Permissions MarketMind requests at OAuth time. */
    requestedScopes: string[];
    graphVersion: string;
    connected: boolean;
    account: SocialAccount | null;
    lastSync: SocialSyncRun | null;
    /** Whether content publishing is available (needs instagram_business_content_publish + review). */
    publishingEnabled: boolean;
  };
  ai: {
    configured: boolean;
    model: string | null;
  };
}

/* -------------------------------------------------------------------------- */
/* API response shapes                                                         */
/* -------------------------------------------------------------------------- */

export interface SyncResponse {
  ok: boolean;
  run: SocialSyncRun;
}

export interface MediaListResponse {
  ok: boolean;
  items: Array<{
    media: SocialMediaItem;
    performance: PerformanceMetrics | null;
    latestInsight: SocialMediaInsightSnapshot | null;
  }>;
  nextCursor: string | null;
}

export interface MediaDetailResponse {
  ok: boolean;
  media: SocialMediaItem;
  performance: PerformanceMetrics | null;
  insight: SocialMediaInsightSnapshot | null;
  interpretation: {
    whatWorked: string[];
    whatToTestNext: string[];
  } | null;
}

export interface OverviewResponse {
  ok: boolean;
  connected: boolean;
  account: SocialAccount | null;
  window: { since: string; until: string; days: number } | null;
  accountMetrics: Record<string, number | null> | null;
  totals: {
    postsInWindow: number;
    reels: number;
    images: number;
    carousels: number;
  } | null;
  unavailable: string[];
}
