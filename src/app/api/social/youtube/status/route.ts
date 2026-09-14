import { toYoutubeErrorResponse } from "@/lib/youtube/errors";
import { getYoutubeConfigStatus } from "@/lib/youtube/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getYoutubeConfigStatus());
  } catch (error) {
    return toYoutubeErrorResponse(error);
  }
}
