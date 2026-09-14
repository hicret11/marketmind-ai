"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  fetchOpportunityConfig,
  runDiscovery,
} from "@/lib/opportunity/client";
import type {
  DiscoverResponse,
  DiscoveryQuery,
  OpportunityConfigStatus,
} from "@/types/opportunity";
import { ConfigNotice } from "@/components/opportunities/config-notice";
import { DiscoveryForm } from "@/components/opportunities/discovery-form";
import { LeadResults } from "@/components/opportunities/lead-results";
import { ProductContextPanel } from "@/components/opportunities/product-context-panel";

export default function OpportunitiesPage() {
  const [config, setConfig] = useState<OpportunityConfigStatus | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<DiscoverResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchOpportunityConfig()
      .then((c) => active && setConfig(c))
      .catch(
        (e) =>
          active &&
          setConfigError(
            e instanceof ApiError ? e.message : "Could not load configuration.",
          ),
      );
    return () => {
      active = false;
    };
  }, []);

  async function handleDiscover(query: DiscoveryQuery) {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const result = await runDiscovery(query);
      setResponse(result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Discovery failed unexpectedly.",
      );
    } finally {
      setLoading(false);
    }
  }

  // Discovery is never "unconfigured" — OpenStreetMap is a free, keyless
  // fallback — so the form is enabled as soon as config has loaded.
  const discoveryReady = Boolean(config);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-xl">
            🎯
          </span>
          <h1 className="text-2xl font-semibold text-mm-ink">
            Opportunity Discovery
          </h1>
        </div>
        <p className="mt-1 text-sm text-mm-muted">
          Search real businesses, analyze their public websites, and score how
          well <span className="font-medium">Sing My Birthday</span> fits — with
          the evidence behind every recommendation.
        </p>
      </header>

      <ProductContextPanel />

      {configError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {configError}
        </div>
      )}
      {config && <ConfigNotice config={config} />}

      <DiscoveryForm
        disabled={!discoveryReady}
        loading={loading}
        onSubmit={handleDiscover}
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-mm-muted">
          Searching the provider, analyzing websites and scoring fit… this can
          take up to a minute.
        </div>
      )}

      {response && !loading && <LeadResults response={response} />}

      {config?.discovery.freeProviderActive && (
        <footer className="border-t border-gray-100 pt-4 text-center text-[11px] text-mm-muted">
          Business data sourced from OpenStreetMap. ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-mm-rose/50 underline-offset-2"
          >
            OpenStreetMap contributors
          </a>
          , available under the Open Database License (ODbL).
        </footer>
      )}
    </div>
  );
}
