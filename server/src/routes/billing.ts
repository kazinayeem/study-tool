import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export const PAYMENT_METHODS = ['BKASH', 'NAGAD', 'ROCKET', 'BANK', 'CARD', 'OTHER'] as const;

const DEFAULT_PLANS = [
  {
    name: '1 Month',
    description: 'Try BornoFlow for a month.',
    durationMonths: 1,
    price: 199,
    isPopular: false,
    features: ['Unlimited semesters and courses', 'Notes, documents and class photos', 'Grades, CGPA and fee tracking'],
  },
  {
    name: '2 Months',
    description: 'Cover a short term or a mid-semester sprint.',
    durationMonths: 2,
    price: 349,
    isPopular: false,
    features: ['Everything in 1 Month', 'Study planner and reminders', 'PDF and Word export'],
  },
  {
    name: '4 Months',
    description: 'A full semester at a lower monthly rate.',
    durationMonths: 4,
    price: 599,
    isPopular: true,
    features: ['Everything in 2 Months', 'Email reminders', 'Backup and restore'],
  },
  {
    name: '6 Months',
    description: 'Best monthly rate for a long term.',
    durationMonths: 6,
    price: 799,
    isPopular: false,
    features: ['Everything in 4 Months', 'Priority support', 'Degree planner'],
  },
  {
    name: 'Per Semester',
    description: 'One payment for a whole semester, however long yours runs.',
    durationMonths: 5,
    isSemester: true,
    price: 699,
    isPopular: false,
    features: ['Everything in 4 Months', 'Covers one semester of study', 'Renew each semester'],
  },
];

const DEFAULT_SETTINGS: Record<string, string> = {
  paymentInstructions:
    'Send the amount to the owner using one of the methods below, then submit the transaction ID here. Payment details have not been added yet.',
  paymentMethods: 'BKASH,NAGAD,ROCKET,BANK,OTHER',
  supportContact: '',
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // Jan 31 + 1 month should land on the last day of February, not spill into March.
  if (d.getDate() < day) d.setDate(0);
  return d;
}

function parseFeatures(raw: string | null): string[] {
  try {
    const v = JSON.parse(raw ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function serializePlan<T extends { features: string }>(plan: T) {
  return { ...plan, features: parseFeatures(plan.features) };
}

async function ensureDefaultPlans() {
  const count = await prisma.plan.count();
  if (count > 0) return;
  await prisma.plan.createMany({
    data: DEFAULT_PLANS.map((p, i) => ({
      name: p.name,
      description: p.description,
      durationMonths: p.durationMonths,
      isSemester: p.isSemester ?? false,
      price: p.price,
      isPopular: p.isPopular,
      features: JSON.stringify(p.features),
      sortOrder: i,
    })),
  });
}

async function getSettings() {
  const rows = await prisma.platformSetting.findMany();
  const map: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const r of rows) map[r.key] = r.value;
  return {
    paymentInstructions: map.paymentInstructions,
    paymentMethods: map.paymentMethods
      .split(',')
      .map((m) => m.trim().toUpperCase())
      .filter((m) => (PAYMENT_METHODS as readonly string[]).includes(m)),
    supportContact: map.supportContact,
  };
}

/** ACTIVE subscriptions past their end date are reported as EXPIRED. */
function effectiveStatus(sub: { status: string; endsAt: Date | null }): string {
  if (sub.status === 'ACTIVE' && sub.endsAt && sub.endsAt.getTime() < Date.now()) return 'EXPIRED';
  return sub.status;
}

const withStatus = <T extends { status: string; endsAt: Date | null }>(sub: T) => ({
  ...sub,
  status: effectiveStatus(sub),
});

/* ------------------------------------------------------------------ */
/* Public: plans + payment instructions                                */
/* ------------------------------------------------------------------ */

export const plansRouter = Router();

plansRouter.get('/', async (_req, res: Response, next: NextFunction) => {
  try {
    await ensureDefaultPlans();
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { durationMonths: 'asc' }],
    });
    res.json({ success: true, data: { plans: plans.map(serializePlan), payment: await getSettings() } });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------------------ */
/* Student: subscribe + history                                        */
/* ------------------------------------------------------------------ */

export const billingRouter = Router();

const subscribeSchema = z.object({
  body: z.object({
    planId: z.string().min(1),
    paymentMethod: z.enum(PAYMENT_METHODS),
    transactionId: z.string().trim().min(4, 'Transaction ID is too short').max(64),
    payerNumber: z.string().trim().max(40).nullable().optional(),
    paidAt: z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'Invalid payment date' }).nullable().optional(),
    note: z.string().trim().max(500).nullable().optional(),
  }),
});

