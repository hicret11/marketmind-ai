import { toErrorResponse } from "@/lib/opportunity/errors";
import { getNotesRepository } from "@/lib/notes/repository";
import { parseCreateNote } from "@/lib/notes/validate";
import type { ListNotesResponse, NoteResponse, NoteType } from "@/types/notes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? undefined;
    const type = (url.searchParams.get("type") as NoteType | null) ?? undefined;
    const tag = url.searchParams.get("tag") ?? undefined;

    const repo = getNotesRepository();
    const notes = await repo.listNotes({ query, type, tag });
    const body: ListNotesResponse = { ok: true, notes, storage: repo.storage };
    return Response.json(body);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    const input = parseCreateNote(raw);
    const repo = getNotesRepository();
    const note = await repo.createNote(input);
    const body: NoteResponse = { ok: true, note, storage: repo.storage };
    return Response.json(body, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
