import { loadHandbookSections } from "@/lib/handbook/loader";
import { searchHandbook } from "@/lib/handbook/search";
import type { HandbookSearchResult } from "@/lib/handbook/types";
import { getNotesRepository } from "@/lib/notes/repository";
import type { MarketingNote } from "@/types/notes";
import type { ProductContext } from "@/types/opportunity";
import { SING_MY_BIRTHDAY } from "@/lib/product-context";
import {
  isSocialRelevant,
  retrieveSocialContext,
  type SocialChatContext,
} from "@/lib/social/chat-context";
import { scoreText, tokenize } from "@/lib/retrieval/text-score";

/**
 * Lightweight, keyword-based retrieval across the Handbook and the user's own
 * Notes — no vector DB. `retrieveMarketingContext` is the one entry point Chat
 * calls; deliberately separate from Gemini so retrieval logic stays testable
 * and swappable (embeddings/pgvector later) without touching the LLM call.
 */

export interface NoteMatch {
  note: MarketingNote;
  score: number;
}

export interface MarketingContext {
  handbook: HandbookSearchResult[];
  notes: NoteMatch[];
  companyContext: ProductContext | null;
  /** Real, aggregated Instagram data — only when the question is social-relevant AND an account is connected. */
  social: SocialChatContext | null;
}

const HANDBOOK_LIMIT = 3;
const NOTES_LIMIT = 3;

const BUSINESS_KEYWORDS = [
  "sing my birthday",
  "my business",
  "my company",
  "my product",
  "our product",
  "our business",
  "my brand",
  "my campaign",
  "my customers",
  "my venue",
  "my venues",
  "b2b",
  "venue",
  "venues",
  "partnership",
  "partner",
  "pilot",
  "outreach",
];

/** Heuristic "intent/relevance detection" — is this question about MarketMind's own business? */
export function isBusinessSpecific(query: string): boolean {
  const lower = query.toLowerCase();
  return BUSINESS_KEYWORDS.some((kw) => lower.includes(kw));
}

function searchNotes(notes: MarketingNote[], query: string, limit: number): NoteMatch[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const scored = notes
    .map((note) => {
      const score =
        scoreText(note.title ?? "", tokens, 3) +
        scoreText(note.tags.join(" "), tokens, 2) +
        scoreText(note.content, tokens, 1);
      return { note, score };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

export async function retrieveMarketingContext(query: string): Promise<MarketingContext> {
  const handbookSections = loadHandbookSections();
  const handbook = searchHandbook(handbookSections, query, HANDBOOK_LIMIT);

  const repo = getNotesRepository();
  const allNotes = await repo.listNotes();
  const notes = searchNotes(allNotes, query, NOTES_LIMIT);

  // Instagram data — only fetched when the question is about the user's own
  // social content/posting. Purely aggregated; no captions, no tokens.
  const social = isSocialRelevant(query) ? await retrieveSocialContext() : null;

  // A matched personal note or social data is inherently business-specific.
  const companyContext =
    isBusinessSpecific(query) || notes.length > 0 || social !== null
      ? SING_MY_BIRTHDAY
      : null;

  return { handbook, notes, companyContext, social };
}
