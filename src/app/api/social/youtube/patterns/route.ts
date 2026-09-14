import { toYoutubeErrorResponse } from "@/lib/youtube/errors";
import { computeYoutubePatternComparisons } from "@/lib/youtube/patterns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format");
    const validFormat = format === "shorts" || format === "long_form" ? format : undefined;
    const result = await computeYoutubePatternComparisons(validFormat);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return toYoutubeErrorResponse(error);
  }
}
