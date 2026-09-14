"use client";

import { useState } from "react";
import type { MetaAdsConfigStatus } from "@/types/meta-ads";

/**
 * Compact connection status — replaces the old full-width warning block.
 * Chatting/drafting/choosing content never depends on this being green;
 * only "Approve & Create Paused Campaign" actually needs a working
 * connection, and that's where a real failure surfaces (see
 * campaign-draft-panel.tsx). Diagnostics (missingScopes / connectionError)
 * are kept — just tucked behind a click instead of blocking the page.
 */
export function MetaConnectionIndicator({ status }: { status: MetaAdsConfigStatus }) {
  const [expanded, setExpanded] = useState(false);
  const hasIssue = !status.connected;

  if (!status.appConfigured) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="h-2 w-2 rounded-full bg-gray-300" />
        <span className="font-medium text-mm-ink">Meta Ads</span>
        <span className="text-mm-muted">Not configured</span>
      </div>
    );
  }

  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5"
      >
        <span className={`h-2 w-2 rounded-full ${hasIssue ? "bg-amber-400" : "bg-green-500"}`} />
        <span className="font-medium text-mm-ink">Meta Ads</span>
        <span className={hasIssue ? "text-amber-700" : "text-green-700"}>
          {hasIssue ? "Connection issue" : "Connected"}
        </span>
        <span className="text-mm-muted">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="mt-2 max-w-md rounded-lg border border-gray-200 bg-white p-3">
          {status.missingScopes.length > 0 && (
            <>
              <p className="font-semibold text-amber-900">Missing Meta permissions:</p>
              <ul className="mt-1 list-inside list-disc text-amber-800">
                {status.missingScopes.map((s) => (
                  <li key={s}>
                    <code className="rounded bg-amber-50 px-1">{s}</code>
                  </li>
                ))}
              </ul>
            </>
          )}
          {status.missingScopes.length === 0 && status.connectionError && (
            <>
              <p className="font-semibold text-red-900">Meta blocked this connection:</p>
              <p className="mt-1 text-red-700">{status.connectionError}</p>
              <p className="mt-1 text-[11px] text-mm-muted">
                Not necessarily a missing scope — check App Review status and Business Manager linkage in Meta
                Developer Dashboard. You can keep building this draft; only the final creation step needs this fixed.
              </p>
            </>
          )}
          {!hasIssue && <p className="text-mm-muted">ads_read and ads_management are both confirmed.</p>}
        </div>
      )}
    </div>
  );
}
