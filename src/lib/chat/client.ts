import { apiRequest } from "@/lib/http";
import type {
  GetConversationResponse,
  ListConversationsResponse,
  SendMessageRequest,
  SendMessageResponse,
} from "@/types/chat";

export { ApiError } from "@/lib/http";

export function sendChatMessage(body: SendMessageRequest): Promise<SendMessageResponse> {
  return apiRequest<SendMessageResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listConversations(): Promise<ListConversationsResponse> {
  return apiRequest<ListConversationsResponse>("/api/chat/conversations");
}

export function getConversation(id: string): Promise<GetConversationResponse> {
  return apiRequest<GetConversationResponse>(`/api/chat/conversations/${id}`);
}
