import { MetaAdsApiClient } from "./api-client";
import { isDraftApprovable, validateDraft } from "./draft";
import { MetaAdsError } from "./errors";
import { recordCreatedCampaign } from "./repository";
import { resolveMetaAdsAccess } from "./token-resolver";
import type { CampaignDraft, CreatedCampaignResult, MetaObjective } from "@/types/meta-ads";

/**
 * Approve & Create — the ONLY place in this module that writes to Meta.
 *
 * ABSOLUTE SAFETY RULE: every object created here is PAUSED. There is no
 * parameter, flag, or code path that can make this create an ACTIVE
 * campaign/ad set/ad — api-client.ts's create* methods hardcode
 * `status: "PAUSED"` themselves, so even a bug here can't flip that.
 */

const OPTIMIZATION_GOAL_BY_OBJECTIVE: Record<MetaObjective, string> = {
  OUTCOME_TRAFFIC: "LINK_CLICKS",
  OUTCOME_ENGAGEMENT: "POST_ENGAGEMENT",
  OUTCOME_AWARENESS: "REACH",
  OUTCOME_LEADS: "LEAD_GENERATION",
  OUTCOME_SALES: "OFFSITE_CONVERSIONS",
};

const client = new MetaAdsApiClient();

export async function createPausedCampaign(draft: CampaignDraft): Promise<CreatedCampaignResult> {
  const validated = validateDraft(draft);
  if (!isDraftApprovable(validated)) {
    throw new MetaAdsError(
      "META_ADS_DRAFT_INVALID",
      `This draft is missing: ${validated.missingFields.join(", ")}.`,
      { details: { missingFields: validated.missingFields } },
    );
  }

  const access = await resolveMetaAdsAccess();
  if (!access) throw new MetaAdsError("META_ADS_NOT_CONNECTED");
  if (!access.adAccountId) throw new MetaAdsError("META_ADS_NO_AD_ACCOUNT");
  const accessToken = access.accessToken;
  const adAccountId = access.adAccountId;

  // ---- 1. Campaign (PAUSED) ------------------------------------------------
  const campaignId = await client.createCampaign(accessToken, adAccountId, {
    name: validated.campaignName as string,
    objective: validated.objective as MetaObjective,
  });

  // ---- 2. Ad Set (PAUSED) --------------------------------------------------
  const dailyBudgetMinorUnits = Math.round((validated.dailyBudget as number) * 100);
  const startTimeIso = validated.startDate ? new Date(`${validated.startDate}T00:00:00Z`).toISOString() : null;
  const endTimeIso = validated.endDate ? new Date(`${validated.endDate}T23:59:59Z`).toISOString() : null;

  const adSetId = await client.createAdSet(accessToken, adAccountId, {
    name: `${validated.campaignName} — Ad Set`,
    campaignId,
    dailyBudgetMinorUnits,
    countries: validated.countries,
    ageMin: validated.ageMin,
    ageMax: validated.ageMax,
    startTimeIso,
    endTimeIso,
    optimizationGoal: OPTIMIZATION_GOAL_BY_OBJECTIVE[validated.objective as MetaObjective],
    billingEvent: "IMPRESSIONS",
  });

  // ---- 3. Ad Creative from the EXISTING Instagram post (no re-upload) -----
  if (!validated.creative) throw new MetaAdsError("META_ADS_DRAFT_INVALID", "No creative selected.");

  // The Instagram business account id doubles as instagram_actor_id for an
  // ad creative sourced from that account's own published media.
  const instagramActorId = await resolveInstagramActorId();

  const creativeId = await client.createCreativeFromInstagramPost(accessToken, adAccountId, {
    name: `${validated.campaignName} — Creative`,
    instagramActorId,
    sourceInstagramMediaId: validated.creative.igMediaId,
    callToActionType: validated.metaCallToActionType as string,
    linkUrl: validated.destinationUrl,
  });

  // ---- 4. Ad (PAUSED) -------------------------------------------------------
  const adId = await client.createAd(accessToken, adAccountId, {
    name: `${validated.campaignName} — Ad`,
    adSetId,
    creativeId,
  });

  return recordCreatedCampaign({
    draftId: validated.id,
    status: "PAUSED",
    campaignId,
    adSetId,
    adCreativeId: creativeId,
    adId,
    adAccountId,
  });
}

/** The connected Instagram business account's id — read-only, from Instagram's own config (untouched). */
async function resolveInstagramActorId(): Promise<string> {
  const { getConnectedAccount: getInstagramAccount } = await import("@/lib/social/repository");
  const ig = await getInstagramAccount();
  if (!ig) {
    throw new MetaAdsError(
      "META_ADS_CREATIVE_NOT_ELIGIBLE",
      "No connected Instagram account was found to source the creative from. Connect Instagram first.",
    );
  }
  return ig.igUserId;
}
