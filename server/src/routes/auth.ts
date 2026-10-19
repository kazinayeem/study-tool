import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { prisma } from '../prisma.js';
import { JWT_SECRET, GOOGLE_OAUTH, CLIENT_URL, API_BASE_URL } from '../config.js';
import {
  authenticateUser,
  loginRateLimiter,
  getOrCreateDefaultOwner,
  setAuthCookie,
  clearAuthCookie,
  extractToken,
  AuthenticatedRequest,
} from '../middleware/auth.js';
import { logActivity } from '../services/activityLogger.js';
import { seedDemoUser } from '../utils/seedDemo.js';

const router = Router();

// Google OAuth client instance
function getOAuth2Client() {
  if (!GOOGLE_OAUTH.clientId || !GOOGLE_OAUTH.clientSecret) {
    return null;
  }
  return new OAuth2Client(
    GOOGLE_OAUTH.clientId,
    GOOGLE_OAUTH.clientSecret,
    GOOGLE_OAUTH.callbackUrl
  );
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const setupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

const googleIdTokenSchema = z.object({
  idToken: z.string().min(10),
});

/**
 * Creates or retrieves session and JWT for a user.
 */
async function createAuthSession(user: any, req: Request, res: Response) {
  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Generate signed JWT (valid 30 days)
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  // Create persistent session in DB
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;

  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  // Set secure HttpOnly cookie
  setAuthCookie(res, token);

  return token;
}

/**
 * GET /api/auth/status
 * Workspace status & OAuth availability check
 */
router.get('/status', async (_req, res, next) => {
  try {
    const owner = await getOrCreateDefaultOwner();
    res.json({
      success: true,
      hasOwner: true,
      ownerEmail: owner.email,
      ownerName: owner.name,
      googleAuthEnabled: Boolean(GOOGLE_OAUTH.clientId && GOOGLE_OAUTH.clientSecret),
      googleClientId: GOOGLE_OAUTH.clientId || null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/google
 * Initiates redirect-based Google OAuth flow
 */
router.get('/google', (req, res) => {
  const client = getOAuth2Client();
  if (!client) {
    return res.status(400).json({
      success: false,
      error: 'Google OAuth is not configured. Please supply GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
    });
  }

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'profile', 'email'],
    prompt: 'select_account',
  });

  res.redirect(authUrl);
});

/**
 * GET /auth/google/callback
 * Handles OAuth callback from Google
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error || !code || typeof code !== 'string') {
      return res.redirect(`${CLIENT_URL}/login?error=${encodeURIComponent(String(error || 'missing_oauth_code'))}`);
    }

    const client = getOAuth2Client();
    if (!client) {
      return res.redirect(`${CLIENT_URL}/login?error=oauth_not_configured`);
    }

    // Exchange authorization code for tokens
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) {
      return res.redirect(`${CLIENT_URL}/login?error=no_id_token_received`);
    }

    // Verify ID token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_OAUTH.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.redirect(`${CLIENT_URL}/login?error=invalid_token_payload`);
    }

    // Enforce email verification requirement
    if (!payload.email_verified || !payload.email) {
      return res.redirect(`${CLIENT_URL}/login?error=email_not_verified`);
    }

    // Find or link or create user
    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const name = payload.name || payload.given_name || 'Student';
    const avatarUrl = payload.picture || null;

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
    });

    if (user) {
      // If account disabled, prevent login
      if (user.status === 'DISABLED') {
        return res.redirect(`${CLIENT_URL}/login?error=account_disabled`);
      }

      // Link googleId and avatar if not yet linked
      if (!user.googleId || !user.avatarUrl) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            avatarUrl: user.avatarUrl || avatarUrl,
            accountType: user.accountType === 'REGULAR' ? 'REGULAR' : 'GOOGLE',
          },
        });
      }
    } else {
      // First-time registration via Google
      user = await prisma.user.create({
        data: {
          email,
          name,
          googleId,
          avatarUrl,
          accountType: 'GOOGLE',
          role: 'STUDENT',
          status: 'ACTIVE',
        },
      });
    }

    const token = await createAuthSession(user, req, res);

    await logActivity({
      userId: user.id,
      eventType: 'SIGN_IN',
      resourceType: 'AUTH',
      isDemo: false,
      metadata: { action: 'google_oauth_redirect' },
    });

    // Redirect user back to frontend with token
    res.redirect(`${CLIENT_URL}/login?token=${token}&authSuccess=true`);
  } catch (err: any) {
    console.error('⚠️ [Auth] Google OAuth Callback error:', err);
    res.redirect(`${CLIENT_URL}/login?error=${encodeURIComponent(err.message || 'oauth_verification_failed')}`);
  }
});

/**
 * POST /api/auth/google
 * Validates Google ID token from frontend Google Identity Services / One Tap / Button
 */
router.post('/google', loginRateLimiter, async (req, res, next) => {
  try {
    const { idToken } = googleIdTokenSchema.parse(req.body);

    if (!GOOGLE_OAUTH.clientId) {
      return res.status(400).json({
        success: false,
        error: 'Google OAuth Client ID is not configured on the server.',
      });
    }

    const client = new OAuth2Client(GOOGLE_OAUTH.clientId);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_OAUTH.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Google ID token payload.',
      });
    }

    // Verify token validity
    const nowEpoch = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowEpoch) {
      return res.status(401).json({
        success: false,
        error: 'Google authentication token has expired. Please sign in again.',
      });
    }

    // Verify issuer
    const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!validIssuers.includes(payload.iss)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token issuer.',
      });
    }

    // Verify email verified
    if (!payload.email_verified || !payload.email) {
      return res.status(400).json({
        success: false,
        error: 'Unverified Google email accounts cannot be used to sign in.',
      });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const name = payload.name || payload.given_name || 'Student';
    const avatarUrl = payload.picture || null;

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
    });

    if (user) {
      if (user.status === 'DISABLED') {
        return res.status(403).json({
          success: false,
          error: 'Your account has been disabled by an administrator. Please contact support.',
        });
      }

      if (!user.googleId || !user.avatarUrl) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            avatarUrl: user.avatarUrl || avatarUrl,
          },
        });
      }
    } else {
      // Create user account on first login
      user = await prisma.user.create({
        data: {
          email,
          name,
          googleId,
          avatarUrl,
          accountType: 'GOOGLE',
          role: 'STUDENT',
          status: 'ACTIVE',
        },
      });
    }

    const token = await createAuthSession(user, req, res);

    await logActivity({
      userId: user.id,
      eventType: 'SIGN_IN',
      resourceType: 'AUTH',
      isDemo: false,
      metadata: { action: 'google_id_token' },
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          accountType: user.accountType,
          status: user.status,
          avatarUrl: user.avatarUrl,
        },
      },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Valid idToken string is required.' });
    }
    return res.status(401).json({
      success: false,
      error: err.message || 'Google token validation failed.',
    });
  }
});

