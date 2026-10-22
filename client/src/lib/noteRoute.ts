export interface NoteRouteParams {
  id?: string;
  noteId?: string;
  semesterId?: string;
}

export interface NoteRouteResolution {
  isSemesterScoped: boolean;
  routeSemesterId?: string;
  requestedNoteId?: string;
}

/**
 * Resolve the semester + note identifiers from the current notes route.
 *
 * BornoFlow exposes two note routes:
 *   - /semesters/:id/notes/:noteId  -> `id` is the SEMESTER, `noteId` is the NOTE
 *   - /notes/:id                    -> `id` is the NOTE
 *
 * A previous implementation treated the dynamic `id` segment as the note id in
 * both routes, so `/semesters/<semesterId>/notes/<noteId>` ended up requesting
 * `GET /api/notes/<semesterId>` and falsely showed "Note Not Found or Deleted".
 */
export function resolveNoteRoute(
  pathname: string,
  params: NoteRouteParams,
  searchParams?: URLSearchParams | null
): NoteRouteResolution {
  const isSemesterScoped = pathname.startsWith('/semesters/');
  const queryNoteId = searchParams?.get('id') || undefined;

  const routeSemesterId = params.semesterId || (isSemesterScoped ? params.id : undefined);
  const requestedNoteId = isSemesterScoped
    ? params.noteId || queryNoteId
    : params.noteId || params.id || queryNoteId;

  return { isSemesterScoped, routeSemesterId, requestedNoteId };
}
