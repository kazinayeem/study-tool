import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validateSemesterCourseConsistency } from '../utils/academicValidation.js';
import { ownedBy, ownerId } from '../middleware/ownership.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';


const router = Router();

// 1. GET /api/planner/plans - List all study plans
router.get('/plans', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { semesterId, courseId, status } = req.query as {
      semesterId?: string;
      courseId?: string;
      status?: string;
    };

    const plans = await prisma.studyPlan.findMany({
      where: {
        ...ownedBy(req),
        ...(semesterId && { semesterId }),
        ...(courseId && { courseId }),
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, code: true, title: true, color: true } },
        targetExam: { select: { id: true, title: true, examDate: true, examType: true } },
        targetAssignment: { select: { id: true, title: true, deadline: true } },
        sessions: {
          orderBy: { scheduledDate: 'asc' },
        },
      },
    });

    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
});

const planCreateSchema = z.object({
  semesterId: z.string().min(1, 'Semester ID is required'),
  courseId: z.string().optional().nullable(),
  title: z.string().min(1, 'Title is required'),
  targetExamId: z.string().optional().nullable(),
  targetAssignmentId: z.string().optional().nullable(),
  topics: z.string().optional().nullable(),
  difficulty: z.number().min(1).max(5).default(3),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  estimatedHours: z.number().positive().default(10.0),
  availableHoursPerWeek: z.number().positive().default(15.0),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  sessionDurationMinutes: z.number().default(60),
});

// Helper: Conflict detection with CalendarEvent
async function checkCalendarConflicts(start: Date, end: Date, req: AuthenticatedRequest) {
  const conflicts = await prisma.calendarEvent.findMany({
    where: {
      ...ownedBy(req),
      OR: [
        { startDate: { lte: start }, endDate: { gte: start } },
        { startDate: { lte: end }, endDate: { gte: end } },
        { startDate: { gte: start }, endDate: { lte: end } },
      ],
    },
    select: { id: true, title: true, startDate: true, endDate: true, category: true },
  });
  return conflicts;
}

