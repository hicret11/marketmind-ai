/**
 * A tiny, purpose-built markdown parser for handbook content — not a general
 * markdown engine. Supports exactly what the handbook authoring needs:
 * `##`/`###` headings, paragraphs, `-`/`1.` lists, `**bold**`, and a custom
 * callout block syntax:
 *
 *   :::key-idea
 *   Text of the callout.
 *   :::
 *
 * Callout kinds: key-idea | example | mistake | metric.
 * Deliberately dependency-free (no remark/MDX) per the project's "avoid
 * unnecessary dependencies" convention.
 */

export type CalloutKind = "key-idea" | "example" | "mistake" | "metric";

export type HandbookBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet-list"; items: string[] }
  | { type: "number-list"; items: string[] }
  | { type: "callout"; kind: CalloutKind; text: string };

const CALLOUT_KINDS: CalloutKind[] = ["key-idea", "example", "mistake", "metric"];

export function parseHandbookMarkdown(markdown: string): HandbookBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: HandbookBlock[] = [];

  let paragraphBuf: string[] = [];
  let listBuf: string[] = [];
  let listType: "bullet-list" | "number-list" | null = null;

  function flushParagraph() {
    if (paragraphBuf.length > 0) {
      blocks.push({ type: "paragraph", text: paragraphBuf.join(" ").trim() });
      paragraphBuf = [];
    }
  }
  function flushList() {
    if (listBuf.length > 0 && listType) {
      blocks.push({ type: listType, items: listBuf });
    }
    listBuf = [];
    listType = null;
  }
  function flushAll() {
    flushParagraph();
    flushList();
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll();
      i += 1;
      continue;
    }

    const calloutOpen = trimmed.match(/^:::(key-idea|example|mistake|metric)\s*$/);
    if (calloutOpen) {
      flushAll();
      const kind = calloutOpen[1] as CalloutKind;
      const body: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== ":::") {
        body.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing :::
      blocks.push({ type: "callout", kind, text: body.join(" ").trim() });
      continue;
    }

    const heading = trimmed.match(/^(#{2,3})\s+(.*)$/);
    if (heading) {
      flushAll();
      blocks.push({
        type: "heading",
        level: heading[1].length === 2 ? 2 : 3,
        text: heading[2].trim(),
      });
      i += 1;
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      if (listType !== "bullet-list") flushList();
      listType = "bullet-list";
      listBuf.push(bullet[1].trim());
      i += 1;
      continue;
    }

    const numbered = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (numbered) {
      flushParagraph();
      if (listType !== "number-list") flushList();
      listType = "number-list";
      listBuf.push(numbered[1].trim());
      i += 1;
      continue;
    }

    flushList();
    paragraphBuf.push(trimmed);
    i += 1;
  }

  flushAll();
  return blocks;
}

export function isCalloutKind(value: string): value is CalloutKind {
  return (CALLOUT_KINDS as string[]).includes(value);
}

/** Strips markdown syntax down to plain text — used for search indexing/snippets. */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/^:::\w[\w-]*\s*$/gm, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+[.)]\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
