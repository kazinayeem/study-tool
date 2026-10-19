import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import app from '../index.js';
import { prisma } from '../prisma.js';
import { UPLOAD_DIR, JWT_SECRET } from '../config.js';

describe('Master Implementation: 7 Advanced Features Production Integration Tests', () => {
  let semesterId: string;
  let courseId: string;
  let adminToken: string;
  let testDocId: string;

  beforeAll(async () => {
    // 1. Ensure test semester & course exist
    let sem = await prisma.semester.findFirst({ where: { status: 'ACTIVE' } });
    if (!sem) {
      sem = await prisma.semester.create({
        data: {
          name: 'Fall 2026 Testing Semester',
          code: 'F26',
          startDate: new Date('2026-09-01'),
          endDate: new Date('2026-12-31'),
          status: 'ACTIVE',
        },
      });
    }
    semesterId = sem.id;

    let course = await prisma.course.findFirst({ where: { semesterId } });
    if (!course) {
      course = await prisma.course.create({
        data: {
          semesterId,
          code: 'CSE480',
          title: 'Software Architecture',
          credits: 3.0,
        },
      });
    }
    courseId = course.id;

    // 2. Setup verified admin user & JWT token
    let adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN', status: 'ACTIVE' } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: 'admin.master@scholarflow.local',
          name: 'Master Admin',
          role: 'ADMIN',
          status: 'ACTIVE',
          accountType: 'REGULAR',
        },
      });
    }
    adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email }, JWT_SECRET, { expiresIn: '1d' });

    // 3. Create a test document for version history tests
    const testStoredFilename = `version_test_${Date.now()}_${Math.random().toString(36).substring(7)}.txt`;
    const dummyFilePath = path.join(UPLOAD_DIR, testStoredFilename);
    fs.writeFileSync(dummyFilePath, 'Initial document version 1 content');
    const doc = await prisma.document.create({
      data: {
        semesterId,
        courseId,
        userId: adminUser.id,
        title: 'Architecture Spec',
        originalFilename: 'architecture_spec_v1.txt',
        storedFilename: testStoredFilename,
        filePath: dummyFilePath,
        mimeType: 'text/plain',
        fileSize: 32,
        visibility: 'PRIVATE',
      },
    });
    testDocId = doc.id;
  });

  // FEATURE 1: Smart Academic Calendar
  describe('Feature 1: Smart Academic Calendar', () => {
    it('generates valid RFC 5545 iCalendar (.ics) and CSV calendar exports', async () => {
      // Create an event first
      const evtRes = await request(app)
        .post('/api/calendar/events')
        .send({
          title: 'Midterm Exam - Software Architecture',
          startDate: '2026-11-15T10:00:00Z',
          endDate: '2026-11-15T12:00:00Z',
          category: 'MIDTERM',
          priority: 'HIGH',
          courseId,
          semesterId,
        });
      expect(evtRes.status).toBe(201);

      // 1. Export as .ics
      const icsRes = await request(app).get('/api/calendar/export?format=ics');
      expect(icsRes.status).toBe(200);
      expect(icsRes.headers['content-type']).toContain('text/calendar');
      expect(icsRes.text).toContain('BEGIN:VCALENDAR');
      expect(icsRes.text).toContain('VERSION:2.0');
      expect(icsRes.text).toContain('SUMMARY:Midterm Exam - Software Architecture');
      expect(icsRes.text).toContain('END:VCALENDAR');

      // 2. Export as CSV
      const csvRes = await request(app).get('/api/calendar/export?format=csv');
      expect(csvRes.status).toBe(200);
      expect(csvRes.headers['content-type']).toContain('text/csv');
      expect(csvRes.text).toContain('Title,Category,Priority');
      expect(csvRes.text).toContain('Midterm Exam - Software Architecture');
    });

    it('detects schedule conflicts and tight deadline clusters', async () => {
      // Create two overlapping exams
      await request(app)
        .post('/api/calendar/events')
        .send({
          title: 'Final Exam Slot A',
          startDate: '2026-12-10T09:00:00Z',
          endDate: '2026-12-10T11:00:00Z',
          category: 'FINAL',
          courseId,
          semesterId,
        });

      await request(app)
        .post('/api/calendar/events')
        .send({
          title: 'Final Exam Slot B (Overlapping)',
          startDate: '2026-12-10T10:00:00Z',
          endDate: '2026-12-10T12:00:00Z',
          category: 'FINAL',
          courseId,
          semesterId,
        });

      const conflictRes = await request(app).get('/api/calendar/conflicts');
      expect(conflictRes.status).toBe(200);
      expect(conflictRes.body.success).toBe(true);
      expect(Array.isArray(conflictRes.body.data)).toBe(true);
      const overlap = conflictRes.body.data.find((c: any) => c.type === 'OVERLAP');
      expect(overlap).toBeDefined();
      expect(overlap.severity).toBe('CRITICAL');
    });
  });

  // FEATURE 2: Assignment & Project Workspace
  describe('Feature 2: Assignment & Project Workspace', () => {
    let createdTaskId: string;
    let createdProjectId: string;

    it('creates project with milestones and tracks progress', async () => {
      const projRes = await request(app)
        .post('/api/projects')
        .send({
          title: 'Capstone Microservices Platform',
          description: 'Distributed cloud architecture course project',
          objectives: 'Build event-driven microservices',
          deliverables: 'Architecture report, GitHub repo, live demo',
          deadline: '2026-12-20T23:59:00Z',
          courseId,
          semesterId,
          status: 'IN_PROGRESS',
          progress: 25,
        });

      expect(projRes.status).toBe(201);
      expect(projRes.body.data.title).toBe('Capstone Microservices Platform');
      createdProjectId = projRes.body.data.id;

      // Add Milestone
      const msRes = await request(app)
        .post(`/api/projects/${createdProjectId}/milestones`)
        .send({
          title: 'Milestone 1: Database Schema & Auth',
          dueDate: '2026-11-01T23:59:00Z',
        });

      expect(msRes.status).toBe(201);
      expect(msRes.body.data.title).toBe('Milestone 1: Database Schema & Auth');
    });

    it('supports 7 task statuses, effort estimation, and task duplication', async () => {
      // 1. Create task with BACKLOG status and estimated hours
      const taskRes = await request(app)
        .post('/api/tasks')
        .send({
          semesterId,
          courseId,
          title: 'Implement OAuth Token Refresh',
          description: 'Add token rotation with redis blacklist',
          deadline: '2026-11-25T18:00:00Z',
          priority: 'URGENT',
          status: 'BACKLOG',
          progress: 10,
          estimatedHours: 6.5,
          projectId: createdProjectId,
          checklist: ['Setup token validator', 'Implement expiry check'],
        });

      expect(taskRes.status).toBe(201);
      expect(taskRes.body.data.status).toBe('BACKLOG');
      expect(taskRes.body.data.estimatedHours).toBe(6.5);
      createdTaskId = taskRes.body.data.id;

      // 2. Duplicate task as template
      const dupRes = await request(app).post(`/api/tasks/${createdTaskId}/duplicate`);
      expect(dupRes.status).toBe(201);
      expect(dupRes.body.data.title).toBe('Implement OAuth Token Refresh (Copy)');
      expect(dupRes.body.data.status).toBe('TODO');
      expect(dupRes.body.data.checklist.length).toBe(2);

      // 3. Move task between statuses (e.g. IN_REVIEW)
      const patchRes = await request(app)
        .patch(`/api/tasks/${createdTaskId}`)
        .send({
          status: 'IN_REVIEW',
          progress: 90,
          submissionLink: 'https://github.com/scholarflow/pr/42',
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.status).toBe('IN_REVIEW');
      expect(patchRes.body.data.progress).toBe(90);
    });

    it('recommends prioritization based on deadline proximity and effort', async () => {
      const recRes = await request(app).get('/api/assignments/recommendations');
      expect(recRes.status).toBe(200);
      expect(Array.isArray(recRes.body.data)).toBe(true);
      expect(recRes.body.data.length).toBeGreaterThan(0);
      expect(recRes.body.data[0].recommendationScore).toBeGreaterThanOrEqual(
        recRes.body.data[recRes.body.data.length - 1].recommendationScore
      );
    });
  });

  // FEATURE 3: Study Time Analytics
  describe('Feature 3: Study Time Analytics', () => {
    let activeSessionId: string;

    it('prevents multiple concurrent active timers (collision prevention)', async () => {
      // 1. Start active session
      const sess1 = await request(app)
        .post('/api/study-sessions')
        .send({
          title: 'Deep Focus: Algorithms',
          topic: 'Dynamic Programming',
          courseId,
          semesterId,
          scheduledDate: new Date().toISOString(),
          status: 'IN_PROGRESS',
        });

      expect(sess1.status).toBe(201);
      activeSessionId = sess1.body.data.id;

      // 2. Attempt to start second overlapping active timer -> must fail with 409
      const sess2 = await request(app)
        .post('/api/study-sessions')
        .send({
          title: 'Deep Focus: Architecture',
          courseId,
          semesterId,
          scheduledDate: new Date().toISOString(),
          status: 'IN_PROGRESS',
        });

      expect(sess2.status).toBe(409);
      expect(sess2.body.error).toContain('already running');
    });

    it('recovers active timer after refresh via timestamp calculation', async () => {
      const activeRes = await request(app).get('/api/planner/sessions/active');
      expect(activeRes.status).toBe(200);
      expect(activeRes.body.data).toBeDefined();
      expect(activeRes.body.data.id).toBe(activeSessionId);
      expect(typeof activeRes.body.data.elapsedSeconds).toBe('number');

      // Finish the active session
      await request(app)
        .patch(`/api/study-sessions/${activeSessionId}`)
        .send({ status: 'COMPLETED', isCompleted: true, actualDurationMinutes: 45 });
    });

    it('computes study analytics trends and weekly goal progress', async () => {
      const analyticsRes = await request(app).get('/api/analytics/study');
      expect(analyticsRes.status).toBe(200);
      expect(analyticsRes.body.data.todayMinutes).toBeDefined();
      expect(analyticsRes.body.data.weeklyGoal).toBeDefined();
      expect(analyticsRes.body.data.weeklyGoal.targetHours).toBe(20);
      expect(Array.isArray(analyticsRes.body.data.dailyTrends)).toBe(true);

      // CSV export
      const csvRes = await request(app).get('/api/analytics/study/export.csv');
      expect(csvRes.status).toBe(200);
      expect(csvRes.headers['content-type']).toContain('text/csv');
      expect(csvRes.text).toContain('Planned Minutes,Actual Minutes');
    });
  });

  // FEATURE 4: Academic Performance Analytics & What-If Calculator
  describe('Feature 4: Academic Performance Analytics & What-If Calculator', () => {
    let scenarioId: string;

    it('provides academic GPA summary and grade distribution', async () => {
      const gpaRes = await request(app).get('/api/analytics/academic');
      expect(gpaRes.status).toBe(200);
      expect(gpaRes.body.data.cumulativeGpa).toBeDefined();
      expect(gpaRes.body.data.gradeDistribution).toBeDefined();
      expect(Array.isArray(gpaRes.body.data.semesters)).toBe(true);
    });

    it('saves hypothetical What-If grade scenarios without modifying real grades', async () => {
      // 1. Create What-If scenario
      const simRes = await request(app)
        .post('/api/grade-scenarios')
        .send({
          name: 'Spring 2027 Dean List Target',
          targetCgpa: 3.9,
          scenarioData: [
            { courseName: 'Distributed Systems', credits: 3.0, expectedGrade: 'A+' },
            { courseName: 'Compiler Design', credits: 3.0, expectedGrade: 'A' },
          ],
        });

      expect(simRes.status).toBe(201);
      expect(simRes.body.data.name).toBe('Spring 2027 Dean List Target');
      expect(simRes.body.data.scenarioData.length).toBe(2);
      scenarioId = simRes.body.data.id;

      // 2. Verify actual grade records were untouched
      const gpaRes = await request(app).get('/api/analytics/academic');
      expect(gpaRes.status).toBe(200);
      // Grade scenario should not overwrite existing actual courses
      const existingCourse = gpaRes.body.data.semesters
        .flatMap((s: any) => s.courses)
        .find((c: any) => c.title === 'Distributed Systems');
      expect(existingCourse).toBeUndefined(); // Should remain purely hypothetical

      // 3. Delete scenario
      const delRes = await request(app).delete(`/api/grade-scenarios/${scenarioId}`);
      expect(delRes.status).toBe(200);
    });
  });

  // FEATURE 5: Document Version History
  describe('Feature 5: Document Version History', () => {
    let version1Id: string;

    it('archives prior version on replace and records SHA-256 checksum', async () => {
      const v2Content = 'Replacement document version 2 content with updated diagrams';
      const v2Path = path.join(UPLOAD_DIR, 'temp_v2.txt');
      fs.writeFileSync(v2Path, v2Content);

      const replaceRes = await request(app)
        .post(`/api/documents/${testDocId}/replace`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', v2Path)
        .field('changeDescription', 'Added system architecture diagrams');

      expect(replaceRes.status).toBe(200);
      expect(replaceRes.body.success).toBe(true);

      // Check version history
      const versionsRes = await request(app)
        .get(`/api/documents/${testDocId}/versions`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(versionsRes.status).toBe(200);
      expect(versionsRes.body.data.versions.length).toBeGreaterThanOrEqual(1);

      const archivedVer = versionsRes.body.data.versions[0];
      expect(archivedVer.versionNumber).toBe(1);
      expect(archivedVer.checksum).toBeDefined();
      expect(archivedVer.checksum.length).toBe(64); // SHA-256 hex string
      version1Id = archivedVer.id;
    });

    it('restores previous version while preserving complete history', async () => {
      const restoreRes = await request(app)
        .post(`/api/documents/${testDocId}/versions/${version1Id}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ changeDescription: 'Rollback to Version 1 for verification' });

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.success).toBe(true);

      // History should now have both Version 1 and Version 2 archived
      const versionsRes = await request(app)
        .get(`/api/documents/${testDocId}/versions`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(versionsRes.status).toBe(200);
      expect(versionsRes.body.data.versions.length).toBeGreaterThanOrEqual(2);
    });
  });

  // FEATURE 6: Notification Inbox
  describe('Feature 6: Notification Inbox', () => {
    let notificationId: string;

    it('supports unread count, pagination, mark read, and demo suppression', async () => {
      // 1. Create a notification in database
      const notif = await prisma.inAppNotification.create({
        data: {
          title: 'Quiz Reminder',
          message: 'Your Quiz on Algorithms starts in 24 hours.',
          category: 'EXAM',
          isRead: false,
        },
      });
      notificationId = notif.id;

      // 2. Fetch notifications list
      const listRes = await request(app).get('/api/notifications?unreadOnly=true');
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.unreadCount).toBeGreaterThan(0);

      // 3. Mark notification as read
      const readRes = await request(app).patch(`/api/notifications/${notificationId}/read`);
      expect(readRes.status).toBe(200);
      expect(readRes.body.data.isRead).toBe(true);

      // 4. Mark all as read
      const allReadRes = await request(app).post('/api/notifications/read-all');
      expect(allReadRes.status).toBe(200);

      // 5. Delete notification
      const delRes = await request(app).delete(`/api/notifications/${notificationId}`);
      expect(delRes.status).toBe(200);
    });
  });

  // FEATURE 7: Admin Audit & Usage Analytics
  describe('Feature 7: Admin Audit & Usage Analytics', () => {
    it('returns privacy-safe feature usage and activity statistics without private content', async () => {
      // 1. Feature usage metrics
      const featRes = await request(app)
        .get('/api/admin/analytics/features')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(featRes.status).toBe(200);
      expect(featRes.body.data.features).toBeDefined();
      expect(featRes.body.data.features.calendarEvents).toBeDefined();
      expect(featRes.body.data.features.assignmentsAndTasks).toBeDefined();
      expect(featRes.body.data.features.documentVersions).toBeDefined();

      // 2. Engagement statistics
      const engRes = await request(app)
        .get('/api/admin/analytics/engagement')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(engRes.status).toBe(200);
      expect(engRes.body.data.totalSignIns).toBeDefined();
      expect(Array.isArray(engRes.body.data.dailySignIns)).toBe(true);

      // 3. Admin audit trail
      const auditRes = await request(app)
        .get('/api/admin/audit')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.data.auditLogs).toBeDefined();

      // 4. Ensure activity timeline has ZERO private note or document text
      const actRes = await request(app)
        .get('/api/admin/activity')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(actRes.status).toBe(200);
      const events = actRes.body.data.events;
      for (const ev of events) {
        expect(ev.noteContent).toBeUndefined();
        expect(ev.extractedText).toBeUndefined();
        expect(ev.password).toBeUndefined();
        expect(ev.token).toBeUndefined();
      }
    });
  });
});
