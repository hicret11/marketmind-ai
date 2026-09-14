import {
  PRODUCT_CONTEXT_ID,
  type FitBand,
  type FitScore,
  type FitScoreCriterion,
  type QualificationResult,
  type QualificationSignal,
  type VerifiedBusiness,
} from "@/types/opportunity";
import { clamp } from "./util";

/**
 * Lead scoring module.
 *
 * A transparent, weighted rubric for Sing My Birthday fit. Every point is
 * attributable to a named criterion with a stated basis ("verified" from the
 * business's own data, or "derived" from rule-based signals). No model, no
 * hidden weights.
 */

interface CriterionDef {
  key: string;
  label: string;
  weight: number;
  basis: "verified" | "derived";
  /** Returns awarded fraction 0..1 and a human rationale. */
  evaluate: (ctx: {
    signal: (key: string) => QualificationSignal | undefined;
    business: VerifiedBusiness;
    analyzed: boolean;
  }) => { fraction: number; rationale: string };
}

function fromSignal(
  signal: QualificationSignal | undefined,
  analyzed: boolean,
  labels: { hit: string; miss: string; unknown: string },
): { fraction: number; rationale: string } {
  if (!analyzed || !signal || signal.status === "unknown") {
    return { fraction: 0, rationale: labels.unknown };
  }
  if (signal.status === "detected") {
    return {
      fraction: clamp(0.5 + signal.confidence * 0.5, 0, 1),
      rationale: `${labels.hit}${
        signal.matchedTerms.length
          ? ` (matched: ${signal.matchedTerms.slice(0, 4).join(", ")})`
          : ""
      }`,
    };
  }
  return { fraction: 0, rationale: labels.miss };
}

const CRITERIA: CriterionDef[] = [
  {
    key: "birthday_focus",
    label: "Birthday focus",
    weight: 30,
    basis: "derived",
    evaluate: ({ signal, analyzed }) =>
      fromSignal(signal("birthday_services"), analyzed, {
        hit: "Website explicitly markets birthdays",
        miss: "No birthday language found on the website",
        unknown: "Website not analyzed — no birthday signal",
      }),
  },
  {
    key: "party_packages",
    label: "Party / celebration packages",
    weight: 20,
    basis: "derived",
    evaluate: ({ signal, analyzed }) =>
      fromSignal(signal("party_packages"), analyzed, {
        hit: "Structured party packages detected",
        miss: "No packaged party offering found",
        unknown: "Website not analyzed — no package signal",
      }),
  },
  {
    key: "audience_fit",
    label: "Audience fit (families / kids)",
    weight: 15,
    basis: "derived",
    evaluate: ({ signal, analyzed }) =>
      fromSignal(signal("family_audience"), analyzed, {
        hit: "Targets families or children",
        miss: "No family / kids audience language",
        unknown: "Website not analyzed — no audience signal",
      }),
  },
  {
    key: "personalization",
    label: "Existing personalization",
    weight: 15,
    basis: "derived",
    evaluate: ({ signal, analyzed }) =>
      fromSignal(signal("personalization"), analyzed, {
        hit: "Already offers custom / personalized experiences",
        miss: "No personalization language found",
        unknown: "Website not analyzed — no personalization signal",
      }),
  },
  {
    key: "event_relevance",
    label: "Event relevance",
    weight: 10,
    basis: "derived",
    evaluate: ({ signal, analyzed }) =>
      fromSignal(signal("event_relevance"), analyzed, {
        hit: "Hosts events / celebrations",
        miss: "No event-hosting language found",
        unknown: "Website not analyzed — no event signal",
      }),
  },
  {
    key: "contactability",
    label: "Contactability (verified)",
    weight: 10,
    basis: "verified",
    evaluate: ({ business }) => {
      const hasWebsite = Boolean(business.website);
      const hasPhone = Boolean(business.phone);
      if (hasWebsite && hasPhone) {
        return { fraction: 1, rationale: "Verified website and phone on record" };
      }
      if (hasWebsite || hasPhone) {
        return {
          fraction: 0.5,
          rationale: `Verified ${hasWebsite ? "website" : "phone"} on record`,
        };
      }
      return { fraction: 0, rationale: "No website or phone on record" };
    },
  },
];

function bandFor(score: number): FitBand {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

export function scoreLead(
  qualification: QualificationResult,
  business: VerifiedBusiness,
): FitScore {
  const signalMap = new Map(qualification.signals.map((s) => [s.key, s]));
  const signal = (key: string) => signalMap.get(key);
  const analyzed = qualification.analyzedFromWebsite;

  const criteria: FitScoreCriterion[] = CRITERIA.map((def) => {
    const { fraction, rationale } = def.evaluate({ signal, business, analyzed });
    const awarded = Math.round(def.weight * clamp(fraction, 0, 1) * 10) / 10;
    return {
      key: def.key,
      label: def.label,
      weight: def.weight,
      max: def.weight,
      awarded,
      basis: def.basis,
      rationale,
    };
  });

  const score = Math.round(
    criteria.reduce((sum, c) => sum + c.awarded, 0),
  );

  return {
    productContextId: PRODUCT_CONTEXT_ID,
    score: clamp(score, 0, 100),
    maxScore: 100,
    band: bandFor(score),
    dataCompleteness: analyzed ? "full" : "partial",
    method: "transparent-weighted-rubric",
    criteria,
  };
}
