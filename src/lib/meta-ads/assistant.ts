import { resolveAiProvider } from "@/lib/opportunity/ai/provider";
import type { ChatTurn, JsonSchema } from "@/lib/opportunity/ai/types";
import { OpportunityError } from "@/lib/opportunity/errors";
import { SING_MY_BIRTHDAY_SUMMARY } from "@/lib/product-context";
import { mapCtaLabelToMeta, validateDraft } from "./draft";
import { searchInstagramContent, toCreativeSelection } from "./creative-search";
import type { AdsChatMessage, CampaignDraft } from "@/types/meta-ads";

/**
 * Turns one user chat message into (a) a conversational reply and (b) a
 * validated patch to the campaign draft.
 *
 * Architecture rule: Gemini NEVER calls the Meta Marketing API. It only
 * proposes field values from natural language; every field is re-validated
 * in code (draft.ts) before the draft can be approved, and the actual Meta
 * API calls only happen after explicit user approval (see create.ts).
 */

const OBJECTIVES = ["OUTCOME_TRAFFIC", "OUTCOME_ENGAGEMENT", "OUTCOME_AWARENESS", "OUTCOME_LEADS", "OUTCOME_SALES"];

const SYSTEM_PROMPT = `You are MarketMind's Meta Ads campaign assistant for the Sing My Birthday account.

${SING_MY_BIRTHDAY_SUMMARY}

You help the user build a Meta (Facebook/Instagram) ad campaign DRAFT from natural language. You do NOT create anything in Meta yourself — you only extract structured fields from what the user says, and ask a short follow-up question for the next most important missing piece of information.

Rules:
1. Only set a field you can Support directly from what the user said or from the given context — never invent a budget, country, or date the user didn't provide or confirm.
2. Countries MUST be ISO 3166-1 alpha-2 codes (e.g. "GB" for United Kingdom, "US" for United States, "AE" for UAE). Convert country names/synonyms the user gives you.
3. Dates MUST be "YYYY-MM-DD". If the user gives a duration ("run for 7 days") instead of an end date, set durationDays and leave endDate unset.
4. If the user references existing content (e.g. "the Reel I posted on August 28", "my Instagram Reel"), set "creativeQuery" to a short search phrase describing it (e.g. "Reel August 28") — the app will search real synced Instagram posts for it; never invent a media id yourself.
5. "ctaLabel" is the call-to-action IN THE USER'S OWN WORDS (e.g. "Create Yours", "Shop Now") — never invent one they didn't ask for or that isn't implied by the content.
6. assistantReply must be short (1-3 sentences): confirm what you just captured, then ask ONE clear question for the single most important missing piece (in this order of priority if several are missing: objective, daily budget, countries, creative, call to action). If everything required is present, say the draft looks ready to review.
7. Never claim you created, scheduled, or activated anything — you only ever produce a draft for the user to review.
8. Omit any field you have no real information for — do not guess a default.`;

function schema(): JsonSchema {
  return {
    type: "object",
    required: ["assistantReply"],
    properties: {
      assistantReply: { type: "string" },
      campaignName: { type: "string" },
      objective: { type: "string", enum: OBJECTIVES },
      dailyBudget: { type: "number" },
      currency: { type: "string" },
      startDate: { type: "string" },
      endDate: { type: "string" },
      durationDays: { type: "integer" },
      countries: { type: "array", items: { type: "string" } },
      ageMin: { type: "integer" },
      ageMax: { type: "integer" },
      interests: { type: "array", items: { type: "string" } },
      ctaLabel: { type: "string" },
      destinationUrl: { type: "string" },
      creativeQuery: { type: "string" },
    },
  };
}

interface RawTurn {
  assistantReply?: unknown;
  campaignName?: unknown;
  objective?: unknown;
  dailyBudget?: unknown;
  currency?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  durationDays?: unknown;
  countries?: unknown;
  ageMin?: unknown;
  ageMax?: unknown;
  interests?: unknown;
  ctaLabel?: unknown;
  destinationUrl?: unknown;
  creativeQuery?: unknown;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}
function strArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const arr = v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
  return arr.length > 0 ? arr : undefined;
}

