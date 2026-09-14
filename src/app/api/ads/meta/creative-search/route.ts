import { toMetaAdsErrorResponse } from "@/lib/meta-ads/errors";
import { searchInstagramContent } from "@/lib/meta-ads/creative-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const results = await searchInstagramContent(q, 12);
    return Response.json({ ok: true, results });
  } catch (error) {
    return toMetaAdsErrorResponse(error);
  }
}
