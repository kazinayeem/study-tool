import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
const router = Router();
const createAssignmentSchema = z.object({
    body: z.object({
        semesterId: z.string().min(1, 'Semester is required'),
        courseId: z.string().min(1, 'Course is required'),
        title: z.string().min(1, 'Title is required'),
        description: z.string().optional(),
        deadline: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid deadline date' }),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
        status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED']).default('NOT_STARTED'),
        personalNotes: z.string().optional(),
        checklist: z.array(z.string()).optional(),
        documentIds: z.array(z.string()).optional(),
    }),
});
const updateAssignmentSchema = z.object({
    body: z.object({
        semesterId: z.string().optional(),
        courseId: z.string().optional(),
        title: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        deadline: z.string().refine((val) => !isNaN(Date.parse(val))).optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED']).optional(),
        personalNotes: z.string().nullable().optional(),
    }),
});
// List assignments
router.get('/', async (req, res, next) => {
    try {
        const { semesterId, courseId, status, priority } = req.query;
        const where = {};
        if (semesterId)
            where.semesterId = String(semesterId);
        if (courseId)
            where.courseId = String(courseId);
        if (status)
            where.status = String(status);
        if (priority)
            where.priority = String(priority);
        const assignments = await prisma.assignment.findMany({
            where,
            orderBy: { deadline: 'asc' },
            include: {
                course: { select: { id: true, code: true, title: true, color: true } },
                semester: { select: { id: true, name: true } },
                checklist: { orderBy: { sortOrder: 'asc' } },
                documents: {
                    include: {
                        document: { select: { id: true, title: true, originalFilename: true, mimeType: true } },
                    },
                },
            },
        });
        const now = new Date();
        const withDerivedStats = assignments.map((a) => {
            const deadlineDate = new Date(a.deadline);
            const diffMs = deadlineDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            const isOverdue = diffMs < 0 && a.status !== 'COMPLETED';
            const totalChecklist = a.checklist.length;
            const completedChecklist = a.checklist.filter((item) => item.isCompleted).length;
            const checklistProgress = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;
            return {
                ...a,
                daysRemaining: diffDays,
                isOverdue,
                checklistProgress,
            };
        });
        res.json({ success: true, data: withDerivedStats });
    }
    catch (error) {
        next(error);
    }
});
// Get single assignment
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const assignment = await prisma.assignment.findUnique({
            where: { id },
            include: {
                course: true,
                semester: true,
                checklist: { orderBy: { sortOrder: 'asc' } },
                documents: { include: { document: true } },
                notes: true,
            },
        });
        if (!assignment) {
            throw new AppError('Assignment not found', 404);
        }
        const now = new Date();
        const diffMs = new Date(assignment.deadline).getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const isOverdue = diffMs < 0 && assignment.status !== 'COMPLETED';
        res.json({
            success: true,
            data: {
                ...assignment,
                daysRemaining: diffDays,
                isOverdue,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
// Create assignment
router.post('/', validate(createAssignmentSchema), async (req, res, next) => {
    try {
        const { semesterId, courseId, title, description, deadline, priority, status, personalNotes, checklist, documentIds, } = req.body;
        const assignment = await prisma.$transaction(async (tx) => {
            const created = await tx.assignment.create({
                data: {
                    semesterId,
                    courseId,
                    title,
                    description,
                    deadline: new Date(deadline),
                    priority,
                    status,
                    personalNotes,
                },
            });
            // Add checklist items
            if (checklist && Array.isArray(checklist)) {
                for (let i = 0; i < checklist.length; i++) {
                    if (checklist[i].trim()) {
                        await tx.taskChecklistItem.create({
                            data: {
                                assignmentId: created.id,
                                text: checklist[i].trim(),
                                sortOrder: i,
                            },
                        });
                    }
                }
            }
            // Link documents
            if (documentIds && Array.isArray(documentIds)) {
                for (const docId of documentIds) {
                    await tx.assignmentDocument.create({
                        data: {
                            assignmentId: created.id,
                            documentId: docId,
                            purpose: 'SUPPORTING_MATERIAL',
                        },
                    });
                }
            }
            // Also create corresponding calendar event automatically
            await tx.calendarEvent.create({
                data: {
                    semesterId,
                    courseId,
                    title: `DEADLINE: ${title}`,
                    description,
                    startDate: new Date(deadline),
                    endDate: new Date(deadline),
                    isAllDay: false,
                    category: 'ASSIGNMENT',
                    priority,
                    reminderMinutesBefore: 1440, // 1 day
                },
            });
            return created;
        });
        const fullAssignment = await prisma.assignment.findUnique({
            where: { id: assignment.id },
            include: {
                course: true,
                semester: true,
                checklist: true,
                documents: { include: { document: true } },
            },
        });
        res.status(201).json({ success: true, data: fullAssignment });
    }
    catch (error) {
        next(error);
    }
});
// Update assignment
router.put('/:id', validate(updateAssignmentSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { semesterId, courseId, title, description, deadline, priority, status, personalNotes } = req.body;
        const updateData = {};
        if (semesterId !== undefined)
            updateData.semesterId = semesterId;
        if (courseId !== undefined)
            updateData.courseId = courseId;
        if (title !== undefined)
            updateData.title = title;
        if (description !== undefined)
            updateData.description = description;
        if (deadline !== undefined)
            updateData.deadline = new Date(deadline);
        if (priority !== undefined)
            updateData.priority = priority;
        if (status !== undefined)
            updateData.status = status;
        if (personalNotes !== undefined)
            updateData.personalNotes = personalNotes;
        const updated = await prisma.assignment.update({
            where: { id },
            data: updateData,
            include: {
                course: true,
                semester: true,
                checklist: true,
                documents: { include: { document: true } },
            },
        });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        next(error);
    }
});
// Checklist item routes
router.post('/:id/checklist', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        if (!text || !text.trim())
            throw new AppError('Checklist text required', 400);
        const count = await prisma.taskChecklistItem.count({ where: { assignmentId: id } });
        const item = await prisma.taskChecklistItem.create({
            data: {
                assignmentId: id,
                text: text.trim(),
                sortOrder: count,
            },
        });
        res.status(201).json({ success: true, data: item });
    }
    catch (error) {
        next(error);
    }
});
router.patch('/:id/checklist/:itemId/toggle', async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const existing = await prisma.taskChecklistItem.findUnique({ where: { id: itemId } });
        if (!existing)
            throw new AppError('Checklist item not found', 404);
        const updated = await prisma.taskChecklistItem.update({
            where: { id: itemId },
            data: { isCompleted: !existing.isCompleted },
        });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:id/checklist/:itemId', async (req, res, next) => {
    try {
        const { itemId } = req.params;
        await prisma.taskChecklistItem.delete({ where: { id: itemId } });
        res.json({ success: true, message: 'Checklist item removed' });
    }
    catch (error) {
        next(error);
    }
});
// Link document to assignment
router.post('/:id/documents', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { documentId, purpose = 'SUPPORTING_MATERIAL' } = req.body;
        const link = await prisma.assignmentDocument.upsert({
            where: { assignmentId_documentId: { assignmentId: id, documentId } },
            create: { assignmentId: id, documentId, purpose },
            update: { purpose },
        });
        res.status(201).json({ success: true, data: link });
    }
    catch (error) {
        next(error);
    }
});
// Delete assignment
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.assignment.delete({ where: { id } });
        res.json({ success: true, message: 'Assignment deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
export default router;
