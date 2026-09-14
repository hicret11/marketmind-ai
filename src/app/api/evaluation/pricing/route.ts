import { toEvalErrorResponse } from "@/lib/evaluation/errors";
import { getAllPricing } from "@/lib/evaluation/model-pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Verified pricing entries only — models without a confirmed rate simply aren't listed. */
export async function GET() {
  try {
    return Response.json({ ok: true, pricing: getAllPricing() });
  } catch (error) {
    return toEvalErrorResponse(error);
  }
}