billingRouter.get('/me', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const subs = await prisma.subscription.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    const list = subs.map(withStatus);
    const current =
      list
        .filter((s) => s.status === 'ACTIVE')
        .sort((a, b) => (b.endsAt?.getTime() ?? 0) - (a.endsAt?.getTime() ?? 0))[0] ?? null;
    res.json({
      success: true,
      data: { current, subscriptions: list, payment: await getSettings() },
    });
  } catch (error) {
    next(error);
  }
});

billingRouter.post('/subscribe', validate(subscribeSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    if (user.role === 'DEMO') throw new AppError('Demo accounts cannot buy a plan. Please create a real account.', 403);

    const plan = await prisma.plan.findFirst({ where: { id: req.body.planId, isActive: true } });
    if (!plan) throw new AppError('This plan is not available', 404);

    const transactionId = String(req.body.transactionId).trim();
    const duplicate = await prisma.subscription.findFirst({
      where: { transactionId, status: { in: ['PENDING', 'ACTIVE'] } },
    });
    if (duplicate) throw new AppError('This transaction ID has already been submitted', 409);

    const pending = await prisma.subscription.count({ where: { userId: user.id, status: 'PENDING' } });
    if (pending >= 3) throw new AppError('You already have pending requests. Please wait for the owner to review them.', 429);

    const sub = await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        currency: plan.currency,
        durationMonths: plan.durationMonths,
        paymentMethod: req.body.paymentMethod,
        transactionId,
        payerNumber: req.body.payerNumber || null,
        paidAt: req.body.paidAt ? new Date(req.body.paidAt) : null,
        studentNote: req.body.note || null,
      },
    });
    res.status(201).json({ success: true, data: withStatus(sub) });
  } catch (error) {
    next(error);
  }
});

billingRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sub = await prisma.subscription.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!sub) throw new AppError('Request not found', 404);
    if (sub.status !== 'PENDING') throw new AppError('Only pending requests can be cancelled', 400);
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'CANCELLED' } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------------------ */
/* Owner: plans, approvals, settings, stats                            */
/* ------------------------------------------------------------------ */

export const ownerRouter = Router();

const planBody = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).nullable().optional(),
  durationMonths: z.number().int().min(1).max(60),
  isSemester: z.boolean().optional(),
  price: z.number().finite().min(0).max(100_000_000),
  currency: z.string().trim().min(1).max(8).optional(),
  features: z.array(z.string().trim().min(1).max(120)).max(12).optional(),
  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});

ownerRouter.get('/stats', async (_req, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const [pending, active, approved, students, recent] = await Promise.all([
      prisma.subscription.count({ where: { status: 'PENDING' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE', endsAt: { gt: now } } }),
      prisma.subscription.findMany({ where: { status: 'ACTIVE' }, select: { amount: true, currency: true, reviewedAt: true } }),
      prisma.user.count({ where: { role: { in: ['STUDENT', 'GOOGLE'] } } }),
      prisma.subscription.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 1 }),
    ]);
    const revenue = round2(approved.reduce((s, a) => s + a.amount, 0));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const revenueThisMonth = round2(approved.filter((a) => a.reviewedAt && a.reviewedAt >= monthStart).reduce((s, a) => s + a.amount, 0));
    res.json({
      success: true,
      data: {
        pending,
        active,
        students,
        revenue,
        revenueThisMonth,
        currency: approved[0]?.currency ?? 'BDT',
        oldestPendingAt: recent[0]?.createdAt ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
});

ownerRouter.get('/subscriptions', async (req, res: Response, next: NextFunction) => {
  try {
    const status = String(req.query.status || '');
    const where = status && status !== 'ALL' ? { status } : {};
    const rows = await prisma.subscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });
    res.json({ success: true, data: rows.map(withStatus) });
  } catch (error) {
    next(error);
  }
});

const reviewSchema = z.object({ body: z.object({ note: z.string().trim().max(500).nullable().optional() }) });

ownerRouter.post('/subscriptions/:id/approve', validate(reviewSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sub = await prisma.subscription.findUnique({ where: { id: req.params.id } });
    if (!sub) throw new AppError('Subscription not found', 404);
    if (sub.status !== 'PENDING') throw new AppError('Only pending requests can be approved', 400);

    // Renewals stack: a new period starts when the current one ends.
    const latest = await prisma.subscription.findFirst({
      where: { userId: sub.userId, status: 'ACTIVE', endsAt: { gt: new Date() } },
      orderBy: { endsAt: 'desc' },
    });
    const startsAt = latest?.endsAt && latest.endsAt > new Date() ? latest.endsAt : new Date();
    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'ACTIVE',
        startsAt,
        endsAt: addMonths(startsAt, sub.durationMonths),
        reviewedById: req.user!.id,
        reviewedAt: new Date(),
        reviewNote: req.body.note || null,
      },
    });
    res.json({ success: true, data: withStatus(updated) });
  } catch (error) {
    next(error);
  }
});

