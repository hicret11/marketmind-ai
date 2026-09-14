/**
 * MarketMind Analytics — the cross-module intelligence dashboard.
 *
 * Every section here is READ from an existing module's own repository/
 * calculations (Social, CRM, Opportunity Discovery, Evaluation Lab). Nothing
 * is recalculated differently, and nothing is invented: an unavailable
 * metric is `null` ("Not available"), and a disconnected source reports
 * `connected: false` rather than sample numbers.
 */

export type DateRangeOption = "7d" | "30d" | "90d" | "all";

export const DATE_RANGE_LABELS: Record<DateRangeOption, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};

/* -------------------------------------------------------------------------- */
/* Channel connections                                                        */
/* -------------------------------------------------------------------------- */

export type ChannelId = "instagram" | "youtube" | "tiktok" | "meta_ads";

export interface ChannelConnection {
  id: ChannelId;
  label: string;
  connected: boolean;
  /** Short real status line when connected (e.g. "@singmybirthday"); null otherwise. */
  detail: string | null;
  /** True once OAuth/connect is actually implemented for this channel. */
  implemented: boolean;
}

/* -------------------------------------------------------------------------- */
/* Marketing Performance (reads Social Analytics' own data — never recomputed) */
/* -------------------------------------------------------------------------- */

export interface BestPerformingLabel {
  dimension: string;
  value: string;
  avgInteractionRate: number | null;
  posts: number;
}

export interface MarketingPerformanceSummary {
  connected: boolean;
  postsAnalyzed: number;
  postsInRange: number;
  totalViews: number | null;
  totalReach: number | null;
  totalInteractions: number | null;
  avgInteractionRate: number | null;
  avgSaveRate: number | null;
  avgShareRate: number | null;
  /** Only populated when the underlying comparison has sufficientData. */
  bestCreativeType: BestPerformingLabel | null;
  bestHookType: BestPerformingLabel | null;
  bestCta: BestPerformingLabel | null;
  bestEmotion: BestPerformingLabel | null;
}

/* -------------------------------------------------------------------------- */
/* YouTube Performance (reads the YouTube module's own data — never recomputed) */
/* -------------------------------------------------------------------------- */

export interface YoutubePerformanceSummary {
  connected: boolean;
  channelTitle: string | null;
  subscriberCount: number | null;
  /** Lifetime channel view count, as reported by YouTube (not range-filtered). */
  lifetimeViews: number | null;
  videosAnalyzed: number;
  avgViewsPerVideo: number | null;
  avgLikesPerVideo: number | null;
  avgCommentsPerVideo: number | null;
  /** Always false today — the Data API v3 doesn't expose watch time (needs the YouTube Analytics API). */
  watchTimeAvailable: boolean;
}

/* -------------------------------------------------------------------------- */
/* TikTok Performance (reads the TikTok module's own data — never recomputed)  */
/* -------------------------------------------------------------------------- */

export interface TiktokPerformanceSummary {
  connected: boolean;
  displayName: string | null;
  videosAnalyzed: number;
  totalViews: number | null;
  avgEngagementRate: number | null;
}

/* -------------------------------------------------------------------------- */
/* CRM Performance                                                             */
/* -------------------------------------------------------------------------- */

export interface FunnelStage {
  status: string;
  label: string;
  count: number;
  /** Conversion from the previous stage's count — null for the first stage. */
  conversionFromPrevious: number | null;
}

export interface BreakdownCount {
  label: string;
  count: number;
}

export interface CrmPerformanceSummary {
  totalLeads: number;
  leadsInRange: number;
  funnel: FunnelStage[];
  byRegion: BreakdownCount[];
  byCategory: BreakdownCount[];
  bySource: BreakdownCount[];
}

/* -------------------------------------------------------------------------- */
/* Opportunity Intelligence                                                    */
/* -------------------------------------------------------------------------- */

export interface OpportunityIntelligenceSummary {
  totalReviewed: number;
  strong: number;
  potential: number;
  weak: number;
  notRelevant: number;
  needsReview: number;
  byCategory: BreakdownCount[];
  byScoreRange: BreakdownCount[];
  /** Category with the highest share of Strong/Potential verdicts — null if not enough verified data. */
  topCategory: { label: string; qualifiedRate: number; verifiedCount: number } | null;
  locationBreakdownAvailable: boolean;
}

/* -------------------------------------------------------------------------- */
/* AI Evaluation                                                               */
/* -------------------------------------------------------------------------- */

export interface EvaluationHighlight {
  modelId: string;
  displayName: string;
  value: number;
}

export interface AiEvaluationSummary {
  hasCompletedRun: boolean;
  totalCompletedRuns: number;
  taskTitle: string | null;
  runStartedAt: string | null;
  runStatus: string | null;
  modelsTested: string[];
  bestAccuracy: EvaluationHighlight | null;
  lowestFalsePositiveRate: EvaluationHighlight | null;
  fastest: EvaluationHighlight | null;
  lowestCost: EvaluationHighlight | null;
  isSmallSample: boolean;
}

/* -------------------------------------------------------------------------- */
/* Top summary                                                                 */
/* -------------------------------------------------------------------------- */

export interface AnalyticsOverviewCards {
  socialPerformance: { connected: boolean; postsAnalyzed: number; avgInteractionRate: number | null };
  crmPipeline: { totalLeads: number; converted: number };
  qualifiedOpportunities: { strong: number; potential: number; totalReviewed: number };
  activeBenchmarks: { completedRuns: number; modelsConfigured: number };
}

/* -------------------------------------------------------------------------- */
/* Cross-source insights (Gemini, evidence-gated)                              */
/* -------------------------------------------------------------------------- */

export type InsightConfidence = "low" | "medium" | "high";

export interface CrossSourceInsight {
  finding: string;
  evidence: string[];
  interpretation: string;
  recommendation: string;
  suggestedAction: string;
  confidence: InsightConfidence;
}

export interface CrossSourceInsightsResult {
  available: boolean;
  reason: string | null;
  model: string | null;
  generatedAt: string | null;
  insights: CrossSourceInsight[];
  sourcesUsed: string[];
}

/* -------------------------------------------------------------------------- */
/* Full overview response                                                      */
/* -------------------------------------------------------------------------- */

export interface AnalyticsOverviewResponse {
  ok: boolean;
  range: DateRangeOption;
  overview: AnalyticsOverviewCards;
  channels: ChannelConnection[];
  marketing: MarketingPerformanceSummary;
  youtube: YoutubePerformanceSummary;
  tiktok: TiktokPerformanceSummary;
  crm: CrmPerformanceSummary;
  opportunity: OpportunityIntelligenceSummary;
  evaluation: AiEvaluationSummary;
}

/* -------------------------------------------------------------------------- */
/* Future channels — unified shape, metrics not yet collected                  */
/* -------------------------------------------------------------------------- */

export interface YouTubeVideoMetrics {
  views: number | null;
  watchTimeMinutes: number | null;
  likes: number | null;
  comments: number | null;
  subscribers: number | null;
}

export interface TikTokVideoMetrics {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
}
