import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { ownedBy, ownerId } from '../middleware/ownership.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const createProjectSchema = z.object({
  body: z.object({
    semesterId: z.string().nullable().optional(),
    courseId: z.string().nullable().optional(),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    objectives: z.string().optional(),
    deliverables: z.string().optional(),
    importantLinks: z.string().optional(),
    deadline: z.string().refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid deadline' }).optional(),
    status: z.enum(['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'ON_HOLD']).default('IN_PROGRESS'),
    progress: z.number().min(0).max(100).default(0),
    notes: z.string().optional(),
  }),
});

const updateProjectSchema = z.object({
  body: z.object({
    semesterId: z.string().nullable().optional(),
    courseId: z.string().nullable().optional(),
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    objectives: z.string().nullable().optional(),
    deliverables: z.string().nullable().optional(),
    importantLinks: z.string().nullable().optional(),
    deadline: z.string().refine((val) => !val || !isNaN(Date.parse(val))).nullable().optional(),
    status: z.enum(['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'ON_HOLD']).optional(),
    progress: z.number().min(0).max(100).optional(),
    notes: z.string().nullable().optional(),
  }),
});

// List projects
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { semesterId, courseId, status } = req.query;
    const where: any = { ...ownedBy(req) };
    if (semesterId) where.semesterId = String(semesterId);
    if (courseId) where.courseId = String(courseId);
    if (status) where.status = String(status);

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, code: true, title: true, color: true } },
        semester: { select: { id: true, name: true } },
        milestones: { orderBy: { sortOrder: 'asc' } },
        _count: {
          select: { tasks: true },
        },
      },
    });

    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
});

// Get single project with tasks & milestones
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findFirst({
      where: { id, ...ownedBy(req) },
      include: {
        course: true,
        semester: true,
        milestones: { orderBy: { sortOrder: 'asc' } },
        tasks: {
          include: {
            checklist: true,
            documents: { include: { document: true } },
          },
          orderBy: { deadline: 'asc' },
        },
      },
    });

    if (!project) throw new AppError('Project not found', 404);

    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

// Create project
router.post('/', validate(createProjectSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const {
      semesterId,
      courseId,
      title,
      description,
      objectives,
      deliverables,
      importantLinks,
      deadline,
      status,
      progress,
      notes,
    } = req.body;

    if (semesterId) {
      const ownedSemester = await prisma.semester.findFirst({ where: { id: semesterId, ...ownedBy(req) } });
      if (!ownedSemester) throw new AppError('Semester not found', 404);
    }
    if (courseId) {
      const ownedCourse = await prisma.course.findFirst({ where: { id: courseId, ...ownedBy(req) } });
      if (!ownedCourse) throw new AppError('Course not found', 404);
    }

    const project = await prisma.project.create({
      data: {
        semesterId: semesterId || null,
        courseId: courseId || null,
        title,
        description,
        objectives,
        deliverables,
        importantLinks,
        deadline: deadline ? new Date(deadline) : null,
        status,
        progress: progress !== undefined ? progress : 0,
        notes,
        userId: ownerId(req),
      },
      include: {
        course: true,
        semester: true,
        milestones: true,
      },
    });

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

// Update project
const handleUpdateProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      semesterId,
      courseId,
      title,
      description,
      objectives,
      deliverables,
      importantLinks,
      deadline,
      status,
      progress,
      notes,
    } = req.body;

    const existing = await prisma.project.findFirst({ where: { id, ...ownedBy(req) } });
    if (!existing) throw new AppError('Project not found', 404);

    if (semesterId) {
      const ownedSemester = await prisma.semester.findFirst({ where: { id: semesterId, ...ownedBy(req) } });
      if (!ownedSemester) throw new AppError('Semester not found', 404);
    }
    if (courseId) {
      const ownedCourse = await prisma.course.findFirst({ where: { id: courseId, ...ownedBy(req) } });
      if (!ownedCourse) throw new AppError('Course not found', 404);
    }

    const updateData: any = {};
    if (semesterId !== undefined) updateData.semesterId = semesterId;
    if (courseId !== undefined) updateData.courseId = courseId;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (objectives !== undefined) updateData.objectives = objectives;
    if (deliverables !== undefined) updateData.deliverables = deliverables;
    if (importantLinks !== undefined) updateData.importantLinks = importantLinks;
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;
    if (status !== undefined) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        course: true,
        semester: true,
        milestones: { orderBy: { sortOrder: 'asc' } },
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

router.put('/:id', validate(updateProjectSchema), handleUpdateProject);
router.patch('/:id', validate(updateProjectSchema), handleUpdateProject);

// Delete project
router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.project.findFirst({ where: { id, ...ownedBy(req) } });
    if (!existing) throw new AppError('Project not found', 404);
    await prisma.project.delete({ where: { id } });
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Milestones
router.get('/:id/milestones', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findFirst({ where: { id, ...ownedBy(req) } });
    if (!project) throw new AppError('Project not found', 404);
    const milestones = await prisma.projectMilestone.findMany({
      where: { projectId: id },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: milestones });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/milestones', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate } = req.body;
    if (!title) throw new AppError('Milestone title is required', 400);

    const project = await prisma.project.findFirst({ where: { id, ...ownedBy(req) } });
    if (!project) throw new AppError('Project not found', 404);

    const count = await prisma.projectMilestone.count({ where: { projectId: id } });
    const milestone = await prisma.projectMilestone.create({
      data: {
        projectId: id,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        sortOrder: count,
      },
    });

    res.status(201).json({ success: true, data: milestone });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/milestones/:milestoneId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id, milestoneId } = req.params;
    const { title, description, dueDate, isCompleted, sortOrder } = req.body;

    const milestone = await prisma.projectMilestone.findFirst({ where: { id: milestoneId, projectId: id } });
    if (!milestone) throw new AppError('Milestone not found', 404);
    const project = await prisma.project.findFirst({ where: { id, ...ownedBy(req) } });
    if (!project) throw new AppError('Milestone not found', 404);

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const updated = await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: updateData,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/milestones/:milestoneId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id, milestoneId } = req.params;
    const milestone = await prisma.projectMilestone.findFirst({ where: { id: milestoneId, projectId: id } });
    if (!milestone) throw new AppError('Milestone not found', 404);
    const project = await prisma.project.findFirst({ where: { id, ...ownedBy(req) } });
    if (!project) throw new AppError('Milestone not found', 404);
    await prisma.projectMilestone.delete({ where: { id: milestoneId } });
    res.json({ success: true, message: 'Milestone removed' });
  } catch (error) {
    next(error);
  }
});

export default router;
