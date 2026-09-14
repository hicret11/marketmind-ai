/** MarketMind Chat — conversations, messages and the context transparency contract. */

export interface ChatContextUsed {
  handbook: Array<{ id: string; title: string }>;
  notes: Array<{ id: string; title: string | null }>;
  company: boolean;
  /** True when real, aggregated Instagram data was included in the answer's context. */
  instagram: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  /** Only set on assistant messages. */
  contextUsed?: ChatContextUsed;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageRequest {
  conversationId?: string;
  message: string;
}

export interface SendMessageResponse {
  ok: boolean;
  conversationId: string;
  userMessage: ChatMessage;
  /** Null when the AI is unavailable — no fake answer is ever persisted or returned. */
  assistantMessage: ChatMessage | null;
  ai: {
    available: boolean;
    reason: string | null;
    model: string | null;
  };
}

export interface ListConversationsResponse {
  ok: boolean;
  conversations: Conversation[];
}

export interface GetConversationResponse {
  ok: boolean;
  conversation: Conversation;
  messages: ChatMessage[];
}
