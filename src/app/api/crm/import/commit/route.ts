import { toCrmErrorResponse } from "@/lib/crm/errors";
import { commitImport } from "@/lib/crm/import";
import { parseImportCommitBody } from "@/lib/crm/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    const body = parseImportCommitBody(raw);
    const result = await commitImport(body);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return toCrmErrorResponse(error);
  }
}
