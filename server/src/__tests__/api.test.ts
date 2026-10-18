import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { prisma } from '../prisma.js';

describe('Personal Student Management System API Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect();
  });

  it('GET /api/health should return ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('Personal Student Management System API');
  });

  it('GET /api/semesters should return list of semesters with courses', async () => {
    const res = await request(app).get('/api/semesters');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const fall2026 = res.body.data.find((s: any) => s.name === 'Fall 2026');
    expect(fall2026).toBeDefined();
    expect(fall2026.status).toBe('ACTIVE');
  });

  it('POST /api/semesters should validate required fields', async () => {
    const res = await request(app).post('/api/semesters').send({
      name: '',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/semesters/:id/duplicate should duplicate structure without files', async () => {
    const semesters = await prisma.semester.findMany();
    const original = semesters[0];

    const res = await request(app)
      .post(`/api/semesters/${original.id}/duplicate`)
      .send({
        newName: 'Fall 2026 Structured Clone',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Fall 2026 Structured Clone');
    expect(res.body.data.courses.length).toBeGreaterThanOrEqual(1);

    // Clean up duplicated test semester
    await prisma.semester.delete({ where: { id: res.body.data.id } });
  });

  it('GET /api/documents should return documents with metadata', async () => {
    const res = await request(app).get('/api/documents');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const doc = res.body.data[0];
    expect(doc.storedFilename).toBeDefined();
    expect(doc.isPdf).toBe(true);
  });

  it('GET /api/notes and autosave conflict prevention', async () => {
    // 1. Create a note
    const createRes = await request(app).post('/api/notes').send({
      title: 'Operating Systems Virtual Memory',
      content: '<p>Paging and TLB caches.</p>',
    });
    expect(createRes.status).toBe(201);
    const noteId = createRes.body.data.id;
    const initialVersion = createRes.body.data.version;

    // 2. Successful update with expected version
    const updateRes = await request(app).put(`/api/notes/${noteId}`).send({
      title: 'Operating Systems Virtual Memory (Updated)',
      content: '<p>Updated with Multi-level page tables.</p>',
      expectedVersion: initialVersion,
    });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.version).toBe(initialVersion + 1);

    // 3. Stale update attempt should trigger 409 Conflict
    const staleRes = await request(app).put(`/api/notes/${noteId}`).send({
      title: 'Stale Overwrite Attempt',
      expectedVersion: initialVersion, // Old version
    });
    expect(staleRes.status).toBe(409);
    expect(staleRes.body.success).toBe(false);

    // Cleanup
    await prisma.note.delete({ where: { id: noteId } });
  });

  it('GET /api/dashboard should compute real database statistics', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stats.totalSemesters).toBeGreaterThanOrEqual(1);
    expect(res.body.data.stats.totalCourses).toBeGreaterThanOrEqual(1);
    expect(res.body.data.upcomingExams).toBeDefined();
    expect(res.body.data.upcomingAssignments).toBeDefined();
  });

  it('GET /api/search should return cross-entity matches', async () => {
    const res = await request(app).get('/api/search?q=Security');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.courses.length).toBeGreaterThanOrEqual(1);
  });
});
