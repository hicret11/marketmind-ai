import { getDatabaseConnectionStatus } from "@/lib/data-insights/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getDatabaseConnectionStatus());
}
