import { toEvalErrorResponse } from "@/lib/evaluation/errors";
import * as repo from "@/lib/evaluation/repository";
import { getProvider } from "@/lib/evaluation/providers/registry";
import { estimateCallCount, startBenchmarkRun } from "@/lib/evaluation/runner";
import { getTaskDefinition } from "@/lib/evaluation/tasks";
import { EvalError } from "@/lib/evaluation/errors";
import { parseStartRun, parseTaskId } from "@/lib/evaluation/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const taskIdParam = url.searchParams.get("taskId");
    const taskId = taskIdParam ? parseTaskId(taskIdParam) : undefined;
    const runs = await repo.listRuns(taskId);
    return Response.json({ ok: true, runs });
  } catch (error) {
    return toEvalErrorResponse(error);
  }
}

/**
 * Starts a benchmark run — the ONLY place a benchmark API call can be
 * triggered. `confirm: false` (or omitted) returns the cost/call estimate
 * WITHOUT calling any model, so the UI can show "N cases x M models = N*M
 * calls — potential paid API usage" and require an explicit second click.
 */
export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    const parsed = parseStartRun(raw);

    const dataset = await repo.getDataset(parsed.datasetId);
    if (!dataset) throw new EvalError("NOT_FOUND", "Dataset not found.");
    if (dataset.taskId !== parsed.taskId) {
      throw new EvalError("INVALID_REQUEST", "That dataset does not belong to this benchmark task.");
    }
    const cases = await repo.listCases(parsed.datasetId);
    const task = getTaskDefinition(parsed.taskId);

    const models = parsed.modelIds.map((id) => {
      const provider = getProvider(id);
      return {
        id,
        displayName: provider?.displayName ?? id,
        configured: provider?.isConfigured() ?? false,
      };
    });
    const unconfigured = models.filter((m) => !m.configured);

    if (!parsed.confirm) {
      return Response.json({
        ok: true,
        estimate: {
          taskId: parsed.taskId,
          promptVersion: task.promptVersion,
          caseCount: cases.length,
          modelCount: parsed.modelIds.length,
          estimatedCalls: estimateCallCount(cases.length, parsed.modelIds.length),
          models,
          unconfiguredModels: unconfigured,
          warning:
            "Starting this run will make real API calls to the selected models. This may incur paid usage depending on your provider plans.",
        },
        started: false,
      });
    }

    if (unconfigured.length > 0) {
      throw new EvalError(
        "MODEL_NOT_CONFIGURED",
        `Cannot start: ${unconfigured.map((m) => m.displayName).join(", ")} not configured.`,
      );
    }

    const run = await startBenchmarkRun({
      taskId: parsed.taskId,
      datasetId: parsed.datasetId,
      modelIds: parsed.modelIds,
    });
    return Response.json({ ok: true, run, started: true }, { status: 201 });
  } catch (error) {
    return toEvalErrorResponse(error);
  }
}
