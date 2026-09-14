import Link from "next/link";
import type { BestPerformingLabel, MarketingPerformanceSummary } from "@/types/analytics";
import { MetricValue, NotConnected, SectionCard, StatTile } from "./analytics-ui";

function BestRow({ label, best }: { label: string; best: BestPerformingLabel | null }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-xs">
      <span className="text-mm-muted">{label}</span>
      {best ? (
        <span className="font-medium text-mm-ink">
          {best.value} · <MetricValue value={best.avgInteractionRate} format="percent" /> ({best.posts} posts)
        </span>
      ) : (
        <span className="italic text-gray-400">Not enough data yet</span>
      )}
    </div>
  );
}

export function MarketingPerformanceSection({ data }: { data: MarketingPerformanceSummary }) {
  return (
    <SectionCard title="Marketing Performance" subtitle="Real Instagram data, read from Social Analytics — never recalculated here.">
      {!data.connected ? (
        <NotConnected label="Instagram" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="Posts analyzed" value={data.postsAnalyzed} />
            <StatTile label="Views" value={<MetricValue value={data.totalViews} />} />
            <StatTile label="Reach" value={<MetricValue value={data.totalReach} />} />
            <StatTile label="Interactions" value={<MetricValue value={data.totalInteractions} />} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Avg interaction rate" value={<MetricValue value={data.avgInteractionRate} format="percent" />} />
            <StatTile label="Avg save rate" value={<MetricValue value={data.avgSaveRate} format="percent" />} />
            <StatTile label="Avg share rate" value={<MetricValue value={data.avgShareRate} format="percent" />} />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-mm-muted">
              Best performing (all synced posts, by interaction rate)
            </p>
            <div className="space-y-1.5">
              <BestRow label="Creative type" best={data.bestCreativeType} />
              <BestRow label="Hook type" best={data.bestHookType} />
              <BestRow label="CTA" best={data.bestCta} />
              <BestRow label="Emotion" best={data.bestEmotion} />
            </div>
          </div>
          <Link href="/social-media/analytics" className="text-xs text-mm-dark-rose underline decoration-mm-rose/50 underline-offset-2">
            Open full Social Analytics →
          </Link>
        </div>
      )}
    </SectionCard>
  );
}
