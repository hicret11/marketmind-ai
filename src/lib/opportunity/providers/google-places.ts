import type { RawBusiness } from "@/types/opportunity";
import { getCategoryQueryText } from "../categories";
import { OpportunityError } from "../errors";
import type { BusinessDiscoveryProvider, DiscoverInput } from "./types";

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.types",
  "places.location",
  "places.rating",
  "places.googleMapsUri",
].join(",");

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  types?: string[];
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  googleMapsUri?: string;
}

/**
 * Google Places API (New) — Text Search. One request per selected category,
 * combined with the location string. Results are returned verbatim.
 */
export class GooglePlacesProvider implements BusinessDiscoveryProvider {
  readonly id = "google_places" as const;

  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw new OpportunityError(
        "DISCOVERY_NOT_CONFIGURED",
        "GOOGLE_PLACES_API_KEY is not set.",
      );
    }
  }

  async discover({
    location,
    categories,
    limit,
    signal,
  }: DiscoverInput): Promise<RawBusiness[]> {
    const perCategory = Math.min(20, Math.max(1, Math.ceil(limit / Math.max(1, categories.length)) + 2));
    const collected: RawBusiness[] = [];

    for (const categoryId of categories) {
      const queryText = getCategoryQueryText(categoryId);
      const places = await this.searchText(
        `${queryText} in ${location}`,
        perCategory,
        signal,
      );
      for (const place of places) {
        // matchedCategory stores the MarketMind category id, not the free-text query.
        const mapped = this.mapPlace(place, categoryId);
        if (mapped) collected.push(mapped);
      }
    }

    return collected;
  }

  private async searchText(
    textQuery: string,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<GooglePlace[]> {
    let response: Response;
    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify({ textQuery, pageSize }),
        signal,
      });
    } catch (cause) {
      throw new OpportunityError(
        "DISCOVERY_PROVIDER_ERROR",
        "Could not reach Google Places API.",
        { cause },
      );
    }

    const payload = (await response.json().catch(() => null)) as
      | { places?: GooglePlace[]; error?: { message?: string } }
      | null;

    if (!response.ok) {
      const message =
        payload?.error?.message ??
        `Google Places API responded with ${response.status}.`;
      throw new OpportunityError("DISCOVERY_PROVIDER_ERROR", message, {
        status: response.status === 429 ? 429 : 502,
        details: { provider: "google_places", httpStatus: response.status },
      });
    }

    return payload?.places ?? [];
  }

  private mapPlace(place: GooglePlace, matchedCategory: string): RawBusiness | null {
    if (!place.id || !place.displayName?.text) return null;
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;

    return {
      provider: this.id,
      sourceId: place.id,
      name: place.displayName.text,
      website: place.websiteUri,
      phone: place.internationalPhoneNumber ?? place.nationalPhoneNumber,
      address: place.formattedAddress,
      category:
        place.primaryTypeDisplayName?.text ??
        place.primaryType ??
        place.types?.[0],
      categories: place.types ?? [],
      location:
        typeof lat === "number" && typeof lng === "number"
          ? { lat, lng }
          : undefined,
      rating: typeof place.rating === "number" ? place.rating : undefined,
      mapsUrl: place.googleMapsUri,
      matchedCategory,
      raw: place,
    };
  }
}
