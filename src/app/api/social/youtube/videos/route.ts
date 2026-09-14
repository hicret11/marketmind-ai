import { toYoutubeErrorResponse } from "@/lib/youtube/errors";
import { getConnectedChannel, listVideos } from "@/lib/youtube/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const channel = await getConnectedChannel();
    if (!channel) return Response.json({ ok: true, videos: [] });
    const videos = await listVideos(channel.id);
    return Response.json({ ok: true, videos });
  } catch (error) {
    return toYoutubeErrorResponse(error);
  }
}
