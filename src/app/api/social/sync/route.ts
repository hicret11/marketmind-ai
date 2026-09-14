import { toSocialErrorResponse } from "@/lib/social/errors";
import { runSync } from "@/lib/social/sync";
import type { SyncResponse } from "@/types/social";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  try {
    const run = await runSync();
    const body: SyncResponse = { ok: true, run };
    return Response.json(body);
  } catch (error) {
    return toSocialErrorResponse(error);
  }
}
