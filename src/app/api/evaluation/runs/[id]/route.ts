import { EvalError, toEvalErrorResponse } from "@/lib/evaluation/errors";
import { checkRegression } from "@/lib/evaluation/metrics/regression";
import * as repo from "@/lib/evaluation/repository";
import type { RegressionFinding } from "@/types/evaluation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Run detail — real progress, metrics (once computed), and (when a baseline
 * run exists for this task and this run isn't it) a regression comparison
 * against that baseline. `?includeResults=true` also returns every raw
 * ModelCaseResult, for the Error Analysis / Model Disagreement views.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const run = await repo.getRun(id);
    if (!run) throw new EvalError("NOT_FOUND", "Run not found.");

    const url = new URL(request.url);
    const includeResults = url.searchParams.get("includeResults") === "true";
    const results = includeResults ? await repo.listResultsForRun(run.id) : undefined;

    let regression: RegressionFinding[] | null = null;
    if (!run.isBaseline && run.metrics) {
      const baseline = await repo.getBaselineRun(run.taskId);
      if (baseline && baseline.id !== run.id && baseline.metrics) {
        const findings: RegressionFinding[] = [];
        for (const modelId of run.modelIds) {
          const current = run.metrics[modelId];
          const base = baseline.metrics[modelId];
          if (current && base) findings.push(...checkRegression(current, base));
        }
        regression = findings;
      }
    }

    return Response.json({ ok: true, run, results: results ?? null, regression });
  } catch (error) {
    return toEvalErrorResponse(error);
  }
}
