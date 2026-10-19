import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { ownedBy, ownerId } from '../middleware/ownership.js';
import { syncAssignmentReminders, cancelRemindersForTarget } from '../services/reminderManager.js';
import { validateSemesterCourseConsistency } from '../utils/academicValidation.js';


const router = Router();

const createAssignmentSchema = z.object({
  body: z.object({
    semesterId: z.string().min(1, 'Semester is required'),
    courseId: z.string().min(1, 'Course is required'),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    deadline: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid deadline date' }),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    status: z.enum(['BACKLOG', 'TODO', 'NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'IN_REVIEW', 'COMPLETED', 'CANCELLED']).default('NOT_STARTED'),
    progress: z.number().min(0).max(100).optional().default(0),
    estimatedHours: z.number().min(0).optional(),
    submissionDate: z.string().optional(),
    submissionLink: z.string().optional(),
    isSubmittedOnTime: z.boolean().optional(),
    projectId: z.string().nullable().optional(),
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
    status: z.enum(['BACKLOG', 'TODO', 'NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'IN_REVIEW', 'COMPLETED', 'CANCELLED']).optional(),
    progress: z.number().min(0).max(100).optional(),
    estimatedHours: z.number().min(0).nullable().optional(),
    submissionDate: z.string().nullable().optional(),
    submissionLink: z.string().nullable().optional(),
    isSubmittedOnTime: z.boolean().nullable().optional(),
    projectId: z.string().nullable().optional(),
    personalNotes: z.string().nullable().optional(),
  }),
});

// List assignments
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { semesterId, courseId, status, priority } = req.query;

    const where: any = { ...ownedBy(req) };
    if (semesterId) where.semesterId = String(semesterId);
    if (courseId) where.courseId = String(courseId);
    if (status) where.status = String(status);
    if (priority) where.priority = String(priority);

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
  } catch (error) {
    next(error);
  }
});

// Smart prioritization recommendations based on deadline, priority, effort, and progress
router.get('/recommendations', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const uncompleted = await prisma.assignment.findMany({
      where: {
        ...ownedBy(req),
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      include: {
        course: { select: { code: true, title: true } },
        checklist: true,
      },
    });

    const now = new Date();
    const scoredTasks = uncompleted.map((task) => {
      const deadline = new Date(task.deadline);
      const diffMs = deadline.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // 1. Priority base score
      let score = 10;
      if (task.priority === 'URGENT') score += 40;
      else if (task.priority === 'HIGH') score += 30;
      else if (task.priority === 'MEDIUM') score += 20;

      // 2. Deadline proximity score
      let urgencyReason = '';
      if (diffHours < 0) {
        score += 60;
        urgencyReason = 'Overdue task';
      } else if (diffHours <= 24) {
        score += 50;
        urgencyReason = 'Due in less than 24 hours';
      } else if (diffDays <= 3) {
        score += 35;
        urgencyReason = `Due in ${diffDays} days`;
      } else if (diffDays <= 7) {
        score += 20;
        urgencyReason = `Due in ${diffDays} days`;
      } else {
        urgencyReason = `Due in ${diffDays} days`;
      }

      // 3. Estimated effort weighting
      const effort = task.estimatedHours || 2;
      if (effort > 4 && diffDays <= 4) {
        score += 20;
        urgencyReason += ` with significant effort (${effort}h)`;
      }

      // 4. Progress discount (if already 80% done, easier to finish)
      const remainingProgress = 100 - (task.progress || 0);
      if (remainingProgress < 30) {
        score += 15;
        urgencyReason += ' (almost finished)';
      }

      return {
        ...task,
        recommendationScore: score,
        urgencyReason,
        daysRemaining: diffDays,
        isOverdue: diffMs < 0,
      };
    });

    // Sort by recommendation score descending
    scoredTasks.sort((a, b) => b.recommendationScore - a.recommendationScore);

    res.json({ success: true, data: scoredTasks });
  } catch (error) {
    next(error);
  }
});

// Get single assignment
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const assignment = await prisma.assignment.findFirst({
      where: { id, ...ownedBy(req) },
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
  } catch (error) {
    next(error);
  }
});

