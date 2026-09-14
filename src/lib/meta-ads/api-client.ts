import { metaAdsGraphVersion } from "./config";
import { MetaAdsError } from "./errors";
import type { MetaAdAccountRef, MetaCampaignSummary } from "@/types/meta-ads";

/**
 * Thin, defensive wrapper over the Meta Marketing API (Graph API). Every
 * write call that creates a delivering object passes `status: "PAUSED"`
 * explicitly — there is no code path in this file that can create an
 * ACTIVE campaign, ad set, or ad. "No data" / "not available" is returned
 * as null, never invented.
 */

export interface CreateCampaignInput {
  name: string;
  objective: string; // MetaObjective
}
export interface CreateAdSetInput {
  name: string;
  campaignId: string;
  dailyBudgetMinorUnits: number; // e.g. cents
  countries: string[];
  ageMin: number | null;
  ageMax: number | null;
  startTimeIso: string | null;
  endTimeIso: string | null;
  optimizationGoal: string;
  billingEvent: string;
}
export interface CreateCreativeFromInstagramPostInput {
  name: string;
  instagramActorId: string;
  sourceInstagramMediaId: string;
  callToActionType: string;
  linkUrl: string | null;
}
export interface CreateAdInput {
  name: string;
  adSetId: string;
  creativeId: string;
}

export interface TokenAccessInspection {
  /** True only when we have REAL granted-scope data from Meta — never assumed. */
  scopesKnown: boolean;
  grantedScopes: string[];
  /** Meta's own real error text, when scopesKnown is false — never a guessed label. */
  rawMessage: string | null;
  rawCode: number | null;
}

function metaAdsErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
function metaAdsErrorCode(error: unknown): number | null {
  if (error instanceof MetaAdsError && error.details && typeof error.details === "object") {
    const code = (error.details as { code?: unknown }).code;
    return typeof code === "number" ? code : null;
  }
  return null;
}

export class MetaAdsApiClient {
  private readonly base: string;
  constructor() {
    this.base = `https://graph.facebook.com/${metaAdsGraphVersion()}`;
  }

  /**
   * The real, correct way to inspect what a token can actually do — without
   * performing any write. Never guesses: if Meta's own introspection can't
   * be reached, this reports that plainly (`scopesKnown: false` + Meta's own
   * raw error) instead of assuming any particular permission is the cause.
   *
   * Tries, in order:
   *  1. GET /me — the cheapest possible real call. If even this is
   *     blocked, the problem is the token/app itself, not a specific scope,
   *     and no further guessing is attempted.
   *  2. GET /debug_token (app_id|app_secret as the inspecting token) — the
   *     documented way to read a token's real granted scopes, works for
   *     both a Facebook Login user token and a Business Settings System
   *     User token.
   *  3. GET /me/permissions (self-inspection, no app secret) — fallback if
   *     debug_token's app-credential call fails for an unrelated reason
   *     (e.g. the app id/secret pair given isn't the one that issued this
   *     token).
   */
  async inspectTokenAccess(accessToken: string, appId: string, appSecret: string): Promise<TokenAccessInspection> {
    try {
      await this.get<{ id?: string }>("/me", accessToken, { fields: "id" });
    } catch (error) {
      return { scopesKnown: false, grantedScopes: [], rawMessage: metaAdsErrorMessage(error), rawCode: metaAdsErrorCode(error) };
    }

    if (appId && appSecret) {
      try {
        const url = new URL(`${this.base}/debug_token`);
        url.searchParams.set("input_token", accessToken);
        url.searchParams.set("access_token", `${appId}|${appSecret}`);
        const data = await this.request<{ data?: { scopes?: string[]; is_valid?: boolean } }>(url, {
          method: "GET",
          signal: AbortSignal.timeout(15000),
        });
        if (data.data?.is_valid) {
          return { scopesKnown: true, grantedScopes: data.data.scopes ?? [], rawMessage: null, rawCode: null };
        }
      } catch {
        // Fall through to /me/permissions — this failure may be about the
        // inspecting app credentials, not the target token.
      }
    }

    try {
      const data = await this.get<{ data?: Array<{ permission?: string; status?: string }> }>("/me/permissions", accessToken, {});
      const granted = (data.data ?? []).filter((p) => p.status === "granted" && p.permission).map((p) => p.permission as string);
      return { scopesKnown: true, grantedScopes: granted, rawMessage: null, rawCode: null };
    } catch (error) {
      // /me worked but neither scope-introspection path did — we genuinely
      // don't know the granted scopes; never invent a list.
      return {
        scopesKnown: false,
        grantedScopes: [],
        rawMessage: `Token is valid but its permissions could not be verified (${metaAdsErrorMessage(error)}).`,
        rawCode: metaAdsErrorCode(error),
      };
    }
  }

