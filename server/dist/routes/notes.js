import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
const router = Router();
const createNoteSchema = z.object({
    body: z.object({
        title: z.string().min(1, 'Title is required'),
        content: z.string().default(''),
        semesterId: z.string().nullable().optional(),
        courseId: z.string().nullable().optional(),
        documentId: z.string().nullable().optional(),
        assignmentId: z.string().nullable().optional(),
        examId: z.string().nullable().optional(),
        isPinned: z.boolean().default(false),
        tags: z.array(z.string()).optional(),
        reminderDate: z.string().nullable().optional(),
    }),
});
const updateNoteSchema = z.object({
    body: z.object({
        title: z.string().min(1).optional(),
        content: z.string().optional(),
        semesterId: z.string().nullable().optional(),
        courseId: z.string().nullable().optional(),
        documentId: z.string().nullable().optional(),
        assignmentId: z.string().nullable().optional(),
        examId: z.string().nullable().optional(),
        isPinned: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
        reminderDate: z.string().nullable().optional(),
        expectedVersion: z.number().int().optional(), // optimistic concurrency check
    }),
});
// List notes with filters & search
router.get('/', async (req, res, next) => {
    try {
        const { semesterId, courseId, documentId, examId, search, tag, isPinned } = req.query;
        const where = {};
        if (semesterId)
            where.semesterId = String(semesterId);
        if (courseId)
            where.courseId = String(courseId);
        if (documentId)
            where.documentId = String(documentId);
        if (examId)
            where.examId = String(examId);
        if (isPinned !== undefined)
            where.isPinned = isPinned === 'true';
        if (search) {
            const q = String(search).trim();
            where.OR = [
                { title: { contains: q } },
                { content: { contains: q } },
            ];
        }
        if (tag) {
            where.tags = { contains: String(tag) };
        }
        const notes = await prisma.note.findMany({
            where,
            orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
            include: {
                semester: { select: { id: true, name: true, color: true } },
                course: { select: { id: true, code: true, title: true, color: true } },
                document: { select: { id: true, title: true, originalFilename: true } },
                exam: { select: { id: true, title: true, examType: true } },
                assignment: { select: { id: true, title: true } },
            },
        });
        res.json({ success: true, data: notes });
    }
    catch (error) {
        next(error);
    }
});
// Get single note
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const note = await prisma.note.findUnique({
            where: { id },
            include: {
                semester: true,
                course: true,
                document: true,
                exam: true,
                assignment: true,
            },
        });
        if (!note) {
            throw new AppError('Note not found', 404);
        }
        res.json({ success: true, data: note });
    }
    catch (error) {
        next(error);
    }
});
// Create note
router.post('/', validate(createNoteSchema), async (req, res, next) => {
    try {
        const { title, content, semesterId, courseId, documentId, assignmentId, examId, isPinned, tags, reminderDate, } = req.body;
        const note = await prisma.note.create({
            data: {
                title,
                content: content || '',
                semesterId: semesterId || null,
                courseId: courseId || null,
                documentId: documentId || null,
                assignmentId: assignmentId || null,
                examId: examId || null,
                isPinned: !!isPinned,
                tags: tags ? JSON.stringify(tags) : null,
                reminderDate: reminderDate ? new Date(reminderDate) : null,
                version: 1,
            },
            include: {
                semester: true,
                course: true,
                document: true,
            },
        });
        res.status(201).json({ success: true, data: note });
    }
    catch (error) {
        next(error);
    }
});
// Update or Autosave note with optimistic locking to prevent stale overwrites
router.put('/:id', validate(updateNoteSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, content, semesterId, courseId, documentId, assignmentId, examId, isPinned, tags, reminderDate, expectedVersion, } = req.body;
        const existingNote = await prisma.note.findUnique({ where: { id } });
        if (!existingNote) {
            throw new AppError('Note not found', 404);
        }
        // Version conflict check if expectedVersion provided
        if (expectedVersion !== undefined && existingNote.version > expectedVersion) {
            return res.status(409).json({
                success: false,
                message: 'Conflict: The note was modified elsewhere. Reload to view the latest version.',
                currentVersion: existingNote.version,
                serverNote: existingNote,
            });
        }
        const updateData = {
            version: existingNote.version + 1,
        };
        if (title !== undefined)
            updateData.title = title;
        if (content !== undefined)
            updateData.content = content;
        if (semesterId !== undefined)
            updateData.semesterId = semesterId;
        if (courseId !== undefined)
            updateData.courseId = courseId;
        if (documentId !== undefined)
            updateData.documentId = documentId;
        if (assignmentId !== undefined)
            updateData.assignmentId = assignmentId;
        if (examId !== undefined)
            updateData.examId = examId;
        if (isPinned !== undefined)
            updateData.isPinned = isPinned;
        if (tags !== undefined)
            updateData.tags = JSON.stringify(tags);
        if (reminderDate !== undefined)
            updateData.reminderDate = reminderDate ? new Date(reminderDate) : null;
        const updated = await prisma.note.update({
            where: { id },
            data: updateData,
            include: {
                semester: true,
                course: true,
                document: true,
            },
        });
        res.json({
            success: true,
            message: 'Note saved successfully',
            data: updated,
        });
    }
    catch (error) {
        next(error);
    }
});
// Toggle pin status
router.patch('/:id/pin', async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await prisma.note.findUnique({ where: { id } });
        if (!existing)
            throw new AppError('Note not found', 404);
        const updated = await prisma.note.update({
            where: { id },
            data: { isPinned: !existing.isPinned },
        });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        next(error);
    }
});
// Delete note
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.note.delete({ where: { id } });
        res.json({ success: true, message: 'Note deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
export default router;
