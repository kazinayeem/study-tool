import cron, { ScheduledTask } from 'node-cron';
import { prisma } from '../prisma.js';
import {
  sendEmail,
  getAssignmentEmail,
  getQuizEmail,
  getMidtermEmail,
  getFinalEmail,
  getProjectEmail,
  getCustomEventEmail,
} from './mailer.js';
import { getNotificationPreferences } from './reminderManager.js';
import { SMTP_CONFIG } from '../config.js';

let cronTask: ScheduledTask | null = null;
let isProcessing = false;


/**
 * Main worker loop that processes due NotificationJobs.
 */
export async function processNotificationJobs(): Promise<number> {
  if (isProcessing) {
    return 0;
  }
  isProcessing = true;

  try {
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    // 1. Identify and skip obsolete backlog jobs that were scheduled more than 24 hours ago
    const staleJobs = await prisma.notificationJob.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lt: staleThreshold },
      },
    });

    for (const stale of staleJobs) {
      await prisma.notificationJob.update({
        where: { id: stale.id },
        data: {
          status: 'SKIPPED',
          lastError: 'Skipped obsolete reminder after extended server outage (> 24 hours overdue)',
        },
      });

      // Log skipped action
      const payload = stale.payloadJson ? JSON.parse(stale.payloadJson) : {};
      await prisma.notificationLog.create({
        data: {
          jobId: stale.id,
          notificationType: stale.targetType,
          targetId: stale.targetId,
          targetTitle: payload.title || 'Academic Task',
          recipient: 'system',
          subject: `Skipped: ${payload.title || 'Overdue reminder'}`,
          scheduledTime: stale.scheduledFor,
          actualSendTime: now,
          status: 'Skipped',
          retryCount: stale.attempts,
          lastError: 'Skipped obsolete reminder (> 24h)',
        },
      });
    }

    // 2. Fetch pending jobs scheduled for now or earlier, respecting retry intervals
    const candidateJobs = await prisma.notificationJob.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: now },
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: now } },
        ],
      },
      take: 20,
      orderBy: { scheduledFor: 'asc' },
    });

    let processedCount = 0;
    const prefs = await getNotificationPreferences();

    for (const job of candidateJobs) {
      // Atomic claim to prevent multi-worker collision
      const claimed = await prisma.$executeRawUnsafe(
        `UPDATE NotificationJob SET status = 'PROCESSING', lockedAt = ? WHERE id = ? AND status = 'PENDING'`,
        now.toISOString(),
        job.id
      );

      if (claimed === 0) {
        // Job was claimed or modified by another worker
        continue;
      }

      processedCount++;
      const payload = job.payloadJson ? JSON.parse(job.payloadJson) : {};
      const recipient = prefs.recipientEmail || 'student@example.com';
      let emailPayload = null;
      let notificationType = job.targetType;
      let subject = 'Academic Reminder';

      // Build corresponding template
      try {
        if (job.targetType === 'ASSIGNMENT') {
          notificationType = 'ASSIGNMENT';
          emailPayload = getAssignmentEmail({
            assignmentTitle: payload.title,
            courseName: payload.courseName,
            semesterName: payload.semesterName,
            deadline: payload.deadline,
            status: payload.status,
            assignmentId: payload.assignmentId,
            timezone: prefs.timezone,
          });
          subject = emailPayload.subject;
        } else if (job.targetType === 'EXAM') {
          const examType = (payload.examType || '').toLowerCase();
          if (examType.includes('quiz')) {
            notificationType = 'QUIZ';
            emailPayload = getQuizEmail({
              quizTitle: payload.title,
              courseName: payload.courseName,
              courseId: payload.courseId,
              examDate: payload.examDate,
              preparationNotes: payload.syllabus,
              timezone: prefs.timezone,
            });
          } else if (examType.includes('final')) {
            notificationType = 'FINAL';
            emailPayload = getFinalEmail({
              examTitle: payload.title,
              courseName: payload.courseName,
              examId: payload.examId,
              examDate: payload.examDate,
              syllabus: payload.syllabus,
              timezone: prefs.timezone,
            });
          } else {
            notificationType = 'MIDTERM';
            emailPayload = getMidtermEmail({
              examTitle: payload.title,
              courseName: payload.courseName,
              examId: payload.examId,
              examDate: payload.examDate,
              preparationStatus: payload.preparationStatus || 'NOT_STARTED',
              syllabus: payload.syllabus,
              timezone: prefs.timezone,
            });
          }
          subject = emailPayload.subject;
        } else if (job.targetType === 'CALENDAR_EVENT') {
          notificationType = 'CUSTOM_EVENT';
          emailPayload = getCustomEventEmail({
            eventTitle: payload.title,
            startDate: payload.startDate,
            description: payload.description,
            location: payload.location,
            eventId: payload.eventId,
            timezone: prefs.timezone,
          });
          subject = emailPayload.subject;
        } else if (job.targetType === 'STUDY_SESSION') {
          notificationType = 'STUDY_SESSION';
          subject = `Study Session Reminder: ${payload.title}`;
          emailPayload = {
            subject,
            html: `<div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
              <h2 style="color: #4f46e5;">Upcoming Study Session Reminder</h2>
              <p>You have a scheduled focus session: <strong>${payload.title}</strong></p>
              <p><strong>Course:</strong> ${payload.courseName}</p>
              <p><strong>Topic:</strong> ${payload.topic || 'General Revision'}</p>
              <p><strong>Scheduled Time:</strong> ${payload.scheduledDate}</p>
              <p><strong>Planned Duration:</strong> ${payload.durationMinutes} minutes</p>
            </div>`,
            text: `Study Session Reminder: ${payload.title}\nCourse: ${payload.courseName}\nTopic: ${payload.topic || 'General'}\nScheduled: ${payload.scheduledDate}\nDuration: ${payload.durationMinutes} mins`,
          };
        }

        // 3. Always dispatch In-App Notification independently so an email failure doesn't erase in-app alerts
        const existingInApp = await prisma.inAppNotification.findFirst({
          where: {
            targetType: job.targetType,
            targetId: job.targetId,
            category: notificationType,
            title: subject,
          },
        });

        if (!existingInApp) {
          await prisma.inAppNotification.create({
            data: {
              title: subject,
              message: `${payload.title || 'Upcoming Event'} is scheduled for ${new Date(payload.deadline || payload.examDate || payload.startDate || Date.now()).toLocaleDateString()}`,
              category: notificationType,
              targetType: job.targetType,
              targetId: job.targetId,
              linkUrl: job.targetType === 'ASSIGNMENT'
                ? `/assignments?id=${job.targetId}`
                : job.targetType === 'EXAM'
                ? `/exams?id=${job.targetId}`
                : '/calendar',
              scheduledFor: job.scheduledFor,
            },
          });
        }

        // 4. Send Email if globally enabled and SMTP configured
        if (!prefs.emailEnabled || !SMTP_CONFIG.enabled || !SMTP_CONFIG.host) {
          // Email disabled or unconfigured: mark skipped for email delivery without error
          await prisma.notificationJob.update({
            where: { id: job.id },
            data: {
              status: 'SKIPPED',
              lastError: !prefs.emailEnabled
                ? 'Email notifications disabled in user preferences'
                : 'SMTP not configured or globally disabled in .env',
            },
          });

          await prisma.notificationLog.create({
            data: {
              jobId: job.id,
              notificationType,
              targetId: job.targetId,
              targetTitle: payload.title || subject,
              recipient,
              subject,
              scheduledTime: job.scheduledFor,
              actualSendTime: now,
              status: 'Skipped',
              retryCount: job.attempts,
              lastError: !prefs.emailEnabled ? 'Email disabled in user preferences' : 'SMTP not configured',
            },
          });
          continue;
        }

        // Send via Nodemailer if email template was generated
        if (emailPayload) {
          await sendEmail({
            to: recipient,
            subject: emailPayload.subject,
            html: emailPayload.html,
            text: emailPayload.text,
          });
        }


        // Mark successfully SENT
        await prisma.notificationJob.update({
          where: { id: job.id },
          data: {
            status: 'SENT',
            lastError: null,
          },
        });

        await prisma.notificationLog.create({
          data: {
            jobId: job.id,
            notificationType,
            targetId: job.targetId,
            targetTitle: payload.title || subject,
            recipient,
            subject,
            scheduledTime: job.scheduledFor,
            actualSendTime: new Date(),
            status: 'Sent',
            retryCount: job.attempts,
            lastError: null,
          },
        });
      } catch (sendError: any) {
        const errorMsg = sendError?.message || 'SMTP delivery failure';
        const newAttempts = job.attempts + 1;

        if (newAttempts >= job.maxAttempts) {
          // Exceeded max retry limit: mark FAILED permanently
          await prisma.notificationJob.update({
            where: { id: job.id },
            data: {
              status: 'FAILED',
              attempts: newAttempts,
              lastError: errorMsg,
            },
          });

          await prisma.notificationLog.create({
            data: {
              jobId: job.id,
              notificationType,
              targetId: job.targetId,
              targetTitle: payload.title || subject,
              recipient,
              subject,
              scheduledTime: job.scheduledFor,
              actualSendTime: new Date(),
              status: 'Failed',
              retryCount: newAttempts,
              lastError: errorMsg,
            },
          });
        } else {
          // Bounded exponential backoff: 2 ^ attempts * 60 seconds (e.g. 2m, 4m, 8m)
          const backoffMinutes = Math.min(Math.pow(2, newAttempts), 30);
          const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

          await prisma.notificationJob.update({
            where: { id: job.id },
            data: {
              status: 'PENDING',
              attempts: newAttempts,
              nextRetryAt,
              lastError: errorMsg,
            },
          });

          await prisma.notificationLog.create({
            data: {
              jobId: job.id,
              notificationType,
              targetId: job.targetId,
              targetTitle: payload.title || subject,
              recipient,
              subject,
              scheduledTime: job.scheduledFor,
              actualSendTime: new Date(),
              status: 'Pending',
              retryCount: newAttempts,
              lastError: `Temporary failure: ${errorMsg}. Next retry in ${backoffMinutes} min.`,
            },
          });
        }
      }
    }

    return processedCount;
  } finally {
    isProcessing = false;
  }
}

/**
 * Initializes the persistent scheduler cron job (runs every minute).
 */
export function initScheduler(): void {
  if (cronTask) {
    return;
  }

  // Run every minute: '* * * * *'
  cronTask = cron.schedule('* * * * *', async () => {
    try {
      await processNotificationJobs();
    } catch (err) {
      console.error('Error in reminder scheduler tick:', err);
    }
  });

  console.log('⏰ [Scheduler] Persistent reminder scheduler initialized (every 1 minute)');

  // Run one immediate check on startup
  processNotificationJobs().catch((err) => {
    console.error('Initial scheduler run error:', err);
  });
}

/**
 * Stops the scheduler (for testing or shutdown).
 */
export function stopScheduler(): void {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
  }
}
