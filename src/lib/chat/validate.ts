import { OpportunityError } from "@/lib/opportunity/errors";
import type { SendMessageRequest } from "@/types/chat";

const MAX_MESSAGE_LENGTH = 4000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseSendMessage(body: unknown): SendMessageRequest {
  if (!isRecord(body)) {
    throw new OpportunityError("INVALID_REQUEST", "Request body must be an object.");
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    throw new OpportunityError("INVALID_REQUEST", "`message` is required.");
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new OpportunityError(
      "INVALID_REQUEST",
      `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`,
    );
  }
  const conversationId =
    typeof body.conversationId === "string" && body.conversationId.trim()
      ? body.conversationId.trim()
      : undefined;

  return { conversationId, message };
}
