import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { ownedBy, ownerId } from '../middleware/ownership.js';
import { syncCalendarEventReminders, cancelRemindersForTarget } from '../services/reminderManager.js';
import { validateSemesterCourseConsistency } from '../utils/academicValidation.js';


const router = Router();

const createEventSchema = z.object({
  body: z.object({
    semesterId: z.string().nullable().optional(),
    courseId: z.string().nullable().optional(),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start date' }),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid end date' }),
    isAllDay: z.boolean().default(false),
    category: z.string().default('CLASS'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    isCompleted: z.boolean().default(false),
    location: z.string().optional(),
    notes: z.string().optional(),
    reminderMinutesBefore: z.number().int().nullable().optional(),
    recurrenceRule: z.string().nullable().optional(),
  }),
});

const updateEventSchema = z.object({
  body: z.object({
    semesterId: z.string().nullable().optional(),
    courseId: z.string().nullable().optional(),
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val))).optional(),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val))).optional(),
    isAllDay: z.boolean().optional(),
    category: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    isCompleted: z.boolean().optional(),
    location: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    reminderMinutesBefore: z.number().int().nullable().optional(),
    recurrenceRule: z.string().nullable().optional(),
  }),
});

// List events by date range, semester, course, category
const handleListEvents = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { start, end, semesterId, courseId, category } = req.query;

    const where: any = { ...ownedBy(req) };
    if (semesterId) where.semesterId = String(semesterId);
    if (courseId) where.courseId = String(courseId);
    if (category) where.category = String(category);

    if (start && end) {
      where.AND = [
        {
          OR: [
            {
              startDate: {
                gte: new Date(String(start)),
                lte: new Date(String(end)),
              },
            },
            {
              endDate: {
                gte: new Date(String(start)),
                lte: new Date(String(end)),
              },
            },
          ],
        },
      ];
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startDate: 'asc' },
      include: {
        course: { select: { id: true, code: true, title: true, color: true } },
        semester: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
};

router.get('/', handleListEvents);
router.get('/events', handleListEvents);

