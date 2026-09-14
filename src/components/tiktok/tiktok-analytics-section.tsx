"use client";

import { useCallback, useEffect, useState } from "react";
import { GenericPatternComparisonCard } from "@/components/social/generic-pattern-comparison";
import { CreativeInsightsSection } from "@/components/social/creative-insights-section";
import { MetricValue } from "@/components/social/social-ui";
import {
  ApiError,
  fetchTiktokPatterns,
  fetchTiktokStatus,
  fetchTiktokVideos,
  generateTiktokInsights,
  labelPendingTiktokVideos,
} from "@/lib/tiktok/client";
import type { GenericPatternComparison } from "@/lib/social/pattern-engine";
import type { CreativeInsightsResult } from "@/types/creative-insights";
import { ConnectTiktok } from "./connect-tiktok";
import type { TiktokConfigStatus } from "@/types/tiktok";

/**
 * TikTok's own Social Analytics tab. Views/likes/comments/shares and the
 * derived engagement rate are all real, computed in code — never invented.
 * "Not Connected" shows plainly until TikTok OAuth is configured and used.
 */
export function TiktokAnalyticsSection() {
  const [config, setConfig] = useState<TiktokConfigStatus | null>(null);
  const [patterns, setPatterns] = useState<{
    totalVideos: number;
    labelledVideos: number;
    comparisons: GenericPatternComparison[];
  } | null>(null);
  const [totals, setTotals] = useState<{ views: number; likes: number; comments: number; shares: number } | null>(null);
  const [labeling, setLabeling] = useState(false);
  const [labelNotice, setLabelNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [insights, setInsights] = useState<CreativeInsightsResult | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  async function runInsights() {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      setInsights(await generateTiktokInsights());
    } catch (e) {
      setInsightsError(e instanceof ApiError ? e.message : "Could not generate insights.");
    } finally {
      setInsightsLoading(false);
    }
  }

  const load = useCallback(() => {
    Promise.all([fetchTiktokStatus(), fetchTiktokPatterns(), fetchTiktokVideos()])
      .then(([c, p, v]) => {
        setConfig(c);
        setPatterns(p);
        setTotals(
          v.videos.reduce(
            (acc, item) => ({
              views: acc.views + (item.viewCount ?? 0),
              likes: acc.likes + (item.likeCount ?? 0),
              comments: acc.comments + (item.commentCount ?? 0),
              shares: acc.shares + (item.shareCount ?? 0),
            }),
            { views: 0, likes: 0, comments: 0, shares: 0 },
          ),
        );
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load TikTok analytics."));
  }, []);

  useEffect(load, [load]);

  async function labelRemaining() {
    setLabeling(true);
    setLabelNotice(null);
    setError(null);
    try {
      const res = await labelPendingTiktokVideos();
      setLabelNotice(
        `Labelled ${res.labelled} of ${res.attempted} video(s).` +
          (res.remaining > 0 ? ` ${res.remaining} still remaining — run again to continue.` : " All caught up."),
      );
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not label remaining videos.");
    } finally {
      setLabeling(false);
    }
  }

  if (!config) return null;

  if (!config.connected) {
    return <ConnectTiktok config={config} onChanged={load} />;
  }

  if (!patterns) return null;

  const engagementRate =
    totals && totals.views > 0 ? (totals.likes + totals.comments + totals.shares) / totals.views : null;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label="Videos synced" value={patterns.totalVideos} />
        <MetricTile label="Total views" value={totals?.views ?? null} />
        <MetricTile label="Total likes" value={totals?.likes ?? null} />
        <MetricTile label="Total comments" value={totals?.comments ?? null} />
        <MetricTile label="Total shares" value={totals?.shares ?? null} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-lg font-semibold text-mm-ink">
            <MetricValue value={engagementRate} format="percent" />
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-mm-muted">
            Engagement rate (likes+comments+shares / views)
          </p>
        </div>
        <StatTile label="AI-labelled" value={patterns.labelledVideos} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-mm-muted">
          A comparison only draws a conclusion when at least two groups each have enough videos.
        </p>
        {patterns.labelledVideos < patterns.totalVideos && (
          <button
            type="button"
            onClick={labelRemaining}
            disabled={labeling}
            className="shrink-0 rounded-full border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 disabled:opacity-50"
          >
            {labeling ? "Labelling…" : `Label remaining videos (${patterns.totalVideos - patterns.labelledVideos})`}
          </button>
        )}
      </div>
      {labelNotice && <p className="text-xs text-emerald-700">{labelNotice}</p>}

      {patterns.totalVideos === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-mm-muted">
          No videos synced yet — run &quot;Sync now&quot; on the Overview page.
        </p>
      ) : (
        <div className="space-y-3">
          {patterns.comparisons.map((c) => (
            <GenericPatternComparisonCard key={c.dimension} comparison={c} />
          ))}
        </div>
      )}

      <CreativeInsightsSection
        result={insights}
        loading={insightsLoading}
        error={insightsError}
        onGenerate={runInsights}
      />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
      <p className="text-lg font-semibold text-mm-ink">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-mm-muted">{label}</p>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
      <p className="text-lg font-semibold text-mm-ink">
        <MetricValue value={value} />
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-mm-muted">{label}</p>
    </div>
  );
}
