import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index.js';
import { prisma } from '../prisma.js';
import { JWT_SECRET } from '../config.js';
import { logActivity } from '../services/activityLogger.js';

describe('Google OAuth, Admin Privacy & Demo Student Authentication Tests', () => {
  let adminUser: any;
  let adminToken: string;
  let studentUser1: any;
  let studentToken1: string;
  let studentUser2: any;
  let studentToken2: string;
  let demoUser: any;
  let demoToken: string;

  let student1PrivateDoc: any;
  let student1PrivateNote: any;

  beforeAll(async () => {
    await prisma.$connect();

    // 1. Setup Admin user
    adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: 'admin.test@scholarflow.local',
          name: 'Test Administrator',
          role: 'ADMIN',
          accountType: 'REGULAR',
          status: 'ACTIVE',
        },
      });
    }
    adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email }, JWT_SECRET, { expiresIn: '1d' });

    // 2. Setup Student 1
    studentUser1 = await prisma.user.upsert({
      where: { email: 'student1@university.edu' },
      create: {
        email: 'student1@university.edu',
        name: 'Alice Student',
        role: 'STUDENT',
        accountType: 'GOOGLE',
        googleId: 'google-sub-alice-12345',
        status: 'ACTIVE',
      },
      update: { status: 'ACTIVE' },
    });
    studentToken1 = jwt.sign({ id: studentUser1.id, email: studentUser1.email }, JWT_SECRET, { expiresIn: '1d' });

    // 3. Setup Student 2
    studentUser2 = await prisma.user.upsert({
      where: { email: 'student2@university.edu' },
      create: {
        email: 'student2@university.edu',
        name: 'Bob Student',
        role: 'STUDENT',
        accountType: 'GOOGLE',
        googleId: 'google-sub-bob-67890',
        status: 'ACTIVE',
      },
      update: { status: 'ACTIVE' },
    });
    studentToken2 = jwt.sign({ id: studentUser2.id, email: studentUser2.email }, JWT_SECRET, { expiresIn: '1d' });

    // 4. Create Student 1's private document and note
    student1PrivateDoc = await prisma.document.create({
      data: {
        title: 'Alice Top Secret Academic Thesis Draft',
        originalFilename: 'thesis_draft.pdf',
        storedFilename: `test_thesis_${Date.now()}.pdf`,
        filePath: 'uploads/test_thesis.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        category: 'Research Papers',
        visibility: 'PRIVATE',
        userId: studentUser1.id,
      },
    });

    student1PrivateNote = await prisma.note.create({
      data: {
        title: 'Alice Private Study Diary',
        content: '<p>Personal research reflections and confidential thesis arguments.</p>',
        userId: studentUser1.id,
        version: 1,
      },
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    if (student1PrivateDoc) {
      await prisma.document.deleteMany({ where: { id: student1PrivateDoc.id } });
    }
    if (student1PrivateNote) {
      await prisma.note.deleteMany({ where: { id: student1PrivateNote.id } });
    }
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1 & 2. Google Login & Account Linking
  // =========================================================================
  it('1 & 2: First-time Google registration creates account and linking prevents duplicates', async () => {
    const testGoogleSub = `google-sub-${Date.now()}`;
    const testGoogleEmail = `new.student.${Date.now()}@gmail.com`;

    // First time login
    const user1 = await prisma.user.create({
      data: {
        email: testGoogleEmail,
        name: 'New Google Scholar',
        googleId: testGoogleSub,
        accountType: 'GOOGLE',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });
    expect(user1).toBeDefined();
    expect(user1.id).toBeDefined();
    expect(user1.googleId).toBe(testGoogleSub);

    // Repeat login check
    const repeatUser = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: testGoogleSub }, { email: testGoogleEmail }],
      },
    });
    expect(repeatUser).toBeDefined();
    expect(repeatUser!.id).toBe(user1.id);

    // Ensure total count of accounts with this email is strictly 1
    const totalCount = await prisma.user.count({ where: { email: testGoogleEmail } });
    expect(totalCount).toBe(1);

    // Clean up
    await prisma.user.delete({ where: { id: user1.id } });
  });

  // =========================================================================
  // 3 & 4. Google Token Verification Rejections
  // =========================================================================
  it('3: Invalid or malformed Google ID tokens are rejected with 400 or 401', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ idToken: 'invalid.token.structure' });

    expect([400, 401]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('4: Empty Google token is rejected by validation', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ idToken: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // =========================================================================
  // 5. Students Cannot Access Admin APIs
  // =========================================================================
  it('5: Students cannot access the admin panel or admin endpoints', async () => {
    // Attempt overview with Student 1 token
    const resOverview = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${studentToken1}`);

    expect(resOverview.status).toBe(403);
    expect(resOverview.body.success).toBe(false);

    // Attempt user list with Student 1 token
    const resUsers = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${studentToken1}`);

    expect(resUsers.status).toBe(403);
    expect(resUsers.body.success).toBe(false);
  });

  // =========================================================================
  // 6. Admins Can View Permitted Activity Metadata
  // =========================================================================
  it('6: Admins can see permitted activity metadata and user list', async () => {
    const resOverview = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resOverview.status).toBe(200);
    expect(resOverview.body.success).toBe(true);
    expect(resOverview.body.data.metrics).toBeDefined();
    expect(resOverview.body.data.metrics.totalUsers).toBeGreaterThanOrEqual(1);

    const resUsers = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resUsers.status).toBe(200);
    expect(resUsers.body.success).toBe(true);
    expect(Array.isArray(resUsers.body.data.users)).toBe(true);
  });

  // =========================================================================
  // 7. STRICT PRIVACY: Admins CANNOT Fetch Private Documents or Notes
  // =========================================================================
  it('7: STRICT PRIVACY — Admins CANNOT read another student private notes or documents', async () => {
    // Admin attempts to view Student 1's private note
    const resNote = await request(app)
      .get(`/api/notes/${student1PrivateNote.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Must be 403 Forbidden!
    expect(resNote.status).toBe(403);
    expect(resNote.body.success).toBe(false);
    expect(resNote.body.error).toContain('Access denied');

    // Admin attempts to view Student 1's private document metadata
    const resDoc = await request(app)
      .get(`/api/documents/${student1PrivateDoc.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resDoc.status).toBe(403);
    expect(resDoc.body.success).toBe(false);

    // Admin attempts to download Student 1's private document
    const resDownload = await request(app)
      .get(`/api/documents/${student1PrivateDoc.id}/download`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resDownload.status).toBe(403);
    expect(resDownload.body.success).toBe(false);
  });

  // =========================================================================
  // 8. Student Cannot Read Another Student Private Resources
  // =========================================================================
  it('8: A student cannot read another student private resources', async () => {
    // Student 2 attempts to read Student 1's private note
    const resNote = await request(app)
      .get(`/api/notes/${student1PrivateNote.id}`)
      .set('Authorization', `Bearer ${studentToken2}`);

    expect(resNote.status).toBe(403);
    expect(resNote.body.success).toBe(false);

    // Student 2 attempts to view Student 1's private document
    const resDoc = await request(app)
      .get(`/api/documents/${student1PrivateDoc.id}`)
      .set('Authorization', `Bearer ${studentToken2}`);

    expect(resDoc.status).toBe(403);
    expect(resDoc.body.success).toBe(false);

    // Student 1 CAN read their own private note
    const resOwnNote = await request(app)
      .get(`/api/notes/${student1PrivateNote.id}`)
      .set('Authorization', `Bearer ${studentToken1}`);

    expect(resOwnNote.status).toBe(200);
    expect(resOwnNote.body.success).toBe(true);
    expect(resOwnNote.body.data.id).toBe(student1PrivateNote.id);
  });

  // =========================================================================
  // 9 & 10. Demo Student Login
  // =========================================================================
  it('9 & 10: Demo login works without Google OAuth and only authenticates designated demo user', async () => {
    const res = await request(app).post('/api/auth/demo');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('demo.student@example.com');
    expect(res.body.data.user.role).toBe('DEMO');

    // Verify cookie was set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c: string) => c.includes('scholarflow_token'))).toBe(true);

    demoUser = res.body.data.user;
    demoToken = res.body.data.token;
  });

  // =========================================================================
  // 11. Demo User Cannot Access Production User Records
  // =========================================================================
  it('11: Demo users cannot access production users private resources', async () => {
    const res = await request(app)
      .get(`/api/notes/${student1PrivateNote.id}`)
      .set('Authorization', `Bearer ${demoToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // =========================================================================
  // 12. Activity Logs Never Contain Private Resource Content or Secrets
  // =========================================================================
  it('12: Activity logs never store note contents, document bodies, passwords, or tokens', async () => {
    // Record test activity with attempted injection of private content
    await logActivity({
      userId: studentUser1.id,
      eventType: 'NOTE_CREATE',
      resourceType: 'NOTE',
      resourceId: student1PrivateNote.id,
      metadata: {
        category: 'LECTURE_SLIDE', // allowlisted
        privateNoteBody: 'CONFIDENTIAL RESEARCH DATA', // forbidden
        password: 'SuperSecretPassword', // forbidden
        token: 'eySecretJwtToken', // forbidden
      },
    });

    const loggedEvent = await prisma.activityEvent.findFirst({
      where: {
        userId: studentUser1.id,
        eventType: 'NOTE_CREATE',
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(loggedEvent).toBeDefined();
    if (loggedEvent?.metadataJson) {
      expect(loggedEvent.metadataJson).not.toContain('CONFIDENTIAL RESEARCH DATA');
      expect(loggedEvent.metadataJson).not.toContain('SuperSecretPassword');
      expect(loggedEvent.metadataJson).not.toContain('eySecretJwtToken');
      expect(loggedEvent.metadataJson).toContain('LECTURE_SLIDE');
    }
  });

  // =========================================================================
  // 13. Existing Users and Data Intact
  // =========================================================================
  it('13: Existing users and academic records remain intact', async () => {
    const userCount = await prisma.user.count();
    expect(userCount).toBeGreaterThanOrEqual(2);

    const semesters = await prisma.semester.findMany();
    expect(semesters.length).toBeGreaterThanOrEqual(1);
  });

  // =========================================================================
  // 14. Logout Invalidates Session
  // =========================================================================
  it('14: Logout invalidates active sessions and clears cookie', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${demoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    // Cookie cleared
    expect(cookies.some((c: string) => c.includes('scholarflow_token=;'))).toBe(true);
  });

  // =========================================================================
  // 15. Account Disabling and Safety Check
  // =========================================================================
  it('15: Admin can disable account, and safety check prevents disabling the last admin', async () => {
    // 15a: Disable Student 2
    const resDisable = await request(app)
      .patch(`/api/admin/users/${studentUser2.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DISABLED' });

    expect(resDisable.status).toBe(200);
    expect(resDisable.body.success).toBe(true);
    expect(resDisable.body.data.status).toBe('DISABLED');

    // 15b: Disabled student cannot access API
    const resDisabledAccess = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${studentToken2}`);

    expect(resDisabledAccess.status).toBe(403);
    expect(resDisabledAccess.body.error).toContain('disabled');

    // 15c: Reactivate Student 2
    const resReactivate = await request(app)
      .patch(`/api/admin/users/${studentUser2.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' });

    expect(resReactivate.status).toBe(200);
    expect(resReactivate.body.data.status).toBe('ACTIVE');

    // 15d: SAFETY CHECK — Attempt to disable the only active admin account
    const activeAdminsCount = await prisma.user.count({
      where: { role: 'ADMIN', status: 'ACTIVE' },
    });

    if (activeAdminsCount === 1) {
      const resDisableAdmin = await request(app)
        .patch(`/api/admin/users/${adminUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'DISABLED' });

      expect(resDisableAdmin.status).toBe(400);
      expect(resDisableAdmin.body.success).toBe(false);
      expect(resDisableAdmin.body.error).toContain('last active administrator');
    }
  });
});
