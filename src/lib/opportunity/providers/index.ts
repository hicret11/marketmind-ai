import { env, resolveDiscoveryProviderId } from "../config";
import { FoursquareProvider } from "./foursquare";
import { GooglePlacesProvider } from "./google-places";
import { OpenStreetMapProvider } from "./openstreetmap";
import type { BusinessDiscoveryProvider } from "./types";

export type { BusinessDiscoveryProvider, DiscoverInput } from "./types";

/**
 * Returns the provider MarketMind will use right now. Resolution order:
 * explicit config -> Google Places -> Foursquare -> OpenStreetMap (free,
 * always available, no key). There is deliberately no mock provider and no
 * "not configured" dead end — OpenStreetMap guarantees discovery always works.
 */
export function resolveDiscoveryProvider(): BusinessDiscoveryProvider {
  const id = resolveDiscoveryProviderId();

  if (id === "google_places") {
    return new GooglePlacesProvider(env("GOOGLE_PLACES_API_KEY"));
  }
  if (id === "foursquare") {
    return new FoursquareProvider(env("FOURSQUARE_API_KEY"));
  }
  return new OpenStreetMapProvider();
}
