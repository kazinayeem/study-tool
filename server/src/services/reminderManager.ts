import { prisma } from '../prisma.js';

/**
 * Calculates a scheduled Date given a target date and interval string.
 * Supported intervals: "7d", "3d", "1d", "4h", "2h", "1h", "due", "start".
 */
export function calculateTriggerTime(targetDate: Date, interval: string): Date {
  const d = new Date(targetDate);
  switch (interval) {
    case '7d':
      d.setDate(d.getDate() - 7);
      break;
    case '3d':
      d.setDate(d.getDate() - 3);
      break;
    case '1d':
      d.setDate(d.getDate() - 1);
      break;
    case '4h':
      d.setHours(d.getHours() - 4);
      break;
    case '2h':
      d.setHours(d.getHours() - 2);
      break;
    case '1h':
      d.setHours(d.getHours() - 1);
      break;
    case 'start':
    case 'due':
    default:
      // Exact time of deadline / event
      break;
  }
  return d;
}

/**
 * Get or initialize default user notification preferences.
 */
export async function getNotificationPreferences() {
  let pref = await prisma.notificationPreference.findUnique({
    where: { id: 'default' },
  });

  if (!pref) {
    pref = await prisma.notificationPreference.create({
      data: {
        id: 'default',
        recipientEmail: 'student@example.com',
        emailEnabled: true,
        notifyAssignments: true,
        notifyQuizzes: true,
        notifyMidterms: true,
        notifyFinals: true,
        notifyProjects: true,
        notifyCustomEvents: true,
        notifyStudySessions: true,
        enableBrowserNotifications: false,
        assignmentIntervals: JSON.stringify(['7d', '3d', '1d', 'due']),
        quizIntervals: JSON.stringify(['3d', '1d', 'due']),
        midtermIntervals: JSON.stringify(['7d', '3d', '1d', 'due']),
        finalIntervals: JSON.stringify(['7d', '3d', '1d', 'due']),
        projectIntervals: JSON.stringify(['7d', '3d', '1d', 'due']),
        customEventIntervals: JSON.stringify(['1d', 'due']),
        studySessionIntervals: JSON.stringify(['2h', 'start']),
        timezone: 'Asia/Dhaka',
      },
    });
  }

  return pref;
}

/**
 * Synchronize reminder jobs for an Assignment.
 * Called when an assignment is created or updated.
 */
export async function syncAssignmentReminders(assignmentId: string): Promise<void> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: true, semester: true },
  });

  if (!assignment) {
    // If assignment deleted, cancel all pending jobs
    await cancelRemindersForTarget('ASSIGNMENT', assignmentId);
    return;
  }

  // If assignment is completed or submitted, cancel pending reminders
  if (assignment.status === 'SUBMITTED' || assignment.status === 'COMPLETED') {
    await cancelRemindersForTarget('ASSIGNMENT', assignmentId);
    return;
  }

  const prefs = await getNotificationPreferences();
  const intervals: string[] = JSON.parse(prefs.assignmentIntervals);

  // If user disabled assignment notifications, cancel pending

  if (!prefs.notifyAssignments) {
    await cancelRemindersForTarget('ASSIGNMENT', assignmentId);
    return;
  }

  // Cancel any existing pending jobs not in current intervals or recalculate due date
  for (const interval of intervals) {
    const scheduledFor = calculateTriggerTime(assignment.deadline, interval);
    const idempotencyKey = `ASSIGNMENT:${assignment.id}:${interval}`;

    // Payload for quick template building without extra joins
    const payloadJson = JSON.stringify({
      assignmentId: assignment.id,
      title: assignment.title,
      courseName: assignment.course.title || assignment.course.code,
      semesterName: assignment.semester.name,
      deadline: assignment.deadline.toISOString(),
      status: assignment.status,
      triggerType: interval,
    });

    // Upsert the job: if it was PENDING, update scheduledFor and payload; if already SENT, don't overwrite
    const existing = await prisma.notificationJob.findUnique({
      where: { idempotencyKey },
    });

    if (!existing) {
      await prisma.notificationJob.create({
        data: {
          idempotencyKey,
          targetType: 'ASSIGNMENT',
          targetId: assignment.id,
          triggerType: interval,
          channel: 'EMAIL',
          scheduledFor,
          status: 'PENDING',
          payloadJson,
        },
      });
    } else if (existing.status === 'PENDING') {
      await prisma.notificationJob.update({
        where: { id: existing.id },
        data: {
          scheduledFor,
          payloadJson,
        },
      });
    }
  }

  // Also remove pending jobs for intervals that are no longer selected
  const activeKeys = intervals.map((i) => `ASSIGNMENT:${assignment.id}:${i}`);
  await prisma.notificationJob.deleteMany({
    where: {
      targetType: 'ASSIGNMENT',
      targetId: assignment.id,
      status: 'PENDING',
      idempotencyKey: { notIn: activeKeys },
    },
  });
}

