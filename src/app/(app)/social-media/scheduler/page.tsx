"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  createCalendarEntry,
  fetchCalendar,
  fetchSocialConfig,
} from "@/lib/social/client";
import type { CalendarEntry, SocialConfigStatus } from "@/types/social";
import { ConnectInstagram } from "@/components/social/connect-instagram";
import { formatDate } from "@/components/social/social-ui";
import { PlatformTabs, type PlatformTabOption } from "@/components/social/platform-tabs";
import { fetchYoutubeConfig } from "@/lib/youtube/client";
import type { YoutubeConfigStatus } from "@/types/youtube";
import { fetchTiktokStatus } from "@/lib/tiktok/client";
import type { TiktokConfigStatus } from "@/types/tiktok";

type Tab = "instagram" | "youtube" | "tiktok";

export default function ScheduledPostsPage() {
  const [tab, setTab] = useState<Tab>("instagram");

  const [config, setConfig] = useState<SocialConfigStatus | null>(null);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState("");
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");

  const [ytConfig, setYtConfig] = useState<YoutubeConfigStatus | null>(null);
  const [ttConfig, setTtConfig] = useState<TiktokConfigStatus | null>(null);

  const load = useCallback(() => {
    Promise.all([fetchSocialConfig(), fetchCalendar()])
      .then(([c, cal]) => {
        setConfig(c);
        setEntries(cal.entries.filter((e) => e.status === "scheduled" || e.status === "draft"));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load scheduler."));
  }, []);

  const loadPlatformStatus = useCallback(() => {
    fetchYoutubeConfig().then(setYtConfig).catch(() => {});
    fetchTiktokStatus().then(setTtConfig).catch(() => {});
  }, []);

  useEffect(load, [load]);
  useEffect(loadPlatformStatus, [loadPlatformStatus]);

  const connected = config?.instagram.connected;
  const publishing = config?.instagram.publishingEnabled;

  async function add(status: "draft" | "scheduled") {
    setSaving(true);
    setError(null);
    try {
      await createCalendarEntry({
        status,
        date: new Date(date).toISOString(),
        caption: caption || undefined,
        mediaSourceUrl: mediaUrl || undefined,
      });
      setDate("");
      setCaption("");
      setMediaUrl("");
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const tabOptions: PlatformTabOption[] = [
    { id: "instagram", label: "Instagram", connected },
    { id: "youtube", label: "YouTube", connected: ytConfig?.connected },
    { id: "tiktok", label: "TikTok", connected: ttConfig?.connected },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-mm-ink">Scheduled Posts</h1>
          <p className="mt-1 text-sm text-mm-muted">
            Plan future content. MarketMind runs the schedule server-side — your browser
            does not need to be open.
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
          {config && !connected && <ConnectInstagram config={config} onChanged={load} />}

          {connected && (
            <>
              <div
                className={`rounded-lg border px-3 py-2 text-xs ${
                  publishing
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                {publishing
                  ? "Instagram content publishing is enabled. Scheduled posts publish automatically when their time arrives (a server cron calls /api/social/cron)."
                  : "Publishing requires Instagram content publishing permission (instagram_business_content_publish + Meta App Review). You can still plan drafts and scheduled entries — they will publish automatically once the permission and INSTAGRAM_ENABLE_PUBLISHING are set."}
              </div>

              <section className="rounded-xl border border-gray-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-mm-ink">New content</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium text-mm-ink">
                    Date &amp; time
                    <input
                      type="datetime-local"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-mm-pink"
                    />
                  </label>
                  <label className="text-xs font-medium text-mm-ink">
                    Public media URL (for publishing)
                    <input
                      type="url"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder="https://…/image.jpg or /video.mp4"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-mm-pink"
                    />
                  </label>
                </div>
                <label className="mt-3 block text-xs font-medium text-mm-ink">
                  Caption
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-mm-pink"
                  />
                </label>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => add("draft")}
                    disabled={saving || !date}
                    className="rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 disabled:opacity-50"
                  >
                    Save draft
                  </button>
                  <button
                    type="button"
                    onClick={() => add("scheduled")}
                    disabled={saving || !date}
                    className="rounded-full bg-gradient-to-r from-mm-pink to-mm-dark-rose px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Schedule
                  </button>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-semibold text-mm-ink">Planned</h2>
                {entries.length === 0 ? (
                  <p className="mt-2 text-xs text-mm-muted">Nothing planned yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {entries.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                e.status === "scheduled" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {e.status}
                            </span>
                            <span className="text-[11px] text-mm-muted">{formatDate(e.date)}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-mm-ink">
                            {e.caption?.trim() || <span className="italic text-gray-400">No caption</span>}
                          </p>
                          {e.publishError && <p className="text-[11px] text-red-600">Publish error: {e.publishError}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </>
      )}

      {tab !== "instagram" && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-mm-muted">
          <p className="font-medium text-mm-ink">
            Scheduling isn&apos;t available for {tab === "youtube" ? "YouTube" : "TikTok"} yet.
          </p>
          <p className="mt-1">
            MarketMind can read real {tab === "youtube" ? "YouTube" : "TikTok"} content in the Content
            Library once connected, but publishing/scheduling to this platform isn&apos;t built yet —
            no fake schedule is shown here.
          </p>
        </div>
      )}
    </div>
  );
}
