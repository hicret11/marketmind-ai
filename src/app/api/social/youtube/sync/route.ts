import { toYoutubeErrorResponse } from "@/lib/youtube/errors";
import { runSync } from "@/lib/youtube/sync";
import type { YoutubeSyncResponse } from "@/types/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  try {
    const run = await runSync();
    const body: YoutubeSyncResponse = { ok: true, run };
    return Response.json(body);
  } catch (error) {
    return toYoutubeErrorResponse(error);
  }
}
