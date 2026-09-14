import { PATTERN_MIN_SAMPLE } from "@/lib/social/config";
import { computeGenericPatternComparisons, type DimensionDef, type GenericPatternComparison } from "@/lib/social/pattern-engine";
import { getConnectedChannel, listVideos } from "./repository";
import type { YoutubeVideoItem } from "@/types/youtube";

const DIMENSIONS: Array<DimensionDef<YoutubeVideoItem>> = [
  { key: "creativeType", label: "Creative type", get: (v) => v.creative?.creativeType ?? null },
  { key: "hookType", label: "Hook type", get: (v) => v.creative?.hookType ?? null },
  { key: "primaryEmotion", label: "Primary emotion", get: (v) => v.creative?.primaryEmotion ?? null },
  { key: "ctaType", label: "Call to action", get: (v) => v.creative?.ctaType ?? null },
  { key: "personalizationVisible", label: "Personalization visible", get: (v) => v.creative?.personalizationVisible ?? null },
];

function metricsOf(v: YoutubeVideoItem) {
  const views = v.viewCount;
  const likes = v.likeCount;
  const comments = v.commentCount;
  const engagementRate =
    views != null && views > 0 && likes != null && comments != null
      ? Math.round(((likes + comments) / views) * 10000) / 10000
      : null;
  return { views, likes, comments, shares: null, engagementRate };
}

export async function computeYoutubePatternComparisons(format?: "shorts" | "long_form"): Promise<{
  totalVideos: number;
  labelledVideos: number;
  shortsCount: number;
  longFormCount: number;
  comparisons: GenericPatternComparison[];
}> {
  const channel = await getConnectedChannel();
  if (!channel) {
    return { totalVideos: 0, labelledVideos: 0, shortsCount: 0, longFormCount: 0, comparisons: [] };
  }

  const allVideos = await listVideos(channel.id);
  // Counts are always over the FULL synced set — only the comparisons below
  // are scoped to the selected format tab ("All" when no filter is given).
  const shortsCount = allVideos.filter((v) => v.format === "shorts").length;
  const longFormCount = allVideos.filter((v) => v.format === "long_form").length;

  const videos = format ? allVideos.filter((v) => v.format === format) : allVideos;
  const labelledVideos = videos.filter((v) => v.creative).length;

  const comparisons = computeGenericPatternComparisons(videos, DIMENSIONS, metricsOf, PATTERN_MIN_SAMPLE);

  return { totalVideos: videos.length, labelledVideos, shortsCount, longFormCount, comparisons };
}
