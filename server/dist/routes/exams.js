import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { ownedBy, ownerId } from '../middleware/ownership.js';
import { syncExamReminders, cancelRemindersForTarget } from '../services/reminderManager.js';
import { validateSemesterCourseConsistency } from '../utils/academicValidation.js';
const router = Router();
const createExamSchema = z.object({
    body: z.object({
        semesterId: z.string().min(1, 'Semester is required'),
        courseId: z.string().min(1, 'Course is required'),
        title: z.string().min(1, 'Title is required'),
        examType: z.enum(['Quiz', 'Midterm', 'Final', 'Practical', 'Viva']).default('Midterm'),
        examDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid exam date' }),
        room: z.string().optional(),
        syllabus: z.string().optional(),
        personalNotes: z.string().optional(),
        preparationStatus: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'REVISION_READY', 'CONFIDENT']).default('NOT_STARTED'),
        prepPercentage: z.number().min(0).max(100).default(0),
        checklist: z.array(z.string()).optional(),
        documentIds: z.array(z.string()).optional(),
    }),
});
const updateExamSchema = z.object({
    body: z.object({
        semesterId: z.string().optional(),
        courseId: z.string().optional(),
        title: z.string().min(1).optional(),
        examType: z.enum(['Quiz', 'Midterm', 'Final', 'Practical', 'Viva']).optional(),
        examDate: z.string().refine((val) => !isNaN(Date.parse(val))).optional(),
        room: z.string().nullable().optional(),
        syllabus: z.string().nullable().optional(),
        personalNotes: z.string().nullable().optional(),
        preparationStatus: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'REVISION_READY', 'CONFIDENT']).optional(),
        prepPercentage: z.number().min(0).max(100).optional(),
    }),
});
async function assertChecklistItemAccessible(existing, req) {
    if (existing.examId) {
        const owned = await prisma.exam.findFirst({ where: { id: existing.examId, ...ownedBy(req) } });
        if (!owned)
            throw new AppError('Checklist item not found', 404);
    }
    else if (existing.assignmentId) {
        const owned = await prisma.assignment.findFirst({ where: { id: existing.assignmentId, ...ownedBy(req) } });
        if (!owned)
            throw new AppError('Checklist item not found', 404);
    }
    else {
        throw new AppError('Checklist item not found', 404);
    }
}
// List exams
router.get('/', async (req, res, next) => {
    try {
        const { semesterId, courseId, examType } = req.query;
        const where = { ...ownedBy(req) };
        if (semesterId)
            where.semesterId = String(semesterId);
        if (courseId)
            where.courseId = String(courseId);
        if (examType)
            where.examType = String(examType);
        const exams = await prisma.exam.findMany({
            where,
            orderBy: { examDate: 'asc' },
            include: {
                course: { select: { id: true, code: true, title: true, color: true } },
                semester: { select: { id: true, name: true } },
                checklist: { orderBy: { sortOrder: 'asc' } },
                questionPapers: {
                    include: {
                        document: { select: { id: true, title: true, originalFilename: true, category: true, isPdf: true } },
                    },
                },
            },
        });
        const now = new Date();
        const withStats = exams.map((exam) => {
            const examDate = new Date(exam.examDate);
            const diffMs = examDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            const totalChecklist = exam.checklist.length;
            const completed = exam.checklist.filter((c) => c.isCompleted).length;
            const calculatedPrep = totalChecklist > 0 ? Math.round((completed / totalChecklist) * 100) : exam.prepPercentage;
            return {
                ...exam,
                daysRemaining: diffDays,
                isPast: diffMs < 0,
                prepPercentage: totalChecklist > 0 ? calculatedPrep : exam.prepPercentage,
            };
        });
        res.json({ success: true, data: withStats });
    }
    catch (error) {
        next(error);
    }
});
// Get single exam
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const exam = await prisma.exam.findFirst({
            where: { id, ...ownedBy(req) },
            include: {
                course: true,
                semester: true,
                checklist: { orderBy: { sortOrder: 'asc' } },
                questionPapers: {
                    include: {
                        document: true,
                    },
                },
                notes: true,
            },
        });
        if (!exam) {
            throw new AppError('Exam not found', 404);
        }
        res.json({ success: true, data: exam });
    }
    catch (error) {
        next(error);
    }
});
// Create exam
router.post('/', validate(createExamSchema), async (req, res, next) => {
    try {
        const { semesterId, courseId, title, examType, examDate, room, syllabus, personalNotes, preparationStatus, prepPercentage, checklist, documentIds, } = req.body;
        const validated = await validateSemesterCourseConsistency(courseId, semesterId);
        if (!validated.courseId || !validated.semesterId) {
            throw new AppError('Exams must belong to both a valid course and semester', 400);
        }
        const exam = await prisma.$transaction(async (tx) => {
            const created = await tx.exam.create({
                data: {
                    semesterId: validated.semesterId,
                    courseId: validated.courseId,
                    title,
                    examType,
                    examDate: new Date(examDate),
                    room,
                    syllabus,
                    personalNotes,
                    preparationStatus,
                    prepPercentage,
                    userId: ownerId(req),
                },
            });
            if (checklist && Array.isArray(checklist)) {
                for (let i = 0; i < checklist.length; i++) {
                    if (checklist[i].trim()) {
                        await tx.taskChecklistItem.create({
                            data: {
                                examId: created.id,
                                text: checklist[i].trim(),
                                sortOrder: i,
                            },
                        });
                    }
                }
            }
            if (documentIds && Array.isArray(documentIds)) {
                for (const docId of documentIds) {
                    await tx.examDocument.create({
                        data: {
                            examId: created.id,
                            documentId: docId,
                            purpose: 'QUESTION_PAPER',
                        },
                    });
                }
            }
            // Add to calendar automatically
            await tx.calendarEvent.create({
                data: {
                    semesterId,
                    courseId,
                    title: `EXAM: ${title} (${examType})`,
                    description: syllabus,
                    startDate: new Date(examDate),
                    endDate: new Date(new Date(examDate).getTime() + 2 * 60 * 60 * 1000), // Default 2 hours
                    isAllDay: false,
                    category: examType.toUpperCase() === 'FINAL' ? 'FINAL' : 'MIDTERM',
                    priority: 'URGENT',
                    location: room,
                    reminderMinutesBefore: 120, // 2 hours
                    userId: ownerId(req),
                },
            });
            return created;
        });
        const fullExam = await prisma.exam.findFirst({
            where: { id: exam.id, ...ownedBy(req) },
            include: {
                course: true,
                semester: true,
                checklist: true,
                questionPapers: { include: { document: true } },
            },
        });
        // Schedule automated exam reminder jobs
        await syncExamReminders(exam.id);
        res.status(201).json({ success: true, data: fullExam });
    }
    catch (error) {
        next(error);
    }
});
// Update exam
router.put('/:id', validate(updateExamSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { semesterId, courseId, title, examType, examDate, room, syllabus, personalNotes, preparationStatus, prepPercentage, } = req.body;
        const existing = await prisma.exam.findFirst({ where: { id, ...ownedBy(req) } });
        if (!existing)
            throw new AppError('Exam not found', 404);
        const updateData = {};
        if (courseId !== undefined || semesterId !== undefined) {
            const targetCourseId = courseId !== undefined ? courseId : existing.courseId;
            const targetSemesterId = semesterId !== undefined ? semesterId : existing.semesterId;
            const validated = await validateSemesterCourseConsistency(targetCourseId, targetSemesterId);
            if (!validated.courseId || !validated.semesterId) {
                throw new AppError('Exams must belong to both a valid course and semester', 400);
            }
            const ownedCourse = await prisma.course.findFirst({ where: { id: validated.courseId, ...ownedBy(req) } });
            const ownedSemester = await prisma.semester.findFirst({ where: { id: validated.semesterId, ...ownedBy(req) } });
            if (!ownedCourse || !ownedSemester) {
                throw new AppError('Exam not found', 404);
            }
            updateData.courseId = validated.courseId;
            updateData.semesterId = validated.semesterId;
        }
        if (title !== undefined)
            updateData.title = title;
        if (examType !== undefined)
            updateData.examType = examType;
        if (examDate !== undefined)
            updateData.examDate = new Date(examDate);
        if (room !== undefined)
            updateData.room = room;
        if (syllabus !== undefined)
            updateData.syllabus = syllabus;
        if (personalNotes !== undefined)
            updateData.personalNotes = personalNotes;
        if (preparationStatus !== undefined)
            updateData.preparationStatus = preparationStatus;
        if (prepPercentage !== undefined)
            updateData.prepPercentage = prepPercentage;
        const updated = await prisma.exam.update({
            where: { id },
            data: updateData,
            include: {
                course: true,
                semester: true,
                checklist: true,
                questionPapers: { include: { document: true } },
            },
        });
        // Recalculate scheduled reminders
        await syncExamReminders(id);
        res.json({ success: true, data: updated });
    }
    catch (error) {
        next(error);
    }
});
// Checklist toggle for exam revision
router.post('/:id/checklist', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        if (!text || !text.trim())
            throw new AppError('Checklist text required', 400);
        const exam = await prisma.exam.findFirst({ where: { id, ...ownedBy(req) } });
        if (!exam)
            throw new AppError('Exam not found', 404);
        const count = await prisma.taskChecklistItem.count({ where: { examId: id } });
        const item = await prisma.taskChecklistItem.create({
            data: {
                examId: id,
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
        await assertChecklistItemAccessible(existing, req);
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
        const item = await prisma.taskChecklistItem.findUnique({ where: { id: itemId } });
        if (!item)
            throw new AppError('Checklist item not found', 404);
        await assertChecklistItemAccessible(item, req);
        await prisma.taskChecklistItem.delete({ where: { id: itemId } });
        res.json({ success: true, message: 'Checklist item removed' });
    }
    catch (error) {
        next(error);
    }
});
// Link document / question paper to exam
router.post('/:id/documents', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { documentId, purpose = 'QUESTION_PAPER' } = req.body;
        const exam = await prisma.exam.findFirst({ where: { id, ...ownedBy(req) } });
        if (!exam)
            throw new AppError('Exam not found', 404);
        const document = await prisma.document.findFirst({ where: { id: documentId, ...ownedBy(req) } });
        if (!document)
            throw new AppError('Document not found', 404);
        const link = await prisma.examDocument.upsert({
            where: { examId_documentId: { examId: id, documentId } },
            create: { examId: id, documentId, purpose },
            update: { purpose },
        });
        res.status(201).json({ success: true, data: link });
    }
    catch (error) {
        next(error);
    }
});
// Unlink document from exam
router.delete('/:id/documents/:documentId', async (req, res, next) => {
    try {
        const { id, documentId } = req.params;
        const exam = await prisma.exam.findFirst({ where: { id, ...ownedBy(req) } });
        if (!exam)
            throw new AppError('Exam not found', 404);
        await prisma.examDocument.deleteMany({
            where: { examId: id, documentId },
        });
        res.json({ success: true, message: 'Document unlinked from exam' });
    }
    catch (error) {
        next(error);
    }
});
// Delete exam
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await cancelRemindersForTarget('EXAM', id);
        await prisma.exam.delete({ where: { id } });
        res.json({ success: true, message: 'Exam deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
export default router;
