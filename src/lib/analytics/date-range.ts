import type { DateRangeOption } from "@/types/analytics";

/** Shared date-range resolution — every section that supports filtering uses this same window. */
export function rangeSinceIso(range: DateRangeOption): string | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function withinRange(iso: string | null | undefined, sinceIso: string | null): boolean {
  if (!sinceIso) return true; // "all"
  if (!iso) return false;
  return iso >= sinceIso;
}
