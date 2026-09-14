"use client";

import { useEffect, useState } from "react";
import { fetchOpportunityConfig } from "@/lib/opportunity/client";
import type { OpportunityConfigStatus } from "@/types/opportunity";

const PROVIDER_LABEL: Record<string, string> = {
  gemini: "Gemini",
  anthropic: "Anthropic",
};

/**
 * Read-only AI configuration summary for Opportunity Discovery. Never
 * displays the API key itself — only connection status, provider and model.
 */
export function AiIntelligenceStatus() {
  const [config, setConfig] = useState<OpportunityConfigStatus | null>(null);

  useEffect(() => {
    let active = true;
    fetchOpportunityConfig()
      .then((c) => active && setConfig(c))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (!config) return null;

  const providerLabel = config.ai.provider
    ? (PROVIDER_LABEL[config.ai.provider] ?? config.ai.provider)
    : "—";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-mm-ink">AI Intelligence</h2>
      <p className="mt-1 text-xs text-mm-muted">
        Powers Opportunity Discovery&apos;s partnership analysis and outreach drafts.
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-mm-muted">
            Provider
          </dt>
          <dd className="font-medium text-mm-ink">{providerLabel}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-mm-muted">
            Status
          </dt>
          <dd
            className={`font-medium ${config.ai.configured ? "text-emerald-600" : "text-gray-500"}`}
          >
            {config.ai.configured ? "Connected" : "Not connected"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-mm-muted">
            Model
          </dt>
          <dd className="font-medium text-mm-ink">{config.ai.model ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
