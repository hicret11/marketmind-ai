import { toSocialErrorResponse } from "@/lib/social/errors";
import { computePatternComparisons } from "@/lib/social/patterns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await computePatternComparisons();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return toSocialErrorResponse(error);
  }
}
