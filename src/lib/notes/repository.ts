import { randomUUID } from "node:crypto";
import { PRODUCT_CONTEXT_ID } from "@/types/opportunity";
import type {
  CreateNoteInput,
  MarketingNote,
  NoteFilters,
  UpdateNoteInput,
} from "@/types/notes";
import { isSupabaseServerConfigured } from "@/lib/opportunity/config";
import { OpportunityError } from "@/lib/opportunity/errors";
import { createJsonArrayStore } from "@/lib/file-store";
import { scoreText, tokenize } from "@/lib/retrieval/text-score";

/**
 * My Marketing Notes persistence.
 *
 * A clean repository abstraction so this can move to Supabase later without
 * touching callers (the UI, and MarketMind Chat's retrieval). File-based for
 * now since Supabase isn't configured — see {@link getNotesRepository}.
 */
export interface MarketingNotesRepository {
  readonly storage: "file" | "supabase";
  listNotes(filters?: NoteFilters): Promise<MarketingNote[]>;
  getNote(id: string): Promise<MarketingNote | null>;
  createNote(input: CreateNoteInput): Promise<MarketingNote>;
  updateNote(id: string, input: UpdateNoteInput): Promise<MarketingNote | null>;
  deleteNote(id: string): Promise<boolean>;
  searchNotes(query: string): Promise<MarketingNote[]>;
}

const MAX_TITLE_LENGTH = 140;
const MAX_CONTENT_LENGTH = 8000;
const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 40;

function cleanTitle(title: string | null | undefined): string | null {
  if (!title) return null;
  const trimmed = title.trim().slice(0, MAX_TITLE_LENGTH);
  return trimmed || null;
}

function cleanTags(tags: string[] | undefined): string[] {
  if (!tags) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().slice(0, MAX_TAG_LENGTH);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

function matchesFilters(note: MarketingNote, filters?: NoteFilters): boolean {
  if (!filters) return true;
  if (filters.type && note.type !== filters.type) return false;
  if (filters.tag) {
    const wanted = filters.tag.toLowerCase();
    if (!note.tags.some((t) => t.toLowerCase() === wanted)) return false;
  }
  if (filters.query && filters.query.trim()) {
    const tokens = tokenize(filters.query);
    if (tokens.length === 0) return true;
    const haystack = [note.title ?? "", note.content, note.tags.join(" ")].join(" ");
    const score = scoreText(haystack, tokens);
    if (score <= 0) return false;
  }
  return true;
}

class FileMarketingNotesRepository implements MarketingNotesRepository {
  readonly storage = "file" as const;
  private store = createJsonArrayStore<MarketingNote>("marketing-notes.json");

  async listNotes(filters?: NoteFilters): Promise<MarketingNote[]> {
    const notes = await this.store.list();
    return notes
      .filter((n) => matchesFilters(n, filters))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getNote(id: string): Promise<MarketingNote | null> {
    const notes = await this.store.list();
    return notes.find((n) => n.id === id) ?? null;
  }

  async createNote(input: CreateNoteInput): Promise<MarketingNote> {
    const content = input.content?.trim().slice(0, MAX_CONTENT_LENGTH) ?? "";
    if (!content) {
      throw new OpportunityError("INVALID_REQUEST", "Note content is required.");
    }
    const now = new Date().toISOString();
    const note: MarketingNote = {
      id: randomUUID(),
      title: cleanTitle(input.title),
      content,
      type: input.type ?? "note",
      tags: cleanTags(input.tags),
      companyContextId: PRODUCT_CONTEXT_ID,
      createdAt: now,
      updatedAt: now,
    };
    return this.store.mutate((notes) => {
      notes.unshift(note);
      return { items: notes, result: note };
    });
  }

  async updateNote(id: string, input: UpdateNoteInput): Promise<MarketingNote | null> {
    return this.store.mutate((notes) => {
      const index = notes.findIndex((n) => n.id === id);
      if (index === -1) return { items: notes, result: null };

      const existing = notes[index];
      const content =
        input.content !== undefined
          ? input.content.trim().slice(0, MAX_CONTENT_LENGTH)
          : existing.content;
      if (!content) {
        throw new OpportunityError("INVALID_REQUEST", "Note content is required.");
      }

      const updated: MarketingNote = {
        ...existing,
        title: input.title !== undefined ? cleanTitle(input.title) : existing.title,
        content,
        type: input.type ?? existing.type,
        tags: input.tags !== undefined ? cleanTags(input.tags) : existing.tags,
        updatedAt: new Date().toISOString(),
      };
      notes[index] = updated;
      return { items: notes, result: updated };
    });
  }

  async deleteNote(id: string): Promise<boolean> {
    return this.store.mutate((notes) => {
      const next = notes.filter((n) => n.id !== id);
      return { items: next, result: next.length !== notes.length };
    });
  }

  async searchNotes(query: string): Promise<MarketingNote[]> {
    return this.listNotes({ query });
  }
}

let cached: MarketingNotesRepository | null = null;

/**
 * Returns the active repository. Only a file-backed implementation exists —
 * Supabase persistence for Notes is intentionally out of scope until
 * MarketMind's database layer is actually configured (matches the CRM's own
 * `isSupabaseServerConfigured()` gate, reused here read-only).
 */
export function getNotesRepository(): MarketingNotesRepository {
  if (isSupabaseServerConfigured()) {
    console.warn(
      "[notes] Supabase is configured but Notes persistence is file-based for now — " +
        "wire a SupabaseMarketingNotesRepository here when that migration happens.",
    );
  }
  if (!cached) cached = new FileMarketingNotesRepository();
  return cached;
}
