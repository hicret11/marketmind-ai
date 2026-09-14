import { toEvalErrorResponse } from "@/lib/evaluation/errors";
import * as repo from "@/lib/evaluation/repository";
import { getTaskDefinition } from "@/lib/evaluation/tasks";
import { parseTaskId } from "@/lib/evaluation/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lists datasets, or (given ?taskId=) returns the single default dataset for
 * that task, auto-creating it on first use (starts empty — "No Human Verified
 * cases yet", never seeded with fake examples).
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const taskIdParam = url.searchParams.get("taskId");

    if (taskIdParam) {
      const taskId = parseTaskId(taskIdParam);
      const task = getTaskDefinition(taskId);
      const dataset = await repo.getOrCreateDefaultDataset(taskId, `${task.shortTitle} dataset`);
      return Response.json({ ok: true, datasets: [dataset] });
    }

    const datasets = await repo.listDatasets();
    return Response.json({ ok: true, datasets });
  } catch (error) {
    return toEvalErrorResponse(error);
  }
}
