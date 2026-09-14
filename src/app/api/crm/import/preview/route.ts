import { buildImportPreview } from "@/lib/crm/csv";
import { toCrmErrorResponse } from "@/lib/crm/errors";
import { listLeads } from "@/lib/crm/repository";
import { parseImportPreviewBody } from "@/lib/crm/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Non-destructive — parses + maps + flags duplicates, persists nothing. */
export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    const { csvText, source } = parseImportPreviewBody(raw);
    const existing = await listLeads();
    const preview = buildImportPreview(csvText, source, existing);
    return Response.json({ ok: true, preview });
  } catch (error) {
    return toCrmErrorResponse(error);
  }
}
