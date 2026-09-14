import fs from "node:fs";
import path from "node:path";
import type { HandbookCategory, HandbookSection } from "./types";

/**
 * Loads the Digital Marketing Handbook from version-controlled markdown files
 * under `data/handbook/`. Server-only (uses `fs`) — the UI reads through this
 * loader (Server Component) or through `search.ts` (isomorphic), never by
 * hardcoding content in components. Same source MarketMind Chat retrieves from.
 */

const HANDBOOK_DIR = path.join(process.cwd(), "data", "handbook");

interface Frontmatter {
  id?: string;
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
}

function parseFrontmatter(raw: string): { meta: Frontmatter; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const meta: Frontmatter = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    const value = rawValue.trim();
    if (key === "tags") {
      const inner = value.replace(/^\[/, "").replace(/\]$/, "");
      meta.tags = inner
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    } else if (key === "id" || key === "title" || key === "description" || key === "category") {
      meta[key] = value;
    }
  }
  return { meta, body: match[2] };
}

function parseHandbookFile(fileName: string, raw: string, order: number): HandbookSection {
  const { meta, body } = parseFrontmatter(raw);
  const fallbackId = fileName.replace(/^\d+-/, "").replace(/\.md$/, "");
  return {
    id: meta.id ?? fallbackId,
    order,
    title: meta.title ?? fallbackId,
    description: meta.description ?? "",
    category: meta.category ?? "General",
    tags: meta.tags ?? [],
    content: body.trim(),
  };
}

let cache: HandbookSection[] | null = null;

export function loadHandbookSections(): HandbookSection[] {
  if (cache) return cache;

  if (!fs.existsSync(HANDBOOK_DIR)) {
    cache = [];
    return cache;
  }

  const files = fs
    .readdirSync(HANDBOOK_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  cache = files.map((file, index) =>
    parseHandbookFile(file, fs.readFileSync(path.join(HANDBOOK_DIR, file), "utf8"), index),
  );
  return cache;
}

export function getHandbookSection(id: string): HandbookSection | undefined {
  return loadHandbookSections().find((s) => s.id === id);
}

export function getHandbookCategories(): HandbookCategory[] {
  const sections = loadHandbookSections();
  const byCategory = new Map<string, HandbookSection[]>();
  for (const section of sections) {
    const list = byCategory.get(section.category) ?? [];
    list.push(section);
    byCategory.set(section.category, list);
  }
  return Array.from(byCategory.entries()).map(([name, list]) => ({
    name,
    sections: list,
  }));
}
