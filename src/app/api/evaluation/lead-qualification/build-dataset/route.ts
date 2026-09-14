import { buildEvaluationDataset } from "@/lib/evaluation/dataset-builder";
import { toEvalErrorResponse } from "@/lib/evaluation/errors";
import { parseBuildDatasetBody } from "@/lib/evaluation/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Discovers + analyzes real businesses across up to 5 category groups — can
// legitimately take a minute or two, same reasoning as /api/opportunities/discover.
export const maxDuration = 240;

/**
 * "Build Evaluation Dataset" — bulk-populates the Lead Qualification dataset
 * from real businesses via the existing OSM discovery + website analysis
 * pipeline. NEVER calls a benchmark model (Gemini/Groq/OpenRouter/OpenAI/
 * Anthropic) — this is discovery + rule-based scoring only, exactly what
 * Opportunity Discovery already does. Every case is created "needs_review"
 * with no ground truth; nothing here ever marks a case Qualified, Not
 * Qualified, or Human Verified.
 */
export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    const params = parseBuildDatasetBody(raw);
    const result = await buildEvaluationDataset(params);
    return Response.json({ ok: true, result });
  } catch (error) {
    return toEvalErrorResponse(error);
  }
}
