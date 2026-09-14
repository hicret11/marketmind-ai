import { OSM_GEOCODE_CACHE_TTL_MS, osmUserAgent } from "./config";
import { OpportunityError } from "./errors";
import { createFileCache } from "./file-cache";
import { createRateLimiter } from "./util";

/**
 * Location resolution for the free OpenStreetMap discovery provider, via
 * Nominatim (OSM's own geocoder — https://nominatim.org/release-docs/latest/api/Search/).
 *
 * Nominatim's usage policy for the public instance requires: a descriptive
 * User-Agent, a maximum of ~1 request/second, and caching so repeated
 * searches don't repeatedly hit the service. All three are implemented here.
 */

export interface ResolvedLocation {
  lat: number;
  lon: number;
  displayName: string;
  /** [south, north, west, east], when Nominatim returns one. */
  boundingBox: [number, number, number, number] | null;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  boundingbox?: [string, string, string, string];
}

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const MIN_REQUEST_SPACING_MS = 1100; // Nominatim policy: max ~1 req/sec

const cache = createFileCache<ResolvedLocation>("osm-geocode-cache.json");
const throttle = createRateLimiter(MIN_REQUEST_SPACING_MS);

function cacheKey(query: string): string {
  return query.trim().toLowerCase();
}

/** Resolves a free-text location ("London, UK") to coordinates. Cached. */
export async function resolveLocation(query: string): Promise<ResolvedLocation> {
  const key = cacheKey(query);
  const cached = await cache.get(key);
  if (cached) return cached;

  await throttle();

  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": osmUserAgent(), Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
  } catch (cause) {
    throw new OpportunityError(
      "DISCOVERY_PROVIDER_ERROR",
      "Could not reach the OpenStreetMap location lookup (Nominatim). Please try again shortly.",
      { cause, status: 502 },
    );
  }

  if (response.status === 429) {
    throw new OpportunityError(
      "DISCOVERY_PROVIDER_ERROR",
      "OpenStreetMap's location lookup is rate-limiting requests right now. Please wait a moment and try again.",
      { status: 429 },
    );
  }
  if (!response.ok) {
    throw new OpportunityError(
      "DISCOVERY_PROVIDER_ERROR",
      `Location lookup failed (HTTP ${response.status}).`,
      { status: 502 },
    );
  }

  const results = (await response.json().catch(() => [])) as NominatimResult[];
  const first = results[0];
  if (!first) {
    throw new OpportunityError(
      "INVALID_REQUEST",
      `Could not resolve "${query}" to a location. Try a more specific place name, e.g. "London, UK".`,
    );
  }

  const resolved: ResolvedLocation = {
    lat: Number(first.lat),
    lon: Number(first.lon),
    displayName: first.display_name,
    boundingBox: first.boundingbox
      ? (first.boundingbox.map(Number) as [number, number, number, number])
      : null,
  };

  await cache.set(key, resolved, OSM_GEOCODE_CACHE_TTL_MS);
  return resolved;
}
