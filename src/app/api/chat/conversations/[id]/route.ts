import { OpportunityError, toErrorResponse } from "@/lib/opportunity/errors";
import { getConversationRepository, getMessageRepository } from "@/lib/chat/repository";
import type { GetConversationResponse } from "@/types/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const conversation = await getConversationRepository().get(id);
    if (!conversation) {
      throw new OpportunityError("INVALID_REQUEST", "Conversation not found.", { status: 404 });
    }
    const messages = await getMessageRepository().listByConversation(id);
    const body: GetConversationResponse = { ok: true, conversation, messages };
    return Response.json(body);
  } catch (error) {
    return toErrorResponse(error);
  }
}