// 2. POST /api/planner/plans - Create study plan & generate transparent schedule
router.post('/plans', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validated = planCreateSchema.parse(req.body);

    const start = new Date(validated.startDate);
    const end = new Date(validated.endDate);

    if (end <= start) {
      return res.status(400).json({ success: false, error: 'End date must be after start date' });
    }

    const academicValid = await validateSemesterCourseConsistency(validated.courseId, validated.semesterId);

    const planSemesterId = academicValid.semesterId || validated.semesterId;
    const ownedSemester = await prisma.semester.findFirst({
      where: { id: planSemesterId, ...ownedBy(req) },
      select: { id: true },
    });
    if (!ownedSemester) {
      throw new AppError('Semester not found', 404);
    }
    if (academicValid.courseId) {
      const ownedCourse = await prisma.course.findFirst({
        where: { id: academicValid.courseId, ...ownedBy(req) },
        select: { id: true },
      });
      if (!ownedCourse) {
        throw new AppError('Course not found', 404);
      }
    }
    if (validated.targetExamId) {
      const ownedExam = await prisma.exam.findFirst({
        where: { id: validated.targetExamId, ...ownedBy(req) },
        select: { id: true },
      });
      if (!ownedExam) {
        throw new AppError('Exam not found', 404);
      }
    }
    if (validated.targetAssignmentId) {
      const ownedAssignment = await prisma.assignment.findFirst({
        where: { id: validated.targetAssignmentId, ...ownedBy(req) },
        select: { id: true },
      });
      if (!ownedAssignment) {
        throw new AppError('Assignment not found', 404);
      }
    }

    // Create the plan
    const plan = await prisma.studyPlan.create({
      data: {
        semesterId: academicValid.semesterId || validated.semesterId,
        courseId: academicValid.courseId || null,
        title: validated.title,

        targetExamId: validated.targetExamId || null,
        targetAssignmentId: validated.targetAssignmentId || null,
        topics: validated.topics || null,
        difficulty: validated.difficulty,
        priority: validated.priority,
        estimatedHours: validated.estimatedHours,
        availableHoursPerWeek: validated.availableHoursPerWeek,
        startDate: start,
        endDate: end,
        status: 'ACTIVE',
        userId: ownerId(req),
      },
    });

    // Schedule generation logic (transparent and editable)
    const sessionDuration = validated.sessionDurationMinutes || 60;
    const totalSessions = Math.max(1, Math.ceil((validated.estimatedHours * 60) / sessionDuration));
    const daySpan = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const intervalDays = Math.max(1, Math.floor(daySpan / totalSessions));

    const topicList = (validated.topics || '')
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);

    const generatedSessions: any[] = [];
    const conflictWarnings: any[] = [];

    let curDate = new Date(start);
    // Prefer evening study time by default (18:00)
    curDate.setHours(18, 0, 0, 0);

    for (let i = 0; i < totalSessions; i++) {
      if (curDate > end) break;

      const plannedStart = new Date(curDate);
      const plannedEnd = new Date(curDate.getTime() + sessionDuration * 60 * 1000);

      // Check conflict with calendar events
      const conflicts = await checkCalendarConflicts(plannedStart, plannedEnd, req);
      if (conflicts.length > 0) {
        conflictWarnings.push({
          sessionIndex: i + 1,
          date: plannedStart.toISOString(),
          conflictsWith: conflicts.map((c) => c.title),
        });
      }

      const topicName = topicList.length > 0
        ? topicList[i % topicList.length]
        : `Session ${i + 1}: ${validated.title}`;

      const session = await prisma.studySession.create({
        data: {
          userId: ownerId(req),
          semesterId: validated.semesterId,
          courseId: validated.courseId || null,
          studyPlanId: plan.id,
          examId: validated.targetExamId || null,
          assignmentId: validated.targetAssignmentId || null,
          title: `${validated.title} — Part ${i + 1}`,
          topic: topicName,
          scheduledDate: plannedStart,
          plannedStartTime: plannedStart,
          plannedEndTime: plannedEnd,
          durationMinutes: sessionDuration,
          priority: validated.priority,
          status: 'SCHEDULED',
        },
      });

      generatedSessions.push(session);

      // Advance by intervalDays
      curDate = new Date(curDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    }

    res.status(201).json({
      success: true,
      data: {
        plan,
        sessions: generatedSessions,
        conflictWarnings,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 3. DELETE /api/planner/plans/:id - Delete study plan & associated sessions
router.delete('/plans/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.studyPlan.findFirst({ where: { id, ...ownedBy(req) } });
    if (!existing) {
      throw new AppError('Study plan not found', 404);
    }
    await prisma.studySession.deleteMany({ where: { studyPlanId: id, ...ownedBy(req) } });
    await prisma.studyPlan.delete({ where: { id } });
    res.json({ success: true, message: 'Study plan and its scheduled sessions removed' });
  } catch (error) {
    next(error);
  }
});

// 4. GET /api/planner/sessions - List study sessions with flexible filters
router.get('/sessions', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { semesterId, courseId, studyPlanId, status, date, view = 'all' } = req.query as {
      semesterId?: string;
      courseId?: string;
      studyPlanId?: string;
      status?: string;
      date?: string;
      view?: string;
    };

    let dateFilter: any = {};
    if (date) {
      const target = new Date(date);
      const start = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0);
      const end = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59);
      dateFilter = { scheduledDate: { gte: start, lte: end } };
    } else if (view === 'today') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      dateFilter = { scheduledDate: { gte: start, lte: end } };
    } else if (view === 'week') {
      const now = new Date();
      const currentDay = now.getDay();
      const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() + distanceToMonday);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      dateFilter = { scheduledDate: { gte: startOfWeek, lte: endOfWeek } };
    }

    const sessions = await prisma.studySession.findMany({
      where: {
        ...ownedBy(req),
        ...dateFilter,
        ...(semesterId && { semesterId }),
        ...(courseId && { courseId }),
        ...(studyPlanId && { studyPlanId }),
        ...(status && { status }),
      },
      orderBy: { scheduledDate: 'asc' },
      include: {
        course: { select: { id: true, code: true, title: true, color: true } },
        studyPlan: { select: { id: true, title: true, priority: true } },
        exam: { select: { id: true, title: true, examDate: true } },
        assignment: { select: { id: true, title: true, deadline: true } },
      },
    });

    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
});

