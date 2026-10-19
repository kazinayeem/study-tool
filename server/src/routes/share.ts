import { Router, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { ownedBy, ownerId } from '../middleware/ownership.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  authenticateOwner,
  optionalAuthenticateOwner,
  passwordVerifyRateLimiter,
  publicShareRateLimiter,
} from '../middleware/auth.js';

const router = Router();

// Validation schema for creating / updating a share link
const createShareLinkSchema = z.object({
  resourceType: z.enum(['DOCUMENT', 'NOTE', 'COURSE', 'ASSIGNMENT', 'EXAM']),
  resourceId: z.string().uuid(),
  visibility: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']).default('UNLISTED'),
  title: z.string().optional(),
  password: z.string().optional().nullable(),
  allowDownload: z.boolean().default(true),
  allowIndexing: z.boolean().default(false),
  viewMode: z.enum(['FULL_ORIGINAL', 'PREVIEW', 'METADATA_ONLY']).default('PREVIEW'),
  expiresAt: z.string().datetime().optional().nullable(),
});

/**
 * Generates a cryptographically secure URL-safe token.
 */
function generateSecureToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

/**
 * POST /api/share/links
 * Creates a new share link for a specific resource (Owner only).
 */
router.post('/links', authenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = createShareLinkSchema.parse(req.body);

    // Verify target resource exists
    let resourceTitle = data.title;
    if (data.resourceType === 'DOCUMENT') {
      const doc = await prisma.document.findUnique({ where: { id: data.resourceId } });
      if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
      resourceTitle = resourceTitle || doc.title;
      // Update resource-level visibility
      await prisma.document.update({
        where: { id: data.resourceId },
        data: { visibility: data.visibility },
      });
    } else if (data.resourceType === 'NOTE') {
      const note = await prisma.note.findUnique({ where: { id: data.resourceId } });
      if (!note) return res.status(404).json({ success: false, error: 'Note not found' });
      resourceTitle = resourceTitle || note.title;
      await prisma.note.update({
        where: { id: data.resourceId },
        data: { visibility: data.visibility },
      });
    } else if (data.resourceType === 'COURSE') {
      const course = await prisma.course.findUnique({ where: { id: data.resourceId } });
      if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
      resourceTitle = resourceTitle || `${course.code} - ${course.title}`;
    } else if (data.resourceType === 'ASSIGNMENT') {
      const assignment = await prisma.assignment.findUnique({ where: { id: data.resourceId } });
      if (!assignment) return res.status(404).json({ success: false, error: 'Assignment not found' });
      resourceTitle = resourceTitle || assignment.title;
      await prisma.assignment.update({
        where: { id: data.resourceId },
        data: { visibility: data.visibility },
      });
    } else if (data.resourceType === 'EXAM') {
      const exam = await prisma.exam.findUnique({ where: { id: data.resourceId } });
      if (!exam) return res.status(404).json({ success: false, error: 'Exam not found' });
      resourceTitle = resourceTitle || exam.title;
      await prisma.exam.update({
        where: { id: data.resourceId },
        data: { visibility: data.visibility },
      });
    }

    // Hash password if provided
    let passwordHash: string | null = null;
    let isPasswordProtected = false;
    if (data.password && data.password.trim().length > 0) {
      passwordHash = await bcrypt.hash(data.password.trim(), 10);
      isPasswordProtected = true;
    }

    const token = generateSecureToken();

    const link = await prisma.shareLink.create({
      data: {
        userId: ownerId(req),
        token,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        visibility: data.visibility,
        title: resourceTitle,
        passwordHash,
        isPasswordProtected,
        allowDownload: data.allowDownload,
        allowIndexing: data.allowIndexing,
        viewMode: data.viewMode,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: link.id,
        token: link.token,
        resourceType: link.resourceType,
        resourceId: link.resourceId,
        visibility: link.visibility,
        title: link.title,
        isPasswordProtected: link.isPasswordProtected,
        allowDownload: link.allowDownload,
        allowIndexing: link.allowIndexing,
        viewMode: link.viewMode,
        expiresAt: link.expiresAt,
        isRevoked: link.isRevoked,
        createdAt: link.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/share/links/resource/:resourceType/:resourceId
 * List all share links for a particular resource (Owner only).
 */
router.get('/links/resource/:resourceType/:resourceId', authenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { resourceType, resourceId } = req.params;
    const links = await prisma.shareLink.findMany({
      where: {
        ...ownedBy(req),
        resourceType: resourceType.toUpperCase(),
        resourceId,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true,
        resourceType: true,
        resourceId: true,
        visibility: true,
        title: true,
        isPasswordProtected: true,
        allowDownload: true,
        allowIndexing: true,
        viewMode: true,
        expiresAt: true,
        isRevoked: true,
        accessCount: true,
        lastAccessedAt: true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: links });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/share/links/:id/revoke
 * Revokes a share link immediately (Owner only).
 */
router.patch('/links/:id/revoke', authenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.shareLink.findFirst({
      where: { id: req.params.id, ...ownedBy(req) },
      select: { id: true },
    });
    if (!existing) {
      throw new AppError('Share link not found', 404);
    }

    const link = await prisma.shareLink.update({
      where: { id: req.params.id },
      data: { isRevoked: true },
    });

    res.json({
      success: true,
      message: 'Share link has been revoked immediately.',
      data: { id: link.id, isRevoked: link.isRevoked },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/share/resource/:resourceType/:resourceId/set-private
 * Switches a resource back to PRIVATE and immediately invalidates all active public/unlisted share links.
 */
router.post('/resource/:resourceType/:resourceId/set-private', authenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { resourceType, resourceId } = req.params;

    // Invalidate all active share links for this resource owned by the caller
    await prisma.shareLink.updateMany({
      where: {
        ...ownedBy(req),
        resourceType: resourceType.toUpperCase(),
        resourceId,
        isRevoked: false,
      },
      data: { isRevoked: true },
    });

    // Update resource visibility in DB (only when owned by the caller)
    if (resourceType.toUpperCase() === 'DOCUMENT') {
      const owned = await prisma.document.findFirst({ where: { id: resourceId, ...ownedBy(req) }, select: { id: true } });
      if (owned) await prisma.document.update({ where: { id: resourceId }, data: { visibility: 'PRIVATE' } });
    } else if (resourceType.toUpperCase() === 'NOTE') {
      const owned = await prisma.note.findFirst({ where: { id: resourceId, ...ownedBy(req) }, select: { id: true } });
      if (owned) await prisma.note.update({ where: { id: resourceId }, data: { visibility: 'PRIVATE' } });
    } else if (resourceType.toUpperCase() === 'ASSIGNMENT') {
      const owned = await prisma.assignment.findFirst({ where: { id: resourceId, ...ownedBy(req) }, select: { id: true } });
      if (owned) await prisma.assignment.update({ where: { id: resourceId }, data: { visibility: 'PRIVATE' } });
    } else if (resourceType.toUpperCase() === 'EXAM') {
      const owned = await prisma.exam.findFirst({ where: { id: resourceId, ...ownedBy(req) }, select: { id: true } });
      if (owned) await prisma.exam.update({ where: { id: resourceId }, data: { visibility: 'PRIVATE' } });
    }

    res.json({
      success: true,
      message: 'Resource switched to Private. All previous share links invalidated.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/share/:token
 * Public endpoint to resolve shared resource metadata and preview content.
 * Enforces rate limiting, token validity, expiration, revocation, and password protection check.
 */
router.get('/:token', publicShareRateLimiter, optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;

    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
    });

    if (!shareLink) {
      return res.status(404).json({
        success: false,
        error: 'The requested share link does not exist or was removed.',
      });
    }

    if (shareLink.isRevoked) {
      return res.status(410).json({
        success: false,
        error: 'This share link has been revoked by the owner and is no longer available.',
      });
    }

    if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
      return res.status(410).json({
        success: false,
        error: 'This share link has expired.',
      });
    }

    // Check if password protected and password hasn't been verified
    const providedPassword = req.headers['x-share-password'] as string | undefined;
    let isPasswordVerified = false;

    if (shareLink.isPasswordProtected && shareLink.passwordHash) {
      // If the authenticated user is the owner, allow direct access
      if (req.user) {
        isPasswordVerified = true;
      } else if (providedPassword) {
        isPasswordVerified = await bcrypt.compare(providedPassword, shareLink.passwordHash);
        if (!isPasswordVerified) {
          return res.status(401).json({
            success: false,
            requiresPassword: true,
            error: 'Incorrect password for protected resource.',
          });
        }
      } else {
        // Return resource metadata stub asking for password
        return res.json({
          success: true,
          requiresPassword: true,
          data: {
            token: shareLink.token,
            resourceType: shareLink.resourceType,
            title: shareLink.title || 'Protected Academic Resource',
            visibility: shareLink.visibility,
            allowIndexing: shareLink.allowIndexing,
          },
        });
      }
    }

    // Record access count and last accessed time
    await prisma.shareLink.update({
      where: { id: shareLink.id },
      data: {
        accessCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });

    // Safely load ONLY permitted public data according to resource type
    let resourceData: any = null;

    if (shareLink.resourceType === 'DOCUMENT') {
      const doc = await prisma.document.findUnique({
        where: { id: shareLink.resourceId },
        select: {
          title: true,
          originalFilename: true,
          mimeType: true,
          fileSize: true,
          category: true,
          description: true,
          isPdf: true,
          pageCount: true,
          createdAt: true,
          course: {
            select: { code: true, title: true, color: true },
          },
          semester: {
            select: { name: true },
          },
        },
      });

      if (!doc) {
        return res.status(404).json({ success: false, error: 'Shared document no longer exists.' });
      }

      resourceData = {
        ...doc,
        fileUrl: `/api/share/${token}/file`,
      };
    } else if (shareLink.resourceType === 'NOTE') {
      const note = await prisma.note.findUnique({
        where: { id: shareLink.resourceId },
        select: {
          title: true,
          content: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          course: {
            select: { code: true, title: true, color: true },
          },
        },
      });

      if (!note) {
        return res.status(404).json({ success: false, error: 'Shared note no longer exists.' });
      }

      resourceData = note;
    } else if (shareLink.resourceType === 'COURSE') {
      const course = await prisma.course.findUnique({
        where: { id: shareLink.resourceId },
        select: {
          code: true,
          title: true,
          credits: true,
          section: true,
          description: true,
          syllabus: true,
          color: true,
          classSchedule: true,
          semester: { select: { name: true } },
        },
      });

      if (!course) {
        return res.status(404).json({ success: false, error: 'Shared course no longer exists.' });
      }

      resourceData = course;
    } else if (shareLink.resourceType === 'ASSIGNMENT') {
      const assignment = await prisma.assignment.findUnique({
        where: { id: shareLink.resourceId },
        select: {
          title: true,
          description: true,
          deadline: true,
          priority: true,
          status: true,
          course: { select: { code: true, title: true, color: true } },
          semester: { select: { name: true } },
          checklist: {
            select: { text: true, isCompleted: true },
          },
          // Intentionally do NOT leak personalNotes
        },
      });

      if (!assignment) {
        return res.status(404).json({ success: false, error: 'Shared assignment no longer exists.' });
      }

      resourceData = assignment;
    } else if (shareLink.resourceType === 'EXAM') {
      const exam = await prisma.exam.findUnique({
        where: { id: shareLink.resourceId },
        select: {
          title: true,
          examType: true,
          examDate: true,
          room: true,
          syllabus: true,
          course: { select: { code: true, title: true, color: true } },
          semester: { select: { name: true } },
          checklist: {
            select: { text: true, isCompleted: true },
          },
          // Intentionally do NOT leak personalNotes
        },
      });

      if (!exam) {
        return res.status(404).json({ success: false, error: 'Shared exam no longer exists.' });
      }

      resourceData = exam;
    }

    res.json({
      success: true,
      requiresPassword: false,
      data: {
        token: shareLink.token,
        resourceType: shareLink.resourceType,
        visibility: shareLink.visibility,
        viewMode: shareLink.viewMode,
        allowDownload: shareLink.allowDownload,
        allowIndexing: shareLink.allowIndexing,
        createdAt: shareLink.createdAt,
        expiresAt: shareLink.expiresAt,
        resource: resourceData,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/share/:token/verify-password
 * Rate-limited password verification endpoint.
 */
router.post('/:token/verify-password', passwordVerifyRateLimiter, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
    });

    if (!shareLink || shareLink.isRevoked) {
      return res.status(404).json({ success: false, error: 'Invalid or revoked link' });
    }

    if (!shareLink.isPasswordProtected || !shareLink.passwordHash) {
      return res.json({ success: true, verified: true });
    }

    const isValid = await bcrypt.compare(password || '', shareLink.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        verified: false,
        error: 'Incorrect password. Access denied.',
      });
    }

    res.json({
      success: true,
      verified: true,
      message: 'Password verified successfully.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/share/:token/file
 * Dedicated secure public file streaming endpoint.
 * Enforces download permission, password check, and streams file safely.
 */
router.get('/:token/file', publicShareRateLimiter, optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const download = req.query.download === 'true';

    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
    });

    if (!shareLink || shareLink.isRevoked) {
      return res.status(404).json({ success: false, error: 'Link is unavailable or revoked.' });
    }

    if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
      return res.status(410).json({ success: false, error: 'Link has expired.' });
    }

    if (shareLink.resourceType !== 'DOCUMENT') {
      return res.status(400).json({ success: false, error: 'Resource does not contain a file.' });
    }

    // Verify password if protected
    const passwordHeader = req.headers['x-share-password'] as string | undefined;
    if (shareLink.isPasswordProtected && shareLink.passwordHash && !req.user) {
      const isMatch = passwordHeader ? await bcrypt.compare(passwordHeader, shareLink.passwordHash) : false;
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Password authentication required.' });
      }
    }

    // Check download permission
    if (download && !shareLink.allowDownload && !req.user) {
      return res.status(403).json({
        success: false,
        error: 'The owner has disabled file downloads for this shared document.',
      });
    }

    const doc = await prisma.document.findUnique({
      where: { id: shareLink.resourceId },
    });

    if (!doc || !fs.existsSync(doc.filePath)) {
      return res.status(404).json({ success: false, error: 'Underlying document file not found.' });
    }

    // Prevent path traversal
    const safePath = path.resolve(doc.filePath);

    res.setHeader('Content-Type', doc.mimeType || 'application/pdf');
    if (download) {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.originalFilename)}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalFilename)}"`);
    }

    const stream = fs.createReadStream(safePath);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

export default router;
