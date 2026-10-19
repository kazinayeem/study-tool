import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import pdfParse from 'pdf-parse';
import { prisma } from '../prisma.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { optionalAuthenticateOwner } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { ownedBy, ownerId, canAccess } from '../middleware/ownership.js';
import { logActivity } from '../services/activityLogger.js';
import { UPLOAD_DIR } from '../config.js';
import { validateSemesterCourseConsistency } from '../utils/academicValidation.js';


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
    visibility: z.enum(['PRIVATE', 'PUBLIC', 'UNLISTED']).optional(),
    tags: z.array(z.string()).optional(), // Tag names or IDs
  }),
});

// Helper to calculate SHA-256 checksum of a file
function computeChecksum(filePath: string): string {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  } catch (err) {
    return 'checksum_unavailable';
  }
}

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

// Build a safe Content-Disposition value that supports unicode filenames
// without allowing header injection via newlines or quotes.
function buildContentDisposition(filename: string): string {
  const raw = filename || 'document';
  const asciiFallback =
    raw.replace(/[\r\n"]/g, '').replace(/[^\x20-\x7e]/g, '_') || 'document';
  return `filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(raw)}`;
}

// Parse a single-range "bytes=start-end" header defensively.
function parseByteRange(rangeHeader: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return null;

  let start = match[1] === '' ? null : parseInt(match[1], 10);
  let end = match[2] === '' ? null : parseInt(match[2], 10);

  if (start === null && end === null) return null;

  if (start === null) {
    // Suffix range: last N bytes.
    const suffix = end as number;
    if (suffix <= 0) return null;
    start = Math.max(size - suffix, 0);
    end = size - 1;
  } else if (end === null || end >= size) {
    end = size - 1;
  }

  if (start >= size || start > (end as number)) return null;
  return { start, end: end as number };
}

// Ensure the requesting user is allowed to attach documents to the given course.
// When a course belongs to a specific owner, only that owner (or an admin-free course)
// may upload against it. Courses without an owner remain open for legacy/anonymous flows.
async function assertCourseUploadAccess(courseId: string | null | undefined, req: AuthenticatedRequest): Promise<void> {
  if (!courseId) return;

  const course = await prisma.course.findFirst({
    where: { id: courseId },
    select: { id: true, userId: true },
  });

  if (!course) {
    throw new AppError('Course not found', 404);
  }

  if (!canAccess(course, req)) {
    throw new AppError('Access denied. You do not have permission to upload documents to this course.', 403);
  }
}

// List documents with flexible filtering, pagination, and search
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { semesterId, courseId, category, search, tag, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const take = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * take;

    const where: any = { AND: [ownedBy(req)] };
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
router.get('/:id', optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const document = await prisma.document.findFirst({
      where: { id, ...ownedBy(req) },
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

    // STRICT PRIVACY: Private documents can only be accessed by their owner
    if (document.visibility === 'PRIVATE') {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'This document is Private. Owner authentication is required to access.',
        });
      }
      if (document.userId && document.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Access denied. You do not have permission to view another user's private document.",
        });
      }
    }

    res.json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
});

