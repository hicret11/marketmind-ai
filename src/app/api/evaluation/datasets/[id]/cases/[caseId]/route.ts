import { EvalError, toEvalErrorResponse } from "@/lib/evaluation/errors";
import * as repo from "@/lib/evaluation/repository";
import {
  assertEvidenceMismatchAcknowledged,
  parseUpdateCase,
  validateGroundTruthShape,
} from "@/lib/evaluation/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; caseId: string }>;
}

async function loadCase(datasetId: string, caseId: string) {
  const dataset = await repo.getDataset(datasetId);
  if (!dataset) throw new EvalError("NOT_FOUND", "Dataset not found.");
  const kase = await repo.getCase(caseId);
  if (!kase || kase.datasetId !== datasetId) throw new EvalError("NOT_FOUND", "Case not found.");
  return { dataset, kase };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id, caseId } = await params;
    const { kase } = await loadCase(id, caseId);
    return Response.json({ ok: true, case: kase });
  } catch (error) {
    return toEvalErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id, caseId } = await params;
    const { dataset, kase } = await loadCase(id, caseId);

    const raw = await request.json().catch(() => null);
    const patch = parseUpdateCase(dataset.taskId, raw);

    // Marking Human Verified requires a valid ground truth — from this patch, or already stored.
    if (patch.reviewStatus === "human_verified" && patch.groundTruth === undefined) {
      validateGroundTruthShape(dataset.taskId, kase.groundTruth);
    }
    // Same for the evidence/domain-mismatch acknowledgment gate — check against
    // the patched input if given, otherwise the case's already-stored input.
    if (patch.reviewStatus === "human_verified" && patch.input === undefined) {
      assertEvidenceMismatchAcknowledged(
        dataset.taskId,
        kase.input,
        patch.evidenceMismatchAcknowledged ?? kase.evidenceMismatchAcknowledged,
      );
    }

    const updated = await repo.updateCase(caseId, patch);
    if (!updated) throw new EvalError("NOT_FOUND", "Case not found.");
    return Response.json({ ok: true, case: updated });
  } catch (error) {
    return toEvalErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id, caseId } = await params;
    await loadCase(id, caseId);
    const deleted = await repo.deleteCase(caseId);
    if (!deleted) throw new EvalError("NOT_FOUND", "Case not found.");
    return Response.json({ ok: true });
  } catch (error) {
    return toEvalErrorResponse(error);
  }
}
