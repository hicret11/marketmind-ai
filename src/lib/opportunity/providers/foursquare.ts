import type { RawBusiness } from "@/types/opportunity";
import { getCategoryQueryText } from "../categories";
import { OpportunityError } from "../errors";
import type { BusinessDiscoveryProvider, DiscoverInput } from "./types";

const ENDPOINT = "https://api.foursquare.com/v3/places/search";
const FIELDS = "fsq_id,name,location,categories,tel,website,rating,geocodes";

interface FoursquarePlace {
  fsq_id?: string;
  name?: string;
  tel?: string;
  website?: string;
  rating?: number;
  location?: { formatted_address?: string };
  categories?: Array<{ name?: string }>;
  geocodes?: { main?: { latitude?: number; longitude?: number } };
}

/** Foursquare Places API — Place Search. One request per selected category. */
export class FoursquareProvider implements BusinessDiscoveryProvider {
  readonly id = "foursquare" as const;

  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw new OpportunityError(
        "DISCOVERY_NOT_CONFIGURED",
        "FOURSQUARE_API_KEY is not set.",
      );
    }
  }

  async discover({
    location,
    categories,
    limit,
    signal,
  }: DiscoverInput): Promise<RawBusiness[]> {
    const perCategory = Math.min(
      50,
      Math.max(1, Math.ceil(limit / Math.max(1, categories.length)) + 2),
    );
    const collected: RawBusiness[] = [];

    for (const categoryId of categories) {
      const queryText = getCategoryQueryText(categoryId);
      const places = await this.search(location, queryText, perCategory, signal);
      for (const place of places) {
        // matchedCategory stores the MarketMind category id, not the free-text query.
        const mapped = this.mapPlace(place, categoryId);
        if (mapped) collected.push(mapped);
      }
    }

    return collected;
  }

  private async search(
    near: string,
    query: string,
    limit: number,
    signal?: AbortSignal,
  ): Promise<FoursquarePlace[]> {
    const url = new URL(ENDPOINT);
    url.searchParams.set("query", query);
    url.searchParams.set("near", near);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("fields", FIELDS);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: this.apiKey, Accept: "application/json" },
        signal,
      });
    } catch (cause) {
      throw new OpportunityError(
        "DISCOVERY_PROVIDER_ERROR",
        "Could not reach Foursquare Places API.",
        { cause },
      );
    }

    const payload = (await response.json().catch(() => null)) as
      | { results?: FoursquarePlace[]; message?: string }
      | null;

    if (!response.ok) {
      throw new OpportunityError(
        "DISCOVERY_PROVIDER_ERROR",
        payload?.message ??
          `Foursquare Places API responded with ${response.status}.`,
        {
          status: response.status === 429 ? 429 : 502,
          details: { provider: "foursquare", httpStatus: response.status },
        },
      );
    }

    return payload?.results ?? [];
  }

  private mapPlace(
    place: FoursquarePlace,
    matchedCategory: string,
  ): RawBusiness | null {
    if (!place.fsq_id || !place.name) return null;
    const lat = place.geocodes?.main?.latitude;
    const lng = place.geocodes?.main?.longitude;

    return {
      provider: this.id,
      sourceId: place.fsq_id,
      name: place.name,
      website: place.website,
      phone: place.tel,
      address: place.location?.formatted_address,
      category: place.categories?.[0]?.name,
      categories: (place.categories ?? [])
        .map((c) => c.name)
        .filter((n): n is string => Boolean(n)),
      location:
        typeof lat === "number" && typeof lng === "number"
          ? { lat, lng }
          : undefined,
      rating: typeof place.rating === "number" ? place.rating : undefined,
      matchedCategory,
      raw: place,
    };
  }
}
