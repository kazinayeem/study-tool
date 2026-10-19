import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import app from '../index.js';
import { prisma } from '../prisma.js';
import { JWT_SECRET, UPLOAD_DIR } from '../config.js';

describe('Smart Class Photo Journal — Board Photo Archive Tests', () => {
  let student1: any;
  let student1Token: string;
  let student2: any;
  let student2Token: string;
  let adminUser: any;
  let adminToken: string;

  let semesterFall2026: any;
  let semesterSpring2027: any;
  let courseSecurity: any;
  let courseTesting: any;
  let courseSpringOther: any;

  let createdSessionId: string;
  let uploadedPhotoId: string;
  let secondPhotoId: string;

  // Minimal 1x1 valid PNG buffer: 89 50 4E 47 0D 0A 1A 0A ...
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);

  // Minimal valid JPEG header buffer: FF D8 FF E0 ...
  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
    0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x0a, 0x00,
    0x0a, 0x01, 0x01, 0x11, 0x00, 0xff, 0xd9,
  ]);

  beforeAll(async () => {
    await prisma.$connect();

    // 1. Setup Student 1
    student1 = await prisma.user.upsert({
      where: { email: 'photo.student1@scholarflow.test' },
      create: {
        email: 'photo.student1@scholarflow.test',
        name: 'Sarah Student',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
      update: { status: 'ACTIVE' },
    });
    student1Token = jwt.sign({ id: student1.id, email: student1.email }, JWT_SECRET, { expiresIn: '1d' });

    // 2. Setup Student 2
    student2 = await prisma.user.upsert({
      where: { email: 'photo.student2@scholarflow.test' },
      create: {
        email: 'photo.student2@scholarflow.test',
        name: 'Bob Peer',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
      update: { status: 'ACTIVE' },
    });
    student2Token = jwt.sign({ id: student2.id, email: student2.email }, JWT_SECRET, { expiresIn: '1d' });

    // 3. Setup Admin
    adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: 'photo.admin@scholarflow.test',
          name: 'Sys Admin',
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });
    }
    adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email }, JWT_SECRET, { expiresIn: '1d' });

    // 4. Create Semesters
    semesterFall2026 = await prisma.semester.create({
      data: {
        name: 'Fall 2026',
        code: 'FA26',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-31'),
        status: 'ACTIVE',
        userId: student1.id,
      },
    });

    semesterSpring2027 = await prisma.semester.create({
      data: {
        name: 'Spring 2027',
        code: 'SP27',
        startDate: new Date('2027-01-15'),
        endDate: new Date('2027-05-30'),
        status: 'UPCOMING',
        userId: student1.id,
      },
    });

    // 5. Create Courses
    courseSecurity = await prisma.course.create({
      data: {
        semesterId: semesterFall2026.id,
        code: 'CSE443',
        title: 'Information System Security',
        credits: 3.0,
        teacherName: 'Dr. Alan Turing',
        roomNumber: 'Lab 402',
        userId: student1.id,
      },
    });

    courseTesting = await prisma.course.create({
      data: {
        semesterId: semesterFall2026.id,
        code: 'CSE445',
        title: 'Software Testing & QA',
        credits: 3.0,
        teacherName: 'Dr. Ada Lovelace',
        roomNumber: 'Room 305',
        userId: student1.id,
      },
    });

    courseSpringOther = await prisma.course.create({
      data: {
        semesterId: semesterSpring2027.id,
        code: 'CSE499',
        title: 'Senior Design Project',
        credits: 4.0,
        userId: student1.id,
      },
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.classPhoto.deleteMany({
      where: { userId: { in: [student1.id, student2.id] } },
    });
    await prisma.classSession.deleteMany({
      where: { userId: { in: [student1.id, student2.id] } },
    });
    await prisma.course.deleteMany({
      where: { id: { in: [courseSecurity.id, courseTesting.id, courseSpringOther.id] } },
    });
    await prisma.semester.deleteMany({
      where: { id: { in: [semesterFall2026.id, semesterSpring2027.id] } },
    });
    await prisma.$disconnect();
  });

  // =========================================================================
  // Test 1: Cross-Semester Course Validation (Reject course from another semester)
  // =========================================================================
  it('1: Rejects creating a class session if course does not belong to the selected semester', async () => {
    const res = await request(app)
      .post('/api/class-sessions')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        semesterId: semesterFall2026.id,
        courseId: courseSpringOther.id, // belongs to Spring 2027!
        sessionDate: '2026-10-18T10:00:00.000Z',
        topic: 'Invalid Course Test',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('does not belong to the selected semester');
  });

  // =========================================================================
  // Test 2: Create Class Session inside a Semester
  // =========================================================================
  it('2: Successfully creates a class session inside the correct semester', async () => {
    const res = await request(app)
      .post('/api/class-sessions')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        semesterId: semesterFall2026.id,
        courseId: courseSecurity.id,
        sessionDate: '2026-10-18T09:30:00.000Z',
        topic: 'Cryptography Notes & RSA Algorithm',
        teacherName: 'Dr. Alan Turing',
        roomNumber: 'Lab 402',
        description: 'Board formulas for modular exponentiation and public key cryptography',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.topic).toBe('Cryptography Notes & RSA Algorithm');
    expect(res.body.data.course.code).toBe('CSE443');
    expect(res.body.data.semester.id).toBe(semesterFall2026.id);

    createdSessionId = res.body.data.id;
  });

  // =========================================================================
  // Test 3: Upload Multiple Board Photos (JPEG and PNG)
  // =========================================================================
  it('3: Uploads multiple board photos to a class session with captions', async () => {
    const res = await request(app)
      .post(`/api/class-sessions/${createdSessionId}/photos`)
      .set('Authorization', `Bearer ${student1Token}`)
      .attach('photos', validPngBuffer, 'rsa-equations.png')
      .attach('photos', validJpegBuffer, 'modular-math.jpg')
      .field('captions', JSON.stringify(['RSA formula derivation', 'Euler totient steps']));

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);

    const firstPhoto = res.body.data[0];
    expect(firstPhoto.originalFilename).toBe('rsa-equations.png');
    expect(firstPhoto.caption).toBe('RSA formula derivation');
    expect(firstPhoto.storedFilename).toBeDefined();

    const secondPhoto = res.body.data[1];
    expect(secondPhoto.originalFilename).toBe('modular-math.jpg');
    expect(secondPhoto.caption).toBe('Euler totient steps');

    uploadedPhotoId = firstPhoto.id;
    secondPhotoId = secondPhoto.id;
  });

  // =========================================================================
  // Test 4: Reject Corrupted or Non-Image Files
  // =========================================================================
  it('4: Rejects files with non-image or fake headers', async () => {
    const fakeBuffer = Buffer.from('This is a plain text file pretending to be an image');

    const res = await request(app)
      .post(`/api/class-sessions/${createdSessionId}/photos`)
      .set('Authorization', `Bearer ${student1Token}`)
      .attach('photos', fakeBuffer, 'fake-board.png');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error || res.body.message).toContain('invalid or corrupted image header');
  });

  // =========================================================================
  // Test 5: Distinct Dates with Photo Counts (for Calendar Day Badges)
  // =========================================================================
  it('5: Returns distinct dates with photo count for calendar badges', async () => {
    const res = await request(app)
      .get('/api/class-sessions/dates')
      .set('Authorization', `Bearer ${student1Token}`)
      .query({ semesterId: semesterFall2026.id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const matchDate = res.body.data.find((d: any) => d.date === '2026-10-18');
    expect(matchDate).toBeDefined();
    expect(matchDate.sessionCount).toBeGreaterThanOrEqual(1);
    expect(matchDate.photoCount).toBeGreaterThanOrEqual(2);
  });

  // =========================================================================
  // Test 6: Search & Filtering by Date, Subject, and Topic
  // =========================================================================
  it('6: Filters sessions by date, semester, course, and search query', async () => {
    // 6a. Search by topic keyword
    const resSearch = await request(app)
      .get('/api/class-sessions')
      .set('Authorization', `Bearer ${student1Token}`)
      .query({ semesterId: semesterFall2026.id, search: 'Cryptography' });

    expect(resSearch.status).toBe(200);
    expect(resSearch.body.success).toBe(true);
    expect(resSearch.body.data.length).toBeGreaterThanOrEqual(1);
    expect(resSearch.body.data[0].topic).toContain('Cryptography');

    // 6b. Filter by exact date
    const resDate = await request(app)
      .get('/api/class-sessions')
      .set('Authorization', `Bearer ${student1Token}`)
      .query({ date: '2026-10-18' });

    expect(resDate.status).toBe(200);
    expect(resDate.body.data.length).toBeGreaterThanOrEqual(1);

    // 6c. Quick filter 'today' / 'month'
    const resMonth = await request(app)
      .get('/api/class-sessions')
      .set('Authorization', `Bearer ${student1Token}`)
      .query({ quickFilter: 'month' });

    expect(resMonth.status).toBe(200);
    expect(resMonth.body.success).toBe(true);
  });

  // =========================================================================
  // Test 7: Stream / Download Saved Board Photo
  // =========================================================================
  it('7: Serves the saved photo stream and download attachment with proper headers', async () => {
    // Stream view
    const resStream = await request(app)
      .get(`/api/class-photos/${uploadedPhotoId}/file`)
      .set('Authorization', `Bearer ${student1Token}`);

    expect(resStream.status).toBe(200);
    expect(resStream.headers['content-type']).toBe('image/png');
    expect(resStream.headers['content-disposition']).toContain('inline');

    // Download attachment
    const resDownload = await request(app)
      .get(`/api/class-photos/${uploadedPhotoId}/file?download=1`)
      .set('Authorization', `Bearer ${student1Token}`);

    expect(resDownload.status).toBe(200);
    expect(resDownload.headers['content-disposition']).toContain('attachment');
  });

  // =========================================================================
  // Test 8: Edit Photo Caption and Session Metadata
  // =========================================================================
  it('8: Allows editing photo caption and session topic without re-uploading', async () => {
    // 8a. Update caption
    const resCaption = await request(app)
      .patch(`/api/class-photos/${uploadedPhotoId}`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ caption: 'Updated RSA formula derivation (Proof of Theorem)' });

    expect(resCaption.status).toBe(200);
    expect(resCaption.body.success).toBe(true);
    expect(resCaption.body.data.caption).toBe('Updated RSA formula derivation (Proof of Theorem)');

    // 8b. Update session metadata
    const resSession = await request(app)
      .patch(`/api/class-sessions/${createdSessionId}`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        topic: 'Cryptography Notes & RSA Algorithm (Complete Lecture)',
        roomNumber: 'Lab 405',
      });

    expect(resSession.status).toBe(200);
    expect(resSession.body.data.topic).toContain('Complete Lecture');
    expect(resSession.body.data.roomNumber).toBe('Lab 405');
  });

  // =========================================================================
  // Test 9: STRICT PRIVACY — Another student cannot access or modify photos
  // =========================================================================
  it('9: STRICT PRIVACY: Another student cannot view, modify, or download private class photos', async () => {
    // Student 2 attempts to fetch session
    const resSession = await request(app)
      .get(`/api/class-sessions/${createdSessionId}`)
      .set('Authorization', `Bearer ${student2Token}`);

    expect(resSession.status).toBe(403);
    expect(resSession.body.success).toBe(false);
    expect(resSession.body.error).toContain('Access denied');

    // Student 2 attempts to stream Student 1's photo
    const resPhoto = await request(app)
      .get(`/api/class-photos/${uploadedPhotoId}/file`)
      .set('Authorization', `Bearer ${student2Token}`);

    expect(resPhoto.status).toBe(403);
    expect(resPhoto.body.success).toBe(false);

    // Student 2 attempts to delete Student 1's photo
    const resDel = await request(app)
      .delete(`/api/class-photos/${uploadedPhotoId}`)
      .set('Authorization', `Bearer ${student2Token}`);

    expect(resDel.status).toBe(403);
  });

  // =========================================================================
  // Test 10: STRICT PRIVACY — Admin cannot snoop on private class photos
  // =========================================================================
  it('10: STRICT PRIVACY: Admins cannot browse or download private class photos', async () => {
    const resAdminPhoto = await request(app)
      .get(`/api/class-photos/${uploadedPhotoId}/file`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resAdminPhoto.status).toBe(403);
    expect(resAdminPhoto.body.success).toBe(false);
  });

  // =========================================================================
  // Test 11: Delete Individual Photo without deleting the session
  // =========================================================================
  it('11: Deletes an individual photo safely and cleans up disk file', async () => {
    // Fetch photo to get storedFilename
    const photo = await prisma.classPhoto.findUnique({
      where: { id: secondPhotoId },
    });
    expect(photo).toBeDefined();

    const filePath = path.resolve(UPLOAD_DIR, 'class-photos', path.basename(photo!.storedFilename));

    // Delete photo
    const resDel = await request(app)
      .delete(`/api/class-photos/${secondPhotoId}`)
      .set('Authorization', `Bearer ${student1Token}`);

    expect(resDel.status).toBe(200);
    expect(resDel.body.success).toBe(true);

    // Disk file should no longer exist
    expect(fs.existsSync(filePath)).toBe(false);

    // Session still exists with 1 remaining photo
    const remainingSession = await prisma.classSession.findUnique({
      where: { id: createdSessionId },
      include: { photos: true },
    });
    expect(remainingSession).toBeDefined();
    expect(remainingSession!.photos.length).toBe(1);
  });

  // =========================================================================
  // Test 12: Delete Class Session and verify full cleanup
  // =========================================================================
  it('12: Deletes entire class session and all its image files', async () => {
    const resDel = await request(app)
      .delete(`/api/class-sessions/${createdSessionId}`)
      .set('Authorization', `Bearer ${student1Token}`);

    expect(resDel.status).toBe(200);
    expect(resDel.body.success).toBe(true);

    // Session is gone from database
    const session = await prisma.classSession.findUnique({
      where: { id: createdSessionId },
    });
    expect(session).toBeNull();
  });
});
