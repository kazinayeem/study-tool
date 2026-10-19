import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { prisma } from '../prisma.js';
import { optionalAuthenticateOwner, AuthenticatedRequest } from '../middleware/auth.js';
import { ownedBy, ownerId } from '../middleware/ownership.js';
import { AppError } from '../middleware/errorHandler.js';
import { UPLOAD_DIR } from '../config.js';
import { logActivity } from '../services/activityLogger.js';

// Dedicated upload directory for class board photos
const CLASS_PHOTOS_DIR = path.resolve(UPLOAD_DIR, 'class-photos');
if (!fs.existsSync(CLASS_PHOTOS_DIR)) {
  fs.mkdirSync(CLASS_PHOTOS_DIR, { recursive: true });
}

// Ensure safe file path inside CLASS_PHOTOS_DIR to prevent directory traversal
function getSafeClassPhotoPath(storedFilename: string): string {
  const sanitized = path.basename(storedFilename);
  const resolved = path.resolve(CLASS_PHOTOS_DIR, sanitized);
  if (!resolved.startsWith(CLASS_PHOTOS_DIR)) {
    throw new AppError('Invalid photo storage path', 400);
  }
  return resolved;
}

// Multer storage for board photos
const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, CLASS_PHOTOS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9.]/gi, '') || '.jpg';
    cb(null, `board-${Date.now()}-${uniqueSuffix}${safeExt}`);
  },
});

const uploadClassPhotos = multer({
  storage: photoStorage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max per photo
    files: 20, // max 20 photos per batch upload
  },
  fileFilter: (_req, file, cb) => {
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];

    if (allowedMime.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new AppError(`Unsupported image format (${file.mimetype || ext}). Only JPEG, PNG, and WebP are permitted.`, 400));
    }
  },
});

// Helper to inspect magic bytes of image buffers
function verifyImageSignature(filePath: string): boolean {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(16);
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
    // WebP: 'RIFF'....'WEBP'
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return true;

    return false;
  } catch {
    return false;
  }
}

// Helper to parse image dimensions without heavy external libraries
function parseImageDimensions(filePath: string): { width: number; height: number } | null {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(2048);
    fs.readSync(fd, buffer, 0, 2048, 0);
    fs.closeSync(fd);

    // PNG
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      if (buffer.length >= 24) {
        return {
          width: buffer.readUInt32BE(16),
          height: buffer.readUInt32BE(20),
        };
      }
    }

    // WebP
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
      const type = buffer.toString('ascii', 12, 16);
      if (type === 'VP8X' && buffer.length >= 30) {
        return {
          width: 1 + buffer.readUIntLE(24, 3),
          height: 1 + buffer.readUIntLE(27, 3),
        };
      }
      if (type === 'VP8L' && buffer.length >= 25) {
        const b1 = buffer[21];
        const b2 = buffer[22];
        const b3 = buffer[23];
        const b4 = buffer[24];
        return {
          width: 1 + (((b2 & 0x3f) << 8) | b1),
          height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)),
        };
      }
    }

    // JPEG
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        if (marker === 0xc0 || marker === 0xc2) {
          return {
            height: buffer.readUInt16BE(offset + 5),
            width: buffer.readUInt16BE(offset + 7),
          };
        }
        if (marker === 0xd9 || marker === 0xda) break; // End of image or start of scan
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
      }
    }
  } catch {
    // If dimension parsing fails, return null safely
  }
  return null;
}

