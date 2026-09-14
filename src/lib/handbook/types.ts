/** A single Digital Marketing Handbook chapter, loaded from data/handbook/*.md. */
export interface HandbookSection {
  id: string;
  order: number;
  title: string;
  description: string;
  category: string;
  tags: string[];
  /** Raw markdown body (frontmatter stripped). */
  content: string;
}

export interface HandbookCategory {
  name: string;
  sections: HandbookSection[];
}

export interface HandbookSearchResult {
  section: HandbookSection;
  score: number;
  snippet: string;
}
