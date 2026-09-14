import type { DiscoveredLead } from "@/types/opportunity";
import type { LeadQualificationInput } from "@/types/evaluation";

/**
 * Maps a real Opportunity Discovery pipeline result straight into a Lead
 * Qualification case input — the SAME shape the manual "Add to Evaluation
 * Dataset" button produces (see lib/evaluation/validate.ts's
 * parseAddLeadQualificationFromOpportunity, which does the equivalent
 * mapping from untrusted JSON). This version works from an already-typed
 * DiscoveredLead straight out of runDiscoveryPipeline, for callers (like the
 * dataset builder) that never leave the server, so there's nothing to
 * validate — only to map.
 */
export function buildLeadQualificationInputFromDiscoveredLead(
  lead: DiscoveredLead,
): LeadQualificationInput {
  const { business, qualification, fitScore } = lead;
  return {
    businessName: business.name,
    category: business.category,
    address: business.address,
    website: business.website,
    matchedCategories: business.matchedCategories,
    signals: qualification.signals.map((s) => ({
      key: s.key,
      label: s.label,
      status: s.status,
      confidence: s.confidence,
      matchedTerms: s.matchedTerms,
    })),
    evidence: qualification.evidence.map((e) => ({
      id: e.id,
      sourceUrl: e.sourceUrl,
      matchedTerm: e.matchedTerm,
      text: e.text,
    })),
    referenceFitScore: { score: fitScore.score, band: fitScore.band },
  };
}
