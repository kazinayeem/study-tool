import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import app from '../index.js';
import { prisma } from '../prisma.js';
import { UPLOAD_DIR } from '../config.js';

// Minimal, structurally-valid PDF header + EOF marker used for binary serving tests.
const PDF_BYTES = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n',
  'utf-8'
);

describe('Document binary file serving', () => {
  let ownerToken: string;
  let pdfDocId: string;
  let imageDocId: string;
  let missingDocId: string;
  const pdfFilename = `test_serving_${Date.now()}.pdf`;
  const imageFilename = `test_serving_${Date.now()}.png`;
  const pngBytes = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8cfc0f01f0005000100ff9d6d1c0000000049454e44ae426082',
    'hex'
  );

  beforeAll(async () => {
    await prisma.$connect();

    await request(app).get('/api/auth/status');
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'owner@scholarflow.local',
      password: 'Password123!',
    });
    expect(loginRes.status).toBe(200);
    ownerToken = loginRes.body.data.token;

    fs.writeFileSync(path.resolve(UPLOAD_DIR, pdfFilename), PDF_BYTES);
    fs.writeFileSync(path.resolve(UPLOAD_DIR, imageFilename), pngBytes);

    const pdfDoc = await prisma.document.create({
      data: {
        title: 'Serving Test PDF',
        originalFilename: 'serving-test.pdf',
        storedFilename: pdfFilename,
        filePath: path.resolve(UPLOAD_DIR, pdfFilename),
        mimeType: 'application/pdf',
        fileSize: PDF_BYTES.length,
        isPdf: true,
        visibility: 'PRIVATE',
      },
    });
    pdfDocId = pdfDoc.id;

    const imageDoc = await prisma.document.create({
      data: {
        title: 'Serving Test Image',
        originalFilename: 'serving-test.png',
        storedFilename: imageFilename,
        filePath: path.resolve(UPLOAD_DIR, imageFilename),
        mimeType: 'image/png',
        fileSize: pngBytes.length,
        isPdf: false,
        visibility: 'PRIVATE',
      },
    });
    imageDocId = imageDoc.id;

    const missingDoc = await prisma.document.create({
      data: {
        title: 'Serving Test Missing File',
        originalFilename: 'missing.pdf',
        storedFilename: `does_not_exist_${Date.now()}.pdf`,
        filePath: path.resolve(UPLOAD_DIR, `does_not_exist_${Date.now()}.pdf`),
        mimeType: 'application/pdf',
        fileSize: 10,
        isPdf: true,
        visibility: 'PRIVATE',
      },
    });
    missingDocId = missingDoc.id;
  });

  afterAll(async () => {
    for (const id of [pdfDocId, imageDocId, missingDocId]) {
      if (id) await prisma.document.delete({ where: { id } }).catch(() => {});
    }
    for (const file of [pdfFilename, imageFilename]) {
      const full = path.resolve(UPLOAD_DIR, file);
      if (fs.existsSync(full)) fs.unlinkSync(full);
    }
  });

  it('returns the original PDF bytes with the correct content type', async () => {
    const res = await request(app)
      .get(`/api/documents/${pdfDocId}/file`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c) => chunks.push(c as Buffer));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('inline');
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.subarray(0, 5).toString('utf-8')).toBe('%PDF-');
    expect(res.body.length).toBe(PDF_BYTES.length);
    expect(res.body.equals(PDF_BYTES)).toBe(true);
  });

  it('returns the original image bytes with an image content type', async () => {
    const res = await request(app)
      .get(`/api/documents/${imageDocId}/file`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c) => chunks.push(c as Buffer));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/png');
    expect(res.body.equals(pngBytes)).toBe(true);
  });

  it('supports HTTP range requests with 206 partial content', async () => {
    const res = await request(app)
      .get(`/api/documents/${pdfDocId}/file`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('Range', 'bytes=0-3')
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c) => chunks.push(c as Buffer));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe(`bytes 0-3/${PDF_BYTES.length}`);
    expect(res.body.toString('utf-8')).toBe('%PDF');
  });

  it('does not expose private files to unauthenticated requests', async () => {
    const res = await request(app).get(`/api/documents/${pdfDocId}/file`);
    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body.success).toBe(false);
  });

  it('returns 404 (not JSON 200) when the file is missing from storage', async () => {
    const res = await request(app)
      .get(`/api/documents/${missingDocId}/file`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body.success).toBe(false);
  });

  it('downloads the file as an attachment', async () => {
    const res = await request(app)
      .get(`/api/documents/${pdfDocId}/download`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');
  });
});
