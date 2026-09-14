import type { DiscoveryProviderId, RawBusiness } from "@/types/opportunity";

export interface DiscoverInput {
  location: string;
  categories: string[];
  limit: number;
  signal?: AbortSignal;
}

/**
 * Integration seam for real business data providers. Implementations MUST return
 * only data returned by their upstream API — never synthesized records.
 */
export interface BusinessDiscoveryProvider {
  readonly id: DiscoveryProviderId;
  discover(input: DiscoverInput): Promise<RawBusiness[]>;
}
