"use client";

import { useState } from "react";
import { formatDate } from "@/components/social/social-ui";
import { ApiError, disconnectTiktok, syncTiktokNow } from "@/lib/tiktok/client";
import type { TiktokConfigStatus } from "@/types/tiktok";

/** Maps the OAuth callback's `tt_error` query param to an understandable message. */
export function tiktokOAuthErrorMessage(code: string, detail: string | null): string {
  switch (code) {
    case "denied":
      return detail
        ? `TikTok authorization was declined: ${detail}`
        : "TikTok authorization was declined. You can connect again anytime.";
    case "invalid_callback":
      return "TikTok didn't return the expected information. Please try connecting again.";
    case "state_mismatch":
      return "That connection attempt expired or was invalid. Please try connecting again.";
    case "no_refresh_token":
      return "TikTok didn't grant a refresh token, so MarketMind can't keep syncing this account. Please try connecting again.";
    case "TOKEN_EXCHANGE_FAILED":
      return "TikTok's token exchange failed — check the server logs for the exact reason. Please try connecting again.";
    case "oauth_failed":
      return "The TikTok connection didn't complete. Please try again.";
    default:
      return "The TikTok connection didn't complete. Please try again.";
  }
}

export function ConnectTiktok({
  config,
  onChanged,
}: {
  config: TiktokConfigStatus;
  onChanged: () => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setNotice(null);
    try {
      const res = await syncTiktokNow();
      setNotice(
        `Synced ${res.run.videosSynced} video(s).` +
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
      await disconnectTiktok();
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not disconnect.");
    }
  }

  // --- Not configured -----------------------------------------------------
  if (!config.appConfigured) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-semibold">TikTok isn&apos;t set up yet.</p>
        <p className="mt-1 text-amber-800">
          Add these to <code className="rounded bg-amber-100 px-1">.env.local</code> (server-side
          only), then restart:
        </p>
        <ul className="mt-1.5 list-inside list-disc text-amber-800">
          {config.missing.map((m) => (
            <li key={m}>
              <code className="rounded bg-amber-100 px-1">{m}</code>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-amber-700">
          In the TikTok for Developers portal, create an app with &quot;Login Kit&quot;, set the
          redirect URI to{" "}
          <code className="rounded bg-amber-100 px-1">{config.redirectUri ?? "/api/social/tiktok/callback"}</code>
          , and request <code className="rounded bg-amber-100 px-1">{config.requestedScopes.join(", ")}</code>.
        </p>
      </div>
    );
  }

  // --- Configured, not connected ---------------------------------------------
  if (!config.connected || !config.account) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm font-semibold text-mm-ink">Connect your TikTok account</p>
        <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-mm-soft-pink to-mm-lavender text-mm-dark-rose">
              TT
            </span>
            <div>
              <p className="text-sm font-medium text-mm-ink">TikTok</p>
              <p className="text-xs text-mm-muted">
                Connect TikTok to analyze your real video performance.
              </p>
            </div>
          </div>
          <a
            href="/api/social/tiktok/connect"
            className="shrink-0 rounded-full bg-gradient-to-r from-mm-pink to-mm-dark-rose px-4 py-2 text-sm font-semibold text-white"
          >
            Connect TikTok
          </a>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  // --- Connected ---------------------------------------------------------
  const acct = config.account;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {acct.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={acct.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-mm-soft-pink to-mm-lavender text-mm-dark-rose">
              TT
            </span>
          )}
          <div>
            <p className="text-sm font-semibold text-mm-ink">TikTok</p>
            <p className="text-sm text-mm-muted">
              {acct.displayName}
              {acct.username && acct.username !== acct.displayName ? ` (@${acct.username})` : ""}
            </p>
            <p className="text-[11px] text-mm-muted">
              {acct.followerCount != null ? `${acct.followerCount.toLocaleString("en-US")} followers · ` : ""}
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
            Last sync: {config.lastSync ? formatDate(config.lastSync.startedAt) : "never"}
            {config.lastSync?.status ? ` (${config.lastSync.status})` : ""}
          </p>
          <p className="text-[11px] text-mm-muted">
            {config.lastSync ? `${config.lastSync.videosSynced} video(s) synced` : "No videos synced yet"}
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
                href="/api/social/tiktok/connect"
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

      {config.missingScopes.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-900">
            Missing permission{config.missingScopes.length > 1 ? "s" : ""}:{" "}
            <code className="rounded bg-amber-100 px-1">{config.missingScopes.join(", ")}</code>. Reconnect
            TikTok to grant the newly added permissions.
          </p>
          <a
            href="/api/social/tiktok/connect"
            className="shrink-0 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Reconnect
          </a>
        </div>
      )}

      {notice && <p className="mt-3 text-xs text-emerald-700">{notice}</p>}
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      {config.lastSync && config.lastSync.warnings.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-gray-100 pt-3">
          {config.lastSync.warnings.slice(0, 4).map((w) => (
            <li key={w} className="text-[11px] text-amber-700">
              — {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