// Format RFC 5545 ICS date helper (UTC YYYYMMDDTHHmmssZ)
function toIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcs(str: string): string {
  return (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

// Export Calendar as valid .ics (RFC 5545) or CSV
router.get('/export', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { format = 'ics', semesterId, courseId } = req.query;
    const where: any = { ...ownedBy(req) };
    if (semesterId) where.semesterId = String(semesterId);
    if (courseId) where.courseId = String(courseId);

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startDate: 'asc' },
      include: {
        course: { select: { code: true, title: true } },
        semester: { select: { name: true } },
      },
    });

    if (format === 'csv') {
      const headers = ['Title', 'Category', 'Priority', 'Start Time', 'End Time', 'Course', 'Semester', 'Location', 'Completed', 'Notes'];
      const rows = events.map((e) => [
        `"${(e.title || '').replace(/"/g, '""')}"`,
        `"${e.category}"`,
        `"${e.priority}"`,
        `"${e.startDate.toISOString()}"`,
        `"${e.endDate.toISOString()}"`,
        `"${(e.course?.code || '').replace(/"/g, '""')}"`,
        `"${(e.semester?.name || '').replace(/"/g, '""')}"`,
        `"${(e.location || '').replace(/"/g, '""')}"`,
        `"${e.isCompleted ? 'YES' : 'NO'}"`,
        `"${(e.notes || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="academic_calendar.csv"');
      return res.send(csvContent);
    }

    // Default: RFC 5545 iCalendar (.ics)
    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//BornoFlow//Academic Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Academic Calendar',
      'X-WR-TIMEZONE:Asia/Dhaka',
    ];

    const nowStr = toIcsDate(new Date());

    for (const evt of events) {
      icsLines.push('BEGIN:VEVENT');
      icsLines.push(`UID:event-${evt.id}@scholarflow.local`);
      icsLines.push(`DTSTAMP:${nowStr}`);
      icsLines.push(`DTSTART:${toIcsDate(new Date(evt.startDate))}`);
      icsLines.push(`DTEND:${toIcsDate(new Date(evt.endDate))}`);
      icsLines.push(`SUMMARY:${escapeIcs(evt.title)}`);
      if (evt.description) icsLines.push(`DESCRIPTION:${escapeIcs(evt.description)}`);
      if (evt.location) icsLines.push(`LOCATION:${escapeIcs(evt.location)}`);
      icsLines.push(`CATEGORIES:${escapeIcs(evt.category)}`);
      icsLines.push(`STATUS:${evt.isCompleted ? 'COMPLETED' : 'CONFIRMED'}`);
      if (evt.priority === 'URGENT' || evt.priority === 'HIGH') {
        icsLines.push('PRIORITY:1');
      } else if (evt.priority === 'LOW') {
        icsLines.push('PRIORITY:9');
      } else {
        icsLines.push('PRIORITY:5');
      }
      if (evt.recurrenceRule) {
        icsLines.push(`RRULE:${evt.recurrenceRule}`);
      }
      icsLines.push('END:VEVENT');
    }

    icsLines.push('END:VCALENDAR');
    const icsContent = icsLines.join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="academic_calendar.ics"');
    return res.send(icsContent);
  } catch (error) {
    next(error);
  }
});

// Identify overlapping exams, events, and study sessions + cluster warnings
router.get('/conflicts', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const activeEvents = await prisma.calendarEvent.findMany({
      where: {
        ...ownedBy(req),
        endDate: { gte: now },
        isCompleted: false,
      },
      orderBy: { startDate: 'asc' },
      include: {
        course: { select: { code: true, title: true } },
      },
    });

    const conflicts: Array<{
      type: 'OVERLAP' | 'DEADLINE_CLUSTER';
      event1: any;
      event2: any;
      severity: 'WARNING' | 'CRITICAL';
      message: string;
    }> = [];

    for (let i = 0; i < activeEvents.length; i++) {
      for (let j = i + 1; j < activeEvents.length; j++) {
        const e1 = activeEvents[i];
        const e2 = activeEvents[j];

        const start1 = new Date(e1.startDate).getTime();
        const end1 = new Date(e1.endDate).getTime();
        const start2 = new Date(e2.startDate).getTime();
        const end2 = new Date(e2.endDate).getTime();

        // Direct time overlap
        if (start2 < end1 && end2 > start1) {
          const isExamOverlap = (e1.category === 'MIDTERM' || e1.category === 'FINAL' || e1.category === 'QUIZ') &&
                                (e2.category === 'MIDTERM' || e2.category === 'FINAL' || e2.category === 'QUIZ');
          conflicts.push({
            type: 'OVERLAP',
            event1: { id: e1.id, title: e1.title, startDate: e1.startDate, category: e1.category },
            event2: { id: e2.id, title: e2.title, startDate: e2.startDate, category: e2.category },
            severity: isExamOverlap ? 'CRITICAL' : 'WARNING',
            message: `Overlapping schedule: "${e1.title}" and "${e2.title}" coincide between ${e1.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} and ${e1.endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          });
        }
        // Deadline clustering: multiple assessments or deadlines within 24 hours
        else if (Math.abs(start2 - start1) < 24 * 60 * 60 * 1000) {
          const isAssessment1 = ['ASSIGNMENT', 'PROJECT', 'MIDTERM', 'FINAL', 'QUIZ'].includes(e1.category);
          const isAssessment2 = ['ASSIGNMENT', 'PROJECT', 'MIDTERM', 'FINAL', 'QUIZ'].includes(e2.category);

          if (isAssessment1 && isAssessment2) {
            conflicts.push({
              type: 'DEADLINE_CLUSTER',
              event1: { id: e1.id, title: e1.title, startDate: e1.startDate, category: e1.category },
              event2: { id: e2.id, title: e2.title, startDate: e2.startDate, category: e2.category },
              severity: 'WARNING',
              message: `Tight deadlines: "${e1.title}" and "${e2.title}" are scheduled less than 24 hours apart.`,
            });
          }
        }
      }
    }

    res.json({ success: true, data: conflicts });
  } catch (error) {
    next(error);
  }
});

// In-app reminders feed: check active events starting in the next 24-48 hours
router.get('/reminders', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const inTwoDays = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const upcomingEvents = await prisma.calendarEvent.findMany({
      where: {
        ...ownedBy(req),
        startDate: {
          gte: now,
          lte: inTwoDays,
        },
        isCompleted: false,
      },
      orderBy: { startDate: 'asc' },
      include: {
        course: { select: { code: true, title: true, color: true } },
      },
    });

    res.json({ success: true, data: upcomingEvents });
  } catch (error) {
    next(error);
  }
});

