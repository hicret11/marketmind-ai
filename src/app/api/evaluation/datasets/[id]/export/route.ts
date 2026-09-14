import { EvalError, toEvalErrorResponse } from "@/lib/evaluation/errors";
import * as repo from "@/lib/evaluation/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(","));
  return lines.join("\n");
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const dataset = await repo.getDataset(id);
    if (!dataset) throw new EvalError("NOT_FOUND", "Dataset not found.");
    const cases = await repo.listCases(id);

    const url = new URL(request.url);
    const format = url.searchParams.get("format") === "csv" ? "csv" : "json";

    if (format === "json") {
      return Response.json({ ok: true, dataset, cases });
    }

    const csv = toCsv(
      cases.map((c) => ({
        id: c.id,
        label: c.label,
        reviewStatus: c.reviewStatus,
        reviewNote: c.reviewNote,
        input: c.input,
        groundTruth: c.groundTruth,
        sourceBusinessId: c.sourceBusinessId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${dataset.taskId}-dataset.csv"`,
      },
    });
  } catch (error) {
    return toEvalErrorResponse(error);
  }
}
