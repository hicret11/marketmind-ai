"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, fetchCalendar, fetchSocialConfig, fetchUnifiedContent } from "@/lib/social/client";
import type { CalendarEntry, SocialConfigStatus } from "@/types/social";
import type { UnifiedContentItem } from "@/types/unified-content";
import { ConnectInstagram } from "@/components/social/connect-instagram";
import { formatDate } from "@/components/social/social-ui";
import { PlatformTabs, type PlatformTabOption } from "@/components/social/platform-tabs";
import { fetchYoutubeConfig } from "@/lib/youtube/client";
import type { YoutubeConfigStatus } from "@/types/youtube";
import { fetchTiktokStatus } from "@/lib/tiktok/client";
import type { TiktokConfigStatus } from "@/types/tiktok";

type Tab = "all" | "instagram" | "youtube" | "tiktok";

const STATUS_STYLES: Record<CalendarEntry["status"], string> = {
  published: "bg-emerald-50 text-emerald-700",
  scheduled: "bg-blue-50 text-blue-700",
  draft: "bg-gray-100 text-gray-600",
};

export default function ContentCalendarPage() {
  const [tab, setTab] = useState<Tab>("instagram");

  const [config, setConfig] = useState<SocialConfigStatus | null>(null);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [ytConfig, setYtConfig] = useState<YoutubeConfigStatus | null>(null);
  const [ttConfig, setTtConfig] = useState<TiktokConfigStatus | null>(null);
  const [unified, setUnified] = useState<UnifiedContentItem[]>([]);

  const load = useCallback(() => {
    Promise.all([fetchSocialConfig(), fetchCalendar()])
      .then(([c, cal]) => {
        setConfig(c);
        setEntries(cal.entries);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load calendar."));
  }, []);

  const loadPlatformStatus = useCallback(() => {
    fetchYoutubeConfig().then(setYtConfig).catch(() => {});
    fetchTiktokStatus().then(setTtConfig).catch(() => {});
  }, []);

  useEffect(load, [load]);
  useEffect(loadPlatformStatus, [loadPlatformStatus]);

  useEffect(() => {
    if (tab === "all") fetchUnifiedContent().then((r) => setUnified(r.items)).catch(() => {});
    else if (tab === "youtube") fetchUnifiedContent("youtube").then((r) => setUnified(r.items)).catch(() => {});
    else if (tab === "tiktok") fetchUnifiedContent("tiktok").then((r) => setUnified(r.items)).catch(() => {});
  }, [tab]);

  const byMonth = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const e of entries) {
      const key = e.date.slice(0, 7) || "unknown";
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  const unifiedByMonth = useMemo(() => {
    const map = new Map<string, UnifiedContentItem[]>();
    for (const item of unified) {
      const key = (item.publishedAt ?? "").slice(0, 7) || "unknown";
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [unified]);

  const igConnected = config?.instagram.connected;
  const published = entries.filter((e) => e.status === "published").length;

  const tabOptions: PlatformTabOption[] = [
    { id: "all", label: "All" },
    { id: "instagram", label: "Instagram", connected: igConnected },
    { id: "youtube", label: "YouTube", connected: ytConfig?.connected },
    { id: "tiktok", label: "TikTok", connected: ttConfig?.connected },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-mm-ink">Content Calendar</h1>
          <p className="mt-1 text-sm text-mm-muted">
            Historical dates are filled automatically from your synced published content — you
            never re-create a past post by hand.
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
              <div className="flex flex-wrap gap-2 text-xs">
                {(["published", "scheduled", "draft"] as const).map((s) => (
                  <span key={s} className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_STYLES[s]}`}>
                    {s}
                  </span>
                ))}
                <span className="text-mm-muted">· {published} published posts imported</span>
              </div>

              {byMonth.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-mm-muted">
                  No entries yet — run &quot;Sync now&quot; to import your published Instagram posts.
                </p>
              ) : (
                byMonth.map(([month, monthEntries]) => (
                  <section key={month} className="rounded-xl border border-gray-200 bg-white p-4">
                    <h2 className="text-sm font-semibold text-mm-ink">{monthTitle(month)}</h2>
                    <ul className="mt-2 divide-y divide-gray-100">
                      {monthEntries
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((e) => (
                          <li key={e.id} className="flex items-start gap-3 py-2">
                            {e.thumbnailUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={e.thumbnailUrl} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
                            ) : (
                              <span className="h-12 w-12 shrink-0 rounded-md bg-gray-100" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[e.status]}`}>
                                  {e.status}
                                </span>
                                <span className="text-[11px] text-mm-muted">{formatDate(e.date)}</span>
                              </div>
                              <p className="mt-0.5 line-clamp-2 text-xs text-mm-ink">
                                {e.caption?.trim() || <span className="italic text-gray-400">No caption</span>}
                              </p>
                              {e.publishError && <p className="text-[11px] text-red-600">Publish error: {e.publishError}</p>}
                            </div>
                            {e.permalink && (
                              <a
                                href={e.permalink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 text-[11px] font-medium text-mm-dark-rose underline underline-offset-2"
                              >
                                Open
                              </a>
                            )}
                          </li>
                        ))}
                    </ul>
                  </section>
                ))
              )}
            </>
          )}
        </>
      )}

      {tab !== "instagram" && (
        <>
          {tab === "youtube" && ytConfig && !ytConfig.connected && (
            <p className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-mm-muted">
              YouTube isn&apos;t connected yet. Connect it from the Overview page.
            </p>
          )}
          {tab === "tiktok" && ttConfig && !ttConfig.connected && (
            <p className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-mm-muted">
              TikTok isn&apos;t connected yet. Connect it from the Overview page.
            </p>
          )}
          {(tab === "all" || (tab === "youtube" && ytConfig?.connected) || (tab === "tiktok" && ttConfig?.connected)) &&
            (unifiedByMonth.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-mm-muted">
                No published content synced yet for this view.
              </p>
            ) : (
              unifiedByMonth.map(([month, monthItems]) => (
                <section key={month} className="rounded-xl border border-gray-200 bg-white p-4">
                  <h2 className="text-sm font-semibold text-mm-ink">{monthTitle(month)}</h2>
                  <ul className="mt-2 divide-y divide-gray-100">
                    {monthItems
                      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
                      .map((item) => (
                        <li key={item.id} className="flex items-start gap-3 py-2">
                          {item.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.thumbnailUrl} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
                          ) : (
                            <span className="h-12 w-12 shrink-0 rounded-md bg-gray-100" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-mm-lavender/40 px-2 py-0.5 text-[10px] font-semibold text-mm-dark-rose">
                                {item.platform === "youtube" ? "YouTube" : item.platform === "tiktok" ? "TikTok" : "Instagram"} ·{" "}
                                {item.contentType}
                              </span>
                              <span className="text-[11px] text-mm-muted">
                                {item.publishedAt ? formatDate(item.publishedAt) : "Date unknown"}
                              </span>
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs text-mm-ink">
                              {item.title?.trim() || <span className="italic text-gray-400">No title/caption</span>}
                            </p>
                          </div>
                          {item.permalink && (
                            <a
                              href={item.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-[11px] font-medium text-mm-dark-rose underline underline-offset-2"
                            >
                              Open
                            </a>
                          )}
                        </li>
                      ))}
                  </ul>
                </section>
              ))
            ))}
        </>
      )}
    </div>
  );
}

function monthTitle(month: string): string {
  if (month === "unknown") return "Unknown date";
  return new Date(`${month}-01`).toLocaleDateString(undefined, { year: "numeric", month: "long" });
}