// Reschedule an event with date validation
router.patch('/:id/reschedule', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      throw new AppError('startDate and endDate are required', 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError('Invalid date format', 400);
    }

    if (end < start) {
      throw new AppError('End date cannot precede start date', 400);
    }

    const existing = await prisma.calendarEvent.findFirst({ where: { id, ...ownedBy(req) } });
    if (!existing) throw new AppError('Event not found', 404);

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: {
        startDate: start,
        endDate: end,
      },
      include: {
        course: true,
        semester: true,
      },
    });

    await syncCalendarEventReminders(id);

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// Create event
const handleCreateEvent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const {
      semesterId,
      courseId,
      title,
      description,
      startDate,
      endDate,
      isAllDay,
      category,
      priority,
      isCompleted,
      location,
      notes,
      reminderMinutesBefore,
      recurrenceRule,
    } = req.body;

    const validated = await validateSemesterCourseConsistency(courseId, semesterId);

    const event = await prisma.calendarEvent.create({
      data: {
        semesterId: validated.semesterId,
        courseId: validated.courseId,
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isAllDay: !!isAllDay,
        category,
        priority,
        isCompleted: !!isCompleted,

        location,
        notes,
        reminderMinutesBefore: reminderMinutesBefore !== undefined ? reminderMinutesBefore : 60,
        recurrenceRule: recurrenceRule || null,
        userId: ownerId(req),
      },
      include: {
        course: true,
        semester: true,
      },
    });

    await syncCalendarEventReminders(event.id);

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
};

router.post('/', validate(createEventSchema), handleCreateEvent);
router.post('/events', validate(createEventSchema), handleCreateEvent);

// Update event (supports both PUT and PATCH)
const handleUpdateEvent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      semesterId,
      courseId,
      title,
      description,
      startDate,
      endDate,
      isAllDay,
      category,
      priority,
      isCompleted,
      location,
      notes,
      reminderMinutesBefore,
      recurrenceRule,
    } = req.body;

    const existing = await prisma.calendarEvent.findFirst({ where: { id, ...ownedBy(req) } });
    if (!existing) throw new AppError('Event not found', 404);

    const updateData: any = {};

    if (courseId !== undefined || semesterId !== undefined) {
      const targetCourseId = courseId !== undefined ? courseId : existing.courseId;
      const targetSemesterId = semesterId !== undefined ? semesterId : existing.semesterId;
      const validated = await validateSemesterCourseConsistency(targetCourseId, targetSemesterId);
      if (validated.courseId) {
        const ownedCourse = await prisma.course.findFirst({
          where: { id: validated.courseId, ...ownedBy(req) },
        });
        if (!ownedCourse) throw new AppError('Course not found', 404);
      }
      if (validated.semesterId) {
        const ownedSemester = await prisma.semester.findFirst({
          where: { id: validated.semesterId, ...ownedBy(req) },
        });
        if (!ownedSemester) throw new AppError('Semester not found', 404);
      }
      updateData.courseId = validated.courseId;
      updateData.semesterId = validated.semesterId;
    }

    if (title !== undefined) updateData.title = title;

    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (isAllDay !== undefined) updateData.isAllDay = isAllDay;
    if (category !== undefined) updateData.category = category;
    if (priority !== undefined) updateData.priority = priority;
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;
    if (location !== undefined) updateData.location = location;
    if (notes !== undefined) updateData.notes = notes;
    if (reminderMinutesBefore !== undefined) updateData.reminderMinutesBefore = reminderMinutesBefore;
    if (recurrenceRule !== undefined) updateData.recurrenceRule = recurrenceRule;

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: updateData,
      include: {
        course: true,
        semester: true,
      },
    });

    await syncCalendarEventReminders(id);

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

router.put('/:id', validate(updateEventSchema), handleUpdateEvent);
router.patch('/:id', validate(updateEventSchema), handleUpdateEvent);
router.patch('/events/:id', validate(updateEventSchema), handleUpdateEvent);

// Toggle complete
router.patch('/:id/toggle', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.calendarEvent.findFirst({ where: { id, ...ownedBy(req) } });
    if (!existing) throw new AppError('Event not found', 404);

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: { isCompleted: !existing.isCompleted },
    });

    await syncCalendarEventReminders(id);

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// Delete event
const handleDeleteEvent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.calendarEvent.findFirst({ where: { id, ...ownedBy(req) } });
    if (!existing) throw new AppError('Event not found', 404);
    await cancelRemindersForTarget('CALENDAR_EVENT', id);
    await prisma.calendarEvent.delete({ where: { id } });
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    next(error);
  }
};

router.delete('/:id', handleDeleteEvent);
router.delete('/events/:id', handleDeleteEvent);


export default router;
