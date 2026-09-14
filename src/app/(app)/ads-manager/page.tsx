"use client";

import { useEffect, useState } from "react";
import { ApiError, fetchMetaAdsStatus } from "@/lib/meta-ads/client";
import { MetaConnectionIndicator } from "@/components/ads/meta-connection-indicator";
import { MetaAdsChat } from "@/components/ads/meta-ads-chat";
import { CampaignDraftPanel } from "@/components/ads/campaign-draft-panel";
import { CampaignHistory } from "@/components/ads/campaign-history";
import { ComingSoonAdsPlatform } from "@/components/ads/coming-soon-platform";
import { estimatedApiActions } from "@/lib/meta-ads/draft";
import type { AdsChatSession, MetaAdsConfigStatus } from "@/types/meta-ads";

type Tab = "meta" | "tiktok" | "google";

export default function AdsManagerPage() {
  const [tab, setTab] = useState<Tab>("meta");
  const [status, setStatus] = useState<MetaAdsConfigStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<AdsChatSession | null>(null);

  function load() {
    fetchMetaAdsStatus()
      .then(setStatus)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load Meta Ads status."));
  }

  useEffect(load, []);

  const tabs: Array<{ id: Tab; label: string; connected?: boolean }> = [
    { id: "meta", label: "Meta Ads", connected: status?.connected },
    { id: "tiktok", label: "TikTok Ads", connected: false },
    { id: "google", label: "Google Ads", connected: false },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-mm-ink">Ads Manager</h1>
        <p className="mt-1 text-sm text-mm-muted">
          An AI campaign assistant plus a real campaign builder — every campaign is created Paused for your review.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PlatformCard
          label="Meta Ads"
          status={status ? (status.connected ? "Connected" : status.appConfigured ? "Not Connected" : "Not configured") : "…"}
          connected={Boolean(status?.connected)}
        />
        <PlatformCard label="TikTok Ads" status="Coming Soon" connected={false} />
        <PlatformCard label="Google Ads" status="Coming Soon" connected={false} />
      </div>

      <div className="flex gap-1 rounded-full border border-gray-200 bg-white p-1 text-xs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 font-semibold ${
              tab === t.id ? "bg-mm-pink text-white" : "text-gray-600"
            }`}
          >
            {t.label}
            {t.connected === false && (
              <span className={`h-1.5 w-1.5 rounded-full ${tab === t.id ? "bg-white/70" : "bg-gray-300"}`} />
            )}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {tab === "meta" && status && (
        <div className="space-y-6">
          {/*
            Connection status is informational only — it never gates the
            chat/draft experience below. Only "Approve & Create Paused
            Campaign" (inside CampaignDraftPanel) actually calls Meta, and
            that's the one place a real connection problem should surface.
          */}
          <MetaConnectionIndicator status={status} />

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
            <div className="h-[520px]">
              <MetaAdsChat session={session} onSessionChanged={setSession} />
            </div>
            <div>
              {session ? (
                <CampaignDraftPanel
                  sessionId={session.id}
                  draft={session.draft}
                  estimatedActions={estimatedApiActions(session.draft)}
                  onDraftChanged={(draft) => setSession((s) => (s ? { ...s, draft } : s))}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-xs text-mm-muted">
                  Describe a campaign in the chat to start a draft.
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-mm-ink">Campaign History</h2>
            {status.connected ? (
              <CampaignHistory />
            ) : (
              <p className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center text-xs text-mm-muted">
                Real campaign history will appear here once the Meta connection issue above is resolved.
              </p>
            )}
          </section>
        </div>
      )}

      {tab === "tiktok" && (
        <ComingSoonAdsPlatform
          title="TikTok Ads"
          description="Connect TikTok Ads Manager to create and analyze TikTok campaigns."
        />
      )}

      {tab === "google" && <ComingSoonAdsPlatform title="Google Ads" />}
    </div>
  );
}

function PlatformCard({ label, status, connected }: { label: string; status: string; connected: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-mm-ink">{label}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            connected ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
          }`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}