// Upload new document
router.post('/upload', optionalAuthenticateOwner, upload.single('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

    const validated = await validateSemesterCourseConsistency(courseId, semesterId);
    await assertCourseUploadAccess(validated.courseId, req);

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
          semesterId: validated.semesterId,
          courseId: validated.courseId,
          userId: ownerId(req),
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

    const fullDoc = await prisma.document.findFirst({
      where: { id: document.id, ...ownedBy(req) },
      include: {
        semester: true,
        course: true,
        tags: { include: { tag: true } },
      },
    });

    if (req.user) {
      await logActivity({
        userId: req.user.id,
        eventType: 'DOCUMENT_UPLOAD',
        resourceType: 'DOCUMENT',
        resourceId: document.id,
        isDemo: req.user.role === 'DEMO',
        metadata: {
          category: document.category,
          fileSize: document.fileSize,
          mimeType: document.mimeType,
          pageCount: document.pageCount,
        },
      });
    }

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
router.get('/:id/file', optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const document = await prisma.document.findFirst({ where: { id, ...ownedBy(req) } });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    // Enforce private ownership check: unauthenticated requests cannot access private documents
    if (document.visibility === 'PRIVATE') {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'This document is Private. Owner authentication is required to access.',
        });
      }
      if (document.userId && document.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Access denied. You do not have permission to access another user's private document.",
        });
      }
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

    if (req.user) {
      await logActivity({
        userId: req.user.id,
        eventType: 'PDF_WORKSPACE_USE',
        resourceType: 'DOCUMENT',
        resourceId: id,
        isDemo: req.user.role === 'DEMO',
        metadata: { category: document.category, pageCount: document.pageCount },
      });
    }

    const stat = fs.statSync(safePath);
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; ${buildContentDisposition(document.originalFilename)}`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    // Prevent MIME sniffing of stored user content.
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const rangeHeader = req.headers.range;
    if (typeof rangeHeader === 'string' && rangeHeader.length > 0) {
      const range = parseByteRange(rangeHeader, stat.size);
      if (!range) {
        res.status(416);
        res.setHeader('Content-Range', `bytes */${stat.size}`);
        return res.end();
      }

      const { start, end } = range;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      res.setHeader('Content-Length', end - start + 1);

      const rangeStream = fs.createReadStream(safePath, { start, end });
      rangeStream.on('error', next);
      rangeStream.pipe(res);
      return;
    }

    res.setHeader('Content-Length', stat.size);
    const fileStream = fs.createReadStream(safePath);
    fileStream.on('error', next);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
});

// Download file as attachment
router.get('/:id/download', optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const document = await prisma.document.findFirst({ where: { id, ...ownedBy(req) } });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    // Enforce private ownership check
    if (document.visibility === 'PRIVATE') {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'This document is Private. Owner authentication is required to download.',
        });
      }
      if (document.userId && document.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Access denied. You do not have permission to download another user's private document.",
        });
      }
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
router.put('/:id', validate(updateDocSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, semesterId, courseId, category, description, comments, lastOpenedPage, tags } = req.body;

    const existing = await prisma.document.findFirst({ where: { id, ...ownedBy(req) } });
    if (!existing) throw new AppError('Document not found', 404);

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;

    if (courseId !== undefined || semesterId !== undefined) {
      const targetCourseId = courseId !== undefined ? courseId : existing.courseId;
      const targetSemesterId = semesterId !== undefined ? semesterId : existing.semesterId;
      const validated = await validateSemesterCourseConsistency(targetCourseId, targetSemesterId);
      updateData.courseId = validated.courseId;
      updateData.semesterId = validated.semesterId;
    }

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

    const updated = await prisma.document.findFirst({
      where: { id, ...ownedBy(req) },
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

// Replace existing document file safely, preserving previous version in history
router.post('/:id/replace', upload.single('file'), optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { changeDescription } = req.body;
    if (!req.file) {
      throw new AppError('No replacement file provided', 400);
    }

    const document = await prisma.document.findFirst({ where: { id, ...ownedBy(req) } });
    if (!document) {
      throw new AppError('Document not found', 404);
    }

    if (document.visibility === 'PRIVATE' && document.userId && (!req.user || req.user.id !== document.userId)) {
      throw new AppError('Access denied. Cannot replace another user\'s private document', 403);
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

    // 1. Calculate next version number and archive previous version
    const lastVersion = await prisma.documentVersion.findFirst({
      where: { documentId: id },
      orderBy: { versionNumber: 'desc' },
    });
    const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

    const oldChecksum = fs.existsSync(oldFilePath) ? computeChecksum(oldFilePath) : 'checksum_pending';

    // Store version record for the previous version file (preserve physical file)
    await prisma.documentVersion.create({
      data: {
        documentId: id,
        versionNumber: nextVersionNumber,
        originalFilename: document.originalFilename,
        storedFilename: document.storedFilename,
        filePath: document.filePath,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        checksum: oldChecksum,
        changeDescription: changeDescription || `Version ${nextVersionNumber} archived before update`,
      },
    });

    // 2. Update document to point to new file
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

    if (req.user) {
      await logActivity({
        userId: req.user.id,
        eventType: 'DOCUMENT_UPDATE',
        resourceType: 'DOCUMENT',
        resourceId: id,
        isDemo: req.user.role === 'DEMO',
        metadata: { version: nextVersionNumber + 1, filename: req.file.originalname },
      });
    }

    res.json({ success: true, message: 'File replaced and prior version archived successfully', data: updated });
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

// Alias for uploading a new version: POST /api/documents/:id/versions
router.post('/:id/versions', upload.single('file'), optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Delegate directly to replace handler
  return (router as any).handle(req, res, next);
});

// List version history of a document
router.get('/:id/versions', optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const document = await prisma.document.findFirst({ where: { id, ...ownedBy(req) } });
    if (!document) throw new AppError('Document not found', 404);

    if (document.visibility === 'PRIVATE') {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      if (document.userId && document.userId !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Access denied to private document versions' });
      }
    }

    const versions = await prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { versionNumber: 'desc' },
    });

    res.json({
      success: true,
      data: {
        current: {
          id: document.id,
          originalFilename: document.originalFilename,
          fileSize: document.fileSize,
          mimeType: document.mimeType,
          updatedAt: document.updatedAt,
        },
        versions,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Download a specific document version
router.get('/:id/versions/:versionId/download', optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id, versionId } = req.params;
    const document = await prisma.document.findFirst({ where: { id, ...ownedBy(req) } });
    if (!document) throw new AppError('Document not found', 404);

    if (document.visibility === 'PRIVATE') {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      if (document.userId && document.userId !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const version = await prisma.documentVersion.findFirst({
      where: { id: versionId, documentId: id },
    });
    if (!version) throw new AppError('Version not found', 404);

    const safePath = getSafeFilePath(version.storedFilename);
    if (!fs.existsSync(safePath)) {
      throw new AppError('Version file missing from disk', 404);
    }

    res.download(safePath, version.originalFilename);
  } catch (error) {
    next(error);
  }
});

// Restore a previous version: preserves current version and restores target
router.post('/:id/versions/:versionId/restore', optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id, versionId } = req.params;
    const { changeDescription } = req.body;
    const document = await prisma.document.findFirst({ where: { id, ...ownedBy(req) } });
    if (!document) throw new AppError('Document not found', 404);

    if (document.visibility === 'PRIVATE') {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      if (document.userId && document.userId !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const targetVersion = await prisma.documentVersion.findFirst({
      where: { id: versionId, documentId: id },
    });
    if (!targetVersion) throw new AppError('Target version not found', 404);

    const targetPath = getSafeFilePath(targetVersion.storedFilename);
    if (!fs.existsSync(targetPath)) {
      throw new AppError('Target version file missing from disk', 404);
    }

    // 1. Archive current document state before restoring
    const lastVersion = await prisma.documentVersion.findFirst({
      where: { documentId: id },
      orderBy: { versionNumber: 'desc' },
    });
    const nextVerNum = (lastVersion?.versionNumber || 0) + 1;
    const currentChecksum = fs.existsSync(getSafeFilePath(document.storedFilename))
      ? computeChecksum(getSafeFilePath(document.storedFilename))
      : 'checksum_pending';

    await prisma.documentVersion.create({
      data: {
        documentId: id,
        versionNumber: nextVerNum,
        originalFilename: document.originalFilename,
        storedFilename: document.storedFilename,
        filePath: document.filePath,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        checksum: currentChecksum,
        changeDescription: changeDescription || `Archived current state before restoring Version ${targetVersion.versionNumber}`,
      },
    });

    // 2. Create a clean copy of the restored file to keep version files immutable
    const ext = path.extname(targetVersion.originalFilename);
    const restoredFilename = `restored_${Date.now()}_${path.basename(targetVersion.storedFilename)}`;
    const restoredPath = path.resolve(UPLOAD_DIR, restoredFilename);
    fs.copyFileSync(targetPath, restoredPath);

    // Calculate pageCount if PDF
    let pageCount = document.pageCount;
    let isScanned = document.isScanned;
    if (targetVersion.mimeType === 'application/pdf' || ext.toLowerCase() === '.pdf') {
      try {
        const fileBuffer = fs.readFileSync(restoredPath);
        const parsed = await pdfParse(fileBuffer);
        pageCount = parsed.numpages || 1;
        const text = parsed.text ? parsed.text.trim() : '';
        isScanned = text.length < 20 * pageCount;
      } catch (err) {
        console.warn('PDF parse error on restore:', err);
      }
    }

    // 3. Update document with restored content
    const updated = await prisma.document.update({
      where: { id },
      data: {
        originalFilename: targetVersion.originalFilename,
        storedFilename: restoredFilename,
        filePath: restoredPath,
        mimeType: targetVersion.mimeType,
        fileSize: targetVersion.fileSize,
        pageCount,
        isScanned,
      },
      include: {
        semester: true,
        course: true,
        tags: { include: { tag: true } },
      },
    });

    if (req.user) {
      await logActivity({
        userId: req.user.id,
        eventType: 'DOCUMENT_UPDATE',
        resourceType: 'DOCUMENT',
        resourceId: id,
        isDemo: req.user.role === 'DEMO',
        metadata: { restoredFromVersion: targetVersion.versionNumber },
      });
    }

    res.json({
      success: true,
      message: `Restored to version ${targetVersion.versionNumber} successfully`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// Delete document and remove physical file
router.delete('/:id', optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const document = await prisma.document.findFirst({ where: { id, ...ownedBy(req) } });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    if (document.userId && (!req.user || req.user.id !== document.userId)) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You cannot delete another user's document.",
      });
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

    if (req.user) {
      await logActivity({
        userId: req.user.id,
        eventType: 'DOCUMENT_DELETE',
        resourceType: 'DOCUMENT',
        resourceId: id,
        isDemo: req.user.role === 'DEMO',
      });
    }

    res.json({ success: true, message: 'Document and physical file deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