// Create assignment
router.post('/', validate(createAssignmentSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const {
      semesterId,
      courseId,
      title,
      description,
      deadline,
      priority,
      status,
      progress,
      estimatedHours,
      submissionDate,
      submissionLink,
      isSubmittedOnTime,
      projectId,
      personalNotes,
      checklist,
      documentIds,
    } = req.body;

    const validated = await validateSemesterCourseConsistency(courseId, semesterId);
    if (!validated.courseId || !validated.semesterId) {
      throw new AppError('Assignments must belong to both a valid course and semester', 400);
    }
    const validSemesterId: string = validated.semesterId;
    const validCourseId: string = validated.courseId;

    const assignment = await prisma.$transaction(async (tx) => {
      const created = await tx.assignment.create({
        data: {
          semesterId: validSemesterId,
          courseId: validCourseId,
          title,
          description,
          deadline: new Date(deadline),

          priority,
          status,
          progress: progress !== undefined ? progress : 0,
          estimatedHours: estimatedHours !== undefined ? estimatedHours : null,
          submissionDate: submissionDate ? new Date(submissionDate) : null,
          submissionLink: submissionLink || null,
          isSubmittedOnTime: isSubmittedOnTime !== undefined ? isSubmittedOnTime : null,
          projectId: projectId || null,
          personalNotes,
          userId: ownerId(req),
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
          userId: ownerId(req),
        },
      });

      return created;
    });

    const fullAssignment = await prisma.assignment.findFirst({
      where: { id: assignment.id, ...ownedBy(req) },
      include: {
        course: true,
        semester: true,
        checklist: true,
        documents: { include: { document: true } },
      },
    });

    // Schedule automated reminder jobs
    await syncAssignmentReminders(assignment.id);

    res.status(201).json({ success: true, data: fullAssignment });
  } catch (error) {
    next(error);
  }
});

// Duplicate task as template
router.post('/:id/duplicate', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const original = await prisma.assignment.findFirst({
      where: { id, ...ownedBy(req) },
      include: { checklist: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!original) throw new AppError('Assignment not found', 404);

    // Duplicate 7 days from today by default or retain same duration
    const newDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const duplicated = await prisma.$transaction(async (tx) => {
      const copy = await tx.assignment.create({
        data: {
          semesterId: original.semesterId,
          courseId: original.courseId,
          title: `${original.title} (Copy)`,
          description: original.description,
          deadline: newDeadline,
          priority: original.priority,
          status: 'TODO',
          progress: 0,
          estimatedHours: original.estimatedHours,
          projectId: original.projectId,
          personalNotes: original.personalNotes,
          userId: ownerId(req),
        },
      });

      for (const item of original.checklist) {
        await tx.taskChecklistItem.create({
          data: {
            assignmentId: copy.id,
            text: item.text,
            isCompleted: false,
            sortOrder: item.sortOrder,
          },
        });
      }

      await tx.calendarEvent.create({
        data: {
          semesterId: original.semesterId,
          courseId: original.courseId,
          title: `DEADLINE: ${original.title} (Copy)`,
          description: original.description,
          startDate: newDeadline,
          endDate: newDeadline,
          isAllDay: false,
          category: 'ASSIGNMENT',
          priority: original.priority,
          reminderMinutesBefore: 1440,
          userId: ownerId(req),
        },
      });

      return copy;
    });

    const fullCopy = await prisma.assignment.findFirst({
      where: { id: duplicated.id, ...ownedBy(req) },
      include: {
        course: true,
        semester: true,
        checklist: true,
      },
    });

    res.status(201).json({ success: true, data: fullCopy });
  } catch (error) {
    next(error);
  }
});

