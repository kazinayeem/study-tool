import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import app from '../index.js';
import { prisma } from '../prisma.js';
import { JWT_SECRET } from '../config.js';

const PDF_BYTES = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n',
  'utf8'
);

/**
 * Regression coverage for the course-scoped document upload flow used by the
 * Course Details page (in-page upload, no navigation to /documents).
 */
describe('Course-scoped document upload', () => {
  const stamp = Date.now();
  let ownerId = '';
  let ownerToken = '';
  let otherId = '';
  let otherToken = '';
  let semesterId = '';
  let otherSemesterId = '';
  let courseId = '';
  let uploadedDocId = '';
  const createdDocIds: string[] = [];

  const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const owner = await prisma.user.create({
      data: {
        email: `course.docs.owner.${stamp}@scholarflow.test`,
        name: 'Course Docs Owner',
        role: 'ADMIN',
        status: 'ACTIVE',
        accountType: 'REGULAR',
      },
    });
    ownerId = owner.id;
    ownerToken = jwt.sign({ id: owner.id, email: owner.email }, JWT_SECRET, { expiresIn: '1d' });

    const other = await prisma.user.create({
      data: {
        email: `course.docs.other.${stamp}@scholarflow.test`,
        name: 'Course Docs Other',
        role: 'STUDENT',
        status: 'ACTIVE',
        accountType: 'REGULAR',
      },
    });
    otherId = other.id;
    otherToken = jwt.sign({ id: other.id, email: other.email }, JWT_SECRET, { expiresIn: '1d' });

    const semester = await prisma.semester.create({
      data: {
        name: `Course Docs Semester ${stamp}`,
        code: 'CD1',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-31'),
        status: 'ACTIVE',
        userId: owner.id,
      },
    });
    semesterId = semester.id;

    const otherSemester = await prisma.semester.create({
      data: {
        name: `Course Docs Other Semester ${stamp}`,
        code: 'CD2',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-31'),
        status: 'ACTIVE',
        userId: owner.id,
      },
    });
    otherSemesterId = otherSemester.id;

    const course = await prisma.course.create({
      data: {
        semesterId,
        userId: owner.id,
        code: `CD${stamp.toString().slice(-4)}`,
        title: 'Course Document Uploads',
        credits: 3,
      },
    });
    courseId = course.id;
  });

  afterAll(async () => {
    // Remove documents + their files from disk
    for (const docId of createdDocIds) {
      const doc = await prisma.document.findUnique({ where: { id: docId } });
      if (doc?.filePath && fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }
      await prisma.document.delete({ where: { id: docId } }).catch(() => undefined);
    }

    await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
    await prisma.semester.delete({ where: { id: semesterId } }).catch(() => undefined);
    await prisma.semester.delete({ where: { id: otherSemesterId } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: ownerId } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: otherId } }).catch(() => undefined);
  });

  it('uploads a PDF directly into the course and links it to the correct course + semester', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set(authHeader(ownerToken))
      .field('courseId', courseId)
      .field('title', 'Lecture 1 - Intro')
      .field('category', 'Lecture Notes')
      .attach('file', PDF_BYTES, { filename: 'lecture-1.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.courseId).toBe(courseId);
    expect(res.body.data.semesterId).toBe(semesterId);
    expect(res.body.data.title).toBe('Lecture 1 - Intro');
    expect(res.body.data.isPdf).toBe(true);

    uploadedDocId = res.body.data.id;
    createdDocIds.push(uploadedDocId);
  });

  it('serves the uploaded PDF bytes back through the file endpoint', async () => {
    const res = await request(app)
      .get(`/api/documents/${uploadedDocId}/file`)
      .set(authHeader(ownerToken))
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('pdf');
    const body = res.body as Buffer;
    expect(Buffer.isBuffer(body)).toBe(true);
    expect(body.length).toBe(PDF_BYTES.length);
  });

  it('rejects a document whose semester does not match the course', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set(authHeader(ownerToken))
      .field('courseId', courseId)
      .field('semesterId', otherSemesterId)
      .attach('file', PDF_BYTES, { filename: 'mismatch.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects unsupported file types', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set(authHeader(ownerToken))
      .field('courseId', courseId)
      .attach('file', Buffer.from('MZ binary junk'), {
        filename: 'malware.exe',
        contentType: 'application/octet-stream',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('allows the course owner to upload but blocks other users', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set(authHeader(otherToken))
      .field('courseId', courseId)
      .attach('file', PDF_BYTES, { filename: 'stolen.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('rejects files larger than the configured maximum size', async () => {
    const oversized = Buffer.alloc(51 * 1024 * 1024, 1);
    const res = await request(app)
      .post('/api/documents/upload')
      .set(authHeader(ownerToken))
      .field('courseId', courseId)
      .attach('file', oversized, { filename: 'huge.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
