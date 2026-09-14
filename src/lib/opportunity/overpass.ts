import { osmCacheTtlMs, osmUserAgent } from "./config";
import { OpportunityError } from "./errors";
import { createFileCache } from "./file-cache";
import { createRateLimiter, shortHash } from "./util";

/**
 * Overpass API access for the free OpenStreetMap discovery provider.
 *
 * Politeness / safety measures (Overpass runs on shared community servers):
 *  - a minimum spacing between outbound requests (process-wide)
 *  - a short-lived local cache so retries/re-renders don't repeat a query
 *  - a bounded `out ... N;` result cap (never an unbounded dump)
 *  - a request timeout, with 429/503/504 mapped to a clear retry message
 *  - a short, sequential list of public mirrors (never called in parallel)
 */

export interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

const MIN_REQUEST_SPACING_MS = 2000;
const REQUEST_TIMEOUT_MS = 28000;

const cache = createFileCache<OverpassElement[]>("osm-overpass-cache.json");
const throttle = createRateLimiter(MIN_REQUEST_SPACING_MS);

function busyMessage(): string {
  return "OpenStreetMap's shared search service (Overpass) is busy or rate-limiting requests right now. Please wait a few seconds and try again.";
}

async function fetchFromMirror(
  endpoint: string,
  query: string,
): Promise<OverpassElement[]> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": osmUserAgent(),
    },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 429 || response.status === 503 || response.status === 504) {
    throw new OpportunityError("DISCOVERY_PROVIDER_ERROR", busyMessage(), {
      status: 429,
    });
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new OpportunityError(
      "DISCOVERY_PROVIDER_ERROR",
      `Overpass API responded with ${response.status}.${
        text ? ` ${text.slice(0, 200)}` : ""
      }`,
      { status: 502 },
    );
  }

  const payload = (await response.json().catch(() => null)) as OverpassResponse | null;
  return payload?.elements ?? [];
}

/** Runs an Overpass QL query, cached and rate-limited. Never runs mirrors in parallel. */
export async function runOverpassQuery(query: string): Promise<OverpassElement[]> {
  const cacheKey = shortHash(query);
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  let lastError: unknown = null;

  for (const endpoint of MIRRORS) {
    await throttle();
    try {
      const elements = await fetchFromMirror(endpoint, query);
      await cache.set(cacheKey, elements, osmCacheTtlMs());
      return elements;
    } catch (cause) {
      lastError =
        cause instanceof Error && cause.name === "TimeoutError"
          ? new OpportunityError(
              "DISCOVERY_PROVIDER_ERROR",
              "The Overpass request timed out — the shared server may be overloaded. Please try again shortly.",
              { status: 504, cause },
            )
          : cause;
    }
  }

  if (lastError instanceof OpportunityError) throw lastError;
  throw new OpportunityError(
    "DISCOVERY_PROVIDER_ERROR",
    "Could not reach OpenStreetMap's Overpass API.",
    { cause: lastError, status: 502 },
  );
}
