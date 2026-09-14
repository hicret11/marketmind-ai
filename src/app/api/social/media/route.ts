import { toSocialErrorResponse } from "@/lib/social/errors";
import { listMediaWithPerformance } from "@/lib/social/queries";
import type { MediaListResponse } from "@/types/social";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const limit = Number(url.searchParams.get("limit")) || undefined;
    const { items, nextCursor } = await listMediaWithPerformance({ cursor, limit });
    const body: MediaListResponse = { ok: true, items, nextCursor };
    return Response.json(body);
  } catch (error) {
    return toSocialErrorResponse(error);
  }
}
