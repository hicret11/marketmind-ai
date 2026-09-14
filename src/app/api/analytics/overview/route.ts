import { getAnalyticsOverview } from "@/lib/analytics/overview";
import type { DateRangeOption } from "@/types/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_RANGES: DateRangeOption[] = ["7d", "30d", "90d", "all"];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rangeParam = url.searchParams.get("range");
    const range: DateRangeOption = VALID_RANGES.includes(rangeParam as DateRangeOption)
      ? (rangeParam as DateRangeOption)
      : "30d";

    const overview = await getAnalyticsOverview(range);
    return Response.json(overview);
  } catch (error) {
    console.error("[analytics] overview failed:", error);
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return Response.json({ error: { code: "INTERNAL", message } }, { status: 500 });
  }
}