// 5. POST /api/planner/sessions - Create manual study session with conflict detection
router.post('/sessions', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      courseId,
      semesterId,
      studyPlanId,
      topic,
      scheduledDate,
      durationMinutes = 60,
      priority = 'MEDIUM',
      status = 'SCHEDULED',
      sessionType = 'STUDY',
      notes,
    } = req.body;

    if (!title || !scheduledDate) {
      return res.status(400).json({ success: false, error: 'Title and scheduledDate are required' });
    }

    // Timer collision check: prevent multiple overlapping active timers
    if (status === 'IN_PROGRESS') {
      const activeExisting = await prisma.studySession.findFirst({
        where: { status: 'IN_PROGRESS', ...ownedBy(req) },
      });
      if (activeExisting) {
        return res.status(409).json({
          success: false,
          error: 'Another study session is already running. Please pause or finish it before starting a new timer.',
          activeSessionId: activeExisting.id,
        });
      }
    }

    const start = new Date(scheduledDate);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    // Conflict check
    const conflicts = await checkCalendarConflicts(start, end, req);

    const academicValid = await validateSemesterCourseConsistency(courseId, semesterId);

    if (academicValid.semesterId) {
      const ownedSemester = await prisma.semester.findFirst({
        where: { id: academicValid.semesterId, ...ownedBy(req) },
        select: { id: true },
      });
      if (!ownedSemester) {
        throw new AppError('Semester not found', 404);
      }
    }
    if (academicValid.courseId) {
      const ownedCourse = await prisma.course.findFirst({
        where: { id: academicValid.courseId, ...ownedBy(req) },
        select: { id: true },
      });
      if (!ownedCourse) {
        throw new AppError('Course not found', 404);
      }
    }
    if (studyPlanId) {
      const ownedPlan = await prisma.studyPlan.findFirst({
        where: { id: studyPlanId, ...ownedBy(req) },
        select: { id: true },
      });
      if (!ownedPlan) {
        throw new AppError('Study plan not found', 404);
      }
    }

    const session = await prisma.studySession.create({
      data: {
        userId: ownerId(req),
        title,
        courseId: academicValid.courseId,
        semesterId: academicValid.semesterId,
        studyPlanId: studyPlanId || null,

        topic,
        scheduledDate: start,
        plannedStartTime: status === 'IN_PROGRESS' ? new Date() : start,
        plannedEndTime: end,
        durationMinutes,
        priority,
        status,
        sessionType,
        notes,
      },
      include: {
        course: { select: { id: true, code: true, title: true, color: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: session,
      conflictsWith: conflicts.length > 0 ? conflicts : undefined,
    });
  } catch (error) {
    next(error);
  }
});

