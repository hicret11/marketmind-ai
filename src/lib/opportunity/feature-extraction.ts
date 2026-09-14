import type {
  EvidenceSnippet,
  QualificationResult,
  QualificationSignal,
  SignalStatus,
  VerifiedBusiness,
  WebsiteAnalysis,
} from "@/types/opportunity";
import { clamp, shortHash } from "./util";

/**
 * Feature extraction module.
 *
 * Deterministic, rule-based extraction of qualification signals from the
 * business's own website text (and provider category as a weak secondary
 * signal). No LLM is involved — every "detected" signal carries the exact
 * matched term and a text snippet from a named source page.
 */

interface FeatureRule {
  key: string;
  label: string;
  description: string;
  terms: string[];
  /** Provider category substrings that count as supporting evidence. */
  categoryHints?: string[];
}

const RULES: FeatureRule[] = [
  {
    key: "birthday_services",
    label: "Birthday services",
    description: "Explicitly markets birthdays or birthday parties.",
    terms: [
      "birthday",
      "birthdays",
      "birthday party",
      "birthday parties",
      "birthday package",
      "bday",
      "turning ",
    ],
  },
  {
    key: "party_packages",
    label: "Party packages",
    description: "Offers structured, bookable party or celebration packages.",
    terms: [
      "party package",
      "party packages",
      "birthday package",
      "celebration package",
      "private party",
      "party room",
      "party hire",
      "function room",
      "book a party",
      "party booking",
      "group booking",
      "reserve a party",
    ],
    categoryHints: ["party", "event venue", "banquet"],
  },
  {
    key: "family_audience",
    label: "Family & kids audience",
    description: "Targets families, children or youth.",
    terms: [
      "family",
      "families",
      "family-friendly",
      "kids",
      "children",
      "child",
      "toddler",
      "youth",
      "all ages",
    ],
    categoryHints: [
      "children",
      "amusement",
      "playground",
      "family",
      "trampoline",
      "zoo",
    ],
  },
  {
    key: "personalization",
    label: "Personalization",
    description: "Already offers custom, bespoke or personalized experiences.",
    terms: [
      "personalized",
      "personalised",
      "customized",
      "customised",
      "custom ",
      "bespoke",
      "tailored",
      "made to order",
      "your name",
      "one of a kind",
      "unique experience",
    ],
  },
  {
    key: "event_relevance",
    label: "Event relevance",
    description: "Hosts dated events, celebrations or special occasions.",
    terms: [
      "event",
      "events",
      "celebration",
      "celebrations",
      "special occasion",
      "occasions",
      "function",
      "functions",
      "party",
      "parties",
      "book your event",
    ],
    categoryHints: ["event", "venue", "entertainment"],
  },
];

function findSnippets(
  text: string,
  rule: FeatureRule,
  sourceUrl: string,
): { matchedTerms: string[]; evidence: EvidenceSnippet[] } {
  if (!text) return { matchedTerms: [], evidence: [] };
  const haystack = text.toLowerCase();
  const matchedTerms: string[] = [];
  const evidence: EvidenceSnippet[] = [];

  for (const term of rule.terms) {
    const idx = haystack.indexOf(term.trim());
    if (idx === -1) continue;
    matchedTerms.push(term.trim());
    if (evidence.length >= 3) continue;

    const start = Math.max(0, idx - 130);
    const end = Math.min(text.length, idx + term.length + 130);
    let snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
    if (start > 0) snippet = `…${snippet}`;
    if (end < text.length) snippet = `${snippet}…`;

    evidence.push({
      id: `ev_${rule.key}_${shortHash(`${sourceUrl}:${term}:${idx}`)}`,
      featureKey: rule.key,
      sourceUrl,
      matchedTerm: term.trim(),
      text: snippet,
    });
  }

  return { matchedTerms: Array.from(new Set(matchedTerms)), evidence };
}

