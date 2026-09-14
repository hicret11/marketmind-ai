import { YoutubeError, toYoutubeErrorResponse } from "@/lib/youtube/errors";
import { getConnectedChannel } from "@/lib/youtube/repository";
import { labelPendingCreative } from "@/lib/youtube/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DEFAULT_BUDGET = 25;

export async function POST(request: Request) {
  try {
    const channel = await getConnectedChannel();
    if (!channel) throw new YoutubeError("YOUTUBE_NOT_CONNECTED");

    const body = await request.json().catch(() => ({}));
    const budget = typeof body?.budget === "number" && body.budget > 0 ? body.budget : DEFAULT_BUDGET;

    const result = await labelPendingCreative(channel.id, budget);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return toYoutubeErrorResponse(error);
  }
}
