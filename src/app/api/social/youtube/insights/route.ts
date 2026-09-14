import { toYoutubeErrorResponse } from "@/lib/youtube/errors";
import { generateYoutubeInsights } from "@/lib/youtube/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format");
    const validFormat = format === "shorts" || format === "long_form" ? format : undefined;
    const result = await generateYoutubeInsights(validFormat);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return toYoutubeErrorResponse(error);
  }
}
