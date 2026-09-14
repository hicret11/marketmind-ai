import { toErrorResponse } from "@/lib/opportunity/errors";
import { runDiscoveryPipeline } from "@/lib/opportunity/pipeline";
import { parseDiscoveryQuery } from "@/lib/opportunity/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const query = parseDiscoveryQuery(body);
    const result = await runDiscoveryPipeline(query);
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
