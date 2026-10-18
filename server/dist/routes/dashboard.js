import { Router } from 'express';
import { prisma } from '../prisma.js';
const router = Router();
router.get('/', async (_req, res, next) => {
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        // 1. App settings & Active semester
        const settings = await prisma.appSetting.findUnique({ where: { id: 'default' } });
        let activeSemester = null;
        if (settings?.currentSemesterId) {
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
                        include: {
                            _count: {
                                select: { documents: true, notes: true, assignments: true, exams: true },
                            },
                        },
                    },
                },
            });
        }
        // 2. High level counts
        const [totalSemesters, totalCourses, totalDocuments, totalNotes] = await Promise.all([
            prisma.semester.count({ where: { isArchived: false } }),
            prisma.course.count(),
            prisma.document.count(),
            prisma.note.count(),
        ]);
        // 3. Upcoming exams (next 30 days)
        const upcomingExams = await prisma.exam.findMany({
            where: {
                examDate: { gte: now },
            },
            orderBy: { examDate: 'asc' },
            take: 5,
            include: {
                course: { select: { id: true, code: true, title: true, color: true } },
                semester: { select: { id: true, name: true } },
                checklist: true,
            },
        });
        // 4. Upcoming assignments (not completed, sorted by deadline)
        const upcomingAssignments = await prisma.assignment.findMany({
            where: {
                status: { not: 'COMPLETED' },
            },
            orderBy: { deadline: 'asc' },
            take: 6,
            include: {
                course: { select: { id: true, code: true, title: true, color: true } },
                checklist: true,
            },
        });
        // 5. Overdue tasks / assignments
        const overdueAssignments = await prisma.assignment.findMany({
            where: {
                status: { not: 'COMPLETED' },
                deadline: { lt: now },
            },
            include: {
                course: { select: { code: true, color: true } },
            },
        });
        // 6. Recently opened documents
        const recentDocuments = await prisma.document.findMany({
            orderBy: [{ lastOpenedAt: 'desc' }, { updatedAt: 'desc' }],
            take: 6,
            include: {
                course: { select: { id: true, code: true, color: true } },
                semester: { select: { name: true } },
            },
        });
        // 7. Recently edited notes
        const recentNotes = await prisma.note.findMany({
            orderBy: { updatedAt: 'desc' },
            take: 5,
            include: {
                course: { select: { code: true, color: true } },
            },
        });
        // 8. Today's events and study schedule
        const todayEvents = await prisma.calendarEvent.findMany({
            where: {
                OR: [
                    {
                        startDate: { gte: startOfToday, lte: endOfToday },
                    },
                    {
                        endDate: { gte: startOfToday, lte: endOfToday },
                    },
                ],
            },
            orderBy: { startDate: 'asc' },
            include: {
                course: { select: { code: true, color: true } },
            },
        });
        // 9. Academic progress calculation
        const courses = await prisma.course.findMany({
            select: { progress: true },
        });
        const avgProgress = courses.length > 0
            ? Math.round(courses.reduce((acc, c) => acc + c.progress, 0) / courses.length)
            : 0;
        const completedAssignmentsCount = await prisma.assignment.count({
            where: { status: 'COMPLETED' },
        });
        const totalAssignmentsCount = await prisma.assignment.count();
        res.json({
            success: true,
            data: {
                activeSemester,
                stats: {
                    totalSemesters,
                    totalCourses,
                    totalDocuments,
                    totalNotes,
                    overdueCount: overdueAssignments.length,
                    avgProgress,
                    completedAssignmentsCount,
                    totalAssignmentsCount,
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
                todayEvents,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
export default router;
