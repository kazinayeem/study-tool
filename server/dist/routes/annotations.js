import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
const router = Router({ mergeParams: true });
const createAnnotationSchema = z.object({
    body: z.object({
        pageNumber: z.number().int().min(1),
        type: z.enum(['highlight', 'note', 'underline', 'strike']).default('highlight'),
        color: z.string().default('#fde047'),
        selectedText: z.string().optional(),
        comment: z.string().optional(),
        rectJson: z.string().optional(),
    }),
});
const updateAnnotationSchema = z.object({
    body: z.object({
        comment: z.string().optional(),
        color: z.string().optional(),
    }),
});
// List annotations for document
router.get('/', async (req, res, next) => {
    try {
        const { documentId } = req.params;
        const { page } = req.query;
        const where = { documentId };
        if (page) {
            where.pageNumber = parseInt(page, 10);
        }
        const annotations = await prisma.documentAnnotation.findMany({
            where,
            orderBy: [{ pageNumber: 'asc' }, { createdAt: 'asc' }],
        });
        res.json({ success: true, data: annotations });
    }
    catch (error) {
        next(error);
    }
});
// Create annotation
router.post('/', validate(createAnnotationSchema), async (req, res, next) => {
    try {
        const { documentId } = req.params;
        const { pageNumber, type, color, selectedText, comment, rectJson } = req.body;
        const document = await prisma.document.findUnique({ where: { id: documentId } });
        if (!document) {
            throw new AppError('Document not found', 404);
        }
        const annotation = await prisma.documentAnnotation.create({
            data: {
                documentId,
                pageNumber,
                type,
                color,
                selectedText,
                comment,
                rectJson,
            },
        });
        res.status(201).json({ success: true, data: annotation });
    }
    catch (error) {
        next(error);
    }
});
// Update annotation
router.put('/:id', validate(updateAnnotationSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { comment, color } = req.body;
        const annotation = await prisma.documentAnnotation.update({
            where: { id },
            data: {
                ...(comment !== undefined ? { comment } : {}),
                ...(color !== undefined ? { color } : {}),
            },
        });
        res.json({ success: true, data: annotation });
    }
    catch (error) {
        next(error);
    }
});
// Delete annotation
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.documentAnnotation.delete({
            where: { id },
        });
        res.json({ success: true, message: 'Annotation deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
export default router;
