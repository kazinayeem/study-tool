import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { ownedBy, ownerId } from '../middleware/ownership.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  getNotificationPreferences,
  syncAssignmentReminders,
  syncExamReminders,
  syncCalendarEventReminders,
} from '../services/reminderManager.js';
import {
  verifySmtpConnection,
  sendEmail,
  getTestEmailTemplate,
} from '../services/mailer.js';
import { processNotificationJobs } from '../services/scheduler.js';
import { optionalAuthenticateOwner } from '../middleware/auth.js';

const router = Router();

const preferencesSchema = z.object({
  recipientEmail: z.string().email(),
  emailEnabled: z.boolean(),
  notifyAssignments: z.boolean(),
  notifyQuizzes: z.boolean(),
  notifyMidterms: z.boolean(),
  notifyFinals: z.boolean(),
  notifyProjects: z.boolean(),
  notifyCustomEvents: z.boolean(),
  notifyStudySessions: z.boolean().optional().default(true),
  enableBrowserNotifications: z.boolean().optional().default(false),
  assignmentIntervals: z.array(z.string()).min(1),
  quizIntervals: z.array(z.string()).min(1),
  midtermIntervals: z.array(z.string()).min(1),
  finalIntervals: z.array(z.string()).min(1),
  projectIntervals: z.array(z.string()).min(1),
  customEventIntervals: z.array(z.string()).min(1),
  studySessionIntervals: z.array(z.string()).min(1).optional().default(['2h', 'start']),
  timezone: z.string().default('Asia/Dhaka'),
});

/**
 * GET /api/notifications/preferences
 * Fetch notification preferences.
 */
