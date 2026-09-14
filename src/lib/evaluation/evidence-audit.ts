import { canonicalizeUrl } from "@/lib/opportunity/util";
import type { LeadQualificationInput } from "@/types/evaluation";

/**
 * Evidence/domain mismatch detection for Lead Qualification cases.
 *
 * Confirmed root cause (see lib/opportunity/website-analysis.ts): a
 * business's recorded website can redirect to a completely unrelated domain
 * (expired/parked/resold), and older evidence captured before that fetch fix
 * shipped may still carry snippets from that unrelated site. This is a pure,
 * deterministic check — no AI involved — comparing each evidence snippet's
 * sourceUrl domain against the business's own recorded website domain, using
 * the exact same canonicalizeUrl normalization used everywhere else (so
 * "www." / scheme differences never count as a mismatch).
 *
 * Client- and server-safe: no Node-only APIs, reused by both the reviewer UI
 * and the benchmark runner.
 */

export interface MismatchedEvidence {
  id: string;
  sourceUrl: string;
  domain: string | null;
}

export interface EvidenceMismatchResult {
  suspected: boolean;
  businessDomain: string | null;
  mismatchedEvidence: MismatchedEvidence[];
}

export function detectLeadQualificationEvidenceMismatch(
  input: LeadQualificationInput,
): EvidenceMismatchResult {
  const businessDomain = input.website ? (canonicalizeUrl(input.website)?.domain ?? null) : null;

  // No recorded website, or no evidence to check — nothing to compare, so nothing suspected.
  if (!businessDomain || input.evidence.length === 0) {
    return { suspected: false, businessDomain, mismatchedEvidence: [] };
  }

  const mismatchedEvidence: MismatchedEvidence[] = [];
  for (const item of input.evidence) {
    const evidenceDomain = canonicalizeUrl(item.sourceUrl)?.domain ?? null;
    if (evidenceDomain && evidenceDomain !== businessDomain) {
      mismatchedEvidence.push({ id: item.id, sourceUrl: item.sourceUrl, domain: evidenceDomain });
    }
  }

  return { suspected: mismatchedEvidence.length > 0, businessDomain, mismatchedEvidence };
}
