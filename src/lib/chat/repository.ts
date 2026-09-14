import { randomUUID } from "node:crypto";
import type { ChatMessage, Conversation } from "@/types/chat";
import { createJsonArrayStore } from "@/lib/file-store";

/**
 * Chat conversation/message persistence — file-based for now (Supabase isn't
 * configured yet), same pattern as Notes and Opportunity's CRM. Swappable
 * later without touching the API routes or UI.
 */
export interface ConversationRepository {
  list(): Promise<Conversation[]>;
  get(id: string): Promise<Conversation | null>;
  create(title: string): Promise<Conversation>;
  touch(id: string): Promise<void>;
}

export interface MessageRepository {
  listByConversation(conversationId: string): Promise<ChatMessage[]>;
  append(message: ChatMessage): Promise<ChatMessage>;
}

const conversationsStore = createJsonArrayStore<Conversation>("conversations.json");
const messagesStore = createJsonArrayStore<ChatMessage>("messages.json");

class FileConversationRepository implements ConversationRepository {
  async list(): Promise<Conversation[]> {
    const all = await conversationsStore.list();
    return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string): Promise<Conversation | null> {
    const all = await conversationsStore.list();
    return all.find((c) => c.id === id) ?? null;
  }

  async create(title: string): Promise<Conversation> {
    const now = new Date().toISOString();
    const conversation: Conversation = { id: randomUUID(), title, createdAt: now, updatedAt: now };
    return conversationsStore.mutate((all) => {
      all.unshift(conversation);
      return { items: all, result: conversation };
    });
  }

  async touch(id: string): Promise<void> {
    await conversationsStore.mutate((all) => {
      const index = all.findIndex((c) => c.id === id);
      if (index !== -1) all[index] = { ...all[index], updatedAt: new Date().toISOString() };
      return { items: all, result: undefined };
    });
  }
}

class FileMessageRepository implements MessageRepository {
  async listByConversation(conversationId: string): Promise<ChatMessage[]> {
    const all = await messagesStore.list();
    return all
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async append(message: ChatMessage): Promise<ChatMessage> {
    return messagesStore.mutate((all) => {
      all.push(message);
      return { items: all, result: message };
    });
  }
}

let conversationRepo: ConversationRepository | null = null;
let messageRepo: MessageRepository | null = null;

export function getConversationRepository(): ConversationRepository {
  if (!conversationRepo) conversationRepo = new FileConversationRepository();
  return conversationRepo;
}

export function getMessageRepository(): MessageRepository {
  if (!messageRepo) messageRepo = new FileMessageRepository();
  return messageRepo;
}

export function newMessageId(): string {
  return randomUUID();
}

/** A short, deterministic conversation title from the first message — no AI call needed. */
export function titleFromMessage(message: string): string {
  const trimmed = message.trim().replace(/\s+/g, " ");
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed || "New conversation";
}
