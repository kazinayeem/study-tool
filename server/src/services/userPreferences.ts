import { prisma } from '../prisma.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { ownerId } from '../middleware/ownership.js';

/**
 * Per-user singletons (settings, dashboard layout, notification preferences,
 * study goals, target GPA). Historically these were global rows keyed by
 * `id: 'default'`, which leaked one user's preferences to everyone.
 *
 * `getOrCreate*` returns the caller's own row, adopting the legacy
 * `userId: null` row for an ADMIN only. Non-admins always get their own row.
 */
export async function getOrCreateAppSetting(req: AuthenticatedRequest) {
  const userId = ownerId(req);
  const own = await prisma.appSetting.findFirst({ where: { userId } });
  if (own) return own;

  if (req.user?.role === 'ADMIN') {
    const legacy = await prisma.appSetting.findFirst({ where: { userId: null } });
    if (legacy) {
      return prisma.appSetting.update({ where: { id: legacy.id }, data: { userId } });
    }
  }
  return prisma.appSetting.create({ data: { id: userId, userId } });
}

export async function getOrCreateDashboardPreference(req: AuthenticatedRequest) {
  const userId = ownerId(req);
  const own = await prisma.dashboardPreference.findFirst({ where: { userId } });
  if (own) return own;

  if (req.user?.role === 'ADMIN') {
    const legacy = await prisma.dashboardPreference.findFirst({ where: { userId: null } });
    if (legacy) {
      return prisma.dashboardPreference.update({ where: { id: legacy.id }, data: { userId } });
    }
  }
  return prisma.dashboardPreference.create({ data: { id: userId, userId } });
}

export async function getOrCreateNotificationPreference(req: AuthenticatedRequest) {
  const userId = ownerId(req);
  const own = await prisma.notificationPreference.findFirst({ where: { userId } });
  if (own) return own;

  if (req.user?.role === 'ADMIN') {
    const legacy = await prisma.notificationPreference.findFirst({ where: { userId: null } });
    if (legacy) {
      return prisma.notificationPreference.update({ where: { id: legacy.id }, data: { userId } });
    }
  }
  return prisma.notificationPreference.create({ data: { id: userId, userId } });
}

export async function getOrCreateStudyGoal(req: AuthenticatedRequest) {
  const userId = ownerId(req);
  const own = await prisma.studyGoal.findFirst({ where: { userId } });
  if (own) return own;

  if (req.user?.role === 'ADMIN') {
    const legacy = await prisma.studyGoal.findFirst({ where: { userId: null } });
    if (legacy) {
      return prisma.studyGoal.update({ where: { id: legacy.id }, data: { userId } });
    }
  }
  return prisma.studyGoal.create({ data: { id: userId, userId } });
}

export async function getOrCreateTargetGpaGoal(req: AuthenticatedRequest) {
  const userId = ownerId(req);
  const own = await prisma.targetGpaGoal.findFirst({ where: { userId } });
  if (own) return own;

  if (req.user?.role === 'ADMIN') {
    const legacy = await prisma.targetGpaGoal.findFirst({ where: { userId: null } });
    if (legacy) {
      return prisma.targetGpaGoal.update({ where: { id: legacy.id }, data: { userId } });
    }
  }
  return prisma.targetGpaGoal.create({ data: { id: userId, userId } });
}
