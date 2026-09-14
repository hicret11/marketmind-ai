import { OVERVIEW_WINDOW_DAYS } from "./config";
import { SocialError } from "./errors";
import { InstagramClient } from "./instagram/client";
import { ACCOUNT_METRICS, metricsForMedia } from "./instagram/metrics";
import { refreshLongLivedToken } from "./instagram/oauth";
import { analyzePostCreative } from "./content-intelligence";
import {
  addAccountInsightSnapshot,
  addMediaInsightSnapshot,
  finishSyncRun,
  getAccessToken,
  getConnectedAccount,
  listMedia,
  saveToken,
  setMediaCreative,
  startSyncRun,
  updateAccount,
  upsertMedia,
} from "./repository";
import type { SocialSyncRun } from "@/types/social";

/**
 * One synchronization run: pull real media + real insights from Instagram and
 * snapshot them (upstream insight availability is time-limited, so we keep our
 * own history), then label the creative of any new posts with MarketMind AI.
 */

const MAX_MEDIA = 200;
const MEDIA_PAGE_SIZE = 25;
const CREATIVE_ANALYSIS_BUDGET = 12; // new posts to label per sync run (AI cost control)

export interface LabelPendingResult {
  attempted: number;
  labelled: number;
  remaining: number;
}

/**
 * Labels up to `budget` already-synced posts that don't have creative labels
 * yet, using the same Gemini creative-labeling system as the sync step. Pure
 * AI labeling — no Instagram API calls, no media/insight re-fetch. Used both
 * by runSync()'s per-sync trickle (small budget) and by the explicit
 * "Label remaining posts" action (larger budget, user-triggered).
 */
export async function labelPendingCreative(
  accountId: string,
  budget: number,
): Promise<LabelPendingResult> {
  const stored = await listMedia(accountId);
  const needsLabels = stored.filter((m) => !m.creative);
  const batch = needsLabels.slice(0, budget);

  let labelled = 0;
  for (const m of batch) {
    const result = await analyzePostCreative(m);
    if (result.available && result.labels) {
      await setMediaCreative(m.id, result.labels);
      labelled += 1;
    }
  }
  return { attempted: batch.length, labelled, remaining: needsLabels.length - batch.length };
}

