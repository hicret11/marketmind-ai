import { OpportunityError, toErrorResponse } from "@/lib/opportunity/errors";
import { getNotesRepository } from "@/lib/notes/repository";
import { parseUpdateNote } from "@/lib/notes/validate";
import type { NoteResponse } from "@/types/notes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const repo = getNotesRepository();
    const note = await repo.getNote(id);
    if (!note) {
      throw new OpportunityError("INVALID_REQUEST", "Note not found.", { status: 404 });
    }
    const body: NoteResponse = { ok: true, note, storage: repo.storage };
    return Response.json(body);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const raw = await request.json().catch(() => null);
    const input = parseUpdateNote(raw);
    const repo = getNotesRepository();
    const note = await repo.updateNote(id, input);
    if (!note) {
      throw new OpportunityError("INVALID_REQUEST", "Note not found.", { status: 404 });
    }
    const body: NoteResponse = { ok: true, note, storage: repo.storage };
    return Response.json(body);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const repo = getNotesRepository();
    const deleted = await repo.deleteNote(id);
    if (!deleted) {
      throw new OpportunityError("INVALID_REQUEST", "Note not found.", { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
