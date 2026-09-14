/**
 * Opportunity Discovery types.
 *
 * MarketMind currently supports exactly one product context: Sing My Birthday.
 * Multi-company support is intentionally out of scope.
 *
 * A hard rule runs through these types: VERIFIED business data (from a real
 * business data provider or the business's own public website) is kept strictly
 * separate from AI INTERPRETATION. The LLM never populates `VerifiedBusiness`,
 * `WebsiteAnalysis`, `QualificationResult` or `FitScore`.
 */

export const PRODUCT_CONTEXT_ID = "sing-my-birthday" as const;
export type ProductContextId = typeof PRODUCT_CONTEXT_ID;

export type DiscoveryProviderId = "google_places" | "foursquare" | "openstreetmap";

/** AI providers behind the generic AiProvider interface (see lib/opportunity/ai/). */
export type AiProviderId = "gemini" | "anthropic";

export type OsmElementType = "node" | "way" | "relation";

export interface DiscoveryQuery {
  location: string;
  /** MarketMind category ids (see lib/opportunity/categories.ts), not free text. */
  categories: string[];
  limit: number;
  analyzeWebsites: boolean;
}

/** Raw record straight from a provider, before normalization. */
export interface RawBusiness {
  provider: DiscoveryProviderId;
  sourceId: string;
  name: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  postcode?: string;
  country?: string;
  openingHours?: string;
  category?: string;
  categories?: string[];
  location?: { lat: number; lng: number };
  rating?: number;
  mapsUrl?: string;
  /** OpenStreetMap-specific provenance (undefined for other providers). */
  osmId?: string;
  osmType?: OsmElementType;
  /** Raw OSM tag bag, kept for audit (undefined for other providers). */
  tags?: Record<string, string>;
  /** Which user-supplied categories surfaced this record. */
  matchedCategory?: string;
  matchedCategories?: string[];
  /** Untouched provider payload, kept for provenance / audit. */
  raw: unknown;
}

/** Verified business data after normalization + dedup. Never AI-generated. */
export interface VerifiedBusiness {
  /** Stable id derived from provider + sourceId. */
  id: string;
  provider: DiscoveryProviderId;
  sourceId: string;
  name: string;
  website: string | null;
  websiteDomain: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
  openingHours: string | null;
  category: string | null;
  categories: string[];
  location: { lat: number; lng: number } | null;
  rating: number | null;
  mapsUrl: string | null;
  osmId: string | null;
  osmType: OsmElementType | null;
  tags: Record<string, string> | null;
  matchedCategories: string[];
  /** Original provider payload for this record. */
  sourcePayload: unknown;
}

export interface WebsitePageSnapshot {
  url: string;
  title: string | null;
  text: string;
  wordCount: number;
}

export interface WebsiteAnalysis {
  requestedUrl: string | null;
  finalUrl: string | null;
  ok: boolean;
  skipped: boolean;
  statusCode: number | null;
  fetchedAt: string;
  pages: WebsitePageSnapshot[];
  combinedText: string;
  totalWords: number;
  truncated: boolean;
  error: string | null;
}

export type SignalStatus = "detected" | "not_detected" | "unknown";

export interface EvidenceSnippet {
  id: string;
  featureKey: string;
  sourceUrl: string;
  matchedTerm: string;
  text: string;
}

export interface QualificationSignal {
  key: string;
  label: string;
  description: string;
  status: SignalStatus;
  /** 0..1 — derived from match count / spread, not from an LLM. */
  confidence: number;
  matchedTerms: string[];
  evidence: EvidenceSnippet[];
}

export interface QualificationResult {
  analyzedFromWebsite: boolean;
  method: "rule-based";
  signals: QualificationSignal[];
  evidence: EvidenceSnippet[];
  notes: string[];
}

export interface FitScoreCriterion {
  key: string;
  label: string;
  weight: number;
  max: number;
  awarded: number;
  basis: "verified" | "derived";
  rationale: string;
}

export type FitBand = "low" | "medium" | "high";

export interface FitScore {
  productContextId: ProductContextId;
  score: number;
  maxScore: 100;
  band: FitBand;
  dataCompleteness: "full" | "partial";
  method: "transparent-weighted-rubric";
  criteria: FitScoreCriterion[];
}

export interface ProductFeature {
  id: string;
  name: string;
  description: string;
}

export interface ProductContext {
  id: ProductContextId;
  name: string;
  tagline: string;
  description: string;
  features: ProductFeature[];
  audiences: string[];
  eventRelevance: string[];
  integrationModels: string[];
  idealPartnerSignals: string[];
}

