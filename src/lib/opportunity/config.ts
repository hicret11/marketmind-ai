import type { DiscoveryProviderId, OpportunityConfigStatus } from "@/types/opportunity";
import { resolveAiProvider, resolveAiProviderId } from "./ai/provider";

/**
 * All Opportunity Discovery configuration is derived from environment variables.
 * OpenStreetMap needs no credential and is always available, so discovery is
 * never "unconfigured" — at worst it falls back to the free provider. Nothing
 * here fabricates data when a *paid* discovery provider or AI credential is
 * missing; it reports a clear state instead.
 */

import { env } from "./env";

export { env };

export const WEBSITE_MAX_PAGES = 3;
export const WEBSITE_DEFAULT_TIMEOUT_MS = 9000;

export const OSM_DEFAULT_RADIUS_M = 8000;
export const OSM_MIN_RADIUS_M = 1000;
export const OSM_MAX_RADIUS_M = 50000;
export const OSM_DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;
export const OSM_GEOCODE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const OSM_USER_AGENT_DEFAULT =
  "MarketMindAI-OpportunityDiscovery/0.1 (+https://marketmind.ai; free-tier OpenStreetMap discovery)";

function intFromEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = Number.parseInt(env(name), 10);
  return Number.isFinite(raw) ? Math.min(max, Math.max(min, raw)) : fallback;
}

export function websiteTimeoutMs(): number {
  return intFromEnv("OPPORTUNITY_WEBSITE_TIMEOUT_MS", WEBSITE_DEFAULT_TIMEOUT_MS, 2000, 30000);
}

export function osmRadiusMeters(): number {
  return intFromEnv(
    "OPPORTUNITY_OSM_RADIUS_METERS",
    OSM_DEFAULT_RADIUS_M,
    OSM_MIN_RADIUS_M,
    OSM_MAX_RADIUS_M,
  );
}

export function osmCacheTtlMs(): number {
  return intFromEnv("OPPORTUNITY_OSM_CACHE_TTL_MS", OSM_DEFAULT_CACHE_TTL_MS, 0, 24 * 60 * 60 * 1000);
}

export function osmUserAgent(): string {
  return env("OPPORTUNITY_OSM_USER_AGENT") || OSM_USER_AGENT_DEFAULT;
}

export const AI_DEFAULT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** How long a successful AI opportunity analysis is cached per business+evidence fingerprint. */
export function aiCacheTtlMs(): number {
  return intFromEnv("OPPORTUNITY_AI_CACHE_TTL_MS", AI_DEFAULT_CACHE_TTL_MS, 0, 30 * 24 * 60 * 60 * 1000);
}

/** Paid discovery providers that currently have a credential set. */
export function configuredPaidProviders(): DiscoveryProviderId[] {
  const providers: DiscoveryProviderId[] = [];
  if (env("GOOGLE_PLACES_API_KEY")) providers.push("google_places");
  if (env("FOURSQUARE_API_KEY")) providers.push("foursquare");
  return providers;
}

/** Every discovery provider usable right now — paid ones with a key, plus OpenStreetMap (always). */
export function availableDiscoveryProviders(): DiscoveryProviderId[] {
  return [...configuredPaidProviders(), "openstreetmap"];
}

/**
 * Resolves the active discovery provider. Priority:
 *   1. an explicit OPPORTUNITY_DISCOVERY_PROVIDER, if its credential (when needed) is present
 *   2. Google Places, if configured
 *   3. Foursquare, if configured
 *   4. OpenStreetMap — the free fallback, always available, no key required
 *
 * This never returns null: OpenStreetMap guarantees discovery works with zero
 * paid credentials.
 */
export function resolveDiscoveryProviderId(): DiscoveryProviderId {
  const explicit = env("OPPORTUNITY_DISCOVERY_PROVIDER").toLowerCase();
  const paid = configuredPaidProviders();

  if (explicit === "google_places" && paid.includes("google_places")) {
    return "google_places";
  }
  if (explicit === "foursquare" && paid.includes("foursquare")) {
    return "foursquare";
  }
  if (explicit === "openstreetmap") return "openstreetmap";

  if (paid.includes("google_places")) return "google_places";
  if (paid.includes("foursquare")) return "foursquare";
  return "openstreetmap";
}

export function isSupabaseServerConfigured(): boolean {
  return Boolean(
    env("SUPABASE_URL") &&
      (env("SUPABASE_SERVICE_ROLE_KEY") || env("SUPABASE_SERVICE_KEY")),
  );
}

export function getOpportunityConfig(): OpportunityConfigStatus {
  const provider = resolveDiscoveryProviderId();

  const aiProviderId = resolveAiProviderId();
  const aiProvider = aiProviderId ? resolveAiProvider() : null;

  const supabaseConfigured = isSupabaseServerConfigured();

  return {
    discovery: {
      provider,
      freeProviderActive: provider === "openstreetmap",
      availableProviders: availableDiscoveryProviders(),
      configuredPaidProviders: configuredPaidProviders(),
    },
    websiteAnalysis: {
      configured: true,
      maxPagesPerSite: WEBSITE_MAX_PAGES,
      timeoutMs: websiteTimeoutMs(),
    },
    ai: {
      configured: Boolean(aiProvider),
      provider: aiProviderId,
      model: aiProvider?.model ?? null,
      // Dev-only hint (see ConfigNotice) — never surfaced in production UI copy.
      missing: aiProviderId ? [] : ["GEMINI_API_KEY"],
    },
    crm: {
      storage: supabaseConfigured ? "supabase" : "file",
      supabaseConfigured,
    },
  };
}
