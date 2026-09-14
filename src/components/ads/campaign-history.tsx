"use client";

import { useEffect, useState } from "react";
import { ApiError, fetchMetaCampaigns } from "@/lib/meta-ads/client";
import { MetricValue } from "@/components/social/social-ui";
import type { MetaCampaignSummary } from "@/types/meta-ads";

/** Real Meta campaign history + real insight metrics. Never fabricated when Meta doesn't report a field. */
export function CampaignHistory() {
  const [campaigns, setCampaigns] = useState<MetaCampaignSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetaCampaigns()
      .then((r) => setCampaigns(r.campaigns))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load campaign history."));
  }, []);

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>;
  }
  if (!campaigns) return <p className="text-xs text-mm-muted">Loading campaign history…</p>;
  if (campaigns.length === 0) {
    return <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-xs text-mm-muted">No campaigns in this ad account yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead>
          <tr className="border-b border-gray-100 text-[10px] uppercase text-mm-muted">
            <th className="px-3 py-2">Campaign</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Objective</th>
            <th className="px-3 py-2">Spend</th>
            <th className="px-3 py-2">Impressions</th>
            <th className="px-3 py-2">Reach</th>
            <th className="px-3 py-2">Clicks</th>
            <th className="px-3 py-2">CTR</th>
            <th className="px-3 py-2">CPC</th>
            <th className="px-3 py-2">CPM</th>
            <th className="px-3 py-2">Conversions</th>
            <th className="px-3 py-2">ROAS</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c.id} className="border-b border-gray-50 last:border-0">
              <td className="max-w-[200px] truncate px-3 py-2 text-mm-ink" title={c.name}>{c.name}</td>
              <td className="px-3 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    c.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {c.status}
                </span>
              </td>
              <td className="px-3 py-2">{c.objective ?? "—"}</td>
              <td className="px-3 py-2">
                {c.spend != null ? `${c.spend.toFixed(2)}${c.currency ? ` ${c.currency}` : ""}` : "Not available"}
              </td>
              <td className="px-3 py-2"><MetricValue value={c.impressions} /></td>
              <td className="px-3 py-2"><MetricValue value={c.reach} /></td>
              <td className="px-3 py-2"><MetricValue value={c.clicks} /></td>
              <td className="px-3 py-2">{c.ctr != null ? `${c.ctr}%` : "Not available"}</td>
              <td className="px-3 py-2">{c.cpc != null ? c.cpc.toFixed(2) : "Not available"}</td>
              <td className="px-3 py-2">{c.cpm != null ? c.cpm.toFixed(2) : "Not available"}</td>
              <td className="px-3 py-2"><MetricValue value={c.conversions} /></td>
              <td className="px-3 py-2">{c.roas != null ? `${c.roas.toFixed(2)}x` : "Not available"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
