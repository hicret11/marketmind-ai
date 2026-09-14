import { toEvalErrorResponse } from "@/lib/evaluation/errors";
import { getModelRegistry } from "@/lib/evaluation/providers/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Registry status for all six model slots — never hides an unconfigured model. */
export async function GET() {
  try {
    return Response.json({ ok: true, models: getModelRegistry() });
  } catch (error) {
    return toEvalErrorResponse(error);
  }
}
