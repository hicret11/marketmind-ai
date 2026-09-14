import { resolveAiProvider } from "@/lib/opportunity/ai/provider";
import type { ChatTurn } from "@/lib/opportunity/ai/types";
import { OpportunityError } from "@/lib/opportunity/errors";
import type { ChatContextUsed } from "@/types/chat";
import { buildChatSystemPrompt } from "./prompt";
import { retrieveMarketingContext, type MarketingContext } from "./retrieval";

/**
 * MarketMind Chat's reply generation. Deliberately NOT a generic Gemini
 * wrapper: every call retrieves relevant Handbook/Notes/company context first
 * (see retrieval.ts) and never fabricates an answer when the AI is down.
 */

const MAX_HISTORY_TURNS = 10;

/** Required product copy — see the task's "GEMINI FAILURES" behavior. */
export const CHAT_UNAVAILABLE_MESSAGE =
  "MarketMind AI is temporarily unavailable. Your notes and handbook are still accessible.";

export interface ChatReplyResult {
  available: boolean;
  reason: string | null;
  model: string | null;
  reply: string | null;
  contextUsed: ChatContextUsed;
}

function toContextUsed(context: MarketingContext): ChatContextUsed {
  return {
    handbook: context.handbook.map((r) => ({ id: r.section.id, title: r.section.title })),
    notes: context.notes.map((n) => ({ id: n.note.id, title: n.note.title })),
    company: Boolean(context.companyContext),
    instagram: context.social !== null,
  };
}

export async function generateChatReply(params: {
  message: string;
  history: ChatTurn[];
}): Promise<ChatReplyResult> {
  const context = await retrieveMarketingContext(params.message);
  const contextUsed = toContextUsed(context);

  const provider = resolveAiProvider();
  if (!provider) {
    return {
      available: false,
      reason: CHAT_UNAVAILABLE_MESSAGE,
      model: null,
      reply: null,
      contextUsed,
    };
  }

  const system = buildChatSystemPrompt(context);
  const history = params.history.slice(-MAX_HISTORY_TURNS);

  try {
    const reply = await provider.generateText({
      system,
      history,
      message: params.message,
      maxOutputTokens: 2048,
    });
    return { available: true, reason: null, model: provider.model, reply, contextUsed };
  } catch (error) {
    if (error instanceof OpportunityError) {
      // Technical detail stays in server logs; the user only ever sees the
      // calm, product-friendly message — never a fabricated answer.
      console.error(`[chat] AI provider error (${error.code}):`, error.message);
      return {
        available: false,
        reason: CHAT_UNAVAILABLE_MESSAGE,
        model: null,
        reply: null,
        contextUsed,
      };
    }
    throw error;
  }
}
