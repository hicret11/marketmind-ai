import { BUSINESS_CATEGORY_OPTIONS, MAX_RESULT_COUNT } from "./categories";
import { OpportunityError } from "./errors";
import { CONTACT_ROLE_TYPES, PARTNERSHIP_TYPES, SING_MY_BIRTHDAY } from "./product-context";
import type {
  DiscoveryProviderId,
  DiscoveryQuery,
  EvidenceSnippet,
  FitBand,
  OpportunityAnalysis,
  OsmElementType,
  VerifiedBusiness,
} from "@/types/opportunity";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

const KNOWN_CATEGORY_IDS = new Set(BUSINESS_CATEGORY_OPTIONS.map((c) => c.id));

export function parseDiscoveryQuery(body: unknown): DiscoveryQuery {
  if (!isRecord(body)) {
    throw new OpportunityError("INVALID_REQUEST", "Request body must be an object.");
  }

  const location = str(body.location);
  if (!location) {
    throw new OpportunityError("INVALID_REQUEST", "`location` is required.");
  }
  if (location.length > 160) {
    throw new OpportunityError("INVALID_REQUEST", "`location` is too long.");
  }

  const rawCategories = Array.isArray(body.categories) ? body.categories : [];
  const categories = Array.from(
    new Set(rawCategories.map((c) => str(c)).filter((c): c is string => Boolean(c))),
  );

  if (categories.length === 0) {
    throw new OpportunityError(
      "INVALID_REQUEST",
      "Select at least one business category.",
    );
  }

  const unknown = categories.filter((c) => !KNOWN_CATEGORY_IDS.has(c));
  if (unknown.length > 0) {
    throw new OpportunityError(
      "INVALID_REQUEST",
      `Unknown category: ${unknown[0]}`,
    );
  }

  const limitRaw = Number(body.limit ?? body.count);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(MAX_RESULT_COUNT, Math.max(1, Math.trunc(limitRaw)))
    : 10;

  const analyzeWebsites =
    body.analyzeWebsites === undefined ? true : Boolean(body.analyzeWebsites);

  return { location, categories, limit, analyzeWebsites };
}

const PROVIDERS: DiscoveryProviderId[] = [
  "google_places",
  "foursquare",
  "openstreetmap",
];
const OSM_ELEMENT_TYPES: OsmElementType[] = ["node", "way", "relation"];

export function parseVerifiedBusiness(value: unknown): VerifiedBusiness {
  if (!isRecord(value)) {
    throw new OpportunityError("INVALID_REQUEST", "`business` must be an object.");
  }

  const provider = value.provider;
  if (
    typeof provider !== "string" ||
    !PROVIDERS.includes(provider as DiscoveryProviderId)
  ) {
    throw new OpportunityError("INVALID_REQUEST", "`business.provider` is invalid.");
  }
  const sourceId = str(value.sourceId);
  const name = str(value.name);
  if (!sourceId || !name) {
    throw new OpportunityError(
      "INVALID_REQUEST",
      "`business.sourceId` and `business.name` are required.",
    );
  }

  const location = isRecord(value.location)
    ? {
        lat: Number(value.location.lat),
        lng: Number(value.location.lng),
      }
    : null;

  const osmType =
    typeof value.osmType === "string" &&
    OSM_ELEMENT_TYPES.includes(value.osmType as OsmElementType)
      ? (value.osmType as OsmElementType)
      : null;

  const tags = isRecord(value.tags)
    ? Object.fromEntries(
        Object.entries(value.tags).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      )
    : null;

  return {
    id: str(value.id) ?? sourceId,
    provider: provider as DiscoveryProviderId,
    sourceId,
    name,
    website: str(value.website),
    websiteDomain: str(value.websiteDomain),
    phone: str(value.phone),
    email: str(value.email),
    address: str(value.address),
    city: str(value.city),
    postcode: str(value.postcode),
    country: str(value.country),
    openingHours: str(value.openingHours),
    category: str(value.category),
    categories: Array.isArray(value.categories)
      ? value.categories.filter((c): c is string => typeof c === "string")
      : [],
    location:
      location && Number.isFinite(location.lat) && Number.isFinite(location.lng)
        ? location
        : null,
    rating: typeof value.rating === "number" ? value.rating : null,
    mapsUrl: str(value.mapsUrl),
    osmId: str(value.osmId),
    osmType,
    tags,
    matchedCategories: Array.isArray(value.matchedCategories)
      ? value.matchedCategories.filter(
          (c): c is string => typeof c === "string",
        )
      : [],
    sourcePayload: value.sourcePayload ?? null,
  };
}

