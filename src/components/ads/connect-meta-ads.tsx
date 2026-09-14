"use client";

import { useState } from "react";
import { ApiError, disconnectMetaAds, selectMetaAdAccount } from "@/lib/meta-ads/client";
import type { MetaAdsConfigStatus } from "@/types/meta-ads";

/** Shown when we have REAL permission data from Meta — exact format requested, never a guess. */
function MissingPermissionsNotice({ missingScopes }: { missingScopes: string[] }) {
  return (
    <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <p className="font-semibold">Missing Meta permissions:</p>
      <ul className="mt-1 list-inside list-disc">
        {missingScopes.map((s) => (
          <li key={s}>
            <code className="rounded bg-amber-100 px-1">{s}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Shown when Meta blocked the connection for a reason that ISN'T a specific named scope — Meta's own text, verbatim. */
function ConnectionErrorNotice({ message }: { message: string }) {
  return (
    <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900">
      <p className="font-semibold">Meta blocked this connection:</p>
      <p className="mt-1">{message}</p>
      <p className="mt-1 text-red-800">
        This isn&apos;t necessarily a missing <code className="rounded bg-red-100 px-1">ads_read</code>/
        <code className="rounded bg-red-100 px-1">ads_management</code> scope — Meta returns the same generic error
        for an app-level block (e.g. Business Verification pending, or the app not having the account/Business
        Manager linked). Check the app&apos;s status in Meta App Dashboard → App Review, and that this ad account is
        added under the app&apos;s Business Manager.
      </p>
    </div>
  );
}

export function ConnectMetaAds({
  status,
  onChanged,
}: {
  status: MetaAdsConfigStatus;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const isStatic = status.account?.id === "static";

  async function handleSelectAccount(id: string) {
    setSwitching(true);
    setError(null);
    try {
      await selectMetaAdAccount(id);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not select ad account.");
    } finally {
      setSwitching(false);
    }
  }

  async function handleDisconnect() {
    try {
      await disconnectMetaAds();
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not disconnect.");
    }
  }

  // --- Not configured -----------------------------------------------------
  if (!status.appConfigured) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-semibold">Meta Ads isn&apos;t set up yet.</p>
        <p className="mt-1 text-amber-800">
          Add these to <code className="rounded bg-amber-100 px-1">.env.local</code> (server-side only), then restart:
        </p>
        <ul className="mt-1.5 list-inside list-disc text-amber-800">
          {status.missing.map((m) => (
            <li key={m}>
              <code className="rounded bg-amber-100 px-1">{m}</code>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-amber-700">
          Simplest path: generate a long-lived System User token in Meta Business Settings with{" "}
          <code className="rounded bg-amber-100 px-1">ads_read</code> +{" "}
          <code className="rounded bg-amber-100 px-1">ads_management</code> assigned to your ad account, then set{" "}
          <code className="rounded bg-amber-100 px-1">META_ADS_ACCESS_TOKEN</code> and{" "}
          <code className="rounded bg-amber-100 px-1">META_AD_ACCOUNT_ID</code>. Or connect via Meta Login below once{" "}
          <code className="rounded bg-amber-100 px-1">META_ADS_APP_ID</code>/
          <code className="rounded bg-amber-100 px-1">META_ADS_APP_SECRET</code> are set (reuses your Meta app id/secret
          by default).
        </p>
      </div>
    );
  }

  // --- Static token configured but not (fully) working — show the real diagnosis, no OAuth button applies here ---
  if (isStatic && !status.connected) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-mm-soft-pink to-mm-lavender text-mm-dark-rose">
            Ⓜ
          </span>
          <div>
            <p className="text-sm font-medium text-mm-ink">Meta Ads (server token)</p>
            <p className="text-xs text-mm-muted">Connected token, but Meta isn&apos;t letting it read the ad account yet.</p>
          </div>
        </div>
        {status.missingScopes.length > 0 && <MissingPermissionsNotice missingScopes={status.missingScopes} />}
        {status.missingScopes.length === 0 && status.connectionError && <ConnectionErrorNotice message={status.connectionError} />}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  // --- Configured, not connected (OAuth path only) ---
  if (!status.connected) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm font-semibold text-mm-ink">Connect your Meta ad account</p>
        <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-mm-soft-pink to-mm-lavender text-mm-dark-rose">
              Ⓜ
            </span>
            <div>
              <p className="text-sm font-medium text-mm-ink">Meta Ads</p>
              <p className="text-xs text-mm-muted">Connect to build and review real campaign drafts.</p>
            </div>
          </div>
          <a
            href="/api/ads/meta/connect"
            className="shrink-0 rounded-full bg-gradient-to-r from-mm-pink to-mm-dark-rose px-4 py-2 text-sm font-semibold text-white"
          >
            Connect Meta Ads
          </a>
        </div>
        {status.missingScopes.length > 0 && <MissingPermissionsNotice missingScopes={status.missingScopes} />}
        {status.missingScopes.length === 0 && status.connectionError && <ConnectionErrorNotice message={status.connectionError} />}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  const acct = status.account!;
  const selectedAccount = status.adAccounts.find((a) => a.id === acct.selectedAdAccountId);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-mm-soft-pink to-mm-lavender text-mm-dark-rose">
            Ⓜ
          </span>
          <div>
            <p className="text-sm font-semibold text-mm-ink">Meta Ads</p>
            <p className="text-sm text-mm-muted">{acct.userName ?? acct.selectedAdAccountId ?? "Connected account"}</p>
            <p className="text-[11px] text-mm-muted">
              {isStatic ? "Server token connection · " : ""}
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

        {!isStatic && (
          <button
            type="button"
            onClick={handleDisconnect}
            className="text-xs font-medium text-gray-400 hover:text-gray-600"
          >
            Disconnect
          </button>
        )}
      </div>

      {status.missingScopes.length > 0 ? (
        <MissingPermissionsNotice missingScopes={status.missingScopes} />
      ) : (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["ads_read", "ads_management"].map((s) => (
            <span key={s} className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">
              ✓ {s}
            </span>
          ))}
        </div>
      )}

      {selectedAccount && (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-3 text-[11px] sm:grid-cols-4">
          <div>
            <p className="text-mm-muted">Ad account</p>
            <p className="font-medium text-mm-ink">{selectedAccount.name}</p>
          </div>
          <div>
            <p className="text-mm-muted">Account ID</p>
            <p className="font-medium text-mm-ink">{selectedAccount.id}</p>
          </div>
          <div>
            <p className="text-mm-muted">Currency</p>
            <p className="font-medium text-mm-ink">{selectedAccount.currency ?? "Not available"}</p>
          </div>
          <div>
            <p className="text-mm-muted">Timezone</p>
            <p className="font-medium text-mm-ink">{selectedAccount.timezoneName ?? "Not available"}</p>
          </div>
        </div>
      )}

      {!isStatic && status.adAccounts.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-muted">Ad account</p>
          <select
            value={acct.selectedAdAccountId ?? ""}
            onChange={(e) => handleSelectAccount(e.target.value)}
            disabled={switching}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-mm-pink"
          >
            <option value="" disabled>
              Choose an ad account…
            </option>
            {status.adAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.id}
                {a.currency ? `, ${a.currency}` : ""})
              </option>
            ))}
          </select>
        </div>
      )}

      {isStatic && !acct.selectedAdAccountId && (
        <p className="mt-3 text-xs text-mm-muted">No ad account id configured (META_AD_ACCOUNT_ID).</p>
      )}

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    </div>
  );
}
