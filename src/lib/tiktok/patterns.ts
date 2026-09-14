import { PATTERN_MIN_SAMPLE } from "@/lib/social/config";
import { computeGenericPatternComparisons, type DimensionDef, type GenericPatternComparison } from "@/lib/social/pattern-engine";
import { getConnectedAccount, listVideos } from "./repository";
import type { TiktokVideoItem } from "@/types/tiktok";

const DIMENSIONS: Array<DimensionDef<TiktokVideoItem>> = [
  { key: "creativeType", label: "Creative type", get: (v) => v.creative?.creativeType ?? null },
  { key: "hookType", label: "Hook type", get: (v) => v.creative?.hookType ?? null },
  { key: "primaryEmotion", label: "Primary emotion", get: (v) => v.creative?.primaryEmotion ?? null },
  { key: "ctaType", label: "Call to action", get: (v) => v.creative?.ctaType ?? null },
  { key: "personalizationVisible", label: "Personalization visible", get: (v) => v.creative?.personalizationVisible ?? null },
];

function metricsOf(v: TiktokVideoItem) {
  const views = v.viewCount;
  const likes = v.likeCount;
  const comments = v.commentCount;
  const shares = v.shareCount;
  const engagementRate =
    views != null && views > 0 && likes != null && comments != null && shares != null
      ? Math.round(((likes + comments + shares) / views) * 10000) / 10000
      : null;
  return { views, likes, comments, shares, engagementRate };
}

export async function computeTiktokPatternComparisons(): Promise<{
  totalVideos: number;
  labelledVideos: number;
  comparisons: GenericPatternComparison[];
}> {
  const account = await getConnectedAccount();
  if (!account) return { totalVideos: 0, labelledVideos: 0, comparisons: [] };

  const videos = await listVideos(account.id);
  const labelledVideos = videos.filter((v) => v.creative).length;
  const comparisons = computeGenericPatternComparisons(videos, DIMENSIONS, metricsOf, PATTERN_MIN_SAMPLE);

  return { totalVideos: videos.length, labelledVideos, comparisons };
}

/** Real, derived-in-code engagement rate per video: (likes+comments+shares)/views. Null if any input is missing. */
export function tiktokEngagementRate(v: TiktokVideoItem): number | null {
  return metricsOf(v).engagementRate;
}