export async function runSync(): Promise<SocialSyncRun> {
  const account = await getConnectedAccount();
  if (!account) throw new SocialError("SOCIAL_NOT_CONNECTED");

  const run = await startSyncRun(account.id);
  const warnings: string[] = [];
  let mediaSynced = 0;
  let mediaInsightsSynced = 0;
  let accountInsightsSynced = 0;

  try {
    const accessToken = await resolveUsableToken(account.id);
    const client = new InstagramClient();

    // 1. Media (paginated, bounded)
    let after: string | null = null;
    const collected: Awaited<ReturnType<InstagramClient["listMedia"]>>["media"] = [];
    do {
      const page = await client.listMedia(accessToken, {
        limit: MEDIA_PAGE_SIZE,
        after,
      });
      collected.push(...page.media);
      after = page.nextCursor;
    } while (after && collected.length < MAX_MEDIA);

    for (const m of collected.slice(0, MAX_MEDIA)) {
      await upsertMedia({
        accountId: account.id,
        igMediaId: m.id,
        caption: m.caption,
        mediaType: m.mediaType,
        mediaProductType: m.mediaProductType,
        mediaUrl: m.mediaUrl,
        thumbnailUrl: m.thumbnailUrl,
        permalink: m.permalink,
        timestamp: m.timestamp,
        username: m.username,
        likeCount: m.likeCount,
        commentsCount: m.commentsCount,
        syncedAt: new Date().toISOString(),
        creative: null,
        creativeAnalyzedAt: null,
      });
      mediaSynced += 1;

      // 2. Media insights (media-type-aware; snapshot even when partial)
      try {
        const candidates = metricsForMedia(m.mediaType, m.mediaProductType);
        const insight = await client.getMediaInsights(accessToken, m.id, candidates);
        await addMediaInsightSnapshot({
          accountId: account.id,
          igMediaId: m.id,
          capturedAt: new Date().toISOString(),
          syncRunId: run.id,
          metrics: insight.metrics,
          unsupportedMetrics: insight.unsupportedMetrics,
        });
        mediaInsightsSynced += 1;
      } catch (error) {
        if (error instanceof SocialError && error.code === "SOCIAL_TOKEN_EXPIRED") throw error;
        warnings.push(
          `Insights unavailable for media ${m.id}: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        );
      }
    }

    // 3. Account insights over the rolling window
    try {
      const until = new Date();
      const since = new Date(until.getTime() - OVERVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
      const acct = await client.getAccountInsights(
        accessToken,
        account.igUserId,
        ACCOUNT_METRICS,
        { since: since.toISOString(), until: until.toISOString() },
      );
      await addAccountInsightSnapshot({
        accountId: account.id,
        capturedAt: new Date().toISOString(),
        syncRunId: run.id,
        period: "day",
        since: since.toISOString(),
        until: until.toISOString(),
        metrics: acct.metrics,
        unsupportedMetrics: acct.unsupportedMetrics,
      });
      accountInsightsSynced = 1;
      if (Object.values(acct.metrics).every((v) => v === null)) {
        warnings.push(
          "Account-level insights returned no data for this account/period (common for smaller audiences).",
        );
      }
    } catch (error) {
      if (error instanceof SocialError && error.code === "SOCIAL_TOKEN_EXPIRED") throw error;
      warnings.push(
        `Account insights unavailable: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }

    // 4. Creative labelling for new posts (bounded, best-effort)
    const labelResult = await labelPendingCreative(account.id, CREATIVE_ANALYSIS_BUDGET);
    if (labelResult.attempted > 0 && labelResult.labelled === 0) {
      warnings.push("Creative analysis was skipped (AI unavailable). Metrics and content still synced.");
    }

    await updateAccount(account.id, { lastSyncAt: new Date().toISOString() });
    const finished = await finishSyncRun(run.id, {
      status: warnings.length > 0 ? "partial" : "success",
      mediaSynced,
      mediaInsightsSynced,
      accountInsightsSynced,
      warnings,
    });
    return finished ?? run;
  } catch (error) {
    if (error instanceof SocialError && error.code === "SOCIAL_TOKEN_EXPIRED") {
      await updateAccount(account.id, { tokenStatus: "expired" });
    }
    const finished = await finishSyncRun(run.id, {
      status: "error",
      mediaSynced,
      mediaInsightsSynced,
      accountInsightsSynced,
      warnings,
      error: error instanceof Error ? error.message : "Sync failed.",
    });
    if (error instanceof SocialError) throw error;
    throw new SocialError("SOCIAL_API_ERROR", "Sync failed.", { cause: error, details: finished });
  }
}

/** Returns a usable access token, refreshing a near/expired long-lived token in place. */
async function resolveUsableToken(accountId: string): Promise<string> {
  const info = await getAccessToken(accountId);
  if (!info) throw new SocialError("SOCIAL_NOT_CONNECTED");

  const msLeft = new Date(info.expiresAt).getTime() - Date.now();
  const tenDays = 10 * 24 * 60 * 60 * 1000;
  if (msLeft > tenDays) return info.accessToken;

  try {
    const refreshed = await refreshLongLivedToken(info.accessToken);
    await saveToken({
      accountId,
      accessToken: refreshed.accessToken,
      tokenType: refreshed.tokenType,
      expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
      scopes: info.scopes,
    });
    await updateAccount(accountId, { tokenStatus: "active" });
    return refreshed.accessToken;
  } catch {
    if (msLeft > 0) return info.accessToken; // still valid for now; refresh later
    throw new SocialError("SOCIAL_TOKEN_EXPIRED");
  }
}
