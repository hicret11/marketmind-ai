import { toEvalErrorResponse } from "@/lib/evaluation/errors";
import * as repo from "@/lib/evaluation/repository";
import { parseAddLeadQualificationFromOpportunity } from "@/lib/evaluation/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Add to Evaluation Dataset" — takes the SAME already-verified business
 * metadata + website evidence Opportunity Discovery produced (no refetch, no
 * re-scoring) and creates (or returns the existing) Lead Qualification case.
 * The human still has to open it and set Qualified/Not Qualified — this never
 * auto-fills ground truth.
 */
export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    const { sourceBusinessId, label, input } = parseAddLeadQualificationFromOpportunity(raw);

    const dataset = await repo.getOrCreateDefaultDataset(
      "lead-qualification",
      "Lead Qualification dataset",
    );

    const existing = await repo.findCaseBySource(dataset.id, sourceBusinessId);
    if (existing) {
      return Response.json({ ok: true, case: existing, dataset, created: false });
    }

    const record = await repo.createCase({
      datasetId: dataset.id,
      taskId: "lead-qualification",
      label,
      input,
      groundTruth: null,
      reviewStatus: "needs_review",
      reviewNote: null,
      sourceBusinessId,
      businessOutcome: null,
      evidenceMismatchAcknowledged: false,
    });
    return Response.json({ ok: true, case: record, dataset, created: true }, { status: 201 });
  } catch (error) {
    return toEvalErrorResponse(error);
  }
}
