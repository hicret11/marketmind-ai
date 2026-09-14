import { apiRequest } from "@/lib/http";
import type { AnalyticsOverviewResponse, CrossSourceInsightsResult, DateRangeOption } from "@/types/analytics";

export { ApiError } from "@/lib/http";

export function fetchAnalyticsOverview(range: DateRangeOption): Promise<AnalyticsOverviewResponse> {
  return apiRequest<AnalyticsOverviewResponse>(`/api/analytics/overview?range=${range}`);
}

export function generateCrossSourceInsights(
  range: DateRangeOption,
): Promise<{ ok: boolean } & CrossSourceInsightsResult> {
  return apiRequest("/api/analytics/insights", { method: "POST", body: JSON.stringify({ range }) });
}
