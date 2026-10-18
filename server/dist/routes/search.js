import { Router } from 'express';
import { prisma } from '../prisma.js';
const router = Router();
router.get('/', async (req, res, next) => {
    try {
        const q = req.query.q ? String(req.query.q).trim() : '';
        if (!q || q.length < 2) {
            return res.json({
                success: true,
                data: {
                    semesters: [],
                    courses: [],
                    documents: [],
                    notes: [],
                    assignments: [],
                    exams: [],
                    events: [],
                },
            });
        }
        const [semesters, courses, documents, notes, assignments, exams, events] = await Promise.all([
            prisma.semester.findMany({
                where: {
                    OR: [
                        { name: { contains: q } },
                        { code: { contains: q } },
                        { description: { contains: q } },
                    ],
                },
                take: 5,
                select: { id: true, name: true, code: true, status: true, color: true },
            }),
            prisma.course.findMany({
                where: {
                    OR: [
                        { code: { contains: q } },
                        { title: { contains: q } },
                        { teacherName: { contains: q } },
                        { description: { contains: q } },
                    ],
                },
                take: 8,
                include: {
                    semester: { select: { id: true, name: true } },
                },
            }),
            prisma.document.findMany({
                where: {
                    OR: [
                        { title: { contains: q } },
                        { originalFilename: { contains: q } },
                        { description: { contains: q } },
                        { category: { contains: q } },
                    ],
                },
                take: 8,
                include: {
                    course: { select: { id: true, code: true, title: true } },
                    semester: { select: { id: true, name: true } },
                },
            }),
            prisma.note.findMany({
                where: {
                    OR: [
                        { title: { contains: q } },
                        { content: { contains: q } },
                        { tags: { contains: q } },
                    ],
                },
                take: 8,
                include: {
                    course: { select: { id: true, code: true } },
                },
            }),
            prisma.assignment.findMany({
                where: {
                    OR: [
                        { title: { contains: q } },
                        { description: { contains: q } },
                    ],
                },
                take: 6,
                include: {
                    course: { select: { id: true, code: true } },
                },
            }),
            prisma.exam.findMany({
                where: {
                    OR: [
                        { title: { contains: q } },
                        { syllabus: { contains: q } },
                    ],
                },
                take: 6,
                include: {
                    course: { select: { id: true, code: true } },
                },
            }),
            prisma.calendarEvent.findMany({
                where: {
                    OR: [
                        { title: { contains: q } },
                        { description: { contains: q } },
                        { location: { contains: q } },
                    ],
                },
                take: 6,
                include: {
                    course: { select: { id: true, code: true } },
                },
            }),
        ]);
        res.json({
            success: true,
            data: {
                semesters,
                courses,
                documents,
                notes,
                assignments,
                exams,
                events,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
export default router;