/**
 * Synchronize reminder jobs for an Exam (Quiz, Midterm, Final, etc.)
 */
export async function syncExamReminders(examId: string): Promise<void> {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { course: true, semester: true },
  });

  if (!exam) {
    await cancelRemindersForTarget('EXAM', examId);
    return;
  }

  const prefs = await getNotificationPreferences();
  const examTypeLower = exam.examType.toLowerCase();

  let enabled = true;
  let rawIntervals = prefs.midtermIntervals;

  if (examTypeLower.includes('quiz')) {
    enabled = prefs.notifyQuizzes;
    rawIntervals = prefs.quizIntervals;
  } else if (examTypeLower.includes('final')) {
    enabled = prefs.notifyFinals;
    rawIntervals = prefs.finalIntervals;
  } else {
    // Midterm or others
    enabled = prefs.notifyMidterms;
    rawIntervals = prefs.midtermIntervals;
  }

  if (!enabled) {
    await cancelRemindersForTarget('EXAM', examId);
    return;
  }

  const intervals: string[] = JSON.parse(rawIntervals);

  for (const interval of intervals) {
    const scheduledFor = calculateTriggerTime(exam.examDate, interval);
    const idempotencyKey = `EXAM:${exam.id}:${interval}`;

    const payloadJson = JSON.stringify({
      examId: exam.id,
      title: exam.title,
      examType: exam.examType,
      courseId: exam.courseId,
      courseName: exam.course.title || exam.course.code,
      examDate: exam.examDate.toISOString(),
      preparationStatus: exam.preparationStatus,
      syllabus: exam.syllabus,
      triggerType: interval,
    });

    const existing = await prisma.notificationJob.findUnique({
      where: { idempotencyKey },
    });

    if (!existing) {
      await prisma.notificationJob.create({
        data: {
          idempotencyKey,
          targetType: 'EXAM',
          targetId: exam.id,
          triggerType: interval,
          channel: 'EMAIL',
          scheduledFor,
          status: 'PENDING',
          payloadJson,
        },
      });
    } else if (existing.status === 'PENDING') {
      await prisma.notificationJob.update({
        where: { id: existing.id },
        data: {
          scheduledFor,
          payloadJson,
        },
      });
    }
  }

  const activeKeys = intervals.map((i) => `EXAM:${exam.id}:${i}`);
  await prisma.notificationJob.deleteMany({
    where: {
      targetType: 'EXAM',
      targetId: exam.id,
      status: 'PENDING',
      idempotencyKey: { notIn: activeKeys },
    },
  });
}

/**
 * Synchronize reminder jobs for a Calendar Event
 */
