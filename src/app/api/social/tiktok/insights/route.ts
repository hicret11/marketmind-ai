import { toTiktokErrorResponse } from "@/lib/tiktok/errors";
import { generateTiktokInsights } from "@/lib/tiktok/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    const result = await generateTiktokInsights();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return toTiktokErrorResponse(error);
  }
}
