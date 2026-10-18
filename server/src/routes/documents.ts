import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { prisma } from '../prisma.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { UPLOAD_DIR } from '../config.js';

const router = Router();

const updateDocSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    semesterId: z.string().nullable().optional(),
    courseId: z.string().nullable().optional(),
    category: z.string().optional(),
    description: z.string().nullable().optional(),
    comments: z.string().nullable().optional(),
    lastOpenedPage: z.number().int().min(1).optional(),
    tags: z.array(z.string()).optional(), // Tag names or IDs
  }),
});

// Helper to sanitize and verify path is safely inside UPLOAD_DIR
function getSafeFilePath(storedFilename: string): string {
  // Strip any directory traversal components
  const sanitized = path.basename(storedFilename);
  const resolved = path.resolve(UPLOAD_DIR, sanitized);
  if (!resolved.startsWith(UPLOAD_DIR)) {
    throw new AppError('Invalid file path', 400);
  }
  return resolved;
}

// List documents with flexible filtering, pagination, and search
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { semesterId, courseId, category, search, tag, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const take = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (semesterId) where.semesterId = String(semesterId);
    if (courseId) where.courseId = String(courseId);
    if (category) where.category = String(category);
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { title: { contains: q } },
        { originalFilename: { contains: q } },
        { description: { contains: q } },
        { comments: { contains: q } },
      ];
    }
    if (tag) {
      where.tags = {
        some: {
          tag: { name: { equals: String(tag) } },
        },
      };
    }

    const [total, documents] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          semester: { select: { id: true, name: true, color: true } },
          course: { select: { id: true, code: true, title: true, color: true } },
          tags: { include: { tag: true } },
          _count: {
            select: {
              bookmarks: true,
              annotations: true,
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: documents,
      pagination: {
        page: pageNum,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single document metadata with bookmarks and annotations
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        semester: true,
        course: true,
        tags: { include: { tag: true } },
        bookmarks: { orderBy: { pageNumber: 'asc' } },
        annotations: { orderBy: [{ pageNumber: 'asc' }, { createdAt: 'asc' }] },
        examLinks: { include: { exam: true } },
        assignmentLinks: { include: { assignment: true } },
      },
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    res.json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
});

// Upload new document
router.post('/upload', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No file provided for upload', 400);
    }

    const {
      title,
      semesterId,
      courseId,
      category = 'Other Documents',
      description,
      comments,
      tags,
    } = req.body;

    const isPdf = req.file.mimetype === 'application/pdf' || path.extname(req.file.originalname).toLowerCase() === '.pdf';
    let pageCount = 1;
    let isScanned = false;

    // If PDF, inspect page count and test for searchable text
    if (isPdf) {
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        const parsed = await pdfParse(fileBuffer);
        pageCount = parsed.numpages || 1;
        // If parsed text length is very minimal compared to page count, likely a scanned PDF
        const trimmedText = parsed.text ? parsed.text.trim() : '';
        if (trimmedText.length < 20 * pageCount) {
          isScanned = true;
        }
      } catch (err) {
        console.warn('Could not parse PDF metadata (proceeding with default):', err);
      }
    }

    const document = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          title: title || req.file!.originalname,
          originalFilename: req.file!.originalname,
          storedFilename: req.file!.filename,
          filePath: req.file!.path,
          mimeType: req.file!.mimetype,
          fileSize: req.file!.size,
          category,
          description,
          comments,
          isPdf,
          pageCount,
          lastOpenedPage: 1,
          isScanned,
          semesterId: semesterId || null,
          courseId: courseId || null,
        },
      });

      // Handle tags if provided
      if (tags) {
        const tagList: string[] = typeof tags === 'string' ? JSON.parse(tags) : tags;
        for (const tagName of tagList) {
          if (!tagName || !tagName.trim()) continue;
          const cleanName = tagName.trim();
          const tag = await tx.tag.upsert({
            where: { name: cleanName },
            create: { name: cleanName },
            update: {},
          });
          await tx.documentTag.create({
            data: {
              documentId: doc.id,
              tagId: tag.id,
            },
          });
        }
      }

      return doc;
    });

    const fullDoc = await prisma.document.findUnique({
      where: { id: document.id },
      include: {
        semester: true,
        course: true,
        tags: { include: { tag: true } },
      },
    });

    res.status(201).json({ success: true, data: fullDoc });
  } catch (error) {
    // If error and file was created on disk, cleanup
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        console.error('Failed to cleanup temp upload file:', cleanupErr);
      }
    }
    next(error);
  }
});

