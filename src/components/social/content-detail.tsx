"use client";

import { useEffect, useState } from "react";
import { ApiError, fetchMediaDetail } from "@/lib/social/client";
import type { MediaDetailResponse } from "@/types/social";
import { CreativeLabelList } from "./creative-labels";
import { MetricValue, SourceLabel, formatDate, mediaTypeLabel } from "./social-ui";

const METRIC_ORDER = [
  "views",
  "reach",
  "likes",
  "comments",
  "saved",
  "shares",
  "total_interactions",
  "ig_reels_avg_watch_time",
  "ig_reels_video_view_total_time",
  "profile_visits",
  "follows",
  "replies",
  "navigation",
];

const METRIC_LABELS: Record<string, string> = {
  views: "Views",
  reach: "Reach",
  likes: "Likes",
  comments: "Comments",
  saved: "Saved",
  shares: "Shares",
  total_interactions: "Total interactions",
  ig_reels_avg_watch_time: "Avg watch time (ms)",
  ig_reels_video_view_total_time: "Total watch time (ms)",
  profile_visits: "Profile visits",
  follows: "Follows",
  replies: "Replies",
  navigation: "Navigation",
};

export function ContentDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<MediaDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    fetchMediaDetail(id)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load analysis."));
  }, [id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-mm-ink">Content analysis</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {error && <p className="p-5 text-sm text-red-600">{error}</p>}
        {!data && !error && <p className="p-5 text-sm text-mm-muted">Loading real Instagram data…</p>}

        {data && (
          <div className="max-h-[75vh] space-y-5 overflow-y-auto p-5">
            {/* CONTENT */}
            <section className="flex gap-4">
              {(data.media.thumbnailUrl ?? data.media.mediaUrl) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.media.thumbnailUrl ?? data.media.mediaUrl ?? ""}
                  alt=""
                  className="h-28 w-28 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-muted">
                  Content
                </p>
                <p className="text-xs text-mm-muted">
                  {mediaTypeLabel(data.media.mediaType, data.media.mediaProductType)} ·{" "}
                  {formatDate(data.media.timestamp)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-mm-ink">
                  {data.media.caption?.trim() || (
                    <span className="italic text-gray-400">No caption</span>
                  )}
                </p>
                {data.media.permalink && (
                  <a
                    href={data.media.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-[11px] font-medium text-mm-dark-rose underline underline-offset-2"
                  >
                    Open on Instagram
                  </a>
                )}
              </div>
            </section>

            {/* PERFORMANCE */}
            <section className="rounded-xl border border-gray-200 p-4">
              <div className="mb-2 flex items-center gap-2">
                <SourceLabel source="instagram" />
                <span className="text-[11px] text-mm-muted">Performance</span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
                {METRIC_ORDER.filter((m) => m in (data.insight?.metrics ?? {})).map((m) => (
                  <div key={m}>
                    <dt className="text-[10px] uppercase tracking-wide text-mm-muted">
                      {METRIC_LABELS[m] ?? m}
                    </dt>
                    <dd>
                      <MetricValue value={data.insight?.metrics[m] ?? null} />
                    </dd>
                  </div>
                ))}
              </dl>
              {data.performance && (
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-gray-100 pt-3 text-xs sm:grid-cols-3">
                  <RateRow label="Interaction rate" value={data.performance.interactionRate} />
                  <RateRow label="Save rate" value={data.performance.saveRate} />
                  <RateRow label="Share rate" value={data.performance.shareRate} />
                  <RateRow label="Comment rate" value={data.performance.commentRate} />
                  <RateRow label="View→interaction" value={data.performance.viewToInteractionRate} />
                </div>
              )}
              <p className="mt-2 text-[10px] text-mm-muted">
                Rates are computed by MarketMind: interaction/save/share/comment rate =
                metric ÷ reach; view→interaction = total_interactions ÷ views. Missing
                inputs show &quot;Not available&quot;, never 0.
              </p>
              {data.insight && data.insight.unsupportedMetrics.length > 0 && (
                <p className="mt-1 text-[10px] text-mm-muted">
                  Not supported for this media type: {data.insight.unsupportedMetrics.join(", ")}.
                </p>
              )}
            </section>

            {/* CREATIVE ANALYSIS */}
            <section className="rounded-xl border border-purple-200 bg-mm-lavender/30 p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-purple-700">
                Creative analysis
              </p>
              <CreativeLabelList labels={data.media.creative} />
            </section>

            {/* WHAT WORKED / WHAT TO TEST NEXT */}
            {data.interpretation ? (
              <section className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-mm-muted">
                    <SourceLabel source="marketmind" /> What worked
                  </p>
                  {data.interpretation.whatWorked.length ? (
                    <ul className="list-disc space-y-1 pl-4 text-sm text-mm-ink">
                      {data.interpretation.whatWorked.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-mm-muted">Limited signal from this single post.</p>
                  )}
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-mm-muted">
                    <SourceLabel source="marketmind" /> What to test next
                  </p>
                  {data.interpretation.whatToTestNext.length ? (
                    <ul className="list-disc space-y-1 pl-4 text-sm text-mm-ink">
                      {data.interpretation.whatToTestNext.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-mm-muted">—</p>
                  )}
                </div>
              </section>
            ) : (
              <p className="text-xs text-mm-muted">
                MarketMind AI interpretation is unavailable right now — the real Instagram
                data above is still complete.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RateRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-mm-muted">{label}</dt>
      <dd>
        <MetricValue value={value} format="percent" />
      </dd>
    </div>
  );
}
