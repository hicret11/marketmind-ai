"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  fetchPatterns,
  fetchSocialConfig,
  generateInsights,
  labelPendingPosts,
} from "@/lib/social/client";
import type {
  PatternComparison,
  SocialConfigStatus,
  SocialInsightsResult,
} from "@/types/social";
import { ConnectInstagram } from "@/components/social/connect-instagram";
import { PatternComparisonCard } from "@/components/social/pattern-comparison";
import { SourceLabel } from "@/components/social/social-ui";
import { PlatformTabs, type PlatformTabOption } from "@/components/social/platform-tabs";
import { YoutubeAnalyticsSection } from "@/components/youtube/youtube-analytics-section";
import { TiktokAnalyticsSection } from "@/components/tiktok/tiktok-analytics-section";
import { fetchYoutubeConfig } from "@/lib/youtube/client";
import { fetchTiktokStatus } from "@/lib/tiktok/client";

type Tab = "instagram" | "youtube" | "tiktok";

export default function SocialAnalyticsPage() {
  const [tab, setTab] = useState<Tab>("instagram");
  const [ytConnected, setYtConnected] = useState<boolean | undefined>(undefined);
  const [ttConnected, setTtConnected] = useState<boolean | undefined>(undefined);
  const [config, setConfig] = useState<SocialConfigStatus | null>(null);
  const [patterns, setPatterns] = useState<{
    totalPosts: number;
    labelledPosts: number;
    comparisons: PatternComparison[];
  } | null>(null);
  const [insights, setInsights] = useState<SocialInsightsResult | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [labeling, setLabeling] = useState(false);
  const [labelNotice, setLabelNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([fetchSocialConfig(), fetchPatterns()])
      .then(([c, p]) => {
        setConfig(c);
        setPatterns({
          totalPosts: p.totalPosts,
          labelledPosts: p.labelledPosts,
          comparisons: p.comparisons,
        });
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load analytics."));
  }, []);

  useEffect(load, [load]);
  useEffect(() => {
    fetchYoutubeConfig().then((c) => setYtConnected(c.connected)).catch(() => {});
    fetchTiktokStatus().then((c) => setTtConnected(c.connected)).catch(() => {});
  }, []);

  async function labelRemaining() {
    setLabeling(true);
    setLabelNotice(null);
    setError(null);
    try {
      const res = await labelPendingPosts();
      setLabelNotice(
        `Labelled ${res.labelled} of ${res.attempted} post(s).` +
          (res.remaining > 0 ? ` ${res.remaining} still remaining — run again to continue.` : " All caught up."),
      );
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not label remaining posts.");
    } finally {
      setLabeling(false);
    }
  }

  async function runInsights() {
    setLoadingInsights(true);
    setError(null);
    try {
      setInsights(await generateInsights());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not generate insights.");
    } finally {
      setLoadingInsights(false);
    }
  }

  const connected = config?.instagram.connected;

  const tabOptions: PlatformTabOption[] = [
    { id: "instagram", label: "Instagram", connected },
    { id: "youtube", label: "YouTube", connected: ytConnected },
    { id: "tiktok", label: "TikTok", connected: ttConnected },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-mm-ink">Social Analytics</h1>
          <p className="mt-1 text-sm text-mm-muted">
            Real content patterns per platform — kept separate, never combined into one total.
          </p>
        </div>
        <PlatformTabs options={tabOptions} active={tab} onChange={(id) => setTab(id as Tab)} />
      </header>

      {error && tab === "instagram" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {tab === "youtube" && <YoutubeAnalyticsSection />}
      {tab === "tiktok" && <TiktokAnalyticsSection />}

      {tab === "instagram" && (
    <>
      {config && !connected && <ConnectInstagram config={config} onChanged={load} />}

      {connected && patterns && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-mm-muted">
              {patterns.totalPosts} posts synced · {patterns.labelledPosts} with AI creative
              labels. A comparison only draws a conclusion when at least two groups each have
              enough posts.
            </p>
            {patterns.labelledPosts < patterns.totalPosts && (
              <button
                type="button"
                onClick={labelRemaining}
                disabled={labeling}
                className="shrink-0 rounded-full border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 disabled:opacity-50"
              >
                {labeling
                  ? "Labelling…"
                  : `Label remaining posts (${patterns.totalPosts - patterns.labelledPosts})`}
              </button>
            )}
          </div>
          {labelNotice && <p className="text-xs text-emerald-700">{labelNotice}</p>}

          <section className="space-y-3">
            {patterns.comparisons.map((c) => (
              <PatternComparisonCard key={c.dimension} comparison={c} />
            ))}
          </section>

          <section className="rounded-xl border border-purple-200 bg-mm-lavender/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SourceLabel source="marketmind" />
                <span className="text-sm font-semibold text-mm-ink">AI marketing insights</span>
              </div>
              <button
                type="button"
                onClick={runInsights}
                disabled={loadingInsights}
                className="rounded-full bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {loadingInsights ? "Analyzing…" : "Generate insights"}
              </button>
            </div>

            {insights && !insights.available && (
              <p className="mt-3 text-xs text-gray-600">{insights.reason}</p>
            )}
            {insights?.available && insights.insights.length === 0 && (
              <p className="mt-3 text-xs text-mm-muted">
                Not enough data yet for a confident comparison — keep posting and syncing.
              </p>
            )}
            {insights?.available && insights.insights.length > 0 && (
              <div className="mt-3 space-y-3">
                {insights.insights.map((ins, i) => (
                  <div key={i} className="rounded-lg bg-white/70 p-3 text-sm">
                    <Field label="Finding" value={ins.finding} />
                    <Field label="Interpretation" value={ins.interpretation} />
                    <Field label="Recommendation" value={ins.recommendation} />
                    <Field label="Suggested experiment" value={ins.suggestedExperiment} />
                    <Field label="KPI" value={ins.kpi} />
                  </div>
                ))}
                <p className="text-[11px] text-mm-muted">
                  Based on {insights.basedOn?.postsAnalyzed} posts and{" "}
                  {insights.basedOn?.comparisonsUsed} comparison(s). Language is associative,
                  not causal.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <p className="mt-1 first:mt-0">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-purple-700">
        {label}:{" "}
      </span>
      <span className="text-mm-ink">{value}</span>
    </p>
  );
}
