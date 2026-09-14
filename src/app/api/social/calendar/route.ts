import { addCalendarEntry, getCalendar } from "@/lib/social/calendar";
import { SocialError, toSocialErrorResponse } from "@/lib/social/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ ok: true, ...(await getCalendar()) });
  } catch (error) {
    return toSocialErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      throw new SocialError("INVALID_REQUEST", "Request body must be an object.");
    }
    const status = body.status === "scheduled" ? "scheduled" : "draft";
    const entry = await addCalendarEntry({
      status,
      date: typeof body.date === "string" ? body.date : "",
      caption: typeof body.caption === "string" ? body.caption : undefined,
      mediaSourceUrl:
        typeof body.mediaSourceUrl === "string" ? body.mediaSourceUrl : undefined,
    });
    return Response.json({ ok: true, entry }, { status: 201 });
  } catch (error) {
    return toSocialErrorResponse(error);
  }
}
