import type { OpportunityConfigStatus } from "@/types/opportunity";

const PROVIDER_LABEL: Record<string, string> = {
  google_places: "Google Places",
  foursquare: "Foursquare",
  openstreetmap: "OpenStreetMap",
};

const isDev = process.env.NODE_ENV === "development";

/**
 * Surfaces the real configuration in product-friendly language.
 *  - Discovery: OpenStreetMap needs no key, so it's never "unconfigured" —
 *    this only differentiates the free provider from a connected paid one.
 *  - AI: shown as "AI Opportunity Intelligence — Connected / Not connected".
 *    The active provider (Gemini) and any env var name are implementation
 *    detail — never named outside of the dev-only hint below.
 */
export function ConfigNotice({
  config,
}: {
  config: OpportunityConfigStatus;
}) {
  const providerLabel =
    PROVIDER_LABEL[config.discovery.provider] ?? config.discovery.provider;

  return (
    <div className="space-y-2">
      {config.discovery.freeProviderActive ? (
        <div className="rounded-lg border border-mm-soft-pink bg-white px-3 py-2 text-xs text-mm-ink">
          <p>
            <span className="font-semibold text-mm-dark-rose">
              Real business discovery powered by OpenStreetMap.
            </span>{" "}
            No API key required. Business data sourced from OpenStreetMap — not
            commercially verified by MarketMind.
          </p>
          {config.discovery.configuredPaidProviders.length === 0 && (
            <p className="mt-1 text-mm-muted">
              Optional: connect{" "}
              <code className="rounded bg-gray-100 px-1">
                GOOGLE_PLACES_API_KEY
              </code>{" "}
              or{" "}
              <code className="rounded bg-gray-100 px-1">
                FOURSQUARE_API_KEY
              </code>{" "}
              in <code className="rounded bg-gray-100 px-1">.env.local</code>{" "}
              for a paid provider instead.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Connected — provider:{" "}
          <span className="font-semibold">{providerLabel}</span> (paid)
        </div>
      )}

      <div
        className={`rounded-lg border px-3 py-2 text-xs ${
          config.ai.configured
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-gray-300 bg-gray-50 text-gray-700"
        }`}
      >
        <span className="font-semibold">AI Opportunity Intelligence</span>
        {" — "}
        {config.ai.configured ? (
          <>Connected. Generates partnership analysis and outreach drafts on request.</>
        ) : (
          <>
            Not connected.{" "}
            <span className="text-gray-500">
              Connect an AI provider in Settings to generate partnership
              analysis.
            </span>
          </>
        )}
        {isDev && !config.ai.configured && config.ai.missing.length > 0 && (
          <span className="ml-1 text-gray-400">
            (dev hint: set {config.ai.missing.join(", ")})
          </span>
        )}
      </div>
    </div>
  );
}