export function parseAnalyzeBody(body: unknown): {
  business: VerifiedBusiness;
  analyzeWebsites: boolean;
} {
  if (!isRecord(body)) {
    throw new OpportunityError("INVALID_REQUEST", "Request body must be an object.");
  }
  return {
    business: parseVerifiedBusiness(body.business),
    analyzeWebsites:
      body.analyzeWebsites === undefined ? true : Boolean(body.analyzeWebsites),
  };
}

function band(value: unknown): FitBand {
  return value === "high" || value === "medium" || value === "low" ? value : "low";
}

function strArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

export function parseEvidenceList(value: unknown): EvidenceSnippet[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((e) => ({
    id: String(e.id ?? ""),
    featureKey: String(e.featureKey ?? ""),
    sourceUrl: String(e.sourceUrl ?? ""),
    matchedTerm: String(e.matchedTerm ?? ""),
    text: String(e.text ?? ""),
  }));
}

/** Reconstructs a client-echoed OpportunityAnalysis defensively — never trusts shape or enums blindly. */
export function parseOpportunityAnalysis(value: unknown): OpportunityAnalysis {
  if (!isRecord(value)) {
    throw new OpportunityError("INVALID_REQUEST", "`analysis` must be an object.");
  }

  const featureObj = isRecord(value.matchedProductFeature) ? value.matchedProductFeature : {};
  const feature = SING_MY_BIRTHDAY.features.find((f) => f.id === str(featureObj.id));
  if (!feature) {
    throw new OpportunityError("INVALID_REQUEST", "`analysis.matchedProductFeature.id` is invalid.");
  }

  const experienceGap = isRecord(value.experienceGap) ? value.experienceGap : {};
  const partnership = isRecord(value.partnership) ? value.partnership : {};
  const pilot = isRecord(value.suggestedPilot) ? value.suggestedPilot : {};

  const partnershipType = str(partnership.type);
  const validPartnershipType =
    partnershipType && (PARTNERSHIP_TYPES as readonly string[]).includes(partnershipType)
      ? partnershipType
      : PARTNERSHIP_TYPES[0];

  return {
    whySelected: str(value.whySelected) ?? "",
    currentExperience: str(value.currentExperience) ?? "",
    experienceGap: {
      detected: experienceGap.detected === true,
      summary: str(experienceGap.summary) ?? "",
      confidence: band(experienceGap.confidence),
    },
    matchedProductFeature: {
      id: feature.id,
      name: feature.name,
      reason: str(featureObj.reason) ?? "",
    },
    partnership: {
      recommended: partnership.recommended === true,
      type: validPartnershipType,
      title: str(partnership.title) ?? "",
      summary: str(partnership.summary) ?? "",
      howItWorks: strArray(partnership.howItWorks),
    },
    suggestedPilot: {
      recommended: pilot.recommended === true,
      duration: str(pilot.duration) ?? "",
      scope: str(pilot.scope) ?? "",
      successMetrics: strArray(pilot.successMetrics),
    },
    recommendedContactRoles: strArray(value.recommendedContactRoles).filter((r) =>
      (CONTACT_ROLE_TYPES as readonly string[]).includes(r),
    ),
    outreachAngle: str(value.outreachAngle) ?? "",
    limitations: strArray(value.limitations),
    usedEvidenceIds: strArray(value.usedEvidenceIds),
  };
}

export function parseOutreachBody(body: unknown): {
  business: VerifiedBusiness;
  analysis: OpportunityAnalysis;
  evidence: EvidenceSnippet[];
} {
  if (!isRecord(body)) {
    throw new OpportunityError("INVALID_REQUEST", "Request body must be an object.");
  }
  return {
    business: parseVerifiedBusiness(body.business),
    analysis: parseOpportunityAnalysis(body.analysis),
    evidence: parseEvidenceList(body.evidence),
  };
}
