import { toSocialErrorResponse } from "@/lib/social/errors";
import { getOverview } from "@/lib/social/overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getOverview());
  } catch (error) {
    return toSocialErrorResponse(error);
  }
}
