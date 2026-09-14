import { toSocialErrorResponse } from "@/lib/social/errors";
import { generateSocialInsights } from "@/lib/social/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    const result = await generateSocialInsights();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return toSocialErrorResponse(error);
  }
}
