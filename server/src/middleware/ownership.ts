import { AppError } from './errorHandler.js';
import type { AuthenticatedRequest } from './auth.js';

/**
 * Central helpers for enforcing per-user data ownership.
 *
 * Rules:
 * - Every user-specific record is owned by exactly one user (`userId`).
 * - A record with `userId === null` is legacy pre-multi-user workspace data and
 *   is only visible to an ADMIN (the workspace owner). It is NEVER visible to
 *   STUDENT / GOOGLE / DEMO accounts.
 * - Demo records live under the dedicated demo user id and never leak to real users.
 */

/** The authenticated user's id, or throws 401 if somehow missing. */
export function ownerId(req: AuthenticatedRequest): string {
  if (!req.user) {
    throw new AppError('Authentication required.', 401);
  }
  return req.user.id;
}

/**
 * Returns a Prisma `where` fragment that restricts a query to records the
 * caller is authorized to see. Spread it together with other filters, e.g.
 *   prisma.course.findMany({ where: { ...ownedBy(req), semesterId } })
 * Prisma treats the extra keys as an AND with the returned `OR`.
 */
export function ownedBy(req: AuthenticatedRequest): Record<string, unknown> {
  if (!req.user) {
    throw new AppError('Authentication required.', 401);
  }
  if (req.user.role === 'ADMIN') {
    // Admins may see their own records plus legacy null-owner workspace records.
    return { OR: [{ userId: req.user.id }, { userId: null }] };
  }
  return { userId: req.user.id };
}

/** Whether the caller may access a record with the given owner id. */
export function canAccess(
  record: { userId?: string | null } | null | undefined,
  req: AuthenticatedRequest
): boolean {
  if (!record || !req.user) return false;
  if (record.userId === req.user.id) return true;
  if (!record.userId && req.user.role === 'ADMIN') return true;
  return false;
}

/**
 * Throws 404 (never 403, to avoid resource enumeration) when a record is
 * missing or owned by someone else.
 */
export function assertOwnership<T extends { userId?: string | null }>(
  record: T | null | undefined,
  req: AuthenticatedRequest,
  notFoundMessage = 'Resource not found'
): T {
  if (!record || !canAccess(record, req)) {
    throw new AppError(notFoundMessage, 404);
  }
  return record;
}

/**
 * Finds a single record by id while enforcing ownership.
 * Returns null when not found or not owned by the caller.
 */
export async function findOwned<
  T extends { userId?: string | null },
  A = T,
>(
  finder: (args: { where: Record<string, unknown> }) => Promise<T | null>,
  id: string,
  req: AuthenticatedRequest
): Promise<A | null> {
  const record = await finder({ where: { id, ...ownedBy(req) } });
  return record as unknown as A | null;
}
