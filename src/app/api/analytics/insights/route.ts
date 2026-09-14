import { generateCrossSourceInsights } from "@/lib/analytics/insights";
import { getAnalyticsOverview } from "@/lib/analytics/overview";
import type { DateRangeOption } from "@/types/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID_RANGES: DateRangeOption[] = ["7d", "30d", "90d", "all"];

/** Explicitly user-triggered — never called on page load or automatically. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const rangeParam = (body as { range?: string } | null)?.range;
    const range: DateRangeOption = VALID_RANGES.includes(rangeParam as DateRangeOption)
      ? (rangeParam as DateRangeOption)
      : "30d";

    const overview = await getAnalyticsOverview(range);
    const result = await generateCrossSourceInsights(overview);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("[analytics] insights failed:", error);
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return Response.json({ error: { code: "INTERNAL", message } }, { status: 500 });
  }
}
