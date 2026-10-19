import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { prisma } from '../prisma.js';
import notesRouter from '../routes/notes.js';
import assignmentsRouter from '../routes/assignments.js';
import examsRouter from '../routes/exams.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { validateSemesterCourseConsistency } from '../utils/academicValidation.js';
import { buildNoteDocxDocument } from '../utils/docxExport.js';
import { Packer } from 'docx';

const app = express();
app.use(express.json());
app.use('/api/notes', notesRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/exams', examsRouter);
app.use(errorHandler);

describe('Semester -> Course Academic Data Integrity & Word Notes Integration Tests', () => {
  let testSemesterA: any;
  let testSemesterB: any;
  let testCourseA: any; // belongs to Semester A
  let testCourseB: any; // belongs to Semester B
  let testNote: any;

  beforeAll(async () => {
    // 1. Create two separate semesters
    testSemesterA = await prisma.semester.create({
      data: {
        name: 'Test Semester Alpha',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
      },
    });

    testSemesterB = await prisma.semester.create({
      data: {
        name: 'Test Semester Beta',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-12-31'),
      },
    });

    // 2. Create courses tied to specific semesters
    testCourseA = await prisma.course.create({
      data: {
        code: 'TEST-A101',
        title: 'Alpha Course',
        credits: 3,
        semesterId: testSemesterA.id,
      },
    });

    testCourseB = await prisma.course.create({
      data: {
        code: 'TEST-B202',
        title: 'Beta Course',
        credits: 3,
        semesterId: testSemesterB.id,
      },
    });
  });

  afterAll(async () => {
    if (testNote?.id) {
      await prisma.noteRevision.deleteMany({ where: { noteId: testNote.id } });
      await prisma.noteLink.deleteMany({ where: { OR: [{ sourceNoteId: testNote.id }, { targetNoteId: testNote.id }] } });
      await prisma.note.deleteMany({ where: { id: testNote.id } });
    }
    await prisma.assignment.deleteMany({ where: { courseId: { in: [testCourseA?.id, testCourseB?.id] } } });
    await prisma.exam.deleteMany({ where: { courseId: { in: [testCourseA?.id, testCourseB?.id] } } });
    await prisma.course.deleteMany({ where: { id: { in: [testCourseA?.id, testCourseB?.id] } } });
    await prisma.semester.deleteMany({ where: { id: { in: [testSemesterA?.id, testSemesterB?.id] } } });
  });

  it('1. Enforces academic integrity: Rejects note creation when course does not belong to selected semester', async () => {
    const res = await request(app)
      .post('/api/notes')
      .send({
        title: 'Incompatible Semester Course Note',
        content: '<p>Test content</p>',
        semesterId: testSemesterA.id,
        courseId: testCourseB.id, // Mismatch: Course B belongs to Semester B!
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Academic data integrity violation');
  });


  it('2. Enforces academic integrity: Successfully creates note when course matches semester', async () => {
    const res = await request(app)
      .post('/api/notes')
      .send({
        title: 'Valid Academic Note',
        content: '<h1>Title</h1><p>Content belonging to Alpha Course</p>',
        semesterId: testSemesterA.id,
        courseId: testCourseA.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.courseId).toBe(testCourseA.id);
    expect(res.body.data.semesterId).toBe(testSemesterA.id);
    testNote = res.body.data;
  });

  it('3. Supports personal notes unaffiliated with semester or course', async () => {
    const res = await request(app)
      .post('/api/notes')
      .send({
        title: 'Personal Study Plan Draft',
        content: '<p>Unlinked personal note</p>',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.semesterId).toBeNull();
    expect(res.body.data.courseId).toBeNull();

    // Clean up
    await prisma.noteRevision.deleteMany({ where: { noteId: res.body.data.id } });
    await prisma.note.delete({ where: { id: res.body.data.id } });
  });

  it('4. Auto-derives semesterId if courseId is specified without semesterId', async () => {
    const result = await validateSemesterCourseConsistency(testCourseA.id, null);
    expect(result.courseId).toBe(testCourseA.id);
    expect(result.semesterId).toBe(testSemesterA.id);
  });

  it('5. Exports note as valid Microsoft Word (.docx) document', async () => {
    const res = await request(app)
      .get(`/api/notes/${testNote.id}/export/docx`)
      .buffer(true)
      .parse((res, callback) => {
        const data: Buffer[] = [];
        res.on('data', (chunk) => data.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(data)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(res.headers['content-disposition']).toContain('.docx');
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body.length).toBeGreaterThan(1000);
  });


  it('6. Direct docx builder builds full document with tables, lists and headings', async () => {
    const doc = buildNoteDocxDocument({
      title: 'Advanced Cryptography Notes',
      courseName: 'CSE 401',
      semesterName: 'Spring 2026',
      content: `
        <h1>1. Stream Ciphers</h1>
        <p>A <strong>stream cipher</strong> encrypts pseudorandom keystreams.</p>
        <ul>
          <li>One-time pad security</li>
          <li>Chacha20 performance</li>
        </ul>
        <table>
          <tr><th>Mode</th><th>Security</th></tr>
          <tr><td>CBC</td><td>Padding Oracle vulnerable without HMAC</td></tr>
          <tr><td>GCM</td><td>AEAD secure</td></tr>
        </table>
      `,
    });
    const buffer = await Packer.toBuffer(doc);
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(2000);
  });

  it('7. Supports archiving and unarchiving notes with PATCH /api/notes/:id/archive', async () => {
    const resArchive = await request(app).patch(`/api/notes/${testNote.id}/archive`);
    expect(resArchive.status).toBe(200);
    expect(resArchive.body.data.isArchived).toBe(true);

    const resUnarchive = await request(app).patch(`/api/notes/${testNote.id}/archive`);
    expect(resUnarchive.status).toBe(200);
    expect(resUnarchive.body.data.isArchived).toBe(false);
  });
});
