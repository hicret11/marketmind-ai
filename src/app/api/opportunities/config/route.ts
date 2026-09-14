import { getOpportunityConfig } from "@/lib/opportunity/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(getOpportunityConfig());
}
