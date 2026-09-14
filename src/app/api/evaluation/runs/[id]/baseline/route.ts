import { MIN_HUMAN_VERIFIED_FOR_BASELINE } from "@/lib/evaluation/config";
import { EvalError, toEvalErrorResponse } from "@/lib/evaluation/errors";
import * as repo from "@/lib/evaluation/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const run = await repo.getRun(id);
    if (!run) throw new EvalError("NOT_FOUND", "Run not found.");
    if (run.status !== "completed" && run.status !== "completed_with_errors") {
      throw new EvalError("INVALID_REQUEST", "Only a completed run can be marked as the baseline.");
    }

    // A baseline is meant to be a stable comparison point — a handful of
    // cases isn't enough to trust as one. Same threshold the UI disables the
    // button at, enforced here too so this can't be bypassed via the API.
    const groundTruthCount = run.metrics
      ? Math.max(0, ...run.modelIds.map((id) => run.metrics?.[id]?.casesWithGroundTruth ?? 0))
      : 0;
    if (groundTruthCount < MIN_HUMAN_VERIFIED_FOR_BASELINE) {
      throw new EvalError(
        "INVALID_REQUEST",
        `Baseline requires at least ${MIN_HUMAN_VERIFIED_FOR_BASELINE} Human Verified cases; this run only has ${groundTruthCount}. Add more Human Verified cases and re-run before setting a baseline.`,
      );
    }

    const updated = await repo.setBaseline(id);
    return Response.json({ ok: true, run: updated });
  } catch (error) {
    return toEvalErrorResponse(error);
  }
}
