"use client";

import { useEffect, useState } from "react";
import { GenericPatternComparisonCard } from "@/components/social/generic-pattern-comparison";
import { CreativeInsightsSection } from "@/components/social/creative-insights-section";
import {
  ApiError,
  fetchYoutubeConfig,
  fetchYoutubePatterns,
  generateYoutubeInsights,
  labelPendingYoutubeVideos,
} from "@/lib/youtube/client";
import type { GenericPatternComparison } from "@/lib/social/pattern-engine";
import type { CreativeInsightsResult } from "@/types/creative-insights";
import { ConnectYoutube } from "./connect-youtube";
import type { YoutubeConfigStatus } from "@/types/youtube";

/**
 * YouTube's own Social Analytics tab. Kept separate — Instagram's analytics
 * page/logic is untouched. Shorts and Long-form are always broken out
 * separately per the "don't combine incompatible metrics" rule.
 */
type FormatFilter = "all" | "shorts" | "long_form";

export function YoutubeAnalyticsSection() {
  const [config, setConfig] = useState<YoutubeConfigStatus | null>(null);
  const [filter, setFilter] = useState<FormatFilter>("all");
  const [patterns, setPatterns] = useState<{
    totalVideos: number;
    labelledVideos: number;
    shortsCount: number;
    longFormCount: number;
    comparisons: GenericPatternComparison[];
  } | null>(null);
  const [labeling, setLabeling] = useState(false);
  const [labelNotice, setLabelNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Each platform tab stores its own latest generated insight result — this
  // one is keyed per format filter so switching tabs never shows a stale
  // (or mismatched-format) result.
  const [insights, setInsights] = useState<Partial<Record<FormatFilter, CreativeInsightsResult>>>({});
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  async function runInsights() {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const result = await generateYoutubeInsights(filter === "all" ? undefined : filter);
      setInsights((prev) => ({ ...prev, [filter]: result }));
    } catch (e) {
      setInsightsError(e instanceof ApiError ? e.message : "Could not generate insights.");
    } finally {
      setInsightsLoading(false);
    }
  }

  function load(f: FormatFilter) {
    Promise.all([fetchYoutubeConfig(), fetchYoutubePatterns(f === "all" ? undefined : f)])
      .then(([c, p]) => {
        setConfig(c);
        setPatterns(p);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load YouTube analytics."));
  }

  useEffect(() => load(filter), [filter]);

  async function labelRemaining() {
    setLabeling(true);
    setLabelNotice(null);
    setError(null);
    try {
      const res = await labelPendingYoutubeVideos();
      setLabelNotice(
        `Labelled ${res.labelled} of ${res.attempted} video(s).` +
          (res.remaining > 0 ? ` ${res.remaining} still remaining — run again to continue.` : " All caught up."),
      );
      load(filter);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not label remaining videos.");
    } finally {
      setLabeling(false);
    }
  }

  if (!config) return null;

  if (!config.connected) {
    return <ConnectYoutube config={config} onChanged={() => load(filter)} />;
  }

  if (!patterns) return null;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Videos synced" value={patterns.shortsCount + patterns.longFormCount} />
        <StatTile label="Shorts" value={patterns.shortsCount} />
        <StatTile label="Long-form" value={patterns.longFormCount} />
        <StatTile label="AI-labelled" value={patterns.labelledVideos} />
      </div>

      <div className="flex gap-1 rounded-full border border-gray-200 bg-white p-1 text-xs">
        {(["all", "shorts", "long_form"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 font-semibold ${
              filter === f ? "bg-mm-pink text-white" : "text-gray-600"
            }`}
          >
            {f === "all" ? "All" : f === "shorts" ? "Shorts" : "Long-form"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-mm-muted">
          Shorts and Long-form are kept separate — their view/engagement scales aren&apos;t
          comparable. A comparison only draws a conclusion when at least two groups each have
          enough videos.
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
          {filter === "all"
            ? 'No videos synced yet — run "Sync now" on the Overview page.'
            : `No ${filter === "shorts" ? "Shorts" : "Long-form"} videos in the synced set yet.`}
        </p>
      ) : (
        <div className="space-y-3">
          {patterns.comparisons.map((c) => (
            <GenericPatternComparisonCard key={c.dimension} comparison={c} />
          ))}
        </div>
      )}

      <CreativeInsightsSection
        result={insights[filter] ?? null}
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