// Validation schemas
const createSessionSchema = z.object({
  semesterId: z.string().min(1, 'Semester ID is required'),
  courseId: z.string().min(1, 'Course ID is required'),
  sessionDate: z.string().min(1, 'Class date is required'),
  topic: z.string().min(1, 'Class topic is required').trim(),
  teacherName: z.string().nullable().optional(),
  roomNumber: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

const updateSessionSchema = z.object({
  sessionDate: z.string().optional(),
  topic: z.string().min(1).trim().optional(),
  teacherName: z.string().nullable().optional(),
  roomNumber: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  courseId: z.string().optional(),
});

const updatePhotoSchema = z.object({
  caption: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

// ==========================================
// 1. CLASS SESSIONS ROUTER
// ==========================================
export const classSessionsRouter = Router();

// List class sessions with filters, date range, search, and pagination
classSessionsRouter.get('/', optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const {
      semesterId,
      courseId,
      date,
      startDate,
      endDate,
      quickFilter,
      search,
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * take;

    const where: any = { ...ownedBy(req) };

    if (semesterId) {
      where.semesterId = String(semesterId);
    }

    if (courseId) {
      where.courseId = String(courseId);
    }

    // Date filtering
    if (date) {
      const parsedDate = new Date(String(date));
      if (!isNaN(parsedDate.getTime())) {
        const startOfDay = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 23, 59, 59, 999);
        where.sessionDate = { gte: startOfDay, lte: endOfDay };
      }
    } else if (quickFilter) {
      const now = new Date();
      if (quickFilter === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        where.sessionDate = { gte: start, lte: end };
      } else if (quickFilter === 'week') {
        const dayOfWeek = now.getDay();
        const start = new Date(now);
        start.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        where.sessionDate = { gte: start, lte: end };
      } else if (quickFilter === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        where.sessionDate = { gte: start, lte: end };
      }
    } else if (startDate || endDate) {
      where.sessionDate = {};
      if (startDate) {
        where.sessionDate.gte = new Date(String(startDate));
      }
      if (endDate) {
        where.sessionDate.lte = new Date(String(endDate));
      }
    }

    // Search query
    if (search) {
      const q = String(search).trim();
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { topic: { contains: q } },
          { description: { contains: q } },
          { teacherName: { contains: q } },
          { roomNumber: { contains: q } },
          { course: { title: { contains: q } } },
          { course: { code: { contains: q } } },
          { photos: { some: { caption: { contains: q } } } },
          { photos: { some: { originalFilename: { contains: q } } } },
        ],
      });
    }

    const [total, sessions] = await Promise.all([
      prisma.classSession.count({ where }),
      prisma.classSession.findMany({
        where,
        skip,
        take,
        orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          course: {
            select: {
              id: true,
              code: true,
              title: true,
              color: true,
              teacherName: true,
              roomNumber: true,
            },
          },
          semester: {
            select: {
              id: true,
              name: true,
              code: true,
              status: true,
            },
          },
          photos: {
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
          _count: {
            select: { photos: true },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: sessions,
      total,
      page: pageNum,
      limit: take,
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    next(error);
  }
});

// Distinct dates with photo counts (for calendar badges/highlights)
classSessionsRouter.get('/dates', optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { semesterId, courseId } = req.query;

    const where: any = { ...ownedBy(req) };
    if (semesterId) where.semesterId = String(semesterId);
    if (courseId) where.courseId = String(courseId);

    const sessions = await prisma.classSession.findMany({
      where,
      select: {
        sessionDate: true,
        _count: {
          select: { photos: true },
        },
      },
    });

    const dateMap = new Map<string, { sessionCount: number; photoCount: number }>();

    for (const session of sessions) {
      const dateStr = session.sessionDate.toISOString().slice(0, 10);
      const existing = dateMap.get(dateStr) || { sessionCount: 0, photoCount: 0 };
      existing.sessionCount += 1;
      existing.photoCount += session._count.photos;
      dateMap.set(dateStr, existing);
    }

    const result = Array.from(dateMap.entries()).map(([date, counts]) => ({
      date,
      sessionCount: counts.sessionCount,
      photoCount: counts.photoCount,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Get single session by ID
classSessionsRouter.get('/:id', optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const session = await prisma.classSession.findFirst({
      where: { id, ...ownedBy(req) },
      include: {
        course: true,
        semester: true,
        photos: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!session) {
      // Distinguish a genuinely-missing record from one owned by another user.
      const exists = await prisma.classSession.findUnique({ where: { id }, select: { id: true } });
      if (exists) {
        return res.status(403).json({
          success: false,
          error: "Access denied. You do not have permission to view another user's class photo journal.",
        });
      }
      throw new AppError('Class session not found', 404);
    }

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

// Create new class session
classSessionsRouter.post('/', optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid input data',
      });
    }

    const { semesterId, courseId, sessionDate, topic, teacherName, roomNumber, description } = parsed.data;

    // 1. Verify semester exists and belongs to the caller
    const semester = await prisma.semester.findFirst({
      where: { id: semesterId, ...ownedBy(req) },
    });
    if (!semester) {
      throw new AppError('Selected semester does not exist', 404);
    }

    // 2. Verify course exists and belongs to the caller
    const course = await prisma.course.findFirst({
      where: { id: courseId, ...ownedBy(req) },
    });
    if (!course) {
      throw new AppError('Selected course does not exist', 404);
    }

    // 3. CRITICAL: Verify course belongs to the selected semester
    if (course.semesterId !== semesterId) {
      return res.status(400).json({
        success: false,
        error: `Selected course (${course.code} - ${course.title}) does not belong to the selected semester (${semester.name}).`,
      });
    }

    const parsedDate = new Date(sessionDate);
    if (isNaN(parsedDate.getTime())) {
      throw new AppError('Invalid session date format', 400);
    }

    const session = await prisma.classSession.create({
      data: {
        semesterId,
        courseId,
        userId: ownerId(req),
        sessionDate: parsedDate,
        topic,
        teacherName: teacherName ?? course.teacherName ?? null,
        roomNumber: roomNumber ?? course.roomNumber ?? null,
        description: description ?? null,
      },
      include: {
        course: true,
        semester: true,
        photos: true,
      },
    });

    if (req.user) {
      await logActivity({
        userId: req.user.id,
        eventType: 'NOTE_CREATE',
        resourceType: 'NOTE',
        resourceId: session.id,
        metadata: {
          category: 'CLASS_PHOTO_JOURNAL',
          topic: session.topic,
          courseCode: course.code,
        },
      });
    }

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

// Update class session
classSessionsRouter.patch('/:id', optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = updateSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid update data',
      });
    }

    const existing = await prisma.classSession.findFirst({
      where: { id, ...ownedBy(req) },
    });

    if (!existing) {
      const exists = await prisma.classSession.findUnique({ where: { id }, select: { id: true } });
      if (exists) {
        return res.status(403).json({
          success: false,
          error: "Access denied. You do not have permission to modify another user's class session.",
        });
      }
      throw new AppError('Class session not found', 404);
    }

    const updateData: any = {};
    if (parsed.data.topic !== undefined) updateData.topic = parsed.data.topic;
    if (parsed.data.teacherName !== undefined) updateData.teacherName = parsed.data.teacherName;
    if (parsed.data.roomNumber !== undefined) updateData.roomNumber = parsed.data.roomNumber;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.sessionDate !== undefined) {
      const d = new Date(parsed.data.sessionDate);
      if (isNaN(d.getTime())) throw new AppError('Invalid session date', 400);
      updateData.sessionDate = d;
    }

    // If changing course, verify it belongs to the session's semester
    if (parsed.data.courseId) {
      const newCourse = await prisma.course.findFirst({
        where: { id: parsed.data.courseId, ...ownedBy(req) },
      });
      if (!newCourse) throw new AppError('New course not found', 404);
      if (newCourse.semesterId !== existing.semesterId) {
        return res.status(400).json({
          success: false,
          error: 'Selected course does not belong to this semester.',
        });
      }
      updateData.courseId = parsed.data.courseId;
    }

    const updated = await prisma.classSession.update({
      where: { id },
      data: updateData,
      include: {
        course: true,
        semester: true,
        photos: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// Delete class session and all its image files from disk
classSessionsRouter.delete('/:id', optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const session = await prisma.classSession.findFirst({
      where: { id, ...ownedBy(req) },
      include: { photos: true },
    });

    if (!session) {
      const exists = await prisma.classSession.findUnique({ where: { id }, select: { id: true } });
      if (exists) {
        return res.status(403).json({
          success: false,
          error: "Access denied. You do not have permission to delete another user's class session.",
        });
      }
      throw new AppError('Class session not found', 404);
    }

    // Delete image files from disk safely
    for (const photo of session.photos) {
      try {
        const fullPath = getSafeClassPhotoPath(photo.storedFilename);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (err) {
        console.warn(`Could not delete photo file ${photo.storedFilename}:`, err);
      }
    }

    // Delete session from DB (cascades to ClassPhoto)
    await prisma.classSession.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Class session and all associated board photos deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
});

// Upload photos to an existing class session
classSessionsRouter.post(
  '/:id/photos',
  optionalAuthenticateOwner,
  uploadClassPhotos.array('photos', 20),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const uploadedFiles = (req.files as Express.Multer.File[]) || [];
    try {
      const { id } = req.params;

      const session = await prisma.classSession.findUnique({
        where: { id },
        include: { photos: true },
      });

      if (!session) {
        // Clean up newly uploaded files before throwing
        for (const f of uploadedFiles) {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        }
        throw new AppError('Class session not found', 404);
      }

      // STRICT PRIVACY: Verify ownership
      if (session.userId) {
        if (!req.user) {
          for (const f of uploadedFiles) {
            if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
          }
          return res.status(401).json({
            success: false,
            error: 'Authentication required.',
          });
        }
        if (session.userId !== req.user.id) {
          for (const f of uploadedFiles) {
            if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
          }
          return res.status(403).json({
            success: false,
            error: "Access denied. You do not have permission to upload photos to another user's class session.",
          });
        }
      }

      if (uploadedFiles.length === 0) {
        throw new AppError('No photo files uploaded. Please select or capture at least one image.', 400);
      }

      // Parse optional captions from request body
      // req.body.captions could be stringified JSON array or array of strings
      let captionsList: string[] = [];
      if (req.body.captions) {
        try {
          if (Array.isArray(req.body.captions)) {
            captionsList = req.body.captions;
          } else if (typeof req.body.captions === 'string') {
            const parsedCaptions = JSON.parse(req.body.captions);
            if (Array.isArray(parsedCaptions)) {
              captionsList = parsedCaptions;
            } else {
              captionsList = [req.body.captions];
            }
          }
        } catch {
          captionsList = [String(req.body.captions)];
        }
      }

      const createdPhotos = [];
      const currentCount = session.photos.length;

      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];

        // 1. Verify image magic bytes
        const isValidSignature = verifyImageSignature(file.path);
        if (!isValidSignature) {
          // Remove invalid file
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          return res.status(400).json({
            success: false,
            error: `File ${file.originalname} has an invalid or corrupted image header. Only genuine JPEG, PNG, and WebP images are permitted.`,
            message: `File ${file.originalname} has an invalid or corrupted image header. Only genuine JPEG, PNG, and WebP images are permitted.`,
          });
        }

        // 2. Parse image dimensions
        const dimensions = parseImageDimensions(file.path);

        // 3. Extract caption
        const caption = captionsList[i] ? String(captionsList[i]).trim() : null;

        // 4. Save photo record
        const photo = await prisma.classPhoto.create({
          data: {
            sessionId: session.id,
            userId: session.userId || req.user?.id || null,
            originalFilename: file.originalname,
            storedFilename: file.filename,
            filePath: file.path,
            mimeType: file.mimetype,
            fileSize: file.size,
            width: dimensions?.width ?? null,
            height: dimensions?.height ?? null,
            caption: caption || null,
            sortOrder: currentCount + i,
          },
        });

        createdPhotos.push(photo);
      }

      res.status(201).json({
        success: true,
        data: createdPhotos,
        message: `Successfully saved ${createdPhotos.length} board photo(s).`,
      });
    } catch (error) {
      // Clean up uploaded files in case of error
      for (const f of uploadedFiles) {
        try {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        } catch {}
      }
      next(error);
    }
  }
);

// ==========================================
// 2. CLASS PHOTOS ROUTER
// ==========================================
export const classPhotosRouter = Router();

// Get single photo metadata
classPhotosRouter.get('/:id', optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const photo = await prisma.classPhoto.findUnique({
      where: { id },
      include: {
        session: {
          include: {
            course: true,
            semester: true,
          },
        },
      },
    });

    if (!photo) {
      throw new AppError('Board photo not found', 404);
    }

    // STRICT PRIVACY: Verify ownership
    const ownerId = photo.userId || photo.session.userId;
    if (ownerId) {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required.',
        });
      }
      if (ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Access denied. You do not have permission to view another user's private class photo.",
        });
      }
    }

    res.json({ success: true, data: photo });
  } catch (error) {
    next(error);
  }
});

