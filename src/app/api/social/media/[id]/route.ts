import { SocialError, toSocialErrorResponse } from "@/lib/social/errors";
import { interpretMediaPerformance } from "@/lib/social/media-analysis";
import { getMediaDetail } from "@/lib/social/queries";
import type { MediaDetailResponse } from "@/types/social";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const detail = await getMediaDetail(id);
    if (!detail) throw new SocialError("INVALID_REQUEST", "Media not found.", { status: 404 });

    const url = new URL(request.url);
    const wantAnalysis = url.searchParams.get("analyze") !== "false";

    let interpretation: MediaDetailResponse["interpretation"] = null;
    if (wantAnalysis) {
      const result = await interpretMediaPerformance(detail.media, detail.performance);
      interpretation = result.interpretation;
    }

    const body: MediaDetailResponse = {
      ok: true,
      media: detail.media,
      performance: detail.performance,
      insight: detail.latestInsight,
      interpretation,
    };
    return Response.json(body);
  } catch (error) {
    return toSocialErrorResponse(error);
  }
}
