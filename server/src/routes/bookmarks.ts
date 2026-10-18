import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router({ mergeParams: true });

const createBookmarkSchema = z.object({
  body: z.object({
    pageNumber: z.number().int().min(1, 'Page number must be at least 1'),
    title: z.string().min(1, 'Bookmark title is required'),
    color: z.string().optional(),
  }),
});

// List bookmarks for document
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { documentId } = req.params;
    const bookmarks = await prisma.documentBookmark.findMany({
      where: { documentId },
      orderBy: { pageNumber: 'asc' },
    });
    res.json({ success: true, data: bookmarks });
  } catch (error) {
    next(error);
  }
});

// Create bookmark
router.post('/', validate(createBookmarkSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { documentId } = req.params;
    const { pageNumber, title, color } = req.body;

    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (!document) {
      throw new AppError('Document not found', 404);
    }

    const bookmark = await prisma.documentBookmark.create({
      data: {
        documentId,
        pageNumber,
        title,
        color: color || '#f59e0b',
      },
    });

    res.status(201).json({ success: true, data: bookmark });
  } catch (error) {
    next(error);
  }
});

// Delete bookmark
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.documentBookmark.delete({
      where: { id },
    });
    res.json({ success: true, message: 'Bookmark removed successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
