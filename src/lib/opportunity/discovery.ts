import type {
  DiscoveryProviderId,
  DiscoveryQuery,
  RawBusiness,
} from "@/types/opportunity";
import { resolveDiscoveryProvider } from "./providers";

/**
 * Business discovery module.
 *
 * Thin orchestration layer over the configured {@link BusinessDiscoveryProvider}.
 * It performs the real upstream search and returns raw records untouched — no
 * scoring, no interpretation, no fabricated entries.
 */
export async function discoverBusinesses(
  query: DiscoveryQuery,
  signal?: AbortSignal,
): Promise<{ provider: DiscoveryProviderId; raw: RawBusiness[] }> {
  const provider = resolveDiscoveryProvider();
  const raw = await provider.discover({
    location: query.location,
    categories: query.categories,
    limit: query.limit,
    signal,
  });
  return { provider: provider.id, raw };
}
