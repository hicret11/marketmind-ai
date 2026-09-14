import { EvalError, toEvalErrorResponse } from "@/lib/evaluation/errors";
import * as repo from "@/lib/evaluation/repository";

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
    return Response.json({ ok: true, dataset });
  } catch (error) {
    return toEvalErrorResponse(error);
  }
}