export async function syncCalendarEventReminders(eventId: string): Promise<void> {
  const event = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
  });

  if (!event || event.isCompleted) {
    await cancelRemindersForTarget('CALENDAR_EVENT', eventId);
    return;
  }

  const prefs = await getNotificationPreferences();
  if (!prefs.notifyCustomEvents) {
    await cancelRemindersForTarget('CALENDAR_EVENT', eventId);
    return;
  }

  const intervals: string[] = JSON.parse(prefs.customEventIntervals);

  for (const interval of intervals) {
    const scheduledFor = calculateTriggerTime(event.startDate, interval);
    const idempotencyKey = `CALENDAR_EVENT:${event.id}:${interval}`;

    const payloadJson = JSON.stringify({
      eventId: event.id,
      title: event.title,
      startDate: event.startDate.toISOString(),
      description: event.description,
      location: event.location,
      triggerType: interval,
    });

    const existing = await prisma.notificationJob.findUnique({
      where: { idempotencyKey },
    });

    if (!existing) {
      await prisma.notificationJob.create({
        data: {
          idempotencyKey,
          targetType: 'CALENDAR_EVENT',
          targetId: event.id,
          triggerType: interval,
          channel: 'EMAIL',
          scheduledFor,
          status: 'PENDING',
          payloadJson,
        },
      });
    } else if (existing.status === 'PENDING') {
      await prisma.notificationJob.update({
        where: { id: existing.id },
        data: {
          scheduledFor,
          payloadJson,
        },
      });
    }
  }

  const activeKeys = intervals.map((i) => `CALENDAR_EVENT:${event.id}:${i}`);
  await prisma.notificationJob.deleteMany({
    where: {
      targetType: 'CALENDAR_EVENT',
      targetId: event.id,
      status: 'PENDING',
      idempotencyKey: { notIn: activeKeys },
    },
  });
}

/**
 * Synchronize reminder jobs for a Study Session
 */
export async function syncStudySessionReminders(sessionId: string): Promise<void> {
  const session = await prisma.studySession.findUnique({
    where: { id: sessionId },
    include: { course: true },
  });

  if (!session || session.isCompleted || session.status === 'COMPLETED' || session.status === 'CANCELLED') {
    await cancelRemindersForTarget('STUDY_SESSION', sessionId);
    return;
  }

  const prefs = await getNotificationPreferences();
  if (!prefs.notifyStudySessions) {
    await cancelRemindersForTarget('STUDY_SESSION', sessionId);
    return;
  }

  const rawIntervals = prefs.studySessionIntervals || '["2h","start"]';
  const intervals: string[] = JSON.parse(rawIntervals);

  for (const interval of intervals) {
    const scheduledFor = calculateTriggerTime(session.scheduledDate, interval);
    const idempotencyKey = `STUDY_SESSION:${session.id}:${interval}`;

    const payloadJson = JSON.stringify({
      sessionId: session.id,
      title: session.title,
      topic: session.topic,
      courseName: session.course?.title || session.course?.code || 'Self Study',
      scheduledDate: session.scheduledDate.toISOString(),
      durationMinutes: session.durationMinutes,
      priority: session.priority,
      triggerType: interval,
    });

    const existing = await prisma.notificationJob.findUnique({
      where: { idempotencyKey },
    });

    if (!existing) {
      await prisma.notificationJob.create({
        data: {
          idempotencyKey,
          targetType: 'STUDY_SESSION',
          targetId: session.id,
          triggerType: interval,
          channel: 'EMAIL',
          scheduledFor,
          status: 'PENDING',
          payloadJson,
        },
      });
    } else if (existing.status === 'PENDING') {
      await prisma.notificationJob.update({
        where: { id: existing.id },
        data: {
          scheduledFor,
          payloadJson,
        },
      });
    }
  }

  const activeKeys = intervals.map((i) => `STUDY_SESSION:${session.id}:${i}`);
  await prisma.notificationJob.deleteMany({
    where: {
      targetType: 'STUDY_SESSION',
      targetId: session.id,
      status: 'PENDING',
      idempotencyKey: { notIn: activeKeys },
    },
  });
}

/**
 * Cancels all pending reminder jobs for a given target entity.
 */
export async function cancelRemindersForTarget(targetType: string, targetId: string): Promise<void> {
  await prisma.notificationJob.deleteMany({
    where: {
      targetType,
      targetId,
      status: 'PENDING',
    },
  });
}

