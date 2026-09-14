import { emptyDraft } from "@/lib/meta-ads/draft";
import { MetaAdsError, toMetaAdsErrorResponse } from "@/lib/meta-ads/errors";
import { runAssistantTurn } from "@/lib/meta-ads/assistant";
import { createChatSession, getChatSession, listChatSessions, updateChatSession } from "@/lib/meta-ads/repository";
import type { AdsChatMessage } from "@/types/meta-ads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    return Response.json({ ok: true, sessions: await listChatSessions() });
  } catch (error) {
    return toMetaAdsErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : null;
    if (!message) throw new MetaAdsError("INVALID_REQUEST", "A message is required.");

    const session = sessionId ? await getChatSession(sessionId) : null;
    const draft = session?.draft ?? emptyDraft();
    const history: AdsChatMessage[] = session?.messages ?? [];

    const userTurn: AdsChatMessage = { role: "user", content: message, createdAt: new Date().toISOString() };

    const result = await runAssistantTurn(history, message, draft);

    if (!result.available) {
      // Save the user's message even when AI is down, so it isn't lost.
      const withUserMsg = [...history, userTurn];
      const persisted = session
        ? await updateChatSession(session.id, { messages: withUserMsg })
        : await createChatSession(draft).then((s) => updateChatSession(s.id, { messages: withUserMsg }));
      return Response.json({ ok: true, available: false, reason: result.reason, session: persisted });
    }

    const assistantTurn: AdsChatMessage = {
      role: "assistant",
      content: result.assistantReply,
      createdAt: new Date().toISOString(),
    };
    const messages = [...history, userTurn, assistantTurn];

    const persisted = session
      ? await updateChatSession(session.id, { messages, draft: result.draft })
      : await createChatSession(result.draft).then((s) => updateChatSession(s.id, { messages }));

    return Response.json({ ok: true, available: true, session: persisted, creativeCandidates: result.creativeCandidates });
  } catch (error) {
    return toMetaAdsErrorResponse(error);
  }
}
