import { extractSnippet, scoreText, tokenize } from "@/lib/retrieval/text-score";
import { markdownToPlainText } from "./markdown";
import type { HandbookSearchResult, HandbookSection } from "./types";

/**
 * Keyword search over a given list of sections. Pure/isomorphic (no `fs`) so
 * it can run both server-side (Handbook page, Chat retrieval) and client-side
 * (the Handbook search box, filtering sections already passed down as props).
 */
export function searchHandbook(
  sections: HandbookSection[],
  query: string,
  limit = 5,
): HandbookSearchResult[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const results: HandbookSearchResult[] = [];
  for (const section of sections) {
    const plainContent = markdownToPlainText(section.content);
    const score =
      scoreText(section.title, tokens, 4) +
      scoreText(section.tags.join(" "), tokens, 3) +
      scoreText(section.description, tokens, 2) +
      scoreText(plainContent, tokens, 1);

    if (score > 0) {
      results.push({
        section,
        score,
        snippet: extractSnippet(plainContent || section.description, tokens),
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
