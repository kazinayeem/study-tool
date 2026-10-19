import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';

const router = Router();

// GET /api/dashboard/preferences - Get user dashboard preferences
router.get('/preferences', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    let pref = await prisma.dashboardPreference.findUnique({
      where: { id: 'default' },
    });

    if (!pref) {
      pref = await prisma.dashboardPreference.create({
        data: {
          id: 'default',
          widgetOrder: JSON.stringify([
            'activeSemester',
            'statsOverview',
            'academicProgress',
            'upcomingDeadlines',
            'todaySessions',
            'weeklyProgress',
            'recentNotes',
            'recentDocuments',
            'calendarEvents',
          ]),
          hiddenWidgets: JSON.stringify([]),
          defaultView: 'today',
        },
      });
    }

    res.json({
      success: true,
      data: {
        ...pref,
        widgetOrder: JSON.parse(pref.widgetOrder || '[]'),
        hiddenWidgets: JSON.parse(pref.hiddenWidgets || '[]'),
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/dashboard/preferences - Update user dashboard preferences
router.put('/preferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { widgetOrder, hiddenWidgets, defaultView, selectedSemesterId, selectedCourseId } = req.body;

    const updated = await prisma.dashboardPreference.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        widgetOrder: JSON.stringify(widgetOrder || []),
        hiddenWidgets: JSON.stringify(hiddenWidgets || []),
        defaultView: defaultView || 'today',
        selectedSemesterId: selectedSemesterId || null,
        selectedCourseId: selectedCourseId || null,
      },
      update: {
        ...(widgetOrder !== undefined && { widgetOrder: JSON.stringify(widgetOrder) }),
        ...(hiddenWidgets !== undefined && { hiddenWidgets: JSON.stringify(hiddenWidgets) }),
        ...(defaultView !== undefined && { defaultView }),
        ...(selectedSemesterId !== undefined && { selectedSemesterId }),
        ...(selectedCourseId !== undefined && { selectedCourseId }),
      },
    });

    res.json({
      success: true,
      data: {
        ...updated,
        widgetOrder: JSON.parse(updated.widgetOrder || '[]'),
        hiddenWidgets: JSON.parse(updated.hiddenWidgets || '[]'),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard - Main dashboard metrics with real data and filtering
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { semesterId, courseId, view = 'today' } = req.query as {
      semesterId?: string;
      courseId?: string;
      view?: string;
    };

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Calculate start & end of current week (Monday to Sunday)
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // 1. App settings & Active semester
    const settings = await prisma.appSetting.findUnique({ where: { id: 'default' } });
    let activeSemester = null;

    if (semesterId) {
      activeSemester = await prisma.semester.findUnique({
        where: { id: semesterId },
        include: {
          courses: {
            where: courseId ? { id: courseId } : undefined,
            include: {
              _count: {
                select: { documents: true, notes: true, assignments: true, exams: true },
              },
            },
          },
        },
      });
    } else if (settings?.currentSemesterId) {
      activeSemester = await prisma.semester.findUnique({
        where: { id: settings.currentSemesterId },
        include: {
          courses: {
            include: {
              _count: {
                select: { documents: true, notes: true, assignments: true, exams: true },
              },
            },
          },
        },
      });
    }

    if (!activeSemester) {
      activeSemester = await prisma.semester.findFirst({
        where: { status: 'ACTIVE', isArchived: false },
        include: {
          courses: {
            where: courseId ? { id: courseId } : undefined,
            include: {
              _count: {
                select: { documents: true, notes: true, assignments: true, exams: true },
              },
            },
          },
        },
      });
    }

    const effectiveSemesterId = semesterId || activeSemester?.id;

    // 2. High level counts (real calculations)
    const [totalSemesters, totalCourses, totalDocuments, totalNotes] = await Promise.all([
      prisma.semester.count({ where: { isArchived: false } }),
      prisma.course.count(effectiveSemesterId ? { where: { semesterId: effectiveSemesterId } } : undefined),
      prisma.document.count(effectiveSemesterId ? { where: { semesterId: effectiveSemesterId } } : undefined),
      prisma.note.count(effectiveSemesterId ? { where: { semesterId: effectiveSemesterId } } : undefined),
    ]);

    // 3. Upcoming exams (filtered by semester/course and time view)
    const examFilter: any = {};
    if (effectiveSemesterId) examFilter.semesterId = effectiveSemesterId;
    if (courseId) examFilter.courseId = courseId;

    if (view === 'today') {
      examFilter.examDate = { gte: startOfToday, lte: endOfToday };
    } else if (view === 'week') {
      examFilter.examDate = { gte: startOfToday, lte: endOfWeek };
    } else {
      examFilter.examDate = { gte: now };
    }

    const upcomingExams = await prisma.exam.findMany({
      where: examFilter,
      orderBy: { examDate: 'asc' },
      take: 8,
      include: {
        course: { select: { id: true, code: true, title: true, color: true } },
        semester: { select: { id: true, name: true } },
        checklist: true,
      },
    });

    // 4. Upcoming assignments (not completed, sorted by deadline)
    const assignmentFilter: any = {
      status: { not: 'COMPLETED' },
    };
    if (effectiveSemesterId) assignmentFilter.semesterId = effectiveSemesterId;
    if (courseId) assignmentFilter.courseId = courseId;

    if (view === 'today') {
      assignmentFilter.deadline = { gte: startOfToday, lte: endOfToday };
    } else if (view === 'week') {
      assignmentFilter.deadline = { gte: startOfToday, lte: endOfWeek };
    } else {
      assignmentFilter.deadline = { gte: now };
    }

    const upcomingAssignments = await prisma.assignment.findMany({
      where: assignmentFilter,
      orderBy: { deadline: 'asc' },
      take: 8,
      include: {
        course: { select: { id: true, code: true, title: true, color: true } },
        checklist: true,
      },
    });

    // 5. Overdue assignments
    const overdueFilter: any = {
      status: { not: 'COMPLETED' },
      deadline: { lt: now },
    };
    if (effectiveSemesterId) overdueFilter.semesterId = effectiveSemesterId;
    if (courseId) overdueFilter.courseId = courseId;

    const overdueAssignments = await prisma.assignment.findMany({
      where: overdueFilter,
      orderBy: { deadline: 'asc' },
      take: 6,
      include: {
        course: { select: { code: true, color: true } },
      },
    });

    // 6. Recently opened documents
    const docFilter: any = {};
    if (effectiveSemesterId) docFilter.semesterId = effectiveSemesterId;
    if (courseId) docFilter.courseId = courseId;

    const recentDocuments = await prisma.document.findMany({
      where: docFilter,
      orderBy: [{ lastOpenedAt: 'desc' }, { updatedAt: 'desc' }],
      take: 6,
      include: {
        course: { select: { id: true, code: true, color: true } },
        semester: { select: { name: true } },
      },
    });

    // 7. Recently edited notes
    const noteFilter: any = {};
    if (effectiveSemesterId) noteFilter.semesterId = effectiveSemesterId;
    if (courseId) noteFilter.courseId = courseId;

    const recentNotes = await prisma.note.findMany({
      where: noteFilter,
      orderBy: { updatedAt: 'desc' },
      take: 6,
      include: {
        course: { select: { code: true, color: true } },
      },
    });

    // 8. Today's & Weekly Study Sessions
    const sessionDateFilter = view === 'week'
      ? { scheduledDate: { gte: startOfWeek, lte: endOfWeek } }
      : { scheduledDate: { gte: startOfToday, lte: endOfToday } };

    const studySessions = await prisma.studySession.findMany({
      where: {
        ...sessionDateFilter,
        ...(effectiveSemesterId && { semesterId: effectiveSemesterId }),
        ...(courseId && { courseId }),
      },
      orderBy: { scheduledDate: 'asc' },
      include: {
        course: { select: { code: true, color: true, title: true } },
        studyPlan: { select: { title: true } },
      },
    });

    // Weekly Study Progress
    const weekSessions = await prisma.studySession.findMany({
      where: {
        scheduledDate: { gte: startOfWeek, lte: endOfWeek },
        ...(effectiveSemesterId && { semesterId: effectiveSemesterId }),
      },
    });

    const totalPlannedMinutes = weekSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const totalActualMinutes = weekSessions.reduce((acc, s) => acc + s.actualDurationMinutes, 0);
    const completedSessionsCount = weekSessions.filter((s) => s.isCompleted || s.status === 'COMPLETED').length;

    // 9. Calendar Events
    const calFilter: any = {};
    if (effectiveSemesterId) calFilter.semesterId = effectiveSemesterId;
    if (courseId) calFilter.courseId = courseId;

    if (view === 'today') {
      calFilter.OR = [
        { startDate: { gte: startOfToday, lte: endOfToday } },
        { endDate: { gte: startOfToday, lte: endOfToday } },
      ];
    } else if (view === 'week') {
      calFilter.OR = [
        { startDate: { gte: startOfWeek, lte: endOfWeek } },
        { endDate: { gte: startOfWeek, lte: endOfWeek } },
      ];
    } else {
      calFilter.startDate = { gte: now };
    }

    const calendarEvents = await prisma.calendarEvent.findMany({
      where: calFilter,
      orderBy: { startDate: 'asc' },
      take: 6,
      include: {
        course: { select: { code: true, color: true } },
      },
    });

    // 10. Class photos count for active semester
    const classPhotoCount = await prisma.classPhoto.count({
      where: effectiveSemesterId ? { session: { semesterId: effectiveSemesterId } } : undefined,
    });

    // 11. Active course progress breakdown
    const activeCourses = await prisma.course.findMany({
      where: effectiveSemesterId ? { semesterId: effectiveSemesterId } : undefined,
      select: {
        id: true,
        code: true,
        title: true,
        color: true,
        credits: true,
        progress: true,
        _count: {
          select: { assignments: true, exams: true, notes: true, documents: true },
        },
      },
    });

    const avgProgress = activeCourses.length > 0
      ? Math.round(activeCourses.reduce((acc, c) => acc + c.progress, 0) / activeCourses.length)
      : 0;

    const completedAssignmentsCount = await prisma.assignment.count({
      where: {
        status: 'COMPLETED',
        ...(effectiveSemesterId && { semesterId: effectiveSemesterId }),
      },
    });

    const totalAssignmentsCount = await prisma.assignment.count({
      where: effectiveSemesterId ? { semesterId: effectiveSemesterId } : undefined,
    });

    // 12. Today's Focus items
    const [tasksDueToday, todayStudySessions, todayPhotos] = await Promise.all([
      prisma.assignment.findMany({
        where: {
          deadline: { gte: startOfToday, lte: endOfToday },
          status: { not: 'COMPLETED' },
          ...(effectiveSemesterId && { semesterId: effectiveSemesterId }),
        },
        include: {
          course: { select: { code: true, color: true } },
        },
      }),
      prisma.studySession.findMany({
        where: {
          scheduledDate: { gte: startOfToday, lte: endOfToday },
          ...(effectiveSemesterId && { semesterId: effectiveSemesterId }),
        },
        orderBy: { scheduledDate: 'asc' },
        include: {
          course: { select: { code: true, color: true, title: true } },
          studyPlan: { select: { title: true } },
        },
      }),
      prisma.classPhoto.findMany({
        where: {
          createdAt: { gte: startOfToday, lte: endOfToday },
          ...(effectiveSemesterId && { session: { semesterId: effectiveSemesterId } }),
        },
        take: 4,
        include: {
          session: {
            select: { id: true, topic: true, course: { select: { code: true, color: true } } },
          },
        },
      }),
    ]);

    // 13. Recent activities timeline
    const [recentAssignments, recentBoardPhotos] = await Promise.all([
      prisma.assignment.findMany({
        where: effectiveSemesterId ? { semesterId: effectiveSemesterId } : undefined,
        orderBy: { updatedAt: 'desc' },
        take: 4,
        include: { course: { select: { code: true, color: true } } },
      }),
      prisma.classPhoto.findMany({
        where: effectiveSemesterId ? { session: { semesterId: effectiveSemesterId } } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 4,
        include: {
          session: {
            select: { id: true, topic: true, course: { select: { code: true, color: true } } },
          },
        },
      }),
    ]);

    // Unified recent activity list
    const combinedActivity: Array<{
      id: string;
      type: 'ASSIGNMENT' | 'NOTE' | 'DOCUMENT' | 'PHOTO';
      title: string;
      courseCode?: string;
      courseColor?: string;
      timestamp: Date;
      detail?: string;
      link: string;
    }> = [];

    recentAssignments.forEach((a) => {
      combinedActivity.push({
        id: a.id,
        type: 'ASSIGNMENT',
        title: a.title,
        courseCode: a.course?.code,
        courseColor: a.course?.color,
        timestamp: a.updatedAt,
        detail: a.status,
        link: '/assignments',
      });
    });

    recentNotes.forEach((n) => {
      combinedActivity.push({
        id: n.id,
        type: 'NOTE',
        title: n.title,
        courseCode: n.course?.code,
        courseColor: n.course?.color,
        timestamp: n.updatedAt,
        detail: 'Note',
        link: `/notes?id=${n.id}`,
      });
    });

    recentDocuments.forEach((d) => {
      combinedActivity.push({
        id: d.id,
        type: 'DOCUMENT',
        title: d.title,
        courseCode: d.course?.code,
        courseColor: d.course?.color,
        timestamp: d.updatedAt,
        detail: d.category,
        link: `/documents/${d.id}/view`,
      });
    });

    recentBoardPhotos.forEach((p) => {
      combinedActivity.push({
        id: p.id,
        type: 'PHOTO',
        title: p.session?.topic || 'Class Board Photo',
        courseCode: p.session?.course?.code,
        courseColor: p.session?.course?.color,
        timestamp: p.createdAt,
        detail: 'Board Photo',
        link: `/journal?semesterId=${effectiveSemesterId || ''}`,
      });
    });

    combinedActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 14. Semester GPA calculation
    let semesterGpa: number | null = null;
    try {
      if (effectiveSemesterId) {
        const assessments = await prisma.assessment.findMany({
          where: { semesterId: effectiveSemesterId },
          include: { course: true },
        });

        if (assessments.length > 0) {
          let scale = await prisma.gradeScale.findUnique({ where: { id: 'default' } });
          const scaleData = scale ? JSON.parse(scale.scaleData) : [];
          // Group by course
          const byCourse: Record<string, { totalEarned: number; totalWeight: number; credits: number }> = {};
          assessments.forEach((ass) => {
            if (!byCourse[ass.courseId]) {
              byCourse[ass.courseId] = { totalEarned: 0, totalWeight: 0, credits: ass.course.credits || 3 };
            }
            if (ass.obtainedMarks !== null && ass.maxMarks > 0) {
              const weight = ass.weight || 10;
              const pct = (ass.obtainedMarks / ass.maxMarks) * weight;
              byCourse[ass.courseId].totalEarned += pct;
              byCourse[ass.courseId].totalWeight += weight;
            }
          });

          let totalQualityPoints = 0;
          let totalCredits = 0;
          Object.values(byCourse).forEach((c) => {
            if (c.totalWeight > 0) {
              const finalScore = (c.totalEarned / c.totalWeight) * 100;
              const sorted = [...scaleData].sort((a: any, b: any) => b.minMarks - a.minMarks);
              let points = 0;
              for (const item of sorted) {
                if (finalScore >= item.minMarks) {
                  points = item.points;
                  break;
                }
              }
              totalQualityPoints += points * c.credits;
              totalCredits += c.credits;
            }
          });

          if (totalCredits > 0) {
            semesterGpa = parseFloat((totalQualityPoints / totalCredits).toFixed(2));
          }
        }
      }
    } catch {
      semesterGpa = null;
    }

    res.json({
      success: true,
      data: {
        activeSemester,
        activeCourses,
        stats: {
          totalSemesters,
          totalCourses,
          totalDocuments,
          totalNotes,
          classPhotoCount,
          overdueCount: overdueAssignments.length,
          avgProgress,
          completedAssignmentsCount,
          totalAssignmentsCount,
          pendingAssignmentsCount: totalAssignmentsCount - completedAssignmentsCount,
          upcomingExamsCount: upcomingExams.length,
          weeklyStudyMinutes: totalActualMinutes,
          weeklyPlannedMinutes: totalPlannedMinutes,
          completedSessionsCount,
          totalSessionsCount: weekSessions.length,
          semesterGpa,
        },
        upcomingExams: upcomingExams.map((e) => ({
          ...e,
          daysRemaining: Math.ceil((new Date(e.examDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        })),
        upcomingAssignments: upcomingAssignments.map((a) => {
          const diffMs = new Date(a.deadline).getTime() - now.getTime();
          return {
            ...a,
            daysRemaining: Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
            isOverdue: diffMs < 0,
          };
        }),
        overdueAssignments,
        recentDocuments,
        recentNotes,
        studySessions,
        todayEvents: calendarEvents,
        calendarEvents,
        todayFocus: {
          tasksDueToday,
          todaySessions: todayStudySessions,
          todayPhotos,
          examsUpcoming: upcomingExams.filter((e) => {
            const diffDays = Math.ceil((new Date(e.examDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 14;
          }),
        },
        recentActivity: combinedActivity.slice(0, 8),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

