import { toSocialErrorResponse } from "@/lib/social/errors";
import { getSocialConfigStatus } from "@/lib/social/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getSocialConfigStatus());
  } catch (error) {
    return toSocialErrorResponse(error);
  }
}
