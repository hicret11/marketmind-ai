import { EvalError, toEvalErrorResponse } from "@/lib/evaluation/errors";
import * as repo from "@/lib/evaluation/repository";
import { parseCreateCase } from "@/lib/evaluation/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const dataset = await repo.getDataset(id);
    if (!dataset) throw new EvalError("NOT_FOUND", "Dataset not found.");
    const cases = await repo.listCases(id);
    return Response.json({ ok: true, dataset, cases });
  } catch (error) {
    return toEvalErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const dataset = await repo.getDataset(id);
    if (!dataset) throw new EvalError("NOT_FOUND", "Dataset not found.");

    const raw = await request.json().catch(() => null);
    const input = parseCreateCase(dataset.taskId, raw);
    const record = await repo.createCase({
      datasetId: dataset.id,
      taskId: dataset.taskId,
      ...input,
      businessOutcome: null,
    });
    return Response.json({ ok: true, case: record }, { status: 201 });
  } catch (error) {
    return toEvalErrorResponse(error);
  }
}