  async listAdAccounts(accessToken: string): Promise<MetaAdAccountRef[]> {
    const data = await this.get<{
      data?: Array<{ id?: string; name?: string; currency?: string; account_status?: number; timezone_name?: string }>;
    }>("/me/adaccounts", accessToken, { fields: "id,name,currency,account_status,timezone_name" });

    return (data.data ?? [])
      .filter((a) => a.id)
      .map((a) => ({
        id: a.id as string,
        name: a.name ?? a.id ?? "",
        currency: a.currency ?? null,
        accountStatus: typeof a.account_status === "number" ? a.account_status : null,
        timezoneName: a.timezone_name ?? null,
      }));
  }

  /** Real campaign history + real insight metrics — never fabricated when Meta doesn't report a field. */
  async listCampaignsWithInsights(accessToken: string, adAccountId: string, limit: number): Promise<MetaCampaignSummary[]> {
    const data = await this.get<{
      data?: Array<{
        id?: string;
        name?: string;
        status?: string;
        objective?: string;
        insights?: {
          data?: Array<{
            spend?: string;
            impressions?: string;
            reach?: string;
            clicks?: string;
            ctr?: string;
            cpc?: string;
            cpm?: string;
            actions?: Array<{ action_type?: string; value?: string }>;
            action_values?: Array<{ action_type?: string; value?: string }>;
            purchase_roas?: Array<{ action_type?: string; value?: string }>;
          }>;
        };
      }>;
    }>(`/${adAccountId}/campaigns`, accessToken, {
      fields:
        "id,name,status,objective,insights.limit(1){spend,impressions,reach,clicks,ctr,cpc,cpm,actions,action_values,purchase_roas}",
      limit: String(limit),
    });

    return (data.data ?? [])
      .filter((c) => c.id)
      .map((c) => {
        const ins = c.insights?.data?.[0];
        const conversions = ins?.actions?.find((a) => a.action_type === "offsite_conversion" || a.action_type === "lead")?.value;
        const roas = ins?.purchase_roas?.[0]?.value;
        return {
          id: c.id as string,
          name: c.name ?? "(untitled)",
          status: c.status ?? "UNKNOWN",
          objective: c.objective ?? null,
          spend: numOrNull(ins?.spend),
          impressions: numOrNull(ins?.impressions),
          reach: numOrNull(ins?.reach),
          clicks: numOrNull(ins?.clicks),
          ctr: numOrNull(ins?.ctr),
          cpc: numOrNull(ins?.cpc),
          cpm: numOrNull(ins?.cpm),
          conversions: numOrNull(conversions),
          roas: numOrNull(roas),
          currency: null, // set by the caller from the ad account's currency
        };
      });
  }

  /** Creates a campaign — ALWAYS status PAUSED. Never accepts a caller-supplied status. */
  async createCampaign(accessToken: string, adAccountId: string, input: CreateCampaignInput): Promise<string> {
    const data = await this.post<{ id?: string }>(`/${adAccountId}/campaigns`, accessToken, {
      name: input.name,
      objective: input.objective,
      status: "PAUSED",
      special_ad_categories: [],
    });
    if (!data.id) throw new MetaAdsError("META_ADS_API_ERROR", "Meta did not return a campaign id.");
    return data.id;
  }

  /** Creates an ad set — ALWAYS status PAUSED. */
  async createAdSet(accessToken: string, adAccountId: string, input: CreateAdSetInput): Promise<string> {
    const targeting: Record<string, unknown> = {
      geo_locations: { countries: input.countries },
    };
    if (input.ageMin != null) targeting.age_min = input.ageMin;
    if (input.ageMax != null) targeting.age_max = input.ageMax;

    const body: Record<string, unknown> = {
      name: input.name,
      campaign_id: input.campaignId,
      daily_budget: input.dailyBudgetMinorUnits,
      billing_event: input.billingEvent,
      optimization_goal: input.optimizationGoal,
      targeting,
      status: "PAUSED",
    };
    if (input.startTimeIso) body.start_time = input.startTimeIso;
    if (input.endTimeIso) body.end_time = input.endTimeIso;

    const data = await this.post<{ id?: string }>(`/${adAccountId}/adsets`, accessToken, body);
    if (!data.id) throw new MetaAdsError("META_ADS_API_ERROR", "Meta did not return an ad set id.");
    return data.id;
  }