// View file inline (for PDF.js and image viewer)
router.get('/:id/file', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const document = await prisma.document.findUnique({ where: { id } });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    const safePath = getSafeFilePath(document.storedFilename);
    if (!fs.existsSync(safePath)) {
      throw new AppError('File not found on storage disk', 404);
    }

    // Update last opened timestamp
    await prisma.document.update({
      where: { id },
      data: { lastOpenedAt: new Date() },
    });

    res.setHeader('Content-Type', document.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalFilename)}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const fileStream = fs.createReadStream(safePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
});

// Download file as attachment
router.get('/:id/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const document = await prisma.document.findUnique({ where: { id } });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    const safePath = getSafeFilePath(document.storedFilename);
    if (!fs.existsSync(safePath)) {
      throw new AppError('File not found on storage disk', 404);
    }

    res.download(safePath, document.originalFilename);
  } catch (error) {
    next(error);
  }
});

// Update document metadata
router.put('/:id', validate(updateDocSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, semesterId, courseId, category, description, comments, lastOpenedPage, tags } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (semesterId !== undefined) updateData.semesterId = semesterId;
    if (courseId !== undefined) updateData.courseId = courseId;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (comments !== undefined) updateData.comments = comments;
    if (lastOpenedPage !== undefined) updateData.lastOpenedPage = lastOpenedPage;

    await prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: { id },
        data: updateData,
      });

      if (tags && Array.isArray(tags)) {
        // Replace existing tags
        await tx.documentTag.deleteMany({ where: { documentId: id } });
        for (const tagName of tags) {
          if (!tagName || !tagName.trim()) continue;
          const cleanName = tagName.trim();
          const tag = await tx.tag.upsert({
            where: { name: cleanName },
            create: { name: cleanName },
            update: {},
          });
          await tx.documentTag.create({
            data: {
              documentId: id,
              tagId: tag.id,
            },
          });
        }
      }
    });

    const updated = await prisma.document.findUnique({
      where: { id },
      include: {
        semester: true,
        course: true,
        tags: { include: { tag: true } },
        bookmarks: true,
        annotations: true,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// Replace existing document file safely
router.post('/:id/replace', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      throw new AppError('No replacement file provided', 400);
    }

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      throw new AppError('Document not found', 404);
    }

    const oldFilePath = getSafeFilePath(document.storedFilename);
    const isPdf = req.file.mimetype === 'application/pdf' || path.extname(req.file.originalname).toLowerCase() === '.pdf';
    let pageCount = 1;
    let isScanned = false;

    if (isPdf) {
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        const parsed = await pdfParse(fileBuffer);
        pageCount = parsed.numpages || 1;
        const trimmedText = parsed.text ? parsed.text.trim() : '';
        if (trimmedText.length < 20 * pageCount) {
          isScanned = true;
        }
      } catch (err) {
        console.warn('PDF parse error on replace:', err);
      }
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        originalFilename: req.file.originalname,
        storedFilename: req.file.filename,
        filePath: req.file.path,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        isPdf,
        pageCount,
        isScanned,
      },
      include: {
        semester: true,
        course: true,
        tags: { include: { tag: true } },
      },
    });

    // Safely delete old physical file from disk
    if (fs.existsSync(oldFilePath)) {
      try {
        fs.unlinkSync(oldFilePath);
      } catch (err) {
        console.error('Could not delete old replaced file:', err);
      }
    }

    res.json({ success: true, message: 'File replaced successfully', data: updated });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        console.error('Failed to cleanup temp replacement file:', cleanupErr);
      }
    }
    next(error);
  }
});

// Delete document and remove physical file
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const document = await prisma.document.findUnique({ where: { id } });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    const safePath = getSafeFilePath(document.storedFilename);

    await prisma.document.delete({ where: { id } });

    if (fs.existsSync(safePath)) {
      try {
        fs.unlinkSync(safePath);
      } catch (err) {
        console.error('Failed to delete physical file:', err);
      }
    }

    res.json({ success: true, message: 'Document and physical file deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
