"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchMedia, fetchSocialConfig, fetchUnifiedContent } from "@/lib/social/client";
import type { MediaListResponse, SocialConfigStatus } from "@/types/social";
import type { UnifiedContentItem } from "@/types/unified-content";
import { ConnectInstagram } from "@/components/social/connect-instagram";
import { ContentCard } from "@/components/social/content-card";
import { ContentDetail } from "@/components/social/content-detail";
import { UnifiedContentCard } from "@/components/social/unified-content-card";
import { PlatformTabs, type PlatformTabOption } from "@/components/social/platform-tabs";
import { ConnectYoutube } from "@/components/youtube/connect-youtube";
import { fetchYoutubeConfig } from "@/lib/youtube/client";
import type { YoutubeConfigStatus } from "@/types/youtube";
import { ConnectTiktok } from "@/components/tiktok/connect-tiktok";
import { fetchTiktokStatus } from "@/lib/tiktok/client";
import type { TiktokConfigStatus } from "@/types/tiktok";

type Tab = "all" | "instagram" | "youtube" | "tiktok";

export default function ContentLibraryPage() {
  const [tab, setTab] = useState<Tab>("instagram");

  const [config, setConfig] = useState<SocialConfigStatus | null>(null);
  const [items, setItems] = useState<MediaListResponse["items"]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [ytConfig, setYtConfig] = useState<YoutubeConfigStatus | null>(null);
  const [ttConfig, setTtConfig] = useState<TiktokConfigStatus | null>(null);
  const [unified, setUnified] = useState<UnifiedContentItem[]>([]);
  const [unifiedLoading, setUnifiedLoading] = useState(false);
  const [ytFormatFilter, setYtFormatFilter] = useState<"all" | "Shorts" | "Long-form">("all");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchSocialConfig(), fetchMedia()])
      .then(([c, m]) => {
        setConfig(c);
        setItems(m.items);
        setCursor(m.nextCursor);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load content."))
      .finally(() => setLoading(false));
  }, []);

  const loadPlatformStatus = useCallback(() => {
    fetchYoutubeConfig().then(setYtConfig).catch(() => {});
    fetchTiktokStatus().then(setTtConfig).catch(() => {});
  }, []);

  const loadUnified = useCallback((platform?: "youtube" | "tiktok") => {
    setUnifiedLoading(true);
    fetchUnifiedContent(platform)
      .then((r) => setUnified(r.items))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load content."))
      .finally(() => setUnifiedLoading(false));
  }, []);

  useEffect(load, [load]);
  useEffect(loadPlatformStatus, [loadPlatformStatus]);

  useEffect(() => {
    if (tab === "all") loadUnified();
    else if (tab === "youtube") loadUnified("youtube");
    else if (tab === "tiktok") loadUnified("tiktok");
  }, [tab, loadUnified]);

  async function loadMore() {
    if (!cursor) return;
    try {
      const m = await fetchMedia(cursor);
      setItems((prev) => [...prev, ...m.items]);
      setCursor(m.nextCursor);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load more.");
    }
  }

  const igConnected = config?.instagram.connected;

  const tabOptions: PlatformTabOption[] = [
    { id: "all", label: "All" },
    { id: "instagram", label: "Instagram", connected: igConnected },
    { id: "youtube", label: "YouTube", connected: ytConfig?.connected },
    { id: "tiktok", label: "TikTok", connected: ttConfig?.connected },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-mm-ink">Content Library</h1>
          <p className="mt-1 text-sm text-mm-muted">
            Your real synced content — actual metrics and AI creative labels, no demo posts.
          </p>
        </div>
        <PlatformTabs options={tabOptions} active={tab} onChange={(id) => setTab(id as Tab)} />
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {tab === "instagram" && (
        <>
          {config && !igConnected && <ConnectInstagram config={config} onChanged={load} />}
          {igConnected && (
            <>
              {loading && items.length === 0 ? (
                <p className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-mm-muted">
                  Loading your synced posts…
                </p>
              ) : items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-mm-muted">
                  No posts synced yet. Run &quot;Sync now&quot; on the Social Media overview.
                </p>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                      <ContentCard key={item.media.id} item={item} onView={setDetailId} />
                    ))}
                  </div>
                  {cursor && (
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={loadMore}
                        className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                      >
                        Load more
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {tab === "youtube" && (
        <>
          {ytConfig && !ytConfig.connected && <ConnectYoutube config={ytConfig} onChanged={loadPlatformStatus} />}
          {ytConfig?.connected && (
            <>
              <div className="flex gap-1 rounded-full border border-gray-200 bg-white p-1 text-xs">
                {(["all", "Shorts", "Long-form"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setYtFormatFilter(f)}
                    className={`rounded-full px-3 py-1 font-semibold ${
                      ytFormatFilter === f ? "bg-mm-pink text-white" : "text-gray-600"
                    }`}
                  >
                    {f === "all" ? "All" : f}
                  </button>
                ))}
              </div>
              <UnifiedGrid
                loading={unifiedLoading}
                items={ytFormatFilter === "all" ? unified : unified.filter((i) => i.contentType === ytFormatFilter)}
                emptyHint="Sync YouTube from the Overview page."
              />
            </>
          )}
        </>
      )}

      {tab === "tiktok" && (
        <>
          {ttConfig && !ttConfig.connected && <ConnectTiktok config={ttConfig} onChanged={loadPlatformStatus} />}
          {ttConfig?.connected && <UnifiedGrid loading={unifiedLoading} items={unified} emptyHint="Sync TikTok from the Overview page." />}
        </>
      )}

      {tab === "all" && <UnifiedGrid loading={unifiedLoading} items={unified} emptyHint="Connect a platform and sync to see content here." />}

      {detailId && <ContentDetail id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function UnifiedGrid({
  loading,
  items,
  emptyHint,
}: {
  loading: boolean;
  items: UnifiedContentItem[];
  emptyHint: string;
}) {
  if (loading && items.length === 0) {
    return (
      <p className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-mm-muted">
        Loading…
      </p>
    );
  }
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-mm-muted">
        No content synced yet. {emptyHint}
      </p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <UnifiedContentCard key={item.id} item={item} />
      ))}
    </div>
  );
}
