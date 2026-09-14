import type { ProductContextId } from "./opportunity";

/**
 * My Marketing Notes — the user's own personal marketing memory. These are
 * USER-WRITTEN observations, never AI-generated and never universal facts.
 * MarketMind Chat may retrieve and reference them, but must always label them
 * as the user's own saved lessons/observations, not general marketing truth.
 */

export type NoteType =
  | "note"
  | "lesson_learned"
  | "mistake"
  | "observation"
  | "strategy"
  | "idea";

export const NOTE_TYPES: NoteType[] = [
  "note",
  "lesson_learned",
  "mistake",
  "observation",
  "strategy",
  "idea",
];

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  note: "Note",
  lesson_learned: "Lesson Learned",
  mistake: "Mistake",
  observation: "Observation",
  strategy: "Strategy",
  idea: "Idea",
};

export interface MarketingNote {
  id: string;
  title: string | null;
  content: string;
  type: NoteType;
  tags: string[];
  /** Fixed to Sing My Birthday for now — no multi-company support yet. */
  companyContextId: ProductContextId;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteInput {
  title?: string | null;
  content: string;
  type?: NoteType;
  tags?: string[];
}

export interface UpdateNoteInput {
  title?: string | null;
  content?: string;
  type?: NoteType;
  tags?: string[];
}

export interface NoteFilters {
  query?: string;
  type?: NoteType;
  tag?: string;
}

export interface ListNotesResponse {
  ok: boolean;
  notes: MarketingNote[];
  storage: "file" | "supabase";
}

export interface NoteResponse {
  ok: boolean;
  note: MarketingNote;
  storage: "file" | "supabase";
}
