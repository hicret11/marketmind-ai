import type { CampaignDraft, MetaCallToActionType } from "@/types/meta-ads";

/**
 * Campaign draft: creation + validation, entirely in code. Gemini (see
 * assistant.ts) only ever proposes a PATCH to this shape — every field is
 * re-validated here before a draft can be approved, per the architecture
 * rule: "All budget, dates, targeting and creative IDs must be validated
 * in code."
 *
 * Deliberately has NO server-only imports (no "node:crypto", etc.) — this
 * module is imported from the client (the Ads Manager page uses
 * estimatedApiActions for a live preview), so it uses the Web Crypto
 * `crypto.randomUUID()` global, which both Node and the browser provide,
 * instead of "node:crypto"'s randomUUID.
 */

const REQUIRED_FIELDS: Array<{ key: keyof CampaignDraft; label: string }> = [
  { key: "campaignName", label: "Campaign name" },
  { key: "objective", label: "Objective" },
  { key: "dailyBudget", label: "Daily budget" },
  { key: "countries", label: "Country targeting" },
  { key: "creative", label: "Creative (an existing Instagram post)" },
  { key: "metaCallToActionType", label: "Call to action" },
];

/** MarketMind's own creative-label CTA vocabulary -> the closest real Meta ad button type. Never silently invented. */
const CTA_LABEL_TO_META: Record<string, MetaCallToActionType> = {
  "create yours": "SIGN_UP",
  "link in bio": "LEARN_MORE",
  "learn more": "LEARN_MORE",
  "shop now": "SHOP_NOW",
  "sign up": "SIGN_UP",
  "message us": "SEND_MESSAGE",
  "send message": "SEND_MESSAGE",
  subscribe: "SUBSCRIBE",
  "watch more": "WATCH_MORE",
  "get offer": "GET_OFFER",
};

export function mapCtaLabelToMeta(ctaLabel: string | null): MetaCallToActionType | null {
  if (!ctaLabel) return null;
  return CTA_LABEL_TO_META[ctaLabel.trim().toLowerCase()] ?? "LEARN_MORE"; // honest, visible default — never left blank
}

export function emptyDraft(): CampaignDraft {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    campaignName: null,
    objective: null,
    dailyBudget: null,
    currency: null,
    startDate: null,
    endDate: null,
    durationDays: null,
    countries: [],
    ageMin: null,
    ageMax: null,
    interests: [],
    placements: "automatic",
    creative: null,
    ctaLabel: null,
    metaCallToActionType: null,
    destinationUrl: null,
    missingFields: REQUIRED_FIELDS.map((f) => f.label),
    warnings: [],
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_COUNTRY = /^[A-Z]{2}$/;

/** Re-validates every field in code — never trusts the AI-proposed patch blindly. */
export function validateDraft(draft: CampaignDraft): CampaignDraft {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  if (!draft.campaignName || !draft.campaignName.trim()) missingFields.push("Campaign name");

  if (!draft.objective) missingFields.push("Objective");

  if (draft.dailyBudget == null || !Number.isFinite(draft.dailyBudget) || draft.dailyBudget <= 0) {
    missingFields.push("Daily budget");
  } else if (draft.dailyBudget < 1) {
    warnings.push("Daily budget is unusually low — Meta may reject budgets under its per-currency minimum.");
  }

  if (draft.startDate && !ISO_DATE.test(draft.startDate)) {
    missingFields.push("Start date (invalid format)");
  }
  if (draft.endDate && !ISO_DATE.test(draft.endDate)) {
    missingFields.push("End date (invalid format)");
  }
  if (draft.startDate && draft.endDate && draft.endDate <= draft.startDate) {
    missingFields.push("End date (must be after start date)");
  }
  if (draft.startDate && !draft.endDate && draft.durationDays == null) {
    warnings.push("No end date or duration set — Meta will run this campaign until manually paused.");
  }

  const invalidCountries = draft.countries.filter((c) => !ISO_COUNTRY.test(c));
  if (draft.countries.length === 0) {
    missingFields.push("Country targeting");
  } else if (invalidCountries.length > 0) {
    missingFields.push(`Country targeting (invalid code(s): ${invalidCountries.join(", ")})`);
  }

  if (draft.ageMin != null && (draft.ageMin < 13 || draft.ageMin > 65)) {
    missingFields.push("Minimum age (must be 13–65)");
  }
  if (draft.ageMax != null && (draft.ageMax < 13 || draft.ageMax > 65)) {
    missingFields.push("Maximum age (must be 13–65)");
  }
  if (draft.ageMin != null && draft.ageMax != null && draft.ageMin > draft.ageMax) {
    missingFields.push("Age range (minimum is greater than maximum)");
  }

  if (!draft.creative || !draft.creative.igMediaId) {
    missingFields.push("Creative (an existing Instagram post)");
  }

  if (!draft.metaCallToActionType) {
    missingFields.push("Call to action");
  }

  if (draft.destinationUrl) {
    try {
      new URL(draft.destinationUrl);
    } catch {
      missingFields.push("Destination URL (invalid)");
    }
  }

  return { ...draft, missingFields, warnings, updatedAt: new Date().toISOString() };
}

export function isDraftApprovable(draft: CampaignDraft): boolean {
  return draft.missingFields.length === 0;
}

/** What will actually be called against the Meta Marketing API — shown before approval, never a surprise. */
export function estimatedApiActions(draft: CampaignDraft): string[] {
  const actions = [
    `Create 1 Campaign ("${draft.campaignName ?? "…"}", objective ${draft.objective ?? "…"}, status PAUSED)`,
    `Create 1 Ad Set (daily budget ${draft.dailyBudget != null ? `${draft.dailyBudget} ${draft.currency ?? ""}`.trim() : "…"}, status PAUSED)`,
  ];
  if (draft.creative) {
    actions.push(`Create 1 Ad Creative from existing Instagram post ${draft.creative.igMediaId} (no re-upload)`);
  } else {
    actions.push("Create 1 Ad Creative (creative not yet chosen)");
  }
  actions.push("Create 1 Ad (status PAUSED)");
  return actions;
}
