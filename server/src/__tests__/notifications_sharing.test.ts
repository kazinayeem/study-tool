import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { prisma } from '../prisma.js';
import {
  syncAssignmentReminders,
  syncExamReminders,
  getNotificationPreferences,
  calculateTriggerTime,
} from '../services/reminderManager.js';
import { processNotificationJobs } from '../services/scheduler.js';
import * as mailer from '../services/mailer.js';

describe('Notification & Sharing System Comprehensive Integration Tests', () => {
  let semesterId: string;
  let courseId: string;
  let ownerToken: string;

  beforeAll(async () => {
    await prisma.$connect();

    // Ensure default owner account exists
    const statusRes = await request(app).get('/api/auth/status');
    expect(statusRes.status).toBe(200);

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'owner@scholarflow.local',
      password: 'Password123!',
    });
    expect(loginRes.status).toBe(200);
    ownerToken = loginRes.body.data.token;

    // Get a test semester & course
    const semester = await prisma.semester.findFirst({
      include: { courses: true },
    });
    expect(semester).toBeDefined();
    semesterId = semester!.id;
    courseId = semester!.courses[0].id;
  });

  it('1. Assignment reminder job generation & recalculation on deadline change', async () => {
    const deadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now

    // Create assignment
    const createRes = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        semesterId,
        courseId,
        title: 'Distributed Systems Raft Consensus Protocol',
        deadline: deadline.toISOString(),
        priority: 'HIGH',
      });

    expect(createRes.status).toBe(201);
    const assignmentId = createRes.body.data.id;

    // Check generated NotificationJobs
    const jobs = await prisma.notificationJob.findMany({
      where: { targetType: 'ASSIGNMENT', targetId: assignmentId },
    });
    expect(jobs.length).toBeGreaterThanOrEqual(1);

    const oneDayJob = jobs.find((j) => j.triggerType === '1d');
    expect(oneDayJob).toBeDefined();

    // Verify scheduledFor is approx 1 day before deadline
    const expectedOneDay = calculateTriggerTime(deadline, '1d');
    expect(new Date(oneDayJob!.scheduledFor).getTime()).toBeCloseTo(expectedOneDay.getTime(), -3);

    // 2. Updating deadline recalculates pending reminders
    const updatedDeadline = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const updateRes = await request(app)
      .put(`/api/assignments/${assignmentId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        deadline: updatedDeadline.toISOString(),
      });
    expect(updateRes.status).toBe(200);

    const updatedJob = await prisma.notificationJob.findUnique({
      where: { idempotencyKey: `ASSIGNMENT:${assignmentId}:1d` },
    });
    expect(new Date(updatedJob!.scheduledFor).getTime()).toBeCloseTo(
      calculateTriggerTime(updatedDeadline, '1d').getTime(),
      -3
    );

    // Clean up
    await prisma.assignment.delete({ where: { id: assignmentId } });
  });

  it('2. Completing or deleting an event cancels pending reminder jobs', async () => {
    const deadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const res = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        semesterId,
        courseId,
        title: 'Cryptography Homework 3',
        deadline: deadline.toISOString(),
      });
    const assignmentId = res.body.data.id;

    let jobs = await prisma.notificationJob.findMany({
      where: { targetType: 'ASSIGNMENT', targetId: assignmentId, status: 'PENDING' },
    });
    expect(jobs.length).toBeGreaterThan(0);

    // Mark completed
    await request(app)
      .put(`/api/assignments/${assignmentId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'COMPLETED' });

    jobs = await prisma.notificationJob.findMany({
      where: { targetType: 'ASSIGNMENT', targetId: assignmentId, status: 'PENDING' },
    });
    expect(jobs.length).toBe(0);

    // Clean up
    await prisma.assignment.delete({ where: { id: assignmentId } });
  });

  it('3. Repeated scheduler runs prevent duplicate sends & handle atomic claiming', async () => {
    // Create a mock job scheduled for now
    const dummyJob = await prisma.notificationJob.create({
      data: {
        idempotencyKey: `TEST_JOB:${Date.now()}`,
        targetType: 'ASSIGNMENT',
        targetId: 'dummy-id',
        triggerType: '1d',
        scheduledFor: new Date(Date.now() - 5000), // 5 seconds ago
        status: 'PENDING',
        payloadJson: JSON.stringify({
          title: 'Concurrency Test Assignment',
          courseName: 'CSE443',
          deadline: new Date().toISOString(),
          status: 'IN_PROGRESS',
        }),
      },
    });

    // Run scheduler
    const count1 = await processNotificationJobs();
    expect(count1).toBeGreaterThanOrEqual(1);

    const processedJob = await prisma.notificationJob.findUnique({
      where: { id: dummyJob.id },
    });
    expect(['SENT', 'SKIPPED']).toContain(processedJob!.status);

    // Re-run scheduler immediately: duplicate run must NOT re-process the same job
    const count2 = await processNotificationJobs();
    const recheckedJob = await prisma.notificationJob.findUnique({
      where: { id: dummyJob.id },
    });
    expect(recheckedJob!.attempts).toBe(processedJob!.attempts);

    // Cleanup
    await prisma.notificationJob.delete({ where: { id: dummyJob.id } });
  });

  it('4. Disabling email notifications prevents email send without breaking in-app notifications', async () => {
    // Set preferences to email disabled
    await request(app)
      .put('/api/notifications/preferences')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        recipientEmail: 'student@example.com',
        emailEnabled: false, // DISABLED
        notifyAssignments: true,
        notifyQuizzes: true,
        notifyMidterms: true,
        notifyFinals: true,
        notifyProjects: true,
        notifyCustomEvents: true,
        assignmentIntervals: ['1d'],
        quizIntervals: ['1d'],
        midtermIntervals: ['1d'],
        finalIntervals: ['1d'],
        projectIntervals: ['1d'],
        customEventIntervals: ['1d'],
        timezone: 'Asia/Dhaka',
      });

    const dummyJob = await prisma.notificationJob.create({
      data: {
        idempotencyKey: `TEST_EMAIL_DISABLED:${Date.now()}`,
        targetType: 'ASSIGNMENT',
        targetId: 'assignment-in-app-test',
        triggerType: '1d',
        scheduledFor: new Date(Date.now() - 5000),
        status: 'PENDING',
        payloadJson: JSON.stringify({
          title: 'Compiler Design Project',
          courseName: 'CSE331',
          deadline: new Date().toISOString(),
          status: 'IN_PROGRESS',
        }),
      },
    });

    await processNotificationJobs();

    // Verify job was marked SKIPPED for email
    const jobAfter = await prisma.notificationJob.findUnique({
      where: { id: dummyJob.id },
    });
    expect(jobAfter!.status).toBe('SKIPPED');

    // Verify In-App notification was still created!
    const inApp = await prisma.inAppNotification.findFirst({
      where: { targetId: 'assignment-in-app-test' },
    });
    expect(inApp).toBeDefined();
    expect(inApp!.title).toContain('Compiler Design Project');

    // Cleanup
    await prisma.notificationJob.delete({ where: { id: dummyJob.id } });
    if (inApp) await prisma.inAppNotification.delete({ where: { id: inApp.id } });
  });

  it('5. Private documents cannot be opened without owner authentication', async () => {
    const doc = await prisma.document.findFirst();
    expect(doc).toBeDefined();

    // Set doc to PRIVATE
    await prisma.document.update({
      where: { id: doc!.id },
      data: { visibility: 'PRIVATE' },
    });

    // Unauthenticated request to /api/documents/:id/file
    const unauthRes = await request(app).get(`/api/documents/${doc!.id}/file`);
    expect(unauthRes.status).toBe(401);
    expect(unauthRes.body.success).toBe(false);

    // Authenticated request with owner token
    const authRes = await request(app)
      .get(`/api/documents/${doc!.id}/file`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(authRes.status).toBe(200);
  });

  it('6. Public & Unlisted share links, password protection, and download restrictions', async () => {
    const doc = await prisma.document.findFirst();
    expect(doc).toBeDefined();

    // Create a password-protected unlisted share link with download disabled
    const shareRes = await request(app)
      .post('/api/share/links')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        resourceType: 'DOCUMENT',
        resourceId: doc!.id,
        visibility: 'UNLISTED',
        password: 'SecretSharePassword123',
        allowDownload: false,
        viewMode: 'PREVIEW',
      });

    expect(shareRes.status).toBe(201);
    const shareToken = shareRes.body.data.token;
    const shareLinkId = shareRes.body.data.id;

    // 6a. Accessing without password returns requiresPassword: true
    const unauthViewerRes = await request(app).get(`/api/share/${shareToken}`);
    expect(unauthViewerRes.status).toBe(200);
    expect(unauthViewerRes.body.requiresPassword).toBe(true);

    // 6b. Password verification rejects wrong password
    const wrongPassRes = await request(app)
      .post(`/api/share/${shareToken}/verify-password`)
      .send({ password: 'WrongPassword' });
    expect(wrongPassRes.status).toBe(401);
    expect(wrongPassRes.body.verified).toBe(false);

    // 6c. Password verification accepts correct password
    const correctPassRes = await request(app)
      .post(`/api/share/${shareToken}/verify-password`)
      .send({ password: 'SecretSharePassword123' });
    expect(correctPassRes.status).toBe(200);
    expect(correctPassRes.body.verified).toBe(true);

    // 6d. Accessing with x-share-password header unlocks document data
    const unlockedRes = await request(app)
      .get(`/api/share/${shareToken}`)
      .set('x-share-password', 'SecretSharePassword123');
    expect(unlockedRes.status).toBe(200);
    expect(unlockedRes.body.requiresPassword).toBe(false);
    expect(unlockedRes.body.data.resource.title).toBe(doc!.title);

    // 6e. Download permission restriction: allowDownload = false rejects download query
    const blockedDownloadRes = await request(app)
      .get(`/api/share/${shareToken}/file?download=true`)
      .set('x-share-password', 'SecretSharePassword123');
    expect(blockedDownloadRes.status).toBe(403);

    // 6f. Revoking link invalidates access immediately
    const revokeRes = await request(app)
      .patch(`/api/share/links/${shareLinkId}/revoke`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(revokeRes.status).toBe(200);

    const revokedViewerRes = await request(app)
      .get(`/api/share/${shareToken}`)
      .set('x-share-password', 'SecretSharePassword123');
    expect(revokedViewerRes.status).toBe(410);

    // 6g. Switching resource to Private invalidates all previous links
    const newShareRes = await request(app)
      .post('/api/share/links')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        resourceType: 'DOCUMENT',
        resourceId: doc!.id,
        visibility: 'PUBLIC',
      });
    const newToken = newShareRes.body.data.token;

    // Switch resource to private
    await request(app)
      .post(`/api/share/resource/DOCUMENT/${doc!.id}/set-private`)
      .set('Authorization', `Bearer ${ownerToken}`);

    // Verify token is now revoked
    const checkRevoked = await request(app).get(`/api/share/${newToken}`);
    expect(checkRevoked.status).toBe(410);
  });
});
