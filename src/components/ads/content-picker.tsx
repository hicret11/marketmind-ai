"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchUnifiedContent } from "@/lib/social/client";
import { formatCompactNumber, formatDate } from "@/components/social/social-ui";
import type { UnifiedContentItem } from "@/types/unified-content";
import type { CampaignCreativeSelection } from "@/types/meta-ads";

type TypeFilter = "all" | "Reel" | "Image" | "Carousel";
type SortOption = "newest" | "views" | "engagement";

/**
 * "Choose from Content Library" — real synced Instagram content only
 * (reads lib/social's own repository via the existing unified-content read
 * model; never modifies Instagram's data). The user must pick a creative
 * before a campaign can be approved, unless the chat already resolved one.
 */
export function ContentPicker({
  onChoose,
  onClose,
}: {
  onChoose: (selection: CampaignCreativeSelection) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<UnifiedContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<SortOption>("newest");

  useEffect(() => {
    fetchUnifiedContent("instagram")
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (typeFilter !== "all") list = list.filter((i) => i.contentType === typeFilter);
    const engagementRate = (i: UnifiedContentItem) => {
      const views = i.metrics.views;
      if (!views) return 0;
      const sum = (i.metrics.likes ?? 0) + (i.metrics.comments ?? 0) + (i.metrics.shares ?? 0) + (i.metrics.saves ?? 0);
      return sum / views;
    };
    const sorted = [...list];
    if (sort === "newest") sorted.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
    else if (sort === "views") sorted.sort((a, b) => (b.metrics.views ?? 0) - (a.metrics.views ?? 0));
    else sorted.sort((a, b) => engagementRate(b) - engagementRate(a));
    return sorted;
  }, [items, typeFilter, sort]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-mm-ink">Choose from Content Library</p>
          <button type="button" onClick={onClose} className="text-xs text-mm-muted hover:text-mm-ink">
            Close
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-full border border-gray-200 bg-white p-1 text-xs">
            {(["all", "Reel", "Image", "Carousel"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setTypeFilter(f)}
                className={`rounded-full px-3 py-1 font-semibold ${typeFilter === f ? "bg-mm-pink text-white" : "text-gray-600"}`}
              >
                {f === "all" ? "All" : f === "Reel" ? "Reels" : f === "Image" ? "Images" : "Carousels"}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-full border border-gray-200 px-3 py-1 text-xs"
          >
            <option value="newest">Newest</option>
            <option value="views">Most viewed</option>
            <option value="engagement">Highest interaction rate</option>
          </select>
        </div>

        {loading ? (
          <p className="mt-6 text-center text-xs text-mm-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-6 text-center text-xs text-mm-muted">No synced Instagram content matches this filter.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {filtered.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-lg border border-gray-200">
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnailUrl} alt="" className="h-32 w-full object-cover" />
                ) : (
                  <div className="flex h-32 items-center justify-center bg-gray-100 text-xs text-gray-400">No thumbnail</div>
                )}
                <div className="p-2">
                  <p className="text-[11px] text-mm-muted">
                    {formatDate(item.publishedAt)} · {item.contentType}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-mm-ink">{item.title?.trim() || "No caption"}</p>
                  <p className="mt-1 text-[11px] text-mm-muted">
                    {item.metrics.views != null ? `${formatCompactNumber(item.metrics.views)} views` : "Views: Not available"}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      onChoose({
                        source: "existing_instagram_post",
                        igMediaId: item.nativeId,
                        caption: item.title,
                        mediaType: item.contentType,
                        permalink: item.permalink,
                        thumbnailUrl: item.thumbnailUrl,
                        timestamp: item.publishedAt,
                      })
                    }
                    className="mt-2 w-full rounded-full bg-mm-ink px-3 py-1 text-[11px] font-semibold text-white"
                  >
                    Use this {item.contentType}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