// Serve image stream or download original
classPhotosRouter.get('/:id/file', optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { download } = req.query;

    const photo = await prisma.classPhoto.findUnique({
      where: { id },
      include: { session: true },
    });

    if (!photo) {
      throw new AppError('Board photo not found', 404);
    }

    // STRICT PRIVACY: Verify ownership
    const ownerId = photo.userId || photo.session.userId;
    if (ownerId) {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required.',
        });
      }
      if (ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Access denied. You do not have permission to view another user's private class photo.",
        });
      }
    }

    const safePath = getSafeClassPhotoPath(photo.storedFilename);
    if (!fs.existsSync(safePath)) {
      throw new AppError('Image file not found on storage disk', 404);
    }

    if (download === 'true' || download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(photo.originalFilename)}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(photo.originalFilename)}"`);
    }

    res.setHeader('Content-Type', photo.mimeType);
    res.setHeader('Cache-Control', 'private, max-age=86400'); // 1 day client cache for owner

    const stream = fs.createReadStream(safePath);
    stream.on('error', (err) => next(err));
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
});

// Update photo caption or order
classPhotosRouter.patch('/:id', optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = updatePhotoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid photo update data',
      });
    }

    const photo = await prisma.classPhoto.findUnique({
      where: { id },
      include: { session: true },
    });

    if (!photo) {
      throw new AppError('Board photo not found', 404);
    }

    // STRICT PRIVACY: Verify ownership
    const ownerId = photo.userId || photo.session.userId;
    if (ownerId) {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required.',
        });
      }
      if (ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Access denied. You do not have permission to update another user's class photo.",
        });
      }
    }

    const updateData: any = {};
    if (parsed.data.caption !== undefined) {
      updateData.caption = parsed.data.caption?.trim() || null;
    }
    if (parsed.data.sortOrder !== undefined) {
      updateData.sortOrder = parsed.data.sortOrder;
    }

    const updated = await prisma.classPhoto.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// Delete individual photo
classPhotosRouter.delete('/:id', optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const photo = await prisma.classPhoto.findUnique({
      where: { id },
      include: { session: true },
    });

    if (!photo) {
      throw new AppError('Board photo not found', 404);
    }

    // STRICT PRIVACY: Verify ownership
    const ownerId = photo.userId || photo.session.userId;
    if (ownerId) {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required.',
        });
      }
      if (ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Access denied. You do not have permission to delete another user's class photo.",
        });
      }
    }

    // Delete image file from disk
    try {
      const fullPath = getSafeClassPhotoPath(photo.storedFilename);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (err) {
      console.warn(`Could not remove photo file ${photo.storedFilename}:`, err);
    }

    // Delete photo record
    await prisma.classPhoto.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Class board photo deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
});