/**
 * POST /api/auth/demo
 * One-click demo student login
 * Authenticates ONLY the designated seeded demo user (demo.student@example.com)
 */
router.post('/demo', loginRateLimiter, async (req, res, next) => {
  try {
    // Authenticate only the designated seeded demo user
    const demoUser = await seedDemoUser(false);

    if (demoUser.status === 'DISABLED') {
      return res.status(403).json({
        success: false,
        error: 'Demo account is currently disabled. Please contact the administrator.',
      });
    }

    const token = await createAuthSession(demoUser, req, res);

    await logActivity({
      userId: demoUser.id,
      eventType: 'SIGN_IN',
      resourceType: 'AUTH',
      isDemo: true,
      metadata: { action: 'demo_explore_login' },
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: demoUser.id,
          email: demoUser.email,
          name: demoUser.name,
          role: demoUser.role,
          accountType: demoUser.accountType,
          status: demoUser.status,
          avatarUrl: demoUser.avatarUrl,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Standard email/password login for owner/admin
 */
router.post('/login', loginRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    if (user.status === 'DISABLED') {
      return res.status(403).json({
        success: false,
        error: 'Your account has been disabled by an administrator.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    const token = await createAuthSession(user, req, res);

    await logActivity({
      userId: user.id,
      eventType: 'SIGN_IN',
      resourceType: 'AUTH',
      isDemo: user.role === 'DEMO',
      metadata: { action: 'password_login' },
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          accountType: user.accountType,
          status: user.status,
          avatarUrl: user.avatarUrl,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile
 */
router.get('/me', authenticateUser, async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json({
      success: true,
      data: req.user,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/auth/me
 * Updates current user's profile (name, avatarUrl)
 */
router.patch('/me', authenticateUser, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { name, avatarUrl } = req.body as { name?: string; avatarUrl?: string };

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    // Demo users cannot change profile
    if (req.user.accountType === 'DEMO' || req.user.role === 'DEMO') {
      return res.status(403).json({ success: false, message: 'Profile changes are not allowed in Demo mode.' });
    }

    const updateData: { name?: string; avatarUrl?: string } = {};
    if (typeof name === 'string' && name.trim().length > 0) {
      updateData.name = name.trim().slice(0, 100);
    }
    if (typeof avatarUrl === 'string') {
      updateData.avatarUrl = avatarUrl.trim() || null as any;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided to update.' });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        accountType: true,
        status: true,
        avatarUrl: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    await logActivity({
      userId: req.user.id,
      eventType: 'PROFILE_UPDATE',
      resourceType: 'AUTH',
      metadata: { fields: Object.keys(updateData) },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});


/**
 * POST /api/auth/logout
 * Revokes current session and clears HttpOnly cookies
 */
router.post('/logout', async (req: AuthenticatedRequest, res, next) => {
  try {
    const token = extractToken(req);
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
        await prisma.session.deleteMany({
          where: { userId: decoded.id },
        });

        await logActivity({
          userId: decoded.id,
          eventType: 'SIGN_OUT',
          resourceType: 'AUTH',
        });
      } catch {
        // Ignore token errors during logout
      }
    }

    clearAuthCookie(res);

    res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/setup
 * Creates owner if none exists
 */
router.post('/setup', async (req, res, next) => {
  try {
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      return res.status(400).json({
        success: false,
        error: 'Owner account is already configured. Please log in.',
      });
    }

    const { email, password, name } = setupSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        role: 'ADMIN',
        accountType: 'REGULAR',
        status: 'ACTIVE',
      },
    });

    const token = await createAuthSession(user, req, res);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          accountType: user.accountType,
          status: user.status,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