/**
 * AI-generated interpretation — "MarketMind AI Opportunity Intelligence".
 * Kept strictly separate from verified data. The active AI provider (Gemini by
 * default; Anthropic optionally) is an implementation detail never named here.
 */
export interface OpportunityExperienceGap {
  detected: boolean;
  summary: string;
  confidence: FitBand;
}

export interface OpportunityMatchedFeature {
  id: string;
  name: string;
  reason: string;
}

export interface OpportunityPartnership {
  recommended: boolean;
  type: string;
  title: string;
  summary: string;
  howItWorks: string[];
}

export interface OpportunityPilot {
  recommended: boolean;
  duration: string;
  scope: string;
  successMetrics: string[];
}

export interface OpportunityAnalysis {
  whySelected: string;
  currentExperience: string;
  experienceGap: OpportunityExperienceGap;
  matchedProductFeature: OpportunityMatchedFeature;
  partnership: OpportunityPartnership;
  suggestedPilot: OpportunityPilot;
  recommendedContactRoles: string[];
  outreachAngle: string;
  limitations: string[];
  /** Ids of EvidenceSnippet items the model says it relied on. */
  usedEvidenceIds: string[];
}

export interface OpportunityGeneration {
  available: boolean;
  reason: string | null;
  model: string | null;
  generatedAt: string | null;
  analysis: OpportunityAnalysis | null;
  groundedOn: {
    evidenceCount: number;
    fitScore: number;
    analyzedFromWebsite: boolean;
  } | null;
  /** True when this result came from the local cache rather than a fresh call. */
  cached?: boolean;
}

/** A draft-only B2B outreach email, grounded in the same evidence + analysis. */
export interface OutreachDraft {
  subject: string;
  /** Full draft text, greeting through sign-off. Never sent automatically. */
  body: string;
  usedEvidenceIds: string[];
}

export interface OutreachGeneration {
  available: boolean;
  reason: string | null;
  model: string | null;
  generatedAt: string | null;
  draft: OutreachDraft | null;
}

/** One fully-processed discovery result (pipeline steps 1–7). */
export interface DiscoveredLead {
  business: VerifiedBusiness;
  website: WebsiteAnalysis;
  qualification: QualificationResult;
  fitScore: FitScore;
}

export interface DiscoverResponse {
  ok: boolean;
  provider: DiscoveryProviderId;
  query: DiscoveryQuery;
  generatedAt: string;
  results: DiscoveredLead[];
  warnings: string[];
}

export interface AnalyzeResponse {
  ok: boolean;
  business: VerifiedBusiness;
  website: WebsiteAnalysis;
  qualification: QualificationResult;
  fitScore: FitScore;
  opportunity: OpportunityGeneration;
}

export interface OpportunityConfigStatus {
  discovery: {
    /** The provider that will actually be used right now. Always resolvable. */
    provider: DiscoveryProviderId;
    /** true when the active provider needs no paid credential (OpenStreetMap). */
    freeProviderActive: boolean;
    availableProviders: DiscoveryProviderId[];
    configuredPaidProviders: DiscoveryProviderId[];
  };
  websiteAnalysis: {
    configured: true;
    maxPagesPerSite: number;
    timeoutMs: number;
  };
  ai: {
    configured: boolean;
    provider: AiProviderId | null;
    model: string | null;
    /** Dev-only diagnostic (e.g. ["GEMINI_API_KEY"]) — never shown in production UI copy. */
    missing: string[];
  };
  crm: {
    storage: "supabase" | "file";
    supabaseConfigured: boolean;
  };
}

export type LeadStatus = "new" | "contacted" | "qualified" | "archived";

export interface LeadRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  productContextId: ProductContextId;
  business: VerifiedBusiness;
  fitScore: {
    score: number;
    band: FitBand;
    dataCompleteness: "full" | "partial";
  };
  signals: Array<
    Pick<QualificationSignal, "key" | "label" | "status" | "confidence">
  >;
  evidence: EvidenceSnippet[];
  opportunity: OpportunityAnalysis | null;
  discovery: {
    provider: DiscoveryProviderId;
    sourceId: string;
    query: DiscoveryQuery;
  };
  status: LeadStatus;
  stage: "lead";
}

export interface SaveLeadResponse {
  ok: boolean;
  lead: LeadRecord;
  storage: "supabase" | "file";
  deduped: boolean;
}

export interface ListLeadsResponse {
  ok: boolean;
  leads: LeadRecord[];
  storage: "supabase" | "file";
}

export interface OutreachResponse {
  ok: boolean;
  outreach: OutreachGeneration;
}
