import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validate } from '../middleware/validate.js';
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
router.get('/', async (_req, res, next) => {
    try {
        const settings = await prisma.appSetting.upsert({
            where: { id: 'default' },
            create: {
                id: 'default',
                theme: 'light',
                studentName: 'Student',
            },
            update: {},
        });
        res.json({ success: true, data: settings });
    }
    catch (error) {
        next(error);
    }
});
router.put('/', validate(updateSettingSchema), async (req, res, next) => {
    try {
        const settings = await prisma.appSetting.upsert({
            where: { id: 'default' },
            create: {
                id: 'default',
                ...req.body,
            },
            update: req.body,
        });
        res.json({ success: true, data: settings });
    }
    catch (error) {
        next(error);
    }
});
export default router;