export interface AssistantTurnResult {
  available: boolean;
  reason: string | null;
  assistantReply: string;
  draft: CampaignDraft;
  /** Real synced Instagram posts found for a creativeQuery, when more than one plausible match exists. */
  creativeCandidates: Awaited<ReturnType<typeof searchInstagramContent>>;
}

export async function runAssistantTurn(
  history: AdsChatMessage[],
  userMessage: string,
  currentDraft: CampaignDraft,
): Promise<AssistantTurnResult> {
  const provider = resolveAiProvider();
  if (!provider) {
    return {
      available: false,
      reason: "MarketMind AI is temporarily unavailable. Your draft is still saved — try again shortly.",
      assistantReply: "",
      draft: currentDraft,
      creativeCandidates: [],
    };
  }

  const chatHistory: ChatTurn[] = history.slice(-10).map((m) => ({ role: m.role, content: m.content }));

  let raw: RawTurn;
  try {
    raw = await provider.generateStructured<RawTurn>({
      system: SYSTEM_PROMPT,
      userPayload: {
        currentDraft: {
          campaignName: currentDraft.campaignName,
          objective: currentDraft.objective,
          dailyBudget: currentDraft.dailyBudget,
          countries: currentDraft.countries,
          startDate: currentDraft.startDate,
          endDate: currentDraft.endDate,
          durationDays: currentDraft.durationDays,
          creativeChosen: Boolean(currentDraft.creative),
          ctaLabel: currentDraft.ctaLabel,
        },
        conversationHistory: chatHistory,
        latestUserMessage: userMessage,
      },
      schemaName: "emit_campaign_draft_patch",
      schemaDescription: "Extract a campaign-draft patch and a short assistant reply from the user's message.",
      schema: schema(),
      maxOutputTokens: 1024,
    });
  } catch (error) {
    return {
      available: false,
      reason: error instanceof OpportunityError ? error.message : "AI analysis failed.",
      assistantReply: "",
      draft: currentDraft,
      creativeCandidates: [],
    };
  }

  const patch: Partial<CampaignDraft> = {};
  if (str(raw.campaignName)) patch.campaignName = str(raw.campaignName)!;
  if (str(raw.objective) && OBJECTIVES.includes(str(raw.objective)!)) patch.objective = str(raw.objective) as CampaignDraft["objective"];
  if (num(raw.dailyBudget) != null) patch.dailyBudget = num(raw.dailyBudget)!;
  if (str(raw.currency)) patch.currency = str(raw.currency)!.toUpperCase();
  if (str(raw.startDate)) patch.startDate = str(raw.startDate)!;
  if (str(raw.endDate)) patch.endDate = str(raw.endDate)!;
  if (num(raw.durationDays) != null) patch.durationDays = Math.round(num(raw.durationDays)!);
  if (strArray(raw.countries)) patch.countries = strArray(raw.countries)!.map((c) => c.toUpperCase());
  if (num(raw.ageMin) != null) patch.ageMin = Math.round(num(raw.ageMin)!);
  if (num(raw.ageMax) != null) patch.ageMax = Math.round(num(raw.ageMax)!);
  if (strArray(raw.interests)) patch.interests = strArray(raw.interests)!;
  if (str(raw.destinationUrl)) patch.destinationUrl = str(raw.destinationUrl)!;
  if (str(raw.ctaLabel)) {
    patch.ctaLabel = str(raw.ctaLabel)!;
    patch.metaCallToActionType = mapCtaLabelToMeta(patch.ctaLabel);
  }

  let creativeCandidates: Awaited<ReturnType<typeof searchInstagramContent>> = [];
  const creativeQuery = str(raw.creativeQuery);
  if (creativeQuery) {
    creativeCandidates = await searchInstagramContent(creativeQuery, 5);
    if (creativeCandidates.length === 1) {
      patch.creative = toCreativeSelection(creativeCandidates[0].media);
    }
    // More than one match, or zero: leave creative unset here — the route
    // returns creativeCandidates so the UI can show the content picker.
  }

  const merged: CampaignDraft = { ...currentDraft, ...patch };
  const validated = validateDraft(merged);

  return {
    available: true,
    reason: null,
    assistantReply: str(raw.assistantReply) ?? "",
    draft: validated,
    creativeCandidates,
  };
}
