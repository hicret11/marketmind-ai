/**
 * Generic "group by AI creative label, compare real performance" engine.
 * Instagram keeps its own lib/social/patterns.ts untouched; YouTube and
 * TikTok share this engine instead of duplicating the comparison logic
 * twice more. Same rule as Instagram's: a comparison only reports
 * "sufficient data" when at least two groups each meet the minimum sample.
 */

export interface GenericVideoMetrics {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  engagementRate: number | null;
}

export interface GenericGroupStat {
  label: string;
  count: number;
  avgViews: number | null;
  avgLikes: number | null;
  avgComments: number | null;
  avgShares: number | null;
  avgEngagementRate: number | null;
}

export interface GenericPatternComparison {
  dimension: string;
  label: string;
  groups: GenericGroupStat[];
  sufficientData: boolean;
  minSample: number;
  note: string;
}

export interface DimensionDef<T> {
  key: string;
  label: string;
  get: (item: T) => string | null;
}

function average(values: Array<number | null>): number | null {
  const present = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (present.length === 0) return null;
  return Math.round((present.reduce((s, v) => s + v, 0) / present.length) * 10000) / 10000;
}

export function computeGenericPatternComparisons<T>(
  items: T[],
  dimensions: Array<DimensionDef<T>>,
  metricsOf: (item: T) => GenericVideoMetrics,
  minSample: number,
): GenericPatternComparison[] {
  return dimensions.map(({ key, label, get }) => {
    const byValue = new Map<string, T[]>();
    for (const item of items) {
      const v = get(item);
      if (!v || v === "Unknown" || v === "Not detected") continue;
      const list = byValue.get(v) ?? [];
      list.push(item);
      byValue.set(v, list);
    }

    const groups: GenericGroupStat[] = Array.from(byValue.entries())
      .map(([v, list]) => {
        const metrics = list.map(metricsOf);
        return {
          label: v,
          count: list.length,
          avgViews: average(metrics.map((m) => m.views)),
          avgLikes: average(metrics.map((m) => m.likes)),
          avgComments: average(metrics.map((m) => m.comments)),
          avgShares: average(metrics.map((m) => m.shares)),
          avgEngagementRate: average(metrics.map((m) => m.engagementRate)),
        };
      })
      .sort((a, b) => b.count - a.count);

    const groupsWithEnough = groups.filter((g) => g.count >= minSample);
    const sufficientData = groupsWithEnough.length >= 2;

    return {
      dimension: key,
      label,
      groups,
      sufficientData,
      minSample,
      note: sufficientData
        ? `Comparing ${groupsWithEnough.length} groups with at least ${minSample} videos each.`
        : `Insufficient data — need at least ${minSample} videos in each of two groups for "${label}".`,
    };
  });
}
