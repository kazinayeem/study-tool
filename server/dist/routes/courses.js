import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
const router = Router();
const createCourseSchema = z.object({
    body: z.object({
        semesterId: z.string().min(1, 'Semester ID is required'),
        code: z.string().min(1, 'Course code is required'),
        title: z.string().min(1, 'Course title is required'),
        credits: z.number().min(0).default(3.0),
        section: z.string().optional(),
        teacherName: z.string().optional(),
        teacherEmail: z.string().email().optional().or(z.literal('')),
        roomNumber: z.string().optional(),
        description: z.string().optional(),
        syllabus: z.string().optional(),
        color: z.string().default('#3b82f6'),
        icon: z.string().default('book'),
        classSchedule: z.string().optional(),
        examSchedule: z.string().optional(),
        midtermPrepNotes: z.string().optional(),
        finalPrepNotes: z.string().optional(),
        progress: z.number().min(0).max(100).default(0),
    }),
});
const updateCourseSchema = z.object({
    body: z.object({
        semesterId: z.string().optional(),
        code: z.string().min(1).optional(),
        title: z.string().min(1).optional(),
        credits: z.number().min(0).optional(),
        section: z.string().nullable().optional(),
        teacherName: z.string().nullable().optional(),
        teacherEmail: z.string().email().nullable().optional().or(z.literal('')),
        roomNumber: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        syllabus: z.string().nullable().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        classSchedule: z.string().nullable().optional(),
        examSchedule: z.string().nullable().optional(),
        midtermPrepNotes: z.string().nullable().optional(),
        finalPrepNotes: z.string().nullable().optional(),
        progress: z.number().min(0).max(100).optional(),
    }),
});
// List courses, optionally filtered by semester
router.get('/', async (req, res, next) => {
    try {
        const { semesterId } = req.query;
        const where = semesterId ? { semesterId: String(semesterId) } : {};
        const courses = await prisma.course.findMany({
            where,
            orderBy: { code: 'asc' },
            include: {
                semester: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                    },
                },
                _count: {
                    select: {
                        documents: true,
                        notes: true,
                        assignments: true,
                        exams: true,
                    },
                },
            },
        });
        res.json({ success: true, data: courses });
    }
    catch (error) {
        next(error);
    }
});
// Get single course details
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const course = await prisma.course.findUnique({
            where: { id },
            include: {
                semester: true,
                documents: {
                    include: {
                        tags: { include: { tag: true } },
                        _count: { select: { bookmarks: true, annotations: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                notes: {
                    orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
                },
                assignments: {
                    include: {
                        checklist: { orderBy: { sortOrder: 'asc' } },
                        documents: { include: { document: true } },
                    },
                    orderBy: { deadline: 'asc' },
                },
                exams: {
                    include: {
                        checklist: { orderBy: { sortOrder: 'asc' } },
                        questionPapers: { include: { document: true } },
                    },
                    orderBy: { examDate: 'asc' },
                },
                calendarEvents: {
                    orderBy: { startDate: 'asc' },
                },
            },
        });
        if (!course) {
            throw new AppError('Course not found', 404);
        }
        res.json({ success: true, data: course });
    }
    catch (error) {
        next(error);
    }
});
// Create course
router.post('/', validate(createCourseSchema), async (req, res, next) => {
    try {
        const course = await prisma.course.create({
            data: req.body,
            include: {
                semester: true,
            },
        });
        res.status(201).json({ success: true, data: course });
    }
    catch (error) {
        next(error);
    }
});
// Update course
router.put('/:id', validate(updateCourseSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const course = await prisma.course.update({
            where: { id },
            data: req.body,
            include: {
                semester: true,
            },
        });
        res.json({ success: true, data: course });
    }
    catch (error) {
        next(error);
    }
});
// Delete course
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.course.delete({
            where: { id },
        });
        res.json({ success: true, message: 'Course deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
export default router;
