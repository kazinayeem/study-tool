import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { ownedBy } from '../middleware/ownership.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { getOrCreateAppSetting } from '../services/userPreferences.js';

const router = Router();

const updateSettingSchema = z.object({
  body: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    studentName: z.string().optional(),
    universityName: z.string().nullable().optional(),
    degree: z.string().nullable().optional(),
    currentSemesterId: z.string().nullable().optional(),
    enableBrowserNotifications: z.boolean().optional(),
    autoSaveDelayMs: z.number().int().min(500).max(10000).optional(),
  }),
});

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const settings = await getOrCreateAppSetting(req);
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

router.put('/', validate(updateSettingSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body;

    if (body.currentSemesterId) {
      const semester = await prisma.semester.findFirst({
        where: { id: body.currentSemesterId, ...ownedBy(req) },
        select: { id: true },
      });
      if (!semester) {
        throw new AppError('Semester not found', 404);
      }
    }

    const existing = await getOrCreateAppSetting(req);
    const settings = await prisma.appSetting.update({
      where: { id: existing.id },
      data: body,
    });

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

export default router;
