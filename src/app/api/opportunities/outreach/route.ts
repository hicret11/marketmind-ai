import { toErrorResponse } from "@/lib/opportunity/errors";
import { generateOutreach } from "@/lib/opportunity/outreach";
import { parseOutreachBody } from "@/lib/opportunity/validate";
import type { OutreachResponse } from "@/types/opportunity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const { business, analysis, evidence } = parseOutreachBody(body);
    const outreach = await generateOutreach({ business, analysis, evidence });
    const response: OutreachResponse = { ok: true, outreach };
    return Response.json(response);
  } catch (error) {
    return toErrorResponse(error);
  }
}
