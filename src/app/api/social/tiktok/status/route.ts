import { toTiktokErrorResponse } from "@/lib/tiktok/errors";
import { getTiktokConfigStatus } from "@/lib/tiktok/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getTiktokConfigStatus());
  } catch (error) {
    return toTiktokErrorResponse(error);
  }
}