  /**
   * Creates an ad creative sourced from an EXISTING Instagram post — never
   * re-uploads media. If the post isn't eligible for promotion, Meta's real
   * error is surfaced (never silently swapped for a different creative).
   */
  async createCreativeFromInstagramPost(
    accessToken: string,
    adAccountId: string,
    input: CreateCreativeFromInstagramPostInput,
  ): Promise<string> {
    const body: Record<string, unknown> = {
      name: input.name,
      instagram_actor_id: input.instagramActorId,
      source_instagram_media_id: input.sourceInstagramMediaId,
      call_to_action: input.linkUrl ? { type: input.callToActionType, value: { link: input.linkUrl } } : undefined,
    };

    let data: { id?: string };
    try {
      data = await this.post<{ id?: string }>(`/${adAccountId}/adcreatives`, accessToken, body);
    } catch (error) {
      if (error instanceof MetaAdsError) {
        throw new MetaAdsError("META_ADS_CREATIVE_NOT_ELIGIBLE", error.message, { details: error.details });
      }
      throw error;
    }
    if (!data.id) throw new MetaAdsError("META_ADS_API_ERROR", "Meta did not return a creative id.");
    return data.id;
  }

  /** Creates an ad — ALWAYS status PAUSED. */
  async createAd(accessToken: string, adAccountId: string, input: CreateAdInput): Promise<string> {
    const data = await this.post<{ id?: string }>(`/${adAccountId}/ads`, accessToken, {
      name: input.name,
      adset_id: input.adSetId,
      creative: { creative_id: input.creativeId },
      status: "PAUSED",
    });
    if (!data.id) throw new MetaAdsError("META_ADS_API_ERROR", "Meta did not return an ad id.");
    return data.id;
  }

  private async get<T>(path: string, accessToken: string, query: Record<string, string>): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
    url.searchParams.set("access_token", accessToken);
    return this.request<T>(url, { method: "GET", signal: AbortSignal.timeout(20000) });
  }

  private async post<T>(path: string, accessToken: string, body: Record<string, unknown>): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    url.searchParams.set("access_token", accessToken);
    return this.request<T>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
  }

  private async request<T>(url: URL, init: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (cause) {
      if (cause instanceof Error && cause.name === "TimeoutError") {
        throw new MetaAdsError("META_ADS_API_ERROR", "Meta request timed out.", { cause });
      }
      throw new MetaAdsError("META_ADS_API_ERROR", undefined, { cause });
    }

    const payload = (await response.json().catch(() => null)) as
      | (T & { error?: { message?: string; code?: number; error_subcode?: number; type?: string } })
      | null;

    if (!response.ok) {
      const err = (payload as { error?: { message?: string; code?: number; error_subcode?: number; type?: string } })?.error;
      // Meta's own error code/type never distinguish "expired token" from
      // "missing permission" from "app blocked" reliably enough to guess a
      // named cause — code 200 / type OAuthException alone covers all of
      // those and more (confirmed live: it also covers "API access
      // blocked", which is an app-level block, not a scope problem). So the
      // REAL message and code are always preserved in `details` and in the
      // thrown error's own message — every caller that needs to explain
      // *why* to the user reads Meta's actual text, never a guessed label.
      const details = { httpStatus: response.status, code: err?.code ?? null, subcode: err?.error_subcode ?? null, rawMessage: err?.message ?? null };

      if (response.status === 401 || err?.code === 190) {
        throw new MetaAdsError("META_ADS_TOKEN_EXPIRED", err?.message ? `Meta: ${err.message}` : undefined, { cause: err, details });
      }
      throw new MetaAdsError(
        "META_ADS_API_ERROR",
        err?.message ? `Meta: ${err.message}` : undefined,
        { details },
      );
    }

    return (payload ?? {}) as T;
  }
}

function numOrNull(v: string | number | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
