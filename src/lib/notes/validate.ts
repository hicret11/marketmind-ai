import { NOTE_TYPES, type CreateNoteInput, type NoteType, type UpdateNoteInput } from "@/types/notes";
import { OpportunityError } from "@/lib/opportunity/errors";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asType(value: unknown): NoteType | undefined {
  return typeof value === "string" && NOTE_TYPES.includes(value as NoteType)
    ? (value as NoteType)
    : undefined;
}

function asTags(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];
  return value.filter((t): t is string => typeof t === "string");
}

export function parseCreateNote(body: unknown): CreateNoteInput {
  if (!isRecord(body)) {
    throw new OpportunityError("INVALID_REQUEST", "Request body must be an object.");
  }
  const content = typeof body.content === "string" ? body.content : "";
  if (!content.trim()) {
    throw new OpportunityError("INVALID_REQUEST", "`content` is required.");
  }
  return {
    title: typeof body.title === "string" ? body.title : null,
    content,
    type: asType(body.type),
    tags: asTags(body.tags),
  };
}

export function parseUpdateNote(body: unknown): UpdateNoteInput {
  if (!isRecord(body)) {
    throw new OpportunityError("INVALID_REQUEST", "Request body must be an object.");
  }
  const update: UpdateNoteInput = {};
  if (body.title !== undefined) {
    update.title = typeof body.title === "string" ? body.title : null;
  }
  if (body.content !== undefined) {
    if (typeof body.content !== "string" || !body.content.trim()) {
      throw new OpportunityError("INVALID_REQUEST", "`content` cannot be empty.");
    }
    update.content = body.content;
  }
  const type = asType(body.type);
  if (type) update.type = type;
  const tags = asTags(body.tags);
  if (tags !== undefined) update.tags = tags;
  return update;
}
