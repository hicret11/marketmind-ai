import { toCrmErrorResponse } from "@/lib/crm/errors";
import { getSummary } from "@/lib/crm/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await getSummary();
    return Response.json({ ok: true, ...summary });
  } catch (error) {
    return toCrmErrorResponse(error);
  }
}
