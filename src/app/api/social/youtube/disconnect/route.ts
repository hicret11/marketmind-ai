import { toYoutubeErrorResponse } from "@/lib/youtube/errors";
import { disconnectChannel, getConnectedChannel } from "@/lib/youtube/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const channel = await getConnectedChannel();
    if (channel) await disconnectChannel(channel.id);
    return Response.json({ ok: true });
  } catch (error) {
    return toYoutubeErrorResponse(error);
  }
}
