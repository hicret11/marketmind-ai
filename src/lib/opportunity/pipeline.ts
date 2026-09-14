import type {
  AnalyzeResponse,
  DiscoverResponse,
  DiscoveredLead,
  DiscoveryQuery,
  VerifiedBusiness,
} from "@/types/opportunity";
import { discoverBusinesses } from "./discovery";
import { extractQualification } from "./feature-extraction";
import { generateOpportunity } from "./opportunity";
import { normalizeBusinesses } from "./normalize";
import { scoreLead } from "./scoring";
import { mapWithConcurrency } from "./util";
import { analyzeWebsite } from "./website-analysis";

const WEBSITE_CONCURRENCY = 4;

/**
 * Discovery pipeline — steps 1–7.
 *
 *   1. real provider search        -> discoverBusinesses
 *   2. normalize + dedupe          -> normalizeBusinesses
 *   3. website analysis            -> analyzeWebsite   (per business, bounded concurrency)
 *   4. rule-based feature extract  -> extractQualification
 *   5. transparent fit scoring     -> scoreLead
 *
 * Step 8 (AI opportunity analysis) is intentionally NOT run here — it is a
 * separate, on-demand call per lead (see {@link analyzeSingleBusiness}).
 */
export async function runDiscoveryPipeline(
  query: DiscoveryQuery,
): Promise<DiscoverResponse> {
  const generatedAt = new Date().toISOString();
  const warnings: string[] = [];

  const { provider, raw } = await discoverBusinesses(query);
  const { businesses, duplicatesRemoved } = normalizeBusinesses(raw, query.limit);

  if (duplicatesRemoved > 0) {
    warnings.push(`Removed ${duplicatesRemoved} duplicate record(s).`);
  }
  if (businesses.length === 0) {
    warnings.push("The provider returned no businesses for this search.");
  }

  const results: DiscoveredLead[] = await mapWithConcurrency(
    businesses,
    WEBSITE_CONCURRENCY,
    async (business) => {
      const website = await analyzeWebsite(business.website, {
        enabled: query.analyzeWebsites,
      });
      const qualification = extractQualification(website, business);
      const fitScore = scoreLead(qualification, business);
      return { business, website, qualification, fitScore };
    },
  );

  results.sort((a, b) => b.fitScore.score - a.fitScore.score);

  const analyzed = results.filter((r) => r.website.ok).length;
  if (query.analyzeWebsites && businesses.length > 0 && analyzed === 0) {
    warnings.push(
      "No websites could be analyzed — fit scores are based on verified fields only.",
    );
  }

  return {
    ok: true,
    provider,
    query,
    generatedAt,
    results,
    warnings,
  };
}

/**
 * Steps 3–8 for a single business, re-verified from a fresh website fetch so the
 * AI analysis is grounded in current data rather than a client-supplied payload.
 */
export async function analyzeSingleBusiness(
  business: VerifiedBusiness,
  options: { analyzeWebsites: boolean },
): Promise<AnalyzeResponse> {
  const website = await analyzeWebsite(business.website, {
    enabled: options.analyzeWebsites,
  });
  const qualification = extractQualification(website, business);
  const fitScore = scoreLead(qualification, business);
  const opportunity = await generateOpportunity({
    business,
    qualification,
    fitScore,
    website,
  });

  return {
    ok: true,
    business,
    website,
    qualification,
    fitScore,
    opportunity,
  };
}
