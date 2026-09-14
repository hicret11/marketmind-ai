import { toErrorResponse } from "@/lib/opportunity/errors";
import { analyzeSingleBusiness } from "@/lib/opportunity/pipeline";
import { parseAnalyzeBody } from "@/lib/opportunity/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const { business, analyzeWebsites } = parseAnalyzeBody(body);
    const result = await analyzeSingleBusiness(business, { analyzeWebsites });
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
