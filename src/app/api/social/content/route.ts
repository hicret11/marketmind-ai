import { listUnifiedContent } from "@/lib/social/content-aggregation";
import type { ContentPlatform } from "@/types/unified-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: ContentPlatform[] = ["instagram", "youtube", "tiktok"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const platform = url.searchParams.get("platform");

  const platforms: ContentPlatform[] =
    platform && VALID.includes(platform as ContentPlatform) ? [platform as ContentPlatform] : VALID;

  const items = await listUnifiedContent(platforms);
  return Response.json({ ok: true, items });
}
