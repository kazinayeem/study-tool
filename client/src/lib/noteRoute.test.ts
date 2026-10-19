import { describe, it, expect } from 'vitest';
import { resolveNoteRoute } from './noteRoute';

describe('resolveNoteRoute', () => {
  it('resolves the note id from a semester-scoped route (regression: semester id was used as note id)', () => {
    const result = resolveNoteRoute(
      '/semesters/semester-1/notes/note-42',
      { id: 'semester-1', noteId: 'note-42' },
      new URLSearchParams()
    );

    expect(result.isSemesterScoped).toBe(true);
    expect(result.routeSemesterId).toBe('semester-1');
    expect(result.requestedNoteId).toBe('note-42');
    expect(result.requestedNoteId).not.toBe('semester-1');
  });

  it('resolves a global note route to the note id', () => {
    const result = resolveNoteRoute('/notes/note-7', { id: 'note-7' }, null);
    expect(result.isSemesterScoped).toBe(false);
    expect(result.routeSemesterId).toBeUndefined();
    expect(result.requestedNoteId).toBe('note-7');
  });

  it('falls back to the ?id= query parameter', () => {
    const result = resolveNoteRoute('/notes', {}, new URLSearchParams('id=note-query'));
    expect(result.requestedNoteId).toBe('note-query');
  });

  it('prefers an explicit semesterId param when present', () => {
    const result = resolveNoteRoute(
      '/notes/note-9',
      { id: 'note-9', semesterId: 'semester-3' },
      null
    );
    expect(result.routeSemesterId).toBe('semester-3');
    expect(result.requestedNoteId).toBe('note-9');
  });
});
