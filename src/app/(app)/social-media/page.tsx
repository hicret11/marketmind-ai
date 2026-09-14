"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  ApiError,
  fetchOverview,
  fetchSocialConfig,
  syncNow,
} from "@/lib/social/client";
import type { OverviewResponse, SocialConfigStatus } from "@/types/social";
import { ConnectInstagram } from "@/components/social/connect-instagram";
import { instagramOAuthErrorMessage, MetricTile } from "@/components/social/social-ui";
import { ConnectYoutube, youtubeOAuthErrorMessage } from "@/components/youtube/connect-youtube";
import {
  ApiError as YtApiError,
  fetchYoutubeConfig,
  fetchYoutubeVideos,
  syncYoutubeNow,
} from "@/lib/youtube/client";
import type { YoutubeConfigStatus, YoutubeVideoItem } from "@/types/youtube";
import { formatCompactNumber } from "@/components/social/social-ui";
import { ConnectTiktok, tiktokOAuthErrorMessage } from "@/components/tiktok/connect-tiktok";
import {
  ApiError as TtApiError,
  fetchTiktokStatus,
  fetchTiktokVideos,
  syncTiktokNow,
} from "@/lib/tiktok/client";
import type { TiktokConfigStatus, TiktokVideoItem } from "@/types/tiktok";

const ACCOUNT_METRIC_LABELS: Record<string, string> = {
  reach: "Reach",
  views: "Views",
  total_interactions: "Total interactions",
  accounts_engaged: "Accounts engaged",
  profile_views: "Profile views",
  profile_links_taps: "Link taps",
  follower_count: "Follower change",
};