ownerRouter.post('/subscriptions/:id/reject', validate(reviewSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sub = await prisma.subscription.findUnique({ where: { id: req.params.id } });
    if (!sub) throw new AppError('Subscription not found', 404);
    if (sub.status !== 'PENDING') throw new AppError('Only pending requests can be rejected', 400);
    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'REJECTED', reviewedById: req.user!.id, reviewedAt: new Date(), reviewNote: req.body.note || null },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

ownerRouter.get('/plans', async (_req, res: Response, next: NextFunction) => {
  try {
    await ensureDefaultPlans();
    const plans = await prisma.plan.findMany({
      orderBy: [{ sortOrder: 'asc' }, { durationMonths: 'asc' }],
      include: { _count: { select: { subscriptions: true } } },
    });
    res.json({ success: true, data: plans.map(serializePlan) });
  } catch (error) {
    next(error);
  }
});

ownerRouter.post('/plans', validate(z.object({ body: planBody })), async (req, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const plan = await prisma.plan.create({
      data: {
        name: b.name,
        description: b.description ?? null,
        durationMonths: b.durationMonths,
        isSemester: b.isSemester ?? false,
        price: b.price,
        currency: (b.currency ?? 'BDT').toUpperCase(),
        features: JSON.stringify(b.features ?? []),
        isActive: b.isActive ?? true,
        isPopular: b.isPopular ?? false,
        sortOrder: b.sortOrder ?? 100,
      },
    });
    res.status(201).json({ success: true, data: serializePlan(plan) });
  } catch (error) {
    next(error);
  }
});

ownerRouter.put('/plans/:id', validate(z.object({ body: planBody.partial() })), async (req, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.plan.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Plan not found', 404);
    const b = req.body;
    const plan = await prisma.plan.update({
      where: { id: existing.id },
      data: {
        ...(b.name !== undefined ? { name: b.name } : {}),
        ...(b.description !== undefined ? { description: b.description } : {}),
        ...(b.durationMonths !== undefined ? { durationMonths: b.durationMonths } : {}),
        ...(b.isSemester !== undefined ? { isSemester: b.isSemester } : {}),
        ...(b.price !== undefined ? { price: b.price } : {}),
        ...(b.currency !== undefined ? { currency: b.currency.toUpperCase() } : {}),
        ...(b.features !== undefined ? { features: JSON.stringify(b.features) } : {}),
        ...(b.isActive !== undefined ? { isActive: b.isActive } : {}),
        ...(b.isPopular !== undefined ? { isPopular: b.isPopular } : {}),
        ...(b.sortOrder !== undefined ? { sortOrder: b.sortOrder } : {}),
      },
    });
    res.json({ success: true, data: serializePlan(plan) });
  } catch (error) {
    next(error);
  }
});

ownerRouter.delete('/plans/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.plan.findUnique({ where: { id: req.params.id }, include: { _count: { select: { subscriptions: true } } } });
    if (!existing) throw new AppError('Plan not found', 404);
    if (existing._count.subscriptions > 0) {
      // Keep purchase history intact: hide the plan instead of deleting it.
      await prisma.plan.update({ where: { id: existing.id }, data: { isActive: false } });
      return res.json({ success: true, deactivated: true });
    }
    await prisma.plan.delete({ where: { id: existing.id } });
    res.json({ success: true, deactivated: false });
  } catch (error) {
    next(error);
  }
});

const settingsSchema = z.object({
  body: z.object({
    paymentInstructions: z.string().trim().max(2000).optional(),
    paymentMethods: z.array(z.enum(PAYMENT_METHODS)).min(1).optional(),
    supportContact: z.string().trim().max(200).optional(),
  }),
});

ownerRouter.get('/settings', async (_req, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await getSettings() });
  } catch (error) {
    next(error);
  }
});

ownerRouter.put('/settings', validate(settingsSchema), async (req, res: Response, next: NextFunction) => {
  try {
    const { paymentInstructions, paymentMethods, supportContact } = req.body;
    const entries: [string, string][] = [];
    if (paymentInstructions !== undefined) entries.push(['paymentInstructions', paymentInstructions]);
    if (paymentMethods !== undefined) entries.push(['paymentMethods', paymentMethods.join(',')]);
    if (supportContact !== undefined) entries.push(['supportContact', supportContact]);
    for (const [key, value] of entries) {
      await prisma.platformSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
    }
    res.json({ success: true, data: await getSettings() });
  } catch (error) {
    next(error);
  }
});
