import { toMetaAdsErrorResponse } from "@/lib/meta-ads/errors";
import { getMetaAdsConfigStatus } from "@/lib/meta-ads/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getMetaAdsConfigStatus());
  } catch (error) {
    return toMetaAdsErrorResponse(error);
  }
}
