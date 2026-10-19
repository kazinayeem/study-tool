import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import { prisma } from '../prisma.js';
import rateLimit from 'express-rate-limit';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'STUDENT' | 'DEMO' | string;
  accountType: 'REGULAR' | 'GOOGLE' | 'DEMO' | string;
  status: 'ACTIVE' | 'DISABLED' | string;
  googleId?: string | null;
  avatarUrl?: string | null;
  lastLoginAt?: Date | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  sessionId?: string;
}

/**
 * Ensures at least one owner/admin user exists.
 * If database has 0 users, creates default owner account with ADMIN role.
 */
export async function getOrCreateDefaultOwner() {
  let owner = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!owner) {
    // Check if any user exists, promote first user or create default admin
    const firstUser = await prisma.user.findFirst();
    if (firstUser) {
      owner = await prisma.user.update({
        where: { id: firstUser.id },
        data: { role: 'ADMIN' },
      });
      console.log(`👤 [Auth] Existing user promoted to ADMIN: ${owner.email}`);
    } else {
      const bcrypt = await import('bcrypt');
      const defaultPassword = 'Password123!';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);
      owner = await prisma.user.create({
        data: {
          email: 'owner@scholarflow.local',
          passwordHash,
          name: 'Academic Scholar',
          role: 'ADMIN',
          accountType: 'REGULAR',
          status: 'ACTIVE',
        },
      });
      console.log('👤 [Auth] Default owner initialized with ADMIN role: owner@scholarflow.local');
    }
  }

  return owner;
}

/**
 * Helper to extract JWT token from cookies, Authorization header, or query parameter.
 */
export function extractToken(req: Request): string | null {
  // 1. Check HttpOnly cookie
  if (req.cookies && req.cookies.scholarflow_token) {
    return req.cookies.scholarflow_token;
  }

  // 2. Check Authorization header: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 3. Check query param ?token=<token>
  if (req.query && typeof req.query.token === 'string') {
    return req.query.token;
  }

  return null;
}

/**
 * Core authentication middleware.
 * Verifies token, fetches user, ensures account is not disabled.
 */
export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in to continue.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        accountType: true,
        status: true,
        googleId: true,
        avatarUrl: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or revoked authentication token.',
      });
    }

    if (user.status === 'DISABLED') {
      return res.status(403).json({
        success: false,
        error: 'Your account has been disabled by an administrator. Please contact support.',
      });
    }

    req.user = user as AuthenticatedUser;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: 'Authentication token is invalid or expired.',
    });
  }
}

// Backward-compatible alias for existing routes
export const authenticateOwner = authenticateUser;

/**
 * Admin role guard middleware.
 * Ensures the authenticated user has the ADMIN role.
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in.',
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Administrator privileges required.',
    });
  }

  next();
}

/**
 * Optional authentication: Attaches req.user if a valid token is present, but doesn't block the request.
 */
export async function optionalAuthenticateOwner(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        accountType: true,
        status: true,
        googleId: true,
        avatarUrl: true,
        lastLoginAt: true,
      },
    });

    if (user && user.status !== 'DISABLED') {
      req.user = user as AuthenticatedUser;
    }
  } catch {
    // Ignore invalid optional tokens
  }

  next();
}

/**
 * Synchronous helper to extract optional authenticated user from request.
 */
export function getOptionalAuthUser(req: Request): { id: string; email: string } | null {
  const token = extractToken(req);
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Enforces resource ownership.
 * Admins CANNOT bypass private document or note ownership.
 */
export function checkResourceOwnership(resourceUserId: string | null | undefined, currentUser?: AuthenticatedUser): boolean {
  if (!currentUser) return false;
  // If the resource was created before multi-user (userId is null),
  // it belongs to the primary workspace owner (admin)
  if (!resourceUserId) {
    return currentUser.role === 'ADMIN';
  }
  return resourceUserId === currentUser.id;
}

/**
 * Helper to set HttpOnly session cookie on the response.
 */
export function setAuthCookie(res: Response, token: string) {
  res.cookie('scholarflow_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  });
}

/**
 * Helper to clear session cookie on logout.
 */
export function clearAuthCookie(res: Response) {
  res.clearCookie('scholarflow_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * Rate limiters
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 login requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
  },
});

export const passwordVerifyRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many incorrect password attempts. Please wait 5 minutes before retrying.',
  },
});

export const publicShareRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Rate limit exceeded for public resource access. Please slow down.',
  },
});
