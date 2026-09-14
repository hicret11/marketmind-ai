import type { ReactNode } from "react";
import type {
  ChannelConnection,
  MarketingPerformanceSummary,
  TiktokPerformanceSummary,
  YoutubePerformanceSummary,
} from "@/types/analytics";
import { MetricValue, SectionCard } from "./analytics-ui";

/**
 * Side-by-side channel comparison. Instagram, YouTube and TikTok show real
 * numbers once connected — every other channel is architecture-only and
 * shown as "Not Connected", never a placeholder metric.
 */
export function ChannelComparisonSection({
  channels,
  marketing,
  youtube,
  tiktok,
}: {
  channels: ChannelConnection[];
  marketing: MarketingPerformanceSummary;
  youtube: YoutubePerformanceSummary;
  tiktok: TiktokPerformanceSummary;
}) {
  return (
    <SectionCard title="Channel Comparison" subtitle="Real metrics only — a channel with no connection shows Not Connected, never a placeholder number.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase text-mm-muted">
              <th className="py-1 pr-3">Channel</th>
              <th className="py-1 pr-3">Status</th>
              <th className="py-1 pr-3">Posts / videos</th>
              <th className="py-1 pr-3">Views</th>
              <th className="py-1">Avg interaction rate</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((c) => {
              const isInstagram = c.id === "instagram";
              const isYoutube = c.id === "youtube";
              const isTiktok = c.id === "tiktok";
              const showInstagramData = isInstagram && marketing.connected;
              const showYoutubeData = isYoutube && youtube.connected;
              const showTiktokData = isTiktok && tiktok.connected;

              let postsCell: ReactNode = "—";
              let viewsCell: ReactNode = "—";
              let rateCell: ReactNode = "—";

              if (showInstagramData) {
                postsCell = marketing.postsAnalyzed;
                viewsCell = <MetricValue value={marketing.totalViews} />;
                rateCell = <MetricValue value={marketing.avgInteractionRate} format="percent" />;
              } else if (showYoutubeData) {
                postsCell = youtube.videosAnalyzed;
                viewsCell = <MetricValue value={youtube.lifetimeViews} />;
                // YouTube's "interaction rate" isn't a native metric here —
                // avg views/video is the honest comparable number we have.
                rateCell = youtube.avgViewsPerVideo != null ? (
                  <span className="text-mm-ink">
                    <MetricValue value={youtube.avgViewsPerVideo} /> avg views/video
                  </span>
                ) : (
                  "—"
                );
              } else if (showTiktokData) {
                postsCell = tiktok.videosAnalyzed;
                viewsCell = <MetricValue value={tiktok.totalViews} />;
                rateCell = <MetricValue value={tiktok.avgEngagementRate} format="percent" />;
              }

              return (
                <tr key={c.id} className="border-t border-gray-100">
                  <td className="py-1.5 pr-3 font-medium text-mm-ink">{c.label}</td>
                  <td className="py-1.5 pr-3">
                    <span className={c.connected ? "text-green-700" : "text-gray-400"}>
                      {c.connected ? "Connected" : "Not Connected"}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3">{postsCell}</td>
                  <td className="py-1.5 pr-3">{viewsCell}</td>
                  <td className="py-1.5">{rateCell}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {youtube.connected && (
        <p className="mt-2 text-[11px] text-mm-muted">
          YouTube watch time isn&apos;t shown yet — it requires the separate YouTube Analytics API.
        </p>
      )}
    </SectionCard>
  );
}
