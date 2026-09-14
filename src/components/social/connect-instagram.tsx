"use client";

import { useState } from "react";
import { ApiError, disconnectInstagram, syncNow } from "@/lib/social/client";
import type { SocialConfigStatus } from "@/types/social";
import { formatDate } from "./social-ui";

export function ConnectInstagram({
  config,
  onChanged,
}: {
  config: SocialConfigStatus;
  onChanged: () => void;
}) {
  const ig = config.instagram;
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setNotice(null);
    try {
      const res = await syncNow();
      setNotice(
        `Synced ${res.run.mediaSynced} post(s), ${res.run.mediaInsightsSynced} insight snapshot(s).` +
          (res.run.warnings.length ? ` ${res.run.warnings.length} warning(s).` : ""),
      );
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    try {
      await disconnectInstagram();
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not disconnect.");
    }
  }

  // --- Not configured -----------------------------------------------------
  if (!ig.appConfigured) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-semibold">Instagram isn&apos;t set up yet.</p>
        <p className="mt-1 text-amber-800">
          Add these to <code className="rounded bg-amber-100 px-1">.env.local</code> (server-side
          only), then restart:
        </p>
        <ul className="mt-1.5 list-inside list-disc text-amber-800">
          {ig.missing.map((m) => (
            <li key={m}>
              <code className="rounded bg-amber-100 px-1">{m}</code>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-amber-700">
          In the Meta App dashboard, add the &quot;Instagram API with Instagram Login&quot; product,
          set the OAuth redirect to{" "}
          <code className="rounded bg-amber-100 px-1">{ig.redirectUri ?? "/api/social/instagram/callback"}</code>
          , and request <code className="rounded bg-amber-100 px-1">{ig.requestedScopes.join(", ")}</code>.
        </p>
      </div>
    );
  }

  // --- Configured, not connected ---------------------------------------------
  if (!ig.connected || !ig.account) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm font-semibold text-mm-ink">Connect your social channels</p>
        <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-mm-soft-pink to-mm-lavender text-mm-dark-rose">
              IG
            </span>
            <div>
              <p className="text-sm font-medium text-mm-ink">Instagram</p>
              <p className="text-xs text-mm-muted">
                Connect Instagram to analyze your real content and performance.
              </p>
            </div>
          </div>
          <a
            href="/api/social/instagram/connect"
            className="shrink-0 rounded-full bg-gradient-to-r from-mm-pink to-mm-dark-rose px-4 py-2 text-sm font-semibold text-white"
          >
            Connect Instagram
          </a>
        </div>
        <p className="mt-3 text-xs text-mm-muted">
          MarketMind Insights requires an Instagram Professional account (Business or Creator).
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  // --- Connected ---------------------------------------------------------
  const acct = ig.account;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {acct.profilePictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={acct.profilePictureUrl}
              alt=""
              className="h-11 w-11 rounded-full object-cover"
            />
          ) : (
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-mm-soft-pink to-mm-lavender text-mm-dark-rose">
              IG
            </span>
          )}
          <div>
            <p className="text-sm font-semibold text-mm-ink">Instagram</p>
            <p className="text-sm text-mm-muted">@{acct.username}</p>
            <p className="text-[11px] text-mm-muted">
              {acct.accountType === "BUSINESS" ? "Business" : "Creator"} account ·{" "}
              {acct.tokenStatus === "active" ? (
                <span className="font-semibold text-emerald-600">Connected</span>
              ) : (
                <span className="font-semibold text-amber-600">
                  {acct.tokenStatus === "expired" ? "Connection expired" : "Permission revoked"}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <p className="text-[11px] text-mm-muted">
            Last sync: {ig.lastSync ? formatDate(ig.lastSync.startedAt) : "never"}
            {ig.lastSync?.status ? ` (${ig.lastSync.status})` : ""}
          </p>
          <p className="text-[11px] text-mm-muted">
            {ig.lastSync ? `${ig.lastSync.mediaSynced} post(s) synced` : "No posts synced yet"}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="rounded-full bg-mm-ink px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {syncing ? "Syncing…" : "Sync now"}
            </button>
            {acct.tokenStatus !== "active" && (
              <a
                href="/api/social/instagram/connect"
                className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800"
              >
                Reconnect
              </a>
            )}
            <button
              type="button"
              onClick={handleDisconnect}
              className="text-xs font-medium text-gray-400 hover:text-gray-600"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>

      {notice && <p className="mt-3 text-xs text-emerald-700">{notice}</p>}
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      {ig.lastSync && ig.lastSync.warnings.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-gray-100 pt-3">
          {ig.lastSync.warnings.slice(0, 4).map((w) => (
            <li key={w} className="text-[11px] text-amber-700">
              — {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
