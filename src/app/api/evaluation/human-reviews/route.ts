import { toEvalErrorResponse } from "@/lib/evaluation/errors";
import * as repo from "@/lib/evaluation/repository";
import { parseHumanReview, parseTaskId } from "@/lib/evaluation/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const runId = url.searchParams.get("runId");
    const subjectId = url.searchParams.get("subjectId");
    const taskIdParam = url.searchParams.get("taskId");

    if (runId) return Response.json({ ok: true, reviews: await repo.listReviewsForRun(runId) });
    if (subjectId) {
      return Response.json({ ok: true, reviews: await repo.listReviewsForSubject(subjectId) });
    }
    if (taskIdParam) {
      const taskId = parseTaskId(taskIdParam);
      return Response.json({ ok: true, reviews: await repo.listReviewsForTask(taskId) });
    }
    return Response.json({ ok: true, reviews: [] });
  } catch (error) {
    return toEvalErrorResponse(error);
  }
}

/** Human scoring (0-10 per dimension) for a Lyrics/Content/Image model output — never AI-scored. */
export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    const input = parseHumanReview(raw);
    const review = await repo.addHumanReview(input);
    return Response.json({ ok: true, review }, { status: 201 });
  } catch (error) {
    return toEvalErrorResponse(error);
  }
}
