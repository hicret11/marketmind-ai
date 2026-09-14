/**
 * Lightweight, dependency-free keyword retrieval used by both the Handbook
 * search and MarketMind Chat's context retrieval. No vector DB / embeddings —
 * normalized token matching with simple relevance scoring. The interface is
 * intentionally narrow so this can be swapped for embeddings/pgvector later
 * without touching callers.
 */

const STOPWORDS = new Set([
  "a", "an", "the", "of", "to", "for", "in", "on", "and", "or", "is", "are",
  "what", "how", "should", "my", "me", "i", "do", "does", "with", "about",
  "this", "that", "it", "be", "can", "will", "you", "your",
]);

export function tokenize(text: string): string[] {
  const raw = text.toLowerCase().match(/[a-z0-9][a-z0-9+/-]*/g) ?? [];
  return raw.filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Scores how well `text` matches `queryTokens`. Exact token hits score full
 * weight; loose substring overlap scores partial weight. Not normalized by
 * length — callers compare scores within one field/document, not across
 * differently-sized texts, unless they weight fields themselves.
 */
export function scoreText(text: string, queryTokens: string[], weight = 1): number {
  if (queryTokens.length === 0) return 0;
  const tokens = tokenize(text);
  if (tokens.length === 0) return 0;
  const tokenSet = new Set(tokens);

  let score = 0;
  for (const qt of queryTokens) {
    if (tokenSet.has(qt)) {
      score += weight;
      continue;
    }
    const partial = tokens.some(
      (t) => (t.length > 3 && qt.includes(t)) || (qt.length > 3 && t.includes(qt)),
    );
    if (partial) score += weight * 0.4;
  }
  return score;
}

/** Extracts a short snippet of `text` around the first token hit, for search UIs. */
export function extractSnippet(
  text: string,
  queryTokens: string[],
  radius = 110,
): string {
  const lower = text.toLowerCase();
  let index = -1;
  for (const qt of queryTokens) {
    const found = lower.indexOf(qt);
    if (found !== -1 && (index === -1 || found < index)) index = found;
  }
  if (index === -1) return text.slice(0, radius * 2).trim();

  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  let snippet = text.slice(start, end).trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < text.length) snippet = `${snippet}…`;
  return snippet;
}
