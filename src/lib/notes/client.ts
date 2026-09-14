import { apiRequest } from "@/lib/http";
import type {
  CreateNoteInput,
  ListNotesResponse,
  NoteFilters,
  NoteResponse,
  UpdateNoteInput,
} from "@/types/notes";

export { ApiError } from "@/lib/http";

export function listNotes(filters?: NoteFilters): Promise<ListNotesResponse> {
  const params = new URLSearchParams();
  if (filters?.query) params.set("q", filters.query);
  if (filters?.type) params.set("type", filters.type);
  if (filters?.tag) params.set("tag", filters.tag);
  const qs = params.toString();
  return apiRequest<ListNotesResponse>(`/api/notes${qs ? `?${qs}` : ""}`);
}

export function createNote(input: CreateNoteInput): Promise<NoteResponse> {
  return apiRequest<NoteResponse>("/api/notes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateNote(id: string, input: UpdateNoteInput): Promise<NoteResponse> {
  return apiRequest<NoteResponse>(`/api/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteNote(id: string): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/api/notes/${id}`, { method: "DELETE" });
}
