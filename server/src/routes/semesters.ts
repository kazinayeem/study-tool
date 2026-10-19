import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { ownedBy, ownerId } from '../middleware/ownership.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { getOrCreateAppSetting } from '../services/userPreferences.js';

const router = Router();

const createSemesterSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Semester name is required'),
    code: z.string().optional(),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start date' }),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid end date' }),
    status: z.enum(['UPCOMING', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).default('UPCOMING'),
    description: z.string().optional(),
    academicGoals: z.string().optional(),
    color: z.string().optional(),
  }),
});

const updateSemesterSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    code: z.string().optional(),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val))).optional(),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val))).optional(),
    status: z.enum(['UPCOMING', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
    description: z.string().nullable().optional(),
    academicGoals: z.string().nullable().optional(),
    color: z.string().optional(),
    isArchived: z.boolean().optional(),
  }),
});

// List all semesters
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { includeArchived } = req.query;
    const where = {
      ...ownedBy(req),
      ...(includeArchived === 'true' ? {} : { isArchived: false }),
    };

    const semesters = await prisma.semester.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        _count: {
          select: {
            courses: true,
            documents: true,
            assignments: true,
            exams: true,
            notes: true,
          },
        },
        courses: {
          select: {
            id: true,
            code: true,
            title: true,
            color: true,
            credits: true,
            progress: true,
          },
        },
      },
    });

    res.json({ success: true, data: semesters });
  } catch (error) {
    next(error);
  }
});

// Get single semester by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const semester = await prisma.semester.findFirst({
      where: { id, ...ownedBy(req) },
      include: {
        courses: {
          include: {
            _count: {
              select: {
                documents: true,
                notes: true,
                assignments: true,
                exams: true,
              },
            },
          },
        },
        assignments: {
          where: { status: { not: 'COMPLETED' } },
          orderBy: { deadline: 'asc' },
          take: 5,
        },
        exams: {
          orderBy: { examDate: 'asc' },
          take: 5,
        },
        _count: {
          select: {
            courses: true,
            documents: true,
            assignments: true,
            exams: true,
            notes: true,
          },
        },
      },
    });

    if (!semester) {
      throw new AppError('Semester not found', 404);
    }

    res.json({ success: true, data: semester });
  } catch (error) {
    next(error);
  }
});

// Create semester
router.post('/', validate(createSemesterSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, code, startDate, endDate, status, description, academicGoals, color } = req.body;

    // Prevent duplicate semesters (same name or code) within the caller's own workspace.
    const duplicate = await prisma.semester.findFirst({
      where: {
        ...ownedBy(req),
        OR: [{ name }, ...(code ? [{ code }] : [])],
      },
      select: { id: true, name: true },
    });
    if (duplicate) {
      throw new AppError(`A semester named "${name}" already exists.`, 409);
    }

    const semester = await prisma.semester.create({
      data: {
        name,
        code,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status,
        description,
        academicGoals,
        color: color || '#4f46e5',
        userId: ownerId(req),
      },
    });

    // If status is ACTIVE, update the caller's own AppSetting
    if (status === 'ACTIVE') {
      const setting = await getOrCreateAppSetting(req);
      await prisma.appSetting.update({
        where: { id: setting.id },
        data: { currentSemesterId: semester.id },
      });
    }

    res.status(201).json({ success: true, data: semester });
  } catch (error) {
    next(error);
  }
});

// Update semester
router.put('/:id', validate(updateSemesterSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, code, startDate, endDate, status, description, academicGoals, color, isArchived } = req.body;

    const existing = await prisma.semester.findFirst({ where: { id, ...ownedBy(req) } });
    if (!existing) {
      throw new AppError('Semester not found', 404);
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (status !== undefined) updateData.status = status;
    if (description !== undefined) updateData.description = description;
    if (academicGoals !== undefined) updateData.academicGoals = academicGoals;
    if (color !== undefined) updateData.color = color;
    if (isArchived !== undefined) updateData.isArchived = isArchived;

    const semester = await prisma.semester.update({
      where: { id },
      data: updateData,
    });

    if (status === 'ACTIVE') {
      const setting = await getOrCreateAppSetting(req);
      await prisma.appSetting.update({
        where: { id: setting.id },
        data: { currentSemesterId: semester.id },
      });
    }

    res.json({ success: true, data: semester });
  } catch (error) {
    next(error);
  }
});

// Duplicate semester structure (copies semester & courses WITHOUT copying files/documents)
router.post('/:id/duplicate', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { newName, newStartDate, newEndDate } = req.body;

    const original = await prisma.semester.findFirst({
      where: { id, ...ownedBy(req) },
      include: { courses: true },
    });

    if (!original) {
      throw new AppError('Original semester not found to duplicate', 404);
    }

    const createdSemester = await prisma.$transaction(async (tx) => {
      const duplicated = await tx.semester.create({
        data: {
          name: newName || `${original.name} (Copy)`,
          code: original.code ? `${original.code}-COPY` : null,
          startDate: newStartDate ? new Date(newStartDate) : original.startDate,
          endDate: newEndDate ? new Date(newEndDate) : original.endDate,
          status: 'UPCOMING',
          description: original.description,
          academicGoals: original.academicGoals,
          color: original.color,
          isArchived: false,
          userId: ownerId(req),
        },
      });

      // Duplicate course structures
      for (const course of original.courses) {
        await tx.course.create({
          data: {
            semesterId: duplicated.id,
            code: course.code,
            title: course.title,
            credits: course.credits,
            section: course.section,
            teacherName: course.teacherName,
            teacherEmail: course.teacherEmail,
            roomNumber: course.roomNumber,
            description: course.description,
            syllabus: course.syllabus,
            color: course.color,
            icon: course.icon,
            classSchedule: course.classSchedule,
            examSchedule: course.examSchedule,
            progress: 0,
            userId: ownerId(req),
          },
        });
      }

      return duplicated;
    });

    const fullDuplicated = await prisma.semester.findUnique({
      where: { id: createdSemester.id },
      include: { courses: true },
    });

    res.status(201).json({
      success: true,
      message: 'Semester structure duplicated successfully without duplicating documents',
      data: fullDuplicated,
    });
  } catch (error) {
    next(error);
  }
});

// Delete semester
router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.semester.findFirst({ where: { id, ...ownedBy(req) } });
    if (!existing) {
      throw new AppError('Semester not found', 404);
    }
    await prisma.semester.delete({
      where: { id },
    });
    res.json({ success: true, message: 'Semester and associated data deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
