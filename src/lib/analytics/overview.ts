import { getChannelConnections } from "./channels";
import { getMarketingPerformance } from "./marketing";
import { getYoutubePerformance } from "./youtube-performance";
import { getTiktokPerformance } from "./tiktok-performance";
import { getCrmPerformance } from "@/lib/crm/analytics";
import { getAiEvaluationSummary, getOpportunityIntelligence } from "@/lib/evaluation/analytics";
import { getConfiguredProviders } from "@/lib/evaluation/providers/registry";
import type { AnalyticsOverviewResponse, DateRangeOption } from "@/types/analytics";

export async function getAnalyticsOverview(range: DateRangeOption): Promise<AnalyticsOverviewResponse> {
  const [channels, marketing, youtube, tiktok, crm, opportunity, evaluation, configuredModels] = await Promise.all([
    getChannelConnections(),
    getMarketingPerformance(range),
    getYoutubePerformance(),
    getTiktokPerformance(),
    getCrmPerformance(range),
    getOpportunityIntelligence(range),
    getAiEvaluationSummary(),
    getConfiguredProviders(),
  ]);

  const converted = crm.funnel.find((f) => f.status === "converted")?.count ?? 0;

  return {
    ok: true,
    range,
    overview: {
      socialPerformance: {
        connected: marketing.connected,
        postsAnalyzed: marketing.postsAnalyzed,
        avgInteractionRate: marketing.avgInteractionRate,
      },
      crmPipeline: { totalLeads: crm.totalLeads, converted },
      qualifiedOpportunities: {
        strong: opportunity.strong,
        potential: opportunity.potential,
        totalReviewed: opportunity.totalReviewed,
      },
      activeBenchmarks: {
        completedRuns: evaluation.totalCompletedRuns,
        modelsConfigured: configuredModels.length,
      },
    },
    channels,
    marketing,
    youtube,
    tiktok,
    crm,
    opportunity,
    evaluation,
  };
}
