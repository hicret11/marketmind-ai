import { PATTERN_MIN_SAMPLE } from "./config";
import { average, computePerformance } from "./performance";
import {
  getConnectedAccount,
  latestMediaInsightsMap,
  listMedia,
} from "./repository";
import type {
  PatternComparison,
  PatternGroupStat,
  PerformanceMetrics,
  SocialMediaItem,
} from "@/types/social";

/**
 * Content Intelligence — groups real posts by MarketMind AI creative labels and
 * compares their ACTUAL Instagram performance. Never claims a pattern from a
 * single post: a comparison only reports "sufficient data" when at least two
 * groups each have >= PATTERN_MIN_SAMPLE posts.
 */

interface PostWithPerf {
  media: SocialMediaItem;
  perf: PerformanceMetrics | null;
}

const DIMENSIONS: Array<{ key: string; label: string; get: (m: SocialMediaItem) => string | null }> = [
  { key: "contentFormat", label: "Format (Reel vs Image vs Carousel)", get: (m) => m.creative?.contentFormat ?? null },
  { key: "creativeType", label: "Creative type", get: (m) => m.creative?.creativeType ?? null },
  { key: "hookType", label: "Hook type", get: (m) => m.creative?.hookType ?? null },
  { key: "primaryEmotion", label: "Primary emotion", get: (m) => m.creative?.primaryEmotion ?? null },
  { key: "ctaType", label: "Call to action", get: (m) => m.creative?.ctaType ?? null },
  { key: "humanReaction", label: "Human reaction present", get: (m) => m.creative?.humanReaction ?? null },
  { key: "personalizationVisible", label: "Personalization visible", get: (m) => m.creative?.personalizationVisible ?? null },
];

function groupStat(label: string, posts: PostWithPerf[]): PatternGroupStat {
  return {
    label,
    posts: posts.length,
    avgViews: average(posts.map((p) => p.perf?.raw.views ?? null)),
    avgReach: average(posts.map((p) => p.perf?.raw.reach ?? null)),
    avgInteractionRate: average(posts.map((p) => p.perf?.interactionRate ?? null)),
    avgSaveRate: average(posts.map((p) => p.perf?.saveRate ?? null)),
    avgShareRate: average(posts.map((p) => p.perf?.shareRate ?? null)),
  };
}

export async function computePatternComparisons(): Promise<{
  totalPosts: number;
  labelledPosts: number;
  comparisons: PatternComparison[];
}> {
  const account = await getConnectedAccount();
  if (!account) return { totalPosts: 0, labelledPosts: 0, comparisons: [] };

  const media = await listMedia(account.id);
  const insights = await latestMediaInsightsMap(account.id);

  const posts: PostWithPerf[] = media.map((m) => {
    const snap = insights.get(m.igMediaId);
    return { media: m, perf: snap ? computePerformance(m.igMediaId, snap.metrics) : null };
  });
  const labelledPosts = posts.filter((p) => p.media.creative).length;

  const comparisons: PatternComparison[] = DIMENSIONS.map(({ key, label, get }) => {
    const byValue = new Map<string, PostWithPerf[]>();
    for (const p of posts) {
      const v = get(p.media);
      if (!v || v === "Unknown" || v === "Not detected") continue;
      const list = byValue.get(v) ?? [];
      list.push(p);
      byValue.set(v, list);
    }

    const groups = Array.from(byValue.entries())
      .map(([v, list]) => groupStat(v, list))
      .sort((a, b) => b.posts - a.posts);

    const groupsWithEnough = groups.filter((g) => g.posts >= PATTERN_MIN_SAMPLE);
    const sufficientData = groupsWithEnough.length >= 2;

    return {
      dimension: key,
      groups,
      sufficientData,
      minSample: PATTERN_MIN_SAMPLE,
      note: sufficientData
        ? `Comparing ${groupsWithEnough.length} groups with at least ${PATTERN_MIN_SAMPLE} posts each.`
        : `Insufficient data — need at least ${PATTERN_MIN_SAMPLE} posts in each of two groups for "${label}".`,
    };
  });

  return { totalPosts: posts.length, labelledPosts, comparisons };
}