// 6. PATCH /api/planner/sessions/:id - Update session status, pomodoro, or manual duration
router.patch('/sessions/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, actualDurationMinutes, pomodoroCount, notes, isCompleted, sessionType } = req.body;

    const existing = await prisma.studySession.findFirst({ where: { id, ...ownedBy(req) } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Study session not found' });
    }

    // Concurrency check when activating a timer
    if (status === 'IN_PROGRESS') {
      const activeExisting = await prisma.studySession.findFirst({
        where: { status: 'IN_PROGRESS', id: { not: id }, ...ownedBy(req) },
      });
      if (activeExisting) {
        return res.status(409).json({
          success: false,
          error: 'Another study timer is already running. Please pause or finish it first.',
          activeSessionId: activeExisting.id,
        });
      }
    }

    // Timestamp-based elapsed calculation if finishing
    let finalActualDuration = actualDurationMinutes !== undefined ? Number(actualDurationMinutes) : undefined;
    if ((status === 'COMPLETED' || isCompleted) && finalActualDuration === undefined && existing.status === 'IN_PROGRESS') {
      const startTime = existing.plannedStartTime ? new Date(existing.plannedStartTime).getTime() : new Date(existing.updatedAt).getTime();
      const elapsedMinutes = Math.max(1, Math.round((Date.now() - startTime) / (1000 * 60)));
      finalActualDuration = elapsedMinutes;
    }

    const updateData: any = {};
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'IN_PROGRESS' && !existing.plannedStartTime) {
        updateData.plannedStartTime = new Date();
      }
    }
    if (finalActualDuration !== undefined) updateData.actualDurationMinutes = finalActualDuration;
    if (pomodoroCount !== undefined) updateData.pomodoroCount = Number(pomodoroCount);
    if (notes !== undefined) updateData.notes = notes;
    if (sessionType !== undefined) updateData.sessionType = sessionType;
    if (isCompleted !== undefined) {
      updateData.isCompleted = isCompleted;
      if (isCompleted && !updateData.status) updateData.status = 'COMPLETED';
    }

    const updated = await prisma.studySession.update({
      where: { id },
      data: updateData,
      include: {
        course: { select: { id: true, code: true, title: true, color: true } },
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// 7. DELETE /api/planner/sessions/:id - Delete study session
router.delete('/sessions/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.studySession.findFirst({ where: { id, ...ownedBy(req) } });
    if (!existing) {
      throw new AppError('Study session not found', 404);
    }
    await prisma.studySession.delete({ where: { id } });
    res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    next(error);
  }
});

// 8. GET /api/planner/stats - Study streak, completed vs missed, and time analytics
router.get('/stats', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const allSessions = await prisma.studySession.findMany({
      where: { ...ownedBy(req) },
      orderBy: { scheduledDate: 'desc' },
    });

    const completedSessions = allSessions.filter((s) => s.isCompleted || s.status === 'COMPLETED');
    const missedSessions = allSessions.filter((s) => s.status === 'MISSED' || (!s.isCompleted && s.scheduledDate < now));

    const totalPlannedMinutes = allSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const totalActualMinutes = allSessions.reduce((acc, s) => acc + s.actualDurationMinutes, 0);
    const totalPomodoros = allSessions.reduce((acc, s) => acc + s.pomodoroCount, 0);

    // Compute streak (consecutive days with at least one completed study session)
    let streakDays = 0;
    const completedDates = new Set(
      completedSessions.map((s) => s.scheduledDate.toISOString().split('T')[0])
    );

    let checkDate = new Date(now);
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (completedDates.has(dateStr)) {
        streakDays++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If today has no completed session yet, check yesterday before ending streak
        if (streakDays === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
          const yDateStr = checkDate.toISOString().split('T')[0];
          if (completedDates.has(yDateStr)) {
            streakDays++;
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
        }
        break;
      }
    }

    res.json({
      success: true,
      data: {
        totalSessionsCount: allSessions.length,
        completedCount: completedSessions.length,
        missedCount: missedSessions.length,
        totalPlannedMinutes,
        totalActualMinutes,
        totalPomodoros,
        streakDays,
        completionRate: allSessions.length > 0 ? Math.round((completedSessions.length / allSessions.length) * 100) : 0,
        // Legacy aliases consumed by the Study Planner page
        totalHoursLogged: Math.round((totalActualMinutes / 60) * 10) / 10,
        completedSessions: completedSessions.length,
        totalSessions: allSessions.length,
        missedSessions: missedSessions.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 9. GET /api/planner/sessions/active - Recover currently active timer after refresh
router.get('/sessions/active', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const activeSession = await prisma.studySession.findFirst({
      where: { status: 'IN_PROGRESS', ...ownedBy(req) },
      include: {
        course: { select: { id: true, code: true, title: true, color: true } },
      },
    });

    if (!activeSession) {
      return res.json({ success: true, data: null });
    }

    // Calculate elapsed time from stored timestamp
    const startTime = activeSession.plannedStartTime ? new Date(activeSession.plannedStartTime).getTime() : new Date(activeSession.updatedAt).getTime();
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));

    res.json({
      success: true,
      data: {
        ...activeSession,
        elapsedSeconds,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 10. GET /api/planner/analytics - Detailed Study Time Analytics
router.get('/analytics', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const allSessions = await prisma.studySession.findMany({
      where: { ...ownedBy(req) },
      include: {
        course: { select: { id: true, code: true, title: true, color: true } },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // Time boundaries
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const dayOfWeek = now.getDay();
    const distanceToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + distanceToMon);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    let todayMinutes = 0;
    let weekMinutes = 0;
    let monthMinutes = 0;
    let totalPlannedMinutes = 0;
    let totalActualMinutes = 0;

    const courseMap = new Map<string, { courseId: string; code: string; title: string; color: string; minutes: number; sessionCount: number }>();
    const topicMap = new Map<string, { topic: string; minutes: number; sessionCount: number }>();

    // Daily trends map for past 14 days
    const dailyMap = new Map<string, { date: string; minutes: number; sessionCount: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap.set(key, { date: key, minutes: 0, sessionCount: 0 });
    }

    const completed = allSessions.filter((s) => s.isCompleted || s.status === 'COMPLETED');

    for (const session of allSessions) {
      totalPlannedMinutes += session.durationMinutes || 0;
      const duration = session.actualDurationMinutes > 0 ? session.actualDurationMinutes : (session.isCompleted ? session.durationMinutes : 0);
      totalActualMinutes += duration;

      const sDate = new Date(session.scheduledDate);
      if (sDate >= todayStart && sDate <= todayEnd) {
        todayMinutes += duration;
      }
      if (sDate >= weekStart) {
        weekMinutes += duration;
      }
      if (sDate >= monthStart) {
        monthMinutes += duration;
      }

      // Course aggregation
      if (session.course) {
        const cKey = session.course.id;
        const existing = courseMap.get(cKey) || {
          courseId: session.course.id,
          code: session.course.code,
          title: session.course.title,
          color: session.course.color,
          minutes: 0,
          sessionCount: 0,
        };
        existing.minutes += duration;
        existing.sessionCount += 1;
        courseMap.set(cKey, existing);
      }

      // Topic aggregation
      const topicName = session.topic?.trim() || session.title.trim() || 'General Study';
      const existingTopic = topicMap.get(topicName) || { topic: topicName, minutes: 0, sessionCount: 0 };
      existingTopic.minutes += duration;
      existingTopic.sessionCount += 1;
      topicMap.set(topicName, existingTopic);

      // Daily trends (past 14 days)
      const dayKey = sDate.toISOString().split('T')[0];
      if (dailyMap.has(dayKey)) {
        const dEntry = dailyMap.get(dayKey)!;
        dEntry.minutes += duration;
        dEntry.sessionCount += 1;
      }
    }

    // Weekly Target Goal (default 20 hours = 1200 mins)
    const goal = await prisma.studyGoal.findFirst({ where: { id: 'default' } });
    const targetHours = goal?.weeklyTargetHours || 20;
    const targetMinutes = targetHours * 60;
    const targetProgressPercentage = Math.min(100, Math.round((weekMinutes / targetMinutes) * 100));

    const byCourse = Array.from(courseMap.values()).sort((a, b) => b.minutes - a.minutes);
    const byTopic = Array.from(topicMap.values()).sort((a, b) => b.minutes - a.minutes).slice(0, 10);
    const dailyTrends = Array.from(dailyMap.values());

    res.json({
      success: true,
      data: {
        todayMinutes,
        weekMinutes,
        monthMinutes,
        totalPlannedMinutes,
        totalActualMinutes,
        completedSessionsCount: completed.length,
        averageSessionDuration: completed.length > 0 ? Math.round(totalActualMinutes / completed.length) : 0,
        byCourse,
        byTopic,
        dailyTrends,
        weeklyGoal: {
          targetHours,
          targetMinutes,
          currentMinutes: weekMinutes,
          progressPercentage: targetProgressPercentage,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// 11. GET /api/planner/export.csv - CSV Export of Study Sessions
router.get('/export.csv', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sessions = await prisma.studySession.findMany({
      where: { ...ownedBy(req) },
      include: {
        course: { select: { code: true, title: true } },
      },
      orderBy: { scheduledDate: 'desc' },
    });

    const headers = ['Date', 'Title', 'Course', 'Topic', 'Planned Minutes', 'Actual Minutes', 'Pomodoros', 'Status', 'Notes'];
    const rows = sessions.map((s) => [
      `"${s.scheduledDate.toISOString().split('T')[0]}"`,
      `"${(s.title || '').replace(/"/g, '""')}"`,
      `"${(s.course?.code || '').replace(/"/g, '""')}"`,
      `"${(s.topic || '').replace(/"/g, '""')}"`,
      s.durationMinutes,
      s.actualDurationMinutes,
      s.pomodoroCount,
      `"${s.status}"`,
      `"${(s.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="study_analytics.csv"');
    return res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

// 12. GET & POST /api/planner/goal - Manage Weekly Study Target
router.get('/goal', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let goal = await prisma.studyGoal.findFirst({ where: { id: 'default' } });
    if (!goal) {
      goal = await prisma.studyGoal.create({
        data: { id: 'default', weeklyTargetHours: 20 },
      });
    }
    res.json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
});

router.post('/goal', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { weeklyTargetHours } = req.body;
    if (weeklyTargetHours === undefined || Number(weeklyTargetHours) <= 0) {
      return res.status(400).json({ success: false, error: 'Valid weeklyTargetHours is required' });
    }

    const updated = await prisma.studyGoal.upsert({
      where: { id: 'default' },
      create: { id: 'default', weeklyTargetHours: Number(weeklyTargetHours) },
      update: { weeklyTargetHours: Number(weeklyTargetHours) },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
