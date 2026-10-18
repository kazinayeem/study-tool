import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
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
    }),
});
// List events by date range, semester, course, category
router.get('/', async (req, res, next) => {
    try {
        const { start, end, semesterId, courseId, category } = req.query;
        const where = {};
        if (semesterId)
            where.semesterId = String(semesterId);
        if (courseId)
            where.courseId = String(courseId);
        if (category)
            where.category = String(category);
        if (start && end) {
            where.OR = [
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
    }
    catch (error) {
        next(error);
    }
});
// In-app reminders feed: check active events starting in the next 24-48 hours
router.get('/reminders', async (req, res, next) => {
    try {
        const now = new Date();
        const inTwoDays = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        const upcomingEvents = await prisma.calendarEvent.findMany({
            where: {
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
    }
    catch (error) {
        next(error);
    }
});
// Create event
router.post('/', validate(createEventSchema), async (req, res, next) => {
    try {
        const { semesterId, courseId, title, description, startDate, endDate, isAllDay, category, priority, isCompleted, location, notes, reminderMinutesBefore, } = req.body;
        const event = await prisma.calendarEvent.create({
            data: {
                semesterId: semesterId || null,
                courseId: courseId || null,
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
            },
            include: {
                course: true,
                semester: true,
            },
        });
        res.status(201).json({ success: true, data: event });
    }
    catch (error) {
        next(error);
    }
});
// Update event
router.put('/:id', validate(updateEventSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { semesterId, courseId, title, description, startDate, endDate, isAllDay, category, priority, isCompleted, location, notes, reminderMinutesBefore, } = req.body;
        const updateData = {};
        if (semesterId !== undefined)
            updateData.semesterId = semesterId;
        if (courseId !== undefined)
            updateData.courseId = courseId;
        if (title !== undefined)
            updateData.title = title;
        if (description !== undefined)
            updateData.description = description;
        if (startDate !== undefined)
            updateData.startDate = new Date(startDate);
        if (endDate !== undefined)
            updateData.endDate = new Date(endDate);
        if (isAllDay !== undefined)
            updateData.isAllDay = isAllDay;
        if (category !== undefined)
            updateData.category = category;
        if (priority !== undefined)
            updateData.priority = priority;
        if (isCompleted !== undefined)
            updateData.isCompleted = isCompleted;
        if (location !== undefined)
            updateData.location = location;
        if (notes !== undefined)
            updateData.notes = notes;
        if (reminderMinutesBefore !== undefined)
            updateData.reminderMinutesBefore = reminderMinutesBefore;
        const updated = await prisma.calendarEvent.update({
            where: { id },
            data: updateData,
            include: {
                course: true,
                semester: true,
            },
        });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        next(error);
    }
});
// Toggle complete
router.patch('/:id/toggle', async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await prisma.calendarEvent.findUnique({ where: { id } });
        if (!existing)
            throw new AppError('Event not found', 404);
        const updated = await prisma.calendarEvent.update({
            where: { id },
            data: { isCompleted: !existing.isCompleted },
        });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        next(error);
    }
});
// Delete event
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.calendarEvent.delete({ where: { id } });
        res.json({ success: true, message: 'Event deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
export default router;
