import { toTiktokErrorResponse } from "@/lib/tiktok/errors";
import { runSync } from "@/lib/tiktok/sync";
import type { TiktokSyncResponse } from "@/types/tiktok";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  try {
    const run = await runSync();
    const body: TiktokSyncResponse = { ok: true, run };
    return Response.json(body);
  } catch (error) {
    return toTiktokErrorResponse(error);
  }
}