router.get('/preferences', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const prefs = await getNotificationPreferences();
    res.json({
      success: true,
      data: {
        ...prefs,
        assignmentIntervals: JSON.parse(prefs.assignmentIntervals),
        quizIntervals: JSON.parse(prefs.quizIntervals),
        midtermIntervals: JSON.parse(prefs.midtermIntervals),
        finalIntervals: JSON.parse(prefs.finalIntervals),
        projectIntervals: JSON.parse(prefs.projectIntervals),
        customEventIntervals: JSON.parse(prefs.customEventIntervals),
        studySessionIntervals: JSON.parse(prefs.studySessionIntervals || '["2h","start"]'),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/notifications/preferences
 * Update notification preferences and re-sync active pending jobs.
 */
router.put('/preferences', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = preferencesSchema.parse(req.body);

    const updated = await prisma.notificationPreference.upsert({
      where: { id: 'default' },
      update: {
        recipientEmail: parsed.recipientEmail,
        emailEnabled: parsed.emailEnabled,
        notifyAssignments: parsed.notifyAssignments,
        notifyQuizzes: parsed.notifyQuizzes,
        notifyMidterms: parsed.notifyMidterms,
        notifyFinals: parsed.notifyFinals,
        notifyProjects: parsed.notifyProjects,
        notifyCustomEvents: parsed.notifyCustomEvents,
        notifyStudySessions: parsed.notifyStudySessions,
        enableBrowserNotifications: parsed.enableBrowserNotifications,
        assignmentIntervals: JSON.stringify(parsed.assignmentIntervals),
        quizIntervals: JSON.stringify(parsed.quizIntervals),
        midtermIntervals: JSON.stringify(parsed.midtermIntervals),
        finalIntervals: JSON.stringify(parsed.finalIntervals),
        projectIntervals: JSON.stringify(parsed.projectIntervals),
        customEventIntervals: JSON.stringify(parsed.customEventIntervals),
        studySessionIntervals: JSON.stringify(parsed.studySessionIntervals),
        timezone: parsed.timezone,
      },
      create: {
        id: 'default',
        recipientEmail: parsed.recipientEmail,
        emailEnabled: parsed.emailEnabled,
        notifyAssignments: parsed.notifyAssignments,
        notifyQuizzes: parsed.notifyQuizzes,
        notifyMidterms: parsed.notifyMidterms,
        notifyFinals: parsed.notifyFinals,
        notifyProjects: parsed.notifyProjects,
        notifyCustomEvents: parsed.notifyCustomEvents,
        notifyStudySessions: parsed.notifyStudySessions,
        enableBrowserNotifications: parsed.enableBrowserNotifications,
        assignmentIntervals: JSON.stringify(parsed.assignmentIntervals),
        quizIntervals: JSON.stringify(parsed.quizIntervals),
        midtermIntervals: JSON.stringify(parsed.midtermIntervals),
        finalIntervals: JSON.stringify(parsed.finalIntervals),
        projectIntervals: JSON.stringify(parsed.projectIntervals),
        customEventIntervals: JSON.stringify(parsed.customEventIntervals),
        studySessionIntervals: JSON.stringify(parsed.studySessionIntervals),
        timezone: parsed.timezone,
      },
    });

    // Re-synchronize upcoming active assignments and exams with new schedules
    const upcomingAssignments = await prisma.assignment.findMany({
      where: { status: { notIn: ['SUBMITTED', 'COMPLETED'] } },
      select: { id: true },
    });
    for (const a of upcomingAssignments) {
      await syncAssignmentReminders(a.id);
    }

    const upcomingExams = await prisma.exam.findMany({
      select: { id: true },
    });
    for (const e of upcomingExams) {
      await syncExamReminders(e.id);
    }

    const upcomingEvents = await prisma.calendarEvent.findMany({
      where: { isCompleted: false },
      select: { id: true },
    });
    for (const ev of upcomingEvents) {
      await syncCalendarEventReminders(ev.id);
    }

    res.json({
      success: true,
      data: {
        ...updated,
        assignmentIntervals: JSON.parse(updated.assignmentIntervals),
        quizIntervals: JSON.parse(updated.quizIntervals),
        midtermIntervals: JSON.parse(updated.midtermIntervals),
        finalIntervals: JSON.parse(updated.finalIntervals),
        projectIntervals: JSON.parse(updated.projectIntervals),
        customEventIntervals: JSON.parse(updated.customEventIntervals),
      },
      message: 'Notification preferences updated and schedules refreshed.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/test
 * Validates SMTP and transmits a real test email to verify credentials.
 * Suppresses external emails for demo users to protect external inboxes.
 */
router.post('/test', optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prefs = await getNotificationPreferences();
    const recipient = req.body.recipientEmail || prefs.recipientEmail;

    if (!recipient) {
      return res.status(400).json({
        success: false,
        error: 'Recipient email address is required.',
      });
    }

    // Safety guard: Demo accounts must never send real external emails
    if (req.user?.role === 'DEMO') {
      return res.json({
        success: true,
        message: `[Demo Sandbox] Test notification simulated successfully for ${recipient} (outbound external emails safely suppressed in demo mode).`,
        messageId: 'demo-sandbox-simulated-id',
      });
    }

    // 1. Verify connection
    const verifyStatus = await verifySmtpConnection();
    if (!verifyStatus.success) {
      return res.status(400).json({
        success: false,
        error: `SMTP Connection Check Failed: ${verifyStatus.message}`,
        details: 'Check your SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD in .env',
      });
    }

    // 2. Transmit test message
    const emailData = getTestEmailTemplate(recipient, prefs.timezone);
    const sendResult = await sendEmail(emailData);

    // 3. Record in audit log
    await prisma.notificationLog.create({
      data: {
        notificationType: 'TEST_EMAIL',
        targetTitle: 'SMTP Configuration Test',
        recipient,
        subject: emailData.subject,
        scheduledTime: new Date(),
        actualSendTime: new Date(),
        status: 'Sent',
        retryCount: 0,
      },
    });

    res.json({
      success: true,
      message: `Test email successfully sent to ${recipient}!`,
      messageId: sendResult.messageId,
    });
  } catch (err: any) {
    const safeError = err?.message || 'Failed to send test email';

    // Log the failed attempt safely
    try {
      const prefs = await getNotificationPreferences();
      await prisma.notificationLog.create({
        data: {
          notificationType: 'TEST_EMAIL',
          targetTitle: 'SMTP Configuration Test',
          recipient: req.body.recipientEmail || prefs.recipientEmail || 'unknown',
          subject: 'Test Email from ScholarFlow',
          scheduledTime: new Date(),
          actualSendTime: new Date(),
          status: 'Failed',
          retryCount: 1,
          lastError: safeError,
        },
      });
    } catch {
      // Ignore secondary error
    }

    res.status(500).json({
      success: false,
      error: `Email transmission failed: ${safeError}`,
    });
  }
});

/**
 * Notification Center Endpoints
 * Supports GET /, GET /in-app, PATCH /:id/read, POST /read-all, DELETE /:id
 */
const handleGetNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';
    const category = req.query.category as string | undefined;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = { ...ownedBy(req) };
    if (unreadOnly) where.isRead = false;
    if (category && category !== 'ALL') where.category = category;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.inAppNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.inAppNotification.count({ where }),
      prisma.inAppNotification.count({ where: { isRead: false, ...ownedBy(req) } }),
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

router.get('/', handleGetNotifications);
router.get('/in-app', handleGetNotifications);

const handleMarkRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.inAppNotification.findFirst({
      where: { id: req.params.id, ...ownedBy(req) },
    });
    if (!existing) {
      throw new AppError('Notification not found', 404);
    }

    const updated = await prisma.inAppNotification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

router.patch('/:id/read', handleMarkRead);
router.patch('/in-app/:id/read', handleMarkRead);

const handleMarkAllRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.inAppNotification.updateMany({
      where: { isRead: false, ...ownedBy(req) },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
};

router.post('/read-all', handleMarkAllRead);
router.post('/in-app/mark-all-read', handleMarkAllRead);

const handleDeleteNotification = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.inAppNotification.findFirst({
      where: { id: req.params.id, ...ownedBy(req) },
    });
    if (!existing) {
      throw new AppError('Notification not found', 404);
    }

    await prisma.inAppNotification.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (err) {
    next(err);
  }
};

router.delete('/:id', handleDeleteNotification);
router.delete('/in-app/:id', handleDeleteNotification);

/**
 * GET /api/notifications/history
 * Notification audit log with filtering by status, notificationType, date.
 */
router.get('/history', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { status, type, startDate, endDate } = req.query;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '25', 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = String(status);
    }
    if (type && type !== 'ALL') {
      where.notificationType = String(type);
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }

    const [logs, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notificationLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/trigger-scheduler
 * Manually executes due reminder jobs (for immediate testing or admin trigger).
 */
router.post('/trigger-scheduler', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const processed = await processNotificationJobs();
    res.json({
      success: true,
      message: `Scheduler checked. ${processed} jobs processed.`,
      processed,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
