import { toTiktokErrorResponse } from "@/lib/tiktok/errors";
import { getConnectedAccount, listVideos } from "@/lib/tiktok/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const account = await getConnectedAccount();
    if (!account) return Response.json({ ok: true, videos: [] });
    const videos = await listVideos(account.id);
    return Response.json({ ok: true, videos });
  } catch (error) {
    return toTiktokErrorResponse(error);
  }
}
