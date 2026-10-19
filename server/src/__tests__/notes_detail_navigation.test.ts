import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import notesRouter from '../routes/notes.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { JWT_SECRET } from '../config.js';
import { resolveNoteRoute } from '../../../client/src/lib/noteRoute';

const app = express();
app.use(express.json());
app.use('/api/notes', notesRouter);
app.use(errorHandler);

describe('Knowledge Base note detail routing, ownership & semester integrity', () => {
  let semester: any;
  let otherSemester: any;
  let course: any;
  let note: any;
  let ownedNote: any;
  let owner: any;

  beforeAll(async () => {
    semester = await prisma.semester.create({
      data: {
        name: 'Nav Test Semester',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
      },
    });
    otherSemester = await prisma.semester.create({
      data: {
        name: 'Nav Test Other Semester',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-12-31'),
      },
    });
    course = await prisma.course.create({
      data: {
        code: 'NAV101',
        title: 'Navigation Course',
        credits: 3,
        semesterId: semester.id,
      },
    });

    owner =
      (await prisma.user.findFirst()) ||
      (await prisma.user.create({
        data: {
          email: 'navtest@scholarflow.local',
          name: 'Nav Tester',
          role: 'STUDENT',
          accountType: 'REGULAR',
          status: 'ACTIVE',
        },
      }));
  });

  afterAll(async () => {
    const ids = [note?.id, ownedNote?.id].filter(Boolean);
    if (ids.length) {
      await prisma.noteRevision.deleteMany({ where: { noteId: { in: ids } } });
      await prisma.noteLink.deleteMany({
        where: { OR: [{ sourceNoteId: { in: ids } }, { targetNoteId: { in: ids } }] },
      });
      await prisma.note.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.course.deleteMany({ where: { id: course?.id } });
    await prisma.semester.deleteMany({ where: { id: { in: [semester?.id, otherSemester?.id] } } });
  });

  describe('route parameter resolution', () => {
    it('treats the first segment of /semesters/:id/notes/:noteId as the SEMESTER id', () => {
      const resolution = resolveNoteRoute(
        '/semesters/sem-123/notes/note-999',
        { id: 'sem-123', noteId: 'note-999' },
        new URLSearchParams()
      );
      expect(resolution.isSemesterScoped).toBe(true);
      expect(resolution.routeSemesterId).toBe('sem-123');
      // The note id must be `note-999`, NOT the semester id.
      expect(resolution.requestedNoteId).toBe('note-999');
    });

    it('resolves /notes/:id to the note id', () => {
      const resolution = resolveNoteRoute('/notes/note-abc', { id: 'note-abc' }, null);
      expect(resolution.isSemesterScoped).toBe(false);
      expect(resolution.routeSemesterId).toBeUndefined();
      expect(resolution.requestedNoteId).toBe('note-abc');
    });

    it('resolves the ?id= query fallback used by dashboard/course deep links', () => {
      const resolution = resolveNoteRoute(
        '/notes',
        {},
        new URLSearchParams('id=note-query')
      );
      expect(resolution.requestedNoteId).toBe('note-query');
    });
  });

  describe('note detail API', () => {
    it('creates a note and fetches the exact same record by id', async () => {
      const createRes = await request(app)
        .post('/api/notes')
        .send({
          title: 'Lecture 1',
          content: '<p>Persisted body</p>',
          semesterId: semester.id,
          courseId: course.id,
        });

      expect(createRes.status).toBe(201);
      note = createRes.body.data;

      const detailRes = await request(app).get(`/api/notes/${note.id}`);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.id).toBe(note.id);
      expect(detailRes.body.data.title).toBe('Lecture 1');
      expect(detailRes.body.data.content).toBe('<p>Persisted body</p>');
      expect(detailRes.body.data.semesterId).toBe(semester.id);
      expect(detailRes.body.data.courseId).toBe(course.id);
    });

    it('returns the note from the list query scoped to the same semester', async () => {
      const listRes = await request(app).get(`/api/notes?semesterId=${semester.id}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.some((n: any) => n.id === note.id)).toBe(true);
    });

    it('does NOT return the note when filtering by a different semester', async () => {
      const listRes = await request(app).get(`/api/notes?semesterId=${otherSemester.id}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.some((n: any) => n.id === note.id)).toBe(false);
    });

    it('returns 404 for a genuinely missing note (never a silent success)', async () => {
      const res = await request(app).get('/api/notes/does-not-exist-000');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('keeps an archived note retrievable by id but filtered from the active list', async () => {
      const archiveRes = await request(app).patch(`/api/notes/${note.id}/archive`);
      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body.data.isArchived).toBe(true);

      const detailRes = await request(app).get(`/api/notes/${note.id}`);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.isArchived).toBe(true);

      const activeList = await request(app).get(`/api/notes?semesterId=${semester.id}`);
      expect(activeList.body.data.some((n: any) => n.id === note.id)).toBe(false);

      const archivedList = await request(app).get(
        `/api/notes?semesterId=${semester.id}&isArchived=true`
      );
      expect(archivedList.body.data.some((n: any) => n.id === note.id)).toBe(true);

      // restore for cleanliness
      await request(app).patch(`/api/notes/${note.id}/archive`);
    });

    it('enforces ownership: a private note is hidden from other/guest users', async () => {
      ownedNote = await prisma.note.create({
        data: {
          title: 'Private Owned Note',
          content: '<p>secret</p>',
          userId: owner.id,
          semesterId: semester.id,
        },
      });

      const guestRes = await request(app).get(`/api/notes/${ownedNote.id}`);
      expect(guestRes.status).toBe(403);
      expect(guestRes.body.success).toBe(false);

      const token = jwt.sign({ id: owner.id, email: owner.email }, JWT_SECRET, {
        expiresIn: '1h',
      });
      const ownerRes = await request(app)
        .get(`/api/notes/${ownedNote.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(ownerRes.status).toBe(200);
      expect(ownerRes.body.data.id).toBe(ownedNote.id);
    });
  });
});