/** Reads the OAuth callback's ?ig_connected / ?ig_error and shows a real result, then cleans the URL. */
function OAuthCallbackBanner({ onConnected }: { onConnected: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const igConnected = searchParams.get("ig_connected");
    const igError = searchParams.get("ig_error");
    if (!igConnected && !igError) return;

    if (igConnected) {
      setMessage({ kind: "success", text: "Instagram connected. Syncing your real content…" });
      onConnected();
      // First sync right after connecting, so real media/insights show up
      // without an extra manual click — same sync the "Sync Now" button runs.
      syncNow()
        .then((res) => {
          setMessage({
            kind: "success",
            text: `Instagram connected. Synced ${res.run.mediaSynced} post(s), ${res.run.mediaInsightsSynced} insight snapshot(s).`,
          });
          onConnected();
        })
        .catch((e) => {
          setMessage({
            kind: "error",
            text:
              e instanceof ApiError
                ? `Instagram connected, but the first sync failed: ${e.message}`
                : "Instagram connected, but the first sync failed. Use Sync Now below.",
          });
        });
    } else if (igError) {
      const detail = searchParams.get("ig_detail");
      const username = searchParams.get("ig_username");
      setMessage({ kind: "error", text: instagramOAuthErrorMessage(igError, detail, username) });
    }
    router.replace("/social-media");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (!message) return null;
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${
        message.kind === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {message.text}
    </div>
  );
}

/** Reads the OAuth callback's ?yt_connected / ?yt_error and shows a real result, then cleans the URL. */
function YoutubeOAuthCallbackBanner({ onConnected }: { onConnected: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const ytConnected = searchParams.get("yt_connected");
    const ytError = searchParams.get("yt_error");
    if (!ytConnected && !ytError) return;

    if (ytConnected) {
      setMessage({ kind: "success", text: "YouTube connected. Syncing your real channel…" });
      onConnected();
      syncYoutubeNow()
        .then((res) => {
          setMessage({ kind: "success", text: `YouTube connected. Synced ${res.run.videosSynced} video(s).` });
          onConnected();
        })
        .catch((e) => {
          setMessage({
            kind: "error",
            text:
              e instanceof YtApiError
                ? `YouTube connected, but the first sync failed: ${e.message}`
                : "YouTube connected, but the first sync failed. Use Sync Now below.",
          });
        });
    } else if (ytError) {
      const detail = searchParams.get("yt_detail");
      setMessage({ kind: "error", text: youtubeOAuthErrorMessage(ytError, detail) });
    }
    router.replace("/social-media");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (!message) return null;
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${
        message.kind === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {message.text}
    </div>
  );
}

/** Reads the OAuth callback's ?platform=tiktok&connected=1 / &error=... and shows a real result, then cleans the URL. */
function TiktokOAuthCallbackBanner({ onConnected }: { onConnected: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (searchParams.get("platform") !== "tiktok") return;
    const ttConnected = searchParams.get("connected");
    const ttError = searchParams.get("error");
    if (!ttConnected && !ttError) return;

    if (ttConnected) {
      setMessage({ kind: "success", text: "TikTok connected. Syncing your real videos…" });
      onConnected();
      syncTiktokNow()
        .then((res) => {
          setMessage({ kind: "success", text: `TikTok connected. Synced ${res.run.videosSynced} video(s).` });
          onConnected();
        })
        .catch((e) => {
          setMessage({
            kind: "error",
            text:
              e instanceof TtApiError
                ? `TikTok connected, but the first sync failed: ${e.message}`
                : "TikTok connected, but the first sync failed. Use Sync Now below.",
          });
        });
    } else if (ttError) {
      const detail = searchParams.get("detail");
      setMessage({ kind: "error", text: tiktokOAuthErrorMessage(ttError, detail) });
    }
    router.replace("/social-media");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (!message) return null;
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${
        message.kind === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {message.text}
    </div>
  );
}

export default function SocialMediaOverviewPage() {
  const [config, setConfig] = useState<SocialConfigStatus | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [youtubeConfig, setYoutubeConfig] = useState<YoutubeConfigStatus | null>(null);
  const [youtubeVideos, setYoutubeVideos] = useState<YoutubeVideoItem[]>([]);
  const [tiktokConfig, setTiktokConfig] = useState<TiktokConfigStatus | null>(null);
  const [tiktokVideos, setTiktokVideos] = useState<TiktokVideoItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([fetchSocialConfig(), fetchOverview()])
      .then(([c, o]) => {
        setConfig(c);
        setOverview(o);
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Could not load social data."),
      );
  }, []);

  const loadYoutube = useCallback(() => {
    fetchYoutubeConfig()
      .then((c) => {
        setYoutubeConfig(c);
        if (c.connected) {
          fetchYoutubeVideos()
            .then((v) => setYoutubeVideos(v.videos))
            .catch(() => setYoutubeVideos([]));
        }
      })
      .catch(() => {
        /* Non-fatal for this page — the Instagram section above still works. */
      });
  }, []);

  const loadTiktok = useCallback(() => {
    fetchTiktokStatus()
      .then((c) => {
        setTiktokConfig(c);
        if (c.connected) {
          fetchTiktokVideos()
            .then((v) => setTiktokVideos(v.videos))
            .catch(() => setTiktokVideos([]));
        }
      })
      .catch(() => {
        /* Non-fatal for this page — the sections above still work. */
      });
  }, []);

  useEffect(load, [load]);
  useEffect(loadYoutube, [loadYoutube]);
  useEffect(loadTiktok, [loadTiktok]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-mm-ink">Social Media</h1>
        <p className="mt-1 text-sm text-mm-muted">
          Real Instagram content and performance for Sing My Birthday — no demo
          metrics.
        </p>
      </header>

      <Suspense fallback={null}>
        <OAuthCallbackBanner onConnected={load} />
      </Suspense>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {config && <ConnectInstagram config={config} onChanged={load} />}

      {config?.instagram.connected && overview?.connected && (
        <>
          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-mm-ink">Last 30 days</h2>
              <div className="flex gap-3 text-xs">
                <Link href="/social-media/content" className="text-mm-dark-rose underline underline-offset-2">
                  Content Library
                </Link>
                <Link href="/social-media/analytics" className="text-mm-dark-rose underline underline-offset-2">
                  Analytics
                </Link>
                <Link href="/social-media/calendar" className="text-mm-dark-rose underline underline-offset-2">
                  Calendar
                </Link>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricTile label="Posts published" value={overview.totals?.postsInWindow ?? null} />
              <MetricTile label="Reels" value={overview.totals?.reels ?? null} />
              <MetricTile label="Images" value={overview.totals?.images ?? null} />
              <MetricTile label="Carousels" value={overview.totals?.carousels ?? null} />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(ACCOUNT_METRIC_LABELS).map(([key, label]) => (
                <MetricTile
                  key={key}
                  label={label}
                  value={overview.accountMetrics?.[key] ?? null}
                />
              ))}
            </div>

            {overview.unavailable.length > 0 && (
              <p className="mt-3 text-[11px] text-mm-muted">
                Not available for this account/period:{" "}
                {overview.unavailable.join(", ")}. Account-level insights depend on
                account type, audience size and how recently the period ended.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4 text-xs text-mm-muted">
            <p className="font-semibold text-mm-ink">Current limitations</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>A professional Instagram account (Business or Creator) is required.</li>
              <li>Some media insight metrics depend on the media type and account.</li>
              <li>Some account metrics are unavailable for smaller audiences.</li>
              <li>Historical insight availability from Instagram is time-limited — MarketMind keeps its own snapshots.</li>
              <li>Organic insights and Meta Ads performance are separate data sources.</li>
            </ul>
          </section>
        </>
      )}

      <header className="pt-4">
        <h1 className="text-2xl font-semibold text-mm-ink">YouTube</h1>
        <p className="mt-1 text-sm text-mm-muted">
          Real channel and video stats via the YouTube Data API — no demo metrics.
        </p>
      </header>

      <Suspense fallback={null}>
        <YoutubeOAuthCallbackBanner onConnected={loadYoutube} />
      </Suspense>

      {youtubeConfig && <ConnectYoutube config={youtubeConfig} onChanged={loadYoutube} />}

      {youtubeConfig?.connected && youtubeConfig.channel && (
        <section>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricTile label="Subscribers" value={youtubeConfig.channel.subscriberCount} />
            <MetricTile label="Lifetime channel views" value={youtubeConfig.channel.viewCount} />
            <MetricTile label="Videos synced" value={youtubeVideos.length} />
          </div>

          {youtubeVideos.length > 0 ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full min-w-[480px] text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] uppercase text-mm-muted">
                    <th className="px-3 py-2">Video</th>
                    <th className="px-3 py-2">Views</th>
                    <th className="px-3 py-2">Likes</th>
                    <th className="px-3 py-2">Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {youtubeVideos.slice(0, 10).map((v) => (
                    <tr key={v.id} className="border-b border-gray-50 last:border-0">
                      <td className="max-w-[240px] truncate px-3 py-2 text-mm-ink" title={v.title}>
                        {v.title || "(untitled)"}
                      </td>
                      <td className="px-3 py-2">
                        {v.viewCount != null ? formatCompactNumber(v.viewCount) : "Not available"}
                      </td>
                      <td className="px-3 py-2">
                        {v.likeCount != null ? formatCompactNumber(v.likeCount) : "Not available"}
                      </td>
                      <td className="px-3 py-2">
                        {v.commentCount != null ? formatCompactNumber(v.commentCount) : "Not available"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-xs text-mm-muted">
              No videos synced yet — click &quot;Sync now&quot; above.
            </p>
          )}

          <p className="mt-3 text-[11px] text-mm-muted">
            Watch time isn&apos;t shown yet — it requires the separate YouTube Analytics API, not
            connected in this step.
          </p>
        </section>
      )}

      <header className="pt-4">
        <h1 className="text-2xl font-semibold text-mm-ink">TikTok</h1>
        <p className="mt-1 text-sm text-mm-muted">
          Real video stats via TikTok Login Kit / Display API — no demo metrics.
        </p>
      </header>

      <Suspense fallback={null}>
        <TiktokOAuthCallbackBanner onConnected={loadTiktok} />
      </Suspense>

      {tiktokConfig && <ConnectTiktok config={tiktokConfig} onChanged={loadTiktok} />}

      {tiktokConfig?.connected && tiktokConfig.account && (
        <section>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricTile label="Videos synced" value={tiktokVideos.length} />
          </div>

          {tiktokVideos.length > 0 ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] uppercase text-mm-muted">
                    <th className="px-3 py-2">Video</th>
                    <th className="px-3 py-2">Views</th>
                    <th className="px-3 py-2">Likes</th>
                    <th className="px-3 py-2">Comments</th>
                    <th className="px-3 py-2">Shares</th>
                  </tr>
                </thead>
                <tbody>
                  {tiktokVideos.slice(0, 10).map((v) => (
                    <tr key={v.id} className="border-b border-gray-50 last:border-0">
                      <td className="max-w-[240px] truncate px-3 py-2 text-mm-ink" title={v.title ?? ""}>
                        {v.title || v.videoDescription || "(untitled)"}
                      </td>
                      <td className="px-3 py-2">
                        {v.viewCount != null ? formatCompactNumber(v.viewCount) : "Not available"}
                      </td>
                      <td className="px-3 py-2">
                        {v.likeCount != null ? formatCompactNumber(v.likeCount) : "Not available"}
                      </td>
                      <td className="px-3 py-2">
                        {v.commentCount != null ? formatCompactNumber(v.commentCount) : "Not available"}
                      </td>
                      <td className="px-3 py-2">
                        {v.shareCount != null ? formatCompactNumber(v.shareCount) : "Not available"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-xs text-mm-muted">
              No videos synced yet — click &quot;Sync now&quot; above.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