function evaluateRule(
  rule: FeatureRule,
  website: WebsiteAnalysis,
  business: VerifiedBusiness,
): QualificationSignal {
  if (!website.ok) {
    return {
      key: rule.key,
      label: rule.label,
      description: rule.description,
      status: "unknown",
      confidence: 0,
      matchedTerms: [],
      evidence: [],
    };
  }

  const allTerms = new Set<string>();
  const allEvidence: EvidenceSnippet[] = [];
  const pages: Array<{ url: string; text: string }> = website.pages.length
    ? website.pages.map((p) => ({ url: p.url, text: p.text }))
    : [
        {
          url: website.finalUrl ?? website.requestedUrl ?? "",
          text: website.combinedText,
        },
      ];

  for (const page of pages) {
    const { matchedTerms, evidence } = findSnippets(
      page.text,
      rule,
      page.url || website.finalUrl || "",
    );
    matchedTerms.forEach((t) => allTerms.add(t));
    allEvidence.push(...evidence);
  }

  const businessCategories = [business.category, ...business.categories].filter(
    (c): c is string => Boolean(c),
  );
  const categoryHint = (rule.categoryHints ?? []).some((hint) =>
    businessCategories.some((c) => c.toLowerCase().includes(hint)),
  );

  const termCount = allTerms.size;
  let status: SignalStatus = "not_detected";
  let confidence = 0;

  if (termCount > 0) {
    status = "detected";
    confidence = clamp(0.45 + termCount * 0.12 + (categoryHint ? 0.1 : 0), 0, 1);
  } else if (categoryHint) {
    status = "detected";
    confidence = 0.3;
  }

  return {
    key: rule.key,
    label: rule.label,
    description: rule.description,
    status,
    confidence: Number(confidence.toFixed(2)),
    matchedTerms: Array.from(allTerms),
    evidence: allEvidence.slice(0, 4),
  };
}

function deriveIntegrationPotential(
  signals: QualificationSignal[],
  website: WebsiteAnalysis,
): QualificationSignal {
  const base: QualificationSignal = {
    key: "product_integration_potential",
    label: "Product integration potential",
    description:
      "Derived: how naturally a personalized birthday song could slot into what this business already sells.",
    status: "unknown",
    confidence: 0,
    matchedTerms: [],
    evidence: [],
  };
  if (!website.ok) return base;

  const get = (key: string) => signals.find((s) => s.key === key);
  const birthday = get("birthday_services");
  const packages = get("party_packages");
  const personalization = get("personalization");
  const family = get("family_audience");
  const events = get("event_relevance");

  const detected = (s?: QualificationSignal) => s?.status === "detected";
  let score = 0;
  if (detected(birthday)) score += 0.4;
  if (detected(packages)) score += 0.25;
  if (detected(personalization)) score += 0.15;
  if (detected(family)) score += 0.1;
  if (detected(events)) score += 0.1;

  const status: SignalStatus = score >= 0.25 ? "detected" : "not_detected";
  const matchedTerms = [birthday, packages, personalization, family, events]
    .filter((s): s is QualificationSignal => detected(s))
    .map((s) => s.label);

  return {
    ...base,
    status,
    confidence: Number(clamp(score, 0, 1).toFixed(2)),
    matchedTerms,
    evidence: [],
  };
}

export function extractQualification(
  website: WebsiteAnalysis,
  business: VerifiedBusiness,
): QualificationResult {
  const ruleSignals = RULES.map((rule) =>
    evaluateRule(rule, website, business),
  );
  const derived = deriveIntegrationPotential(ruleSignals, website);
  const signals = [...ruleSignals, derived];
  const evidence = ruleSignals.flatMap((s) => s.evidence);

  const notes: string[] = [];
  if (!website.ok) {
    notes.push(
      website.skipped
        ? "Website not analyzed — signals are marked unknown."
        : `Website could not be analyzed (${website.error ?? "unknown error"}) — signals are marked unknown.`,
    );
  } else if (website.truncated) {
    notes.push("Website text was truncated; extraction used the available portion.");
  }

  return {
    analyzedFromWebsite: website.ok,
    method: "rule-based",
    signals,
    evidence,
    notes,
  };
}
