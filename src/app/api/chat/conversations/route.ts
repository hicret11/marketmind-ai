import { toErrorResponse } from "@/lib/opportunity/errors";
import { getConversationRepository } from "@/lib/chat/repository";
import type { ListConversationsResponse } from "@/types/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const conversations = await getConversationRepository().list();
    const body: ListConversationsResponse = { ok: true, conversations };
    return Response.json(body);
  } catch (error) {
    return toErrorResponse(error);
  }
}
