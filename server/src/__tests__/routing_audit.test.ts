import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';

describe('BornoFlow Routing & API Architecture Audit', () => {
  it('1. GET /api/health returns 200 with service health payload', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toContain('Personal Student Management System');
  });

  it('2. Unmatched API route returns 404 JSON with structured error message (never HTML)', async () => {
    const res = await request(app).get('/api/non-existent-subpath-999');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: 'Endpoint not found',
      path: '/api/non-existent-subpath-999',
    });
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('3. GET /api/semesters returns active semesters list', async () => {
    const res = await request(app).get('/api/semesters');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('4. GET /api/semesters/:id with invalid ID returns 404', async () => {
    const res = await request(app).get('/api/semesters/non-existent-uuid-12345');
    expect(res.status).toBe(404);
  });

  it('5. GET /api/courses with semesterId query filter executes successfully', async () => {
    const semestersRes = await request(app).get('/api/semesters');
    const firstSem = semestersRes.body.data[0];
    const res = await request(app).get(`/api/courses?semesterId=${firstSem ? firstSem.id : 'fake'}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('6. GET /api/courses/:id with invalid ID returns null or 404 without crashing', async () => {
    const res = await request(app).get('/api/courses/non-existent-uuid-99999');
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data).toBeNull();
    }
  });

  it('7. GET /api/notes/:id/export/docx with non-existent note returns 404', async () => {
    const res = await request(app).get('/api/notes/non-existent-uuid-note/export/docx');
    expect(res.status).toBe(404);
  });

  it('8. GET /api/admin/overview enforces authentication and authorization (401 or 403 for guest)', async () => {
    const res = await request(app).get('/api/admin/overview');
    expect([401, 403]).toContain(res.status);
  });

  it('9. GET /api/share/:token with invalid token returns 404', async () => {
    const res = await request(app).get('/api/share/invalid-token-xyz-123');
    expect(res.status).toBe(404);
  });

  it('10. GET /api/admin/users requires authentication and admin authorization', async () => {
    const res = await request(app).get('/api/admin/users');
    expect([401, 403]).toContain(res.status);
  });
});
