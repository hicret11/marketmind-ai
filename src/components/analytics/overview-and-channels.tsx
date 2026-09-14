import Link from "next/link";
import type { AnalyticsOverviewCards, ChannelConnection } from "@/types/analytics";
import { MetricValue, StatTile } from "./analytics-ui";

export function OverviewCards({ overview }: { overview: AnalyticsOverviewCards }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile
        label="Social Performance"
        value={
          overview.socialPerformance.connected ? (
            <MetricValue value={overview.socialPerformance.avgInteractionRate} format="percent" />
          ) : (
            <span className="text-xs italic text-gray-400">Not Connected</span>
          )
        }
      />
      <StatTile label="CRM Pipeline" value={overview.crmPipeline.totalLeads} />
      <StatTile
        label="Qualified Opportunities"
        value={`${overview.qualifiedOpportunities.strong + overview.qualifiedOpportunities.potential}/${overview.qualifiedOpportunities.totalReviewed}`}
      />
      <StatTile label="Active Benchmarks" value={overview.activeBenchmarks.completedRuns} />
    </div>
  );
}

export function ChannelCards({ channels }: { channels: ChannelConnection[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {channels.map((c) => (
        <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-mm-ink">{c.label}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                c.connected ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
              }`}
            >
              {c.connected ? "Connected" : "Not Connected"}
            </span>
          </div>
          {c.detail && <p className="mt-1 text-xs text-mm-muted">{c.detail}</p>}
          {!c.connected && c.implemented && (
            <Link
              href="/social-media"
              className="mt-2 inline-block rounded-full bg-mm-pink px-3 py-1 text-[11px] font-semibold text-white"
            >
              Connect
            </Link>
          )}
          {!c.implemented && (
            <button
              type="button"
              disabled
              title="Architecture prepared — connection not implemented yet"
              className="mt-2 rounded-full border border-gray-300 px-3 py-1 text-[11px] font-semibold text-gray-400"
            >
              Connect (coming soon)
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
