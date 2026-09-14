"use client";

import { useCallback, useEffect, useState } from "react";
import { AiEvaluationSection } from "@/components/analytics/evaluation-section";
import { ChannelComparisonSection } from "@/components/analytics/channel-comparison-section";
import { CrmPerformanceSection } from "@/components/analytics/crm-section";
import { InsightsSection } from "@/components/analytics/insights-section";
import { MarketingPerformanceSection } from "@/components/analytics/marketing-section";
import { OpportunityIntelligenceSection } from "@/components/analytics/opportunity-section";
import { ChannelCards, OverviewCards } from "@/components/analytics/overview-and-channels";
import { ApiError, fetchAnalyticsOverview } from "@/lib/analytics/client";
import { DATE_RANGE_LABELS, type AnalyticsOverviewResponse, type DateRangeOption } from "@/types/analytics";

const RANGE_OPTIONS: DateRangeOption[] = ["7d", "30d", "90d", "all"];

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRangeOption>("30d");
  const [data, setData] = useState<AnalyticsOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback((r: DateRangeOption) => {
    setLoading(true);
    setError(null);
    fetchAnalyticsOverview(r)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load analytics."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(range), [range, load]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-mm-ink">Analytics</h1>
          <p className="mt-1 text-sm text-mm-muted">
            MarketMind&apos;s central intelligence — real data from Instagram, CRM, Opportunity Discovery and the AI
            Evaluation Lab, in one place.
          </p>
        </div>
        <div className="flex gap-1 rounded-full border border-gray-200 bg-white p-1">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                range === r ? "bg-mm-pink text-white" : "text-gray-600"
              }`}
            >
              {DATE_RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading && !data ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-mm-muted">
          Loading real data from every connected module…
        </div>
      ) : data ? (
        <>
          <section>
            <h2 className="mb-2 text-sm font-semibold text-mm-ink">MarketMind Overview</h2>
            <OverviewCards overview={data.overview} />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-mm-ink">Channel Connections</h2>
            <ChannelCards channels={data.channels} />
          </section>

          <MarketingPerformanceSection data={data.marketing} />
          <CrmPerformanceSection data={data.crm} />
          <OpportunityIntelligenceSection data={data.opportunity} />
          <AiEvaluationSection data={data.evaluation} />
          <ChannelComparisonSection
            channels={data.channels}
            marketing={data.marketing}
            youtube={data.youtube}
            tiktok={data.tiktok}
          />
          <InsightsSection range={range} />

          <p className="text-center text-[11px] text-mm-muted">
            The date range above filters posts, leads and opportunities by their real creation/publish date.
            &quot;Best performing&quot; content and the current AI benchmark reflect all-time data — those
            comparisons don&apos;t support range filtering yet.
          </p>
        </>
      ) : null}
    </div>
  );
}
