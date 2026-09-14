import { toErrorResponse } from "@/lib/opportunity/errors";
import { generateChatReply } from "@/lib/chat/generate";
import {
  getConversationRepository,
  getMessageRepository,
  newMessageId,
  titleFromMessage,
} from "@/lib/chat/repository";
import { parseSendMessage } from "@/lib/chat/validate";
import type { ChatMessage, SendMessageResponse } from "@/types/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    const { conversationId, message } = parseSendMessage(raw);

    const conversations = getConversationRepository();
    const messages = getMessageRepository();

    const conversation = conversationId
      ? await conversations.get(conversationId)
      : null;
    const activeConversation =
      conversation ?? (await conversations.create(titleFromMessage(message)));

    const now = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: newMessageId(),
      conversationId: activeConversation.id,
      role: "user",
      content: message,
      createdAt: now,
    };
    await messages.append(userMessage);

    const history = (await messages.listByConversation(activeConversation.id))
      .filter((m) => m.id !== userMessage.id)
      .map((m) => ({ role: m.role, content: m.content }));

    const result = await generateChatReply({ message, history });

    let assistantMessage: ChatMessage | null = null;
    if (result.available && result.reply) {
      assistantMessage = {
        id: newMessageId(),
        conversationId: activeConversation.id,
        role: "assistant",
        content: result.reply,
        contextUsed: result.contextUsed,
        createdAt: new Date().toISOString(),
      };
      await messages.append(assistantMessage);
    }

    await conversations.touch(activeConversation.id);

    const body: SendMessageResponse = {
      ok: true,
      conversationId: activeConversation.id,
      userMessage,
      assistantMessage,
      ai: { available: result.available, reason: result.reason, model: result.model },
    };
    return Response.json(body);
  } catch (error) {
    return toErrorResponse(error);
  }
}