// Update assignment (supports both PUT and PATCH)
const handleUpdateAssignment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      semesterId,
      courseId,
      title,
      description,
      deadline,
      priority,
      status,
      progress,
      estimatedHours,
      submissionDate,
      submissionLink,
      isSubmittedOnTime,
      projectId,
      personalNotes,
    } = req.body;

    const existing = await prisma.assignment.findFirst({ where: { id, ...ownedBy(req) } });
    if (!existing) throw new AppError('Assignment not found', 404);

    const updateData: any = {};

    if (courseId !== undefined || semesterId !== undefined) {
      const targetCourseId = courseId !== undefined ? courseId : existing.courseId;
      const targetSemesterId = semesterId !== undefined ? semesterId : existing.semesterId;
      const validated = await validateSemesterCourseConsistency(targetCourseId, targetSemesterId);
      if (!validated.courseId || !validated.semesterId) {
        throw new AppError('Assignments must belong to both a valid course and semester', 400);
      }
      const ownedCourse = await prisma.course.findFirst({
        where: { id: validated.courseId, ...ownedBy(req) },
      });
      if (!ownedCourse) throw new AppError('Course not found', 404);
      const ownedSemester = await prisma.semester.findFirst({
        where: { id: validated.semesterId, ...ownedBy(req) },
      });
      if (!ownedSemester) throw new AppError('Semester not found', 404);
      updateData.courseId = validated.courseId;
      updateData.semesterId = validated.semesterId;
    }

    if (title !== undefined) updateData.title = title;

    if (description !== undefined) updateData.description = description;
    if (deadline !== undefined) updateData.deadline = new Date(deadline);
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours;
    if (submissionDate !== undefined) updateData.submissionDate = submissionDate ? new Date(submissionDate) : null;
    if (submissionLink !== undefined) updateData.submissionLink = submissionLink;
    if (isSubmittedOnTime !== undefined) updateData.isSubmittedOnTime = isSubmittedOnTime;
    if (projectId !== undefined) updateData.projectId = projectId;
    if (personalNotes !== undefined) updateData.personalNotes = personalNotes;

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

    // Keep calendar event in sync without duplicates
    if (deadline || title) {
      await prisma.calendarEvent.updateMany({
        where: {
          category: 'ASSIGNMENT',
          title: `DEADLINE: ${existing.title}`,
          ...ownedBy(req),
        },
        data: {
          ...(title ? { title: `DEADLINE: ${title}` } : {}),
          ...(deadline ? { startDate: new Date(deadline), endDate: new Date(deadline) } : {}),
        },
      });
    }

    // Recalculate pending reminder jobs or cancel if completed/submitted
    await syncAssignmentReminders(id);

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

router.put('/:id', validate(updateAssignmentSchema), handleUpdateAssignment);
router.patch('/:id', validate(updateAssignmentSchema), handleUpdateAssignment);

// Checklist item routes
router.post('/:id/checklist', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) throw new AppError('Checklist text required', 400);

    const parent = await prisma.assignment.findFirst({ where: { id, ...ownedBy(req) } });
    if (!parent) throw new AppError('Assignment not found', 404);

    const count = await prisma.taskChecklistItem.count({ where: { assignmentId: id } });
    const item = await prisma.taskChecklistItem.create({
      data: {
        assignmentId: id,
        text: text.trim(),
        sortOrder: count,
      },
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/checklist/:itemId/toggle', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id, itemId } = req.params;
    const existing = await prisma.taskChecklistItem.findFirst({ where: { id: itemId, assignmentId: id } });
    if (!existing) throw new AppError('Checklist item not found', 404);

    const parent = await prisma.assignment.findFirst({ where: { id, ...ownedBy(req) } });
    if (!parent) throw new AppError('Assignment not found', 404);

    const updated = await prisma.taskChecklistItem.update({
      where: { id: itemId },
      data: { isCompleted: !existing.isCompleted },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/checklist/:itemId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id, itemId } = req.params;
    const existing = await prisma.taskChecklistItem.findFirst({ where: { id: itemId, assignmentId: id } });
    if (!existing) throw new AppError('Checklist item not found', 404);

    const parent = await prisma.assignment.findFirst({ where: { id, ...ownedBy(req) } });
    if (!parent) throw new AppError('Assignment not found', 404);

    await prisma.taskChecklistItem.delete({ where: { id: itemId } });
    res.json({ success: true, message: 'Checklist item removed' });
  } catch (error) {
    next(error);
  }
});

// Link document to assignment
router.post('/:id/documents', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { documentId, purpose = 'SUPPORTING_MATERIAL' } = req.body;

    const parent = await prisma.assignment.findFirst({ where: { id, ...ownedBy(req) } });
    if (!parent) throw new AppError('Assignment not found', 404);

    const link = await prisma.assignmentDocument.upsert({
      where: { assignmentId_documentId: { assignmentId: id, documentId } },
      create: { assignmentId: id, documentId, purpose },
      update: { purpose },
    });

    res.status(201).json({ success: true, data: link });
  } catch (error) {
    next(error);
  }
});

// Delete assignment
router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.assignment.findFirst({ where: { id, ...ownedBy(req) } });
    if (!existing) throw new AppError('Assignment not found', 404);
    await cancelRemindersForTarget('ASSIGNMENT', id);
    await prisma.calendarEvent.deleteMany({
      where: {
        category: 'ASSIGNMENT',
        title: `DEADLINE: ${existing.title}`,
        ...ownedBy(req),
      },
    });
    await prisma.assignment.delete({ where: { id } });
    res.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    next(error);
  }
});


export default router;
