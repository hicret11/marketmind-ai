import type { OsmElementType, RawBusiness } from "@/types/opportunity";
import { getCategoryOsmMapping, type OsmCategoryMapping } from "../categories";
import { osmRadiusMeters } from "../config";
import { OpportunityError } from "../errors";
import { resolveLocation } from "../geocode";
import { runOverpassQuery, type OverpassElement } from "../overpass";
import type { BusinessDiscoveryProvider, DiscoverInput } from "./types";

/**
 * OpenStreetMap discovery provider — free, no API key.
 *
 * User location + selected categories → Nominatim geocode (cached) → one
 * bounded Overpass query (cached, rate-limited, mirror-fallback) → real OSM
 * elements only. Never fabricates a business.
 */

function escapeOverpassValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Broad "this is some kind of POI/business" keys. A bare `["name"~regex]` scan
 * has to test every named element in the search radius (streets, buildings,
 * postboxes…) and is far too expensive for a shared Overpass server — pairing
 * the regex with one of these existence filters keeps it to actual businesses
 * while still not requiring an exact tag value. Kept short: each extra key
 * multiplies the query's cost, and empirically 3 covers the vast majority of
 * this category set (event-planners / party-planners opt into office/club).
 */
const DEFAULT_KEYWORD_KEYS = ["shop", "amenity", "leisure"];

function overpassLinesForMapping(
  mapping: OsmCategoryMapping,
  radius: number,
  lat: number,
  lon: number,
): string[] {
  const around = `(around:${radius},${lat},${lon})`;
  const lines: string[] = [];

  for (const filter of mapping.tagFilters) {
    const condition = filter.value
      ? `["${filter.key}"="${escapeOverpassValue(filter.value)}"]`
      : `["${filter.key}"~"${filter.valueRegex}",i]`;
    lines.push(`nwr${condition}${around};`);
  }

  if (mapping.keywordRegex) {
    for (const key of mapping.keywordKeys ?? DEFAULT_KEYWORD_KEYS) {
      lines.push(`nwr["${key}"]["name"~"${mapping.keywordRegex}",i]${around};`);
    }
  }

  return lines;
}

function humanizeOsmTag(value: string | undefined): string | undefined {
  return value ? value.replace(/_/g, " ") : undefined;
}

function buildAddress(tags: Record<string, string>): string | undefined {
  const streetLine = [tags["addr:housenumber"], tags["addr:street"]]
    .filter(Boolean)
    .join(" ")
    .trim();
  return streetLine || tags["addr:full"] || undefined;
}

function matchedCategoriesFor(
  tags: Record<string, string>,
  name: string,
  categoryIds: string[],
): string[] {
  const matched: string[] = [];
  const lowerName = name.toLowerCase();

  for (const id of categoryIds) {
    const mapping = getCategoryOsmMapping(id);
    if (!mapping) continue;

    const tagHit = mapping.tagFilters.some((f) => {
      const value = tags[f.key];
      if (value === undefined) return false;
      if (f.value) return value === f.value;
      if (f.valueRegex) {
        try {
          return new RegExp(f.valueRegex, "i").test(value);
        } catch {
          return false;
        }
      }
      return false;
    });

    const keywordHit = mapping.keywordRegex
      ? (() => {
          try {
            return new RegExp(mapping.keywordRegex!, "i").test(lowerName);
          } catch {
            return false;
          }
        })()
      : false;

    if (tagHit || keywordHit) matched.push(id);
  }

  return matched;
}

function mapElement(
  element: OverpassElement,
  categoryIds: string[],
): RawBusiness | null {
  const tags = element.tags ?? {};
  const name = tags.name?.trim();
  if (!name) return null; // never surface an unnamed OSM element as a "business"

  const lat = element.type === "node" ? element.lat : element.center?.lat;
  const lon = element.type === "node" ? element.lon : element.center?.lon;

  const rawCategory =
    tags.amenity ?? tags.shop ?? tags.leisure ?? tags.tourism ?? tags.office ?? tags.club;
  const rawCategories = [tags.amenity, tags.shop, tags.leisure, tags.tourism, tags.office, tags.club]
    .filter((v): v is string => Boolean(v));

  return {
    provider: "openstreetmap",
    sourceId: `${element.type}/${element.id}`,
    name,
    website: tags.website ?? tags["contact:website"],
    phone: tags.phone ?? tags["contact:phone"],
    email: tags.email ?? tags["contact:email"],
    address: buildAddress(tags),
    city: tags["addr:city"],
    postcode: tags["addr:postcode"],
    country: tags["addr:country"],
    openingHours: tags.opening_hours,
    category: humanizeOsmTag(rawCategory),
    categories: rawCategories.map((c) => humanizeOsmTag(c) ?? c),
    location:
      typeof lat === "number" && typeof lon === "number" ? { lat, lng: lon } : undefined,
    osmId: String(element.id),
    osmType: element.type as OsmElementType,
    tags,
    matchedCategories: matchedCategoriesFor(tags, name, categoryIds),
    raw: element,
  };
}

export class OpenStreetMapProvider implements BusinessDiscoveryProvider {
  readonly id = "openstreetmap" as const;

  async discover({ location, categories, limit }: DiscoverInput): Promise<RawBusiness[]> {
    const center = await resolveLocation(location);
    const radius = osmRadiusMeters();

    const knownCategories = categories.filter((id) => getCategoryOsmMapping(id));
    if (knownCategories.length === 0) {
      throw new OpportunityError(
        "INVALID_REQUEST",
        "None of the selected categories map to an OpenStreetMap search yet.",
      );
    }

    // One bounded, cacheable query per category — run strictly sequentially
    // (runOverpassQuery already rate-limits) so a single expensive category
    // can't block or fail the others, and each stays cheap enough for a
    // shared Overpass server to answer quickly.
    const hardCap = Math.min(120, Math.max(limit * 4, 30));
    const results: RawBusiness[] = [];
    let lastError: unknown = null;
    let succeeded = 0;

    for (const categoryId of knownCategories) {
      const mapping = getCategoryOsmMapping(categoryId)!;
      const lines = overpassLinesForMapping(mapping, radius, center.lat, center.lon);
      if (lines.length === 0) continue;

      const query = [
        "[out:json][timeout:20];",
        "(",
        ...lines,
        ");",
        `out center tags ${hardCap};`,
      ].join("\n");

      try {
        const elements = await runOverpassQuery(query);
        succeeded += 1;
        for (const element of elements) {
          const mapped = mapElement(element, categories);
          if (mapped) results.push(mapped);
        }
      } catch (error) {
        // Isolated per category — one slow/expensive category (e.g. a broad
        // keyword search in a dense city) doesn't take down the others.
        lastError = error;
        console.warn(
          `[openstreetmap] category "${categoryId}" query failed:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    if (succeeded === 0 && lastError) {
      throw lastError instanceof OpportunityError
        ? lastError
        : new OpportunityError(
            "DISCOVERY_PROVIDER_ERROR",
            "OpenStreetMap discovery failed for every selected category.",
            { cause: lastError, status: 502 },
          );
    }

    return results;
  }
}
