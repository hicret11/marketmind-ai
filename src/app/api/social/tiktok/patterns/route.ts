import { toTiktokErrorResponse } from "@/lib/tiktok/errors";
import { computeTiktokPatternComparisons } from "@/lib/tiktok/patterns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await computeTiktokPatternComparisons();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return toTiktokErrorResponse(error);
  }
}
