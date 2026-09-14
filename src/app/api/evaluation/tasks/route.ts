import { toEvalErrorResponse } from "@/lib/evaluation/errors";
import { BENCHMARK_TASKS } from "@/lib/evaluation/tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ ok: true, tasks: BENCHMARK_TASKS });
  } catch (error) {
    return toEvalErrorResponse(error);
  }
}
