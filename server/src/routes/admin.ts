import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import {
  authenticateUser,
  requireAdmin,
  AuthenticatedRequest,
} from '../middleware/auth.js';
import { logActivity, formatActivityDescription } from '../services/activityLogger.js';

const router = Router();

// Apply admin guard to all routes in this router
router.use(authenticateUser, requireAdmin);

const statusUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'DISABLED']),
});

/**
 * GET /api/admin/overview
 * System metrics: total users, active users, demo vs regular stats, activity events by category
 */
router.get('/overview', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeStatusUsers,
      disabledUsers,
      recentlyActiveUsers,
      googleUsers,
      regularUsers,
      demoUsers,
      totalActivityEvents,
      demoActivityCount,
      regularActivityCount,
      recentEvents,
      activityByCategoryRaw,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'DISABLED' } }),
      prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { accountType: 'GOOGLE' } }),
      prisma.user.count({ where: { accountType: 'REGULAR' } }),
      prisma.user.count({ where: { accountType: 'DEMO' } }),
      prisma.activityEvent.count(),
      prisma.activityEvent.count({ where: { isDemo: true } }),
      prisma.activityEvent.count({ where: { isDemo: false } }),
      prisma.activityEvent.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.activityEvent.groupBy({
        by: ['eventType'],
        _count: {
          id: true,
        },
      }),
    ]);

    // Format category distribution
    const eventTypeCounts = activityByCategoryRaw.map((item) => ({
      eventType: item.eventType,
      count: item._count.id,
    }));

    // Privacy-safe recent activity stream
    const formattedRecentEvents = recentEvents.map((evt) => ({
      id: evt.id,
      userId: evt.userId,
      userName: evt.user.name,
      userEmail: evt.user.email,
      eventType: evt.eventType,
      resourceType: evt.resourceType,
      isDemo: evt.isDemo,
      createdAt: evt.createdAt,
      description: formatActivityDescription(evt),
    }));

    res.json({
      success: true,
      data: {
        metrics: {
          totalUsers,
          activeUsers: activeStatusUsers,
          disabledUsers,
          recentlyActiveUsers,
          googleUsers,
          regularUsers,
          demoUsers,
          totalActivityEvents,
          demoActivityCount,
          regularActivityCount,
        },
        activityByCategory: eventTypeCounts,
        recentActivity: formattedRecentEvents,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/users
 * Paginated, searchable, filterable user list with metadata
 */
router.get('/users', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '15', 10)));
    const skip = (page - 1) * limit;

    const query = (req.query.q as string)?.trim().toLowerCase();
    const role = req.query.role as string;
    const status = req.query.status as string;
    const accountType = req.query.accountType as string;

    const where: any = {};

    if (query) {
      where.OR = [
        { name: { contains: query } },
        { email: { contains: query } },
      ];
    }

    if (role && ['ADMIN', 'STUDENT', 'DEMO'].includes(role)) {
      where.role = role;
    }

    if (status && ['ACTIVE', 'DISABLED'].includes(status)) {
      where.status = status;
    }

    if (accountType && ['REGULAR', 'GOOGLE', 'DEMO'].includes(accountType)) {
      where.accountType = accountType;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          accountType: true,
          status: true,
          avatarUrl: true,
          googleId: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              activityEvents: true,
              sessions: true,
            },
          },
        },
      }),
    ]);

    const formattedUsers = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      accountType: u.accountType,
      status: u.status,
      avatarUrl: u.avatarUrl,
      isGoogleLinked: Boolean(u.googleId),
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      activityCount: u._count.activityEvents,
      activeSessionsCount: u._count.sessions,
    }));

    res.json({
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/users/:id
 * Privacy-safe user details with activity summary
 */
router.get('/users/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountType: true,
        status: true,
        avatarUrl: true,
        googleId: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            activityEvents: true,
            sessions: true,
            semesters: true,
            courses: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Recent privacy-safe activity timeline for this user
    const recentActivity = await prisma.activityEvent.findMany({
      where: { userId: id },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    const formattedActivity = recentActivity.map((evt) => ({
      id: evt.id,
      eventType: evt.eventType,
      resourceType: evt.resourceType,
      isDemo: evt.isDemo,
      createdAt: evt.createdAt,
      description: formatActivityDescription(evt),
    }));

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          accountType: user.accountType,
          status: user.status,
          avatarUrl: user.avatarUrl,
          isGoogleLinked: Boolean(user.googleId),
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          counts: {
            activityEvents: user._count.activityEvents,
            activeSessions: user._count.sessions,
            semesters: user._count.semesters,
            courses: user._count.courses,
          },
        },
        recentActivity: formattedActivity,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/users/:id/status
 * Enables or disables a user account.
 * Crucial safety check: Prevents disabling the last active administrator!
 */
router.patch('/users/:id/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = statusUpdateSchema.parse(req.body);

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // SAFETY CHECK: Prevent the last active administrator from losing administrative access
    if (targetUser.role === 'ADMIN' && status === 'DISABLED') {
      const activeAdminsCount = await prisma.user.count({
        where: {
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });

      if (activeAdminsCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Action prohibited: You cannot disable the last active administrator account.',
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountType: true,
        status: true,
        avatarUrl: true,
        updatedAt: true,
      },
    });

    // If disabling account, revoke all active sessions immediately
    if (status === 'DISABLED') {
      await prisma.session.deleteMany({
        where: { userId: id },
      });
    }

    // Record activity event
    await logActivity({
      userId: req.user!.id,
      eventType: 'ACCOUNT_STATUS_CHANGE',
      resourceType: 'USER',
      resourceId: id,
      isDemo: false,
      metadata: {
        targetUserId: id,
        newStatus: status,
      },
    });

    // Record formal admin audit event
    await prisma.adminAuditEvent.create({
      data: {
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        action: `USER_STATUS_${status}`,
        targetType: 'USER',
        targetId: id,
        detailsJson: JSON.stringify({ previousStatus: targetUser.status, newStatus: status }),
        ipAddress: req.ip || null,
      },
    });

    res.json({
      success: true,
      message: `User account has been ${status.toLowerCase()}.`,
      data: updatedUser,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Status must be ACTIVE or DISABLED' });
    }
    next(error);
  }
});

/**
 * GET /api/admin/activity
 * Paginated privacy-safe activity timeline with filtering
 */
router.get('/activity', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
    const skip = (page - 1) * limit;

    const eventType = req.query.eventType as string;
    const isDemoQuery = req.query.isDemo as string;
    const userId = req.query.userId as string;

    const where: any = {};

    if (eventType) {
      where.eventType = eventType;
    }

    if (isDemoQuery === 'true') {
      where.isDemo = true;
    } else if (isDemoQuery === 'false') {
      where.isDemo = false;
    }

    if (userId) {
      where.userId = userId;
    }

    const [total, events] = await Promise.all([
      prisma.activityEvent.count({ where }),
      prisma.activityEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatarUrl: true,
            },
          },
        },
      }),
    ]);

    const formattedEvents = events.map((evt) => ({
      id: evt.id,
      userId: evt.userId,
      userName: evt.user.name,
      userEmail: evt.user.email,
      userRole: evt.user.role,
      eventType: evt.eventType,
      resourceType: evt.resourceType,
      isDemo: evt.isDemo,
      createdAt: evt.createdAt,
      description: formatActivityDescription(evt),
    }));

    res.json({
      success: true,
      data: {
        events: formattedEvents,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/activity/:id
 * Single activity event detail (strictly metadata only)
 */
router.get('/activity/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const event = await prisma.activityEvent.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Activity event not found' });
    }

    res.json({
      success: true,
      data: {
        id: event.id,
        userId: event.userId,
        userName: event.user.name,
        userEmail: event.user.email,
        eventType: event.eventType,
        resourceType: event.resourceType,
        isDemo: event.isDemo,
        createdAt: event.createdAt,
        description: formatActivityDescription(event),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/analytics/features
 * Aggregate feature usage counts without exposing private academic data
 */
router.get('/analytics/features', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const [
      calendarEventsCount,
      assignmentsCount,
      projectsCount,
      studySessionsCount,
      assessmentsCount,
      documentVersionsCount,
      activeShareLinksCount,
      backupRecordsCount,
      studySessions,
      notificationsSentCount,
      notificationsFailedCount,
    ] = await Promise.all([
      prisma.calendarEvent.count(),
      prisma.assignment.count(),
      prisma.project.count(),
      prisma.studySession.count(),
      prisma.assessment.count(),
      prisma.documentVersion.count(),
      prisma.shareLink.count({ where: { isRevoked: false } }),
      prisma.backupRecord.count({ where: { status: 'SUCCESS' } }),
      prisma.studySession.findMany({
        where: { isCompleted: true },
        select: { actualDurationMinutes: true, durationMinutes: true },
      }),
      prisma.notificationLog.count({ where: { status: 'Sent' } }),
      prisma.notificationLog.count({ where: { status: 'Failed' } }),
    ]);

    const totalStudyMinutes = studySessions.reduce(
      (sum, s) => sum + (s.actualDurationMinutes > 0 ? s.actualDurationMinutes : s.durationMinutes),
      0
    );
    const totalStudyHours = Math.round((totalStudyMinutes / 60) * 10) / 10;

    res.json({
      success: true,
      data: {
        features: {
          calendarEvents: calendarEventsCount,
          assignmentsAndTasks: assignmentsCount,
          projects: projectsCount,
          studySessions: studySessionsCount,
          totalStudyHours,
          assessmentsRecorded: assessmentsCount,
          documentVersions: documentVersionsCount,
          activeShareLinks: activeShareLinksCount,
          backupsCreated: backupRecordsCount,
          notificationsSent: notificationsSentCount,
          notificationsFailed: notificationsFailedCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/analytics/engagement
 * Daily and weekly user engagement and sign-in activity
 */
router.get('/analytics/engagement', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const past14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const past30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalSignIns, activeUsersCount, newRegistrationsCount, signIns14Days] = await Promise.all([
      prisma.activityEvent.count({ where: { eventType: 'SIGN_IN' } }),
      prisma.activityEvent.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: past30Days } },
      }),
      prisma.user.count({ where: { createdAt: { gte: past30Days } } }),
      prisma.activityEvent.findMany({
        where: {
          eventType: 'SIGN_IN',
          createdAt: { gte: past14Days },
        },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Aggregate daily sign-ins for the past 14 days
    const dailyMap = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dailyMap.set(d.toISOString().split('T')[0], 0);
    }

    for (const evt of signIns14Days) {
      const key = evt.createdAt.toISOString().split('T')[0];
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
      }
    }

    const dailySignIns = Array.from(dailyMap.entries()).map(([date, count]) => ({
      date,
      signIns: count,
    }));

    res.json({
      success: true,
      data: {
        totalSignIns,
        activeUsers30Days: activeUsersCount.length,
        newRegistrations30Days: newRegistrationsCount,
        dailySignIns,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/audit
 * Immutable audit trail of administrative operations
 */
router.get('/audit', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
    const skip = (page - 1) * limit;
    const action = req.query.action as string | undefined;

    const where: any = {};
    if (action) where.action = action;

    const [total, auditLogs] = await Promise.all([
      prisma.adminAuditEvent.count({ where }),
      prisma.adminAuditEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const formatted = auditLogs.map((log) => ({
      ...log,
      details: log.detailsJson ? JSON.parse(log.detailsJson) : null,
    }));

    res.json({
      success: true,
      data: {
        auditLogs: formatted,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
