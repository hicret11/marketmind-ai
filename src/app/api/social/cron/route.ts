import { cronSecret } from "@/lib/social/config";
import { toSocialErrorResponse } from "@/lib/social/errors";
import { runDueScheduledPosts } from "@/lib/social/publishing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Server-side scheduler entry point. A real cron/worker calls this on an
 * interval with the shared secret. It never depends on a browser being open.
 * If SOCIAL_CRON_SECRET is unset, the endpoint is disabled.
 */
export async function POST(request: Request) {
  try {
    const secret = cronSecret();
    if (!secret) {
      return Response.json(
        { ok: false, error: "Scheduler disabled — set SOCIAL_CRON_SECRET." },
        { status: 503 },
      );
    }
    const provided =
      request.headers.get("x-cron-secret") ??
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (provided !== secret) {
      return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const result = await runDueScheduledPosts();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return toSocialErrorResponse(error);
  }
}
