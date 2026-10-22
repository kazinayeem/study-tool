import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { ownedBy, ownerId } from '../middleware/ownership.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

export const FEE_CATEGORIES = [
  'REGISTRATION',
  'MID_EXAM',
  'FINAL_EXAM',
  'LAB',
  'LIBRARY',
  'ACTIVITY',
  'TRANSPORT',
  'HOSTEL',
  'OTHER',
] as const;

const money = z.number().finite().min(0).max(1_000_000_000);

const planSchema = z.object({
  body: z.object({
    semesterId: z.string().min(1),
    currency: z.string().min(1).max(8).default('BDT'),
    perCreditFee: money.default(0),
    waiverPercent: z.number().min(0).max(100).default(0),
    tuitionPaid: money.optional(),
    notes: z.string().max(2000).nullable().optional(),
  }),
});

const createItemSchema = z.object({
  body: z.object({
    semesterId: z.string().min(1),
    courseId: z.string().nullable().optional(),
    category: z.enum(FEE_CATEGORIES).default('OTHER'),
    label: z.string().min(1).max(160),
    amount: money,
    paidAmount: money.default(0),
    dueDate: z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'Invalid due date' }).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  }),
});

const updateItemSchema = z.object({
  body: z.object({
    courseId: z.string().nullable().optional(),
    category: z.enum(FEE_CATEGORIES).optional(),
    label: z.string().min(1).max(160).optional(),
    amount: money.optional(),
    paidAmount: money.optional(),
    dueDate: z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'Invalid due date' }).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  }),
});

const paySchema = z.object({
  body: z.object({ amount: z.number().finite().positive().max(1_000_000_000) }),
});

const tuitionPaySchema = z.object({
  body: z.object({ semesterId: z.string().min(1), amount: z.number().finite().positive().max(1_000_000_000) }),
});

const round2 = (n: number) => Math.round(n * 100) / 100;

type ItemStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';

function itemStatus(amount: number, paid: number, dueDate: Date | null): ItemStatus {
  if (amount > 0 && paid >= amount) return 'PAID';
  if (dueDate && dueDate.getTime() < Date.now()) return 'OVERDUE';
  return paid > 0 ? 'PARTIAL' : 'UNPAID';
}

async function requireSemester(req: AuthenticatedRequest, semesterId: string) {
  const semester = await prisma.semester.findFirst({ where: { id: semesterId, ...ownedBy(req) } });
  if (!semester) throw new AppError('Semester not found', 404);
  return semester;
}

/** Builds the full cost breakdown for one semester. */
async function buildSummary(req: AuthenticatedRequest, semesterId: string) {
  const semester = await requireSemester(req, semesterId);
  const [plan, courses, items] = await Promise.all([
    prisma.semesterFeePlan.findUnique({ where: { semesterId } }),
    prisma.course.findMany({
      where: { semesterId, ...ownedBy(req) },
      select: { id: true, code: true, title: true, credits: true, color: true },
      orderBy: { code: 'asc' },
    }),
    prisma.feeItem.findMany({
      where: { semesterId, ...ownedBy(req) },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  const currency = plan?.currency ?? 'BDT';
  const perCreditFee = plan?.perCreditFee ?? 0;
  const waiverPercent = plan?.waiverPercent ?? 0;
  const totalCredits = courses.reduce((sum, c) => sum + (c.credits ?? 0), 0);

  const tuitionGross = round2(totalCredits * perCreditFee);
  const waiverAmount = round2((tuitionGross * waiverPercent) / 100);
  const tuitionNet = round2(tuitionGross - waiverAmount);
  const tuitionPaid = Math.min(plan?.tuitionPaid ?? 0, tuitionNet);

  const detailedItems = items.map((item) => ({
    ...item,
    paidAmount: Math.min(item.paidAmount, item.amount),
    dueAmount: round2(Math.max(0, item.amount - item.paidAmount)),
    status: itemStatus(item.amount, item.paidAmount, item.dueDate),
  }));

  const byCategory: Record<string, { amount: number; paid: number }> = {};
  for (const item of detailedItems) {
    const bucket = (byCategory[item.category] ??= { amount: 0, paid: 0 });
    bucket.amount = round2(bucket.amount + item.amount);
    bucket.paid = round2(bucket.paid + item.paidAmount);
  }

  const extrasTotal = round2(detailedItems.reduce((s, i) => s + i.amount, 0));
  const extrasPaid = round2(detailedItems.reduce((s, i) => s + i.paidAmount, 0));
  const total = round2(tuitionNet + extrasTotal);
  const paid = round2(tuitionPaid + extrasPaid);

  const perCourse = courses.map((c) => {
    const tuition = round2((c.credits ?? 0) * perCreditFee * (1 - waiverPercent / 100));
    const labFees = round2(
      detailedItems.filter((i) => i.courseId === c.id).reduce((s, i) => s + i.amount, 0)
    );
    return { ...c, tuition, courseFees: labFees, total: round2(tuition + labFees) };
  });

  return {
    semester: { id: semester.id, name: semester.name, code: semester.code },
    plan: {
      currency,
      perCreditFee,
      waiverPercent,
      tuitionPaid,
      notes: plan?.notes ?? null,
      configured: !!plan,
    },
    credits: { total: totalCredits, courses: courses.length },
    tuition: { gross: tuitionGross, waiver: waiverAmount, net: tuitionNet, paid: tuitionPaid, due: round2(tuitionNet - tuitionPaid) },
    byCategory,
    items: detailedItems,
    perCourse,
    totals: {
      total,
      paid,
      due: round2(total - paid),
      percentPaid: total > 0 ? Math.round((paid / total) * 100) : 0,
      overdueCount: detailedItems.filter((i) => i.status === 'OVERDUE').length,
    },
  };
}

// Per-semester totals for the cost history / all-time view.
router.get('/overview', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const semesters = await prisma.semester.findMany({
      where: { ...ownedBy(req) },
      select: { id: true },
      orderBy: { startDate: 'desc' },
    });
    const summaries = await Promise.all(semesters.map((s) => buildSummary(req, s.id)));
    const rows = summaries.map((s) => ({
      semesterId: s.semester.id,
      name: s.semester.name,
      currency: s.plan.currency,
      credits: s.credits.total,
      total: s.totals.total,
      paid: s.totals.paid,
      due: s.totals.due,
    }));
    const grand = rows.reduce(
      (acc, r) => ({ total: acc.total + r.total, paid: acc.paid + r.paid, due: acc.due + r.due }),
      { total: 0, paid: 0, due: 0 }
    );
    res.json({
      success: true,
      data: { rows, grand: { total: round2(grand.total), paid: round2(grand.paid), due: round2(grand.due) } },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/summary', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const semesterId = String(req.query.semesterId || '');
    if (!semesterId) throw new AppError('semesterId is required', 400);
    res.json({ success: true, data: await buildSummary(req, semesterId) });
  } catch (error) {
    next(error);
  }
});

router.put('/plan', validate(planSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { semesterId, tuitionPaid, notes } = req.body;
    const currency: string = req.body.currency ?? 'BDT';
    const perCreditFee: number = req.body.perCreditFee ?? 0;
    const waiverPercent: number = req.body.waiverPercent ?? 0;
    await requireSemester(req, semesterId);
    await prisma.semesterFeePlan.upsert({
      where: { semesterId },
      create: {
        semesterId,
        currency: currency.toUpperCase(),
        perCreditFee,
        waiverPercent,
        tuitionPaid: tuitionPaid ?? 0,
        notes: notes ?? null,
        userId: ownerId(req),
      },
      update: {
        currency: currency.toUpperCase(),
        perCreditFee,
        waiverPercent,
        ...(tuitionPaid !== undefined ? { tuitionPaid } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });
    res.json({ success: true, data: await buildSummary(req, semesterId) });
  } catch (error) {
    next(error);
  }
});

router.post('/tuition-payment', validate(tuitionPaySchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { semesterId, amount } = req.body;
    const summary = await buildSummary(req, semesterId);
    const newPaid = Math.min(summary.tuition.net, summary.tuition.paid + amount);
    await prisma.semesterFeePlan.upsert({
      where: { semesterId },
      create: { semesterId, tuitionPaid: newPaid, userId: ownerId(req) },
      update: { tuitionPaid: newPaid },
    });
    res.json({ success: true, data: await buildSummary(req, semesterId) });
  } catch (error) {
    next(error);
  }
});

async function assertCourseInSemester(req: AuthenticatedRequest, courseId: string | null | undefined, semesterId: string) {
  if (!courseId) return;
  const course = await prisma.course.findFirst({ where: { id: courseId, semesterId, ...ownedBy(req) } });
  if (!course) throw new AppError('Course does not belong to this semester', 400);
}

router.post('/items', validate(createItemSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { semesterId, courseId, label, amount, dueDate, notes } = req.body;
    // The validator does not write schema defaults back onto req.body, so apply them here.
    const category = req.body.category ?? 'OTHER';
    const paidAmount = req.body.paidAmount ?? 0;
    await requireSemester(req, semesterId);
    await assertCourseInSemester(req, courseId, semesterId);
    const item = await prisma.feeItem.create({
      data: {
        semesterId,
        ...(courseId ? { courseId } : {}),
        category,
        label,
        amount,
        paidAmount: Math.min(paidAmount, amount),
        dueDate: dueDate ? new Date(dueDate) : null,
        paidAt: paidAmount > 0 ? new Date() : null,
        notes: notes ?? null,
        userId: ownerId(req),
      },
    });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

router.put('/items/:id', validate(updateItemSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.feeItem.findFirst({ where: { id: req.params.id, ...ownedBy(req) } });
    if (!existing) throw new AppError('Fee item not found', 404);
    const body = req.body;
    if (body.courseId !== undefined) await assertCourseInSemester(req, body.courseId, existing.semesterId);
    const amount = body.amount ?? existing.amount;
    const paidAmount = Math.min(body.paidAmount ?? existing.paidAmount, amount);
    const item = await prisma.feeItem.update({
      where: { id: existing.id },
      data: {
        ...(body.courseId !== undefined ? { courseId: body.courseId } : {}),
        ...(body.category ? { category: body.category } : {}),
        ...(body.label ? { label: body.label } : {}),
        amount,
        paidAmount,
        ...(body.dueDate !== undefined ? { dueDate: body.dueDate ? new Date(body.dueDate) : null } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        paidAt: paidAmount > existing.paidAmount ? new Date() : existing.paidAt,
      },
    });
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

router.post('/items/:id/pay', validate(paySchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.feeItem.findFirst({ where: { id: req.params.id, ...ownedBy(req) } });
    if (!existing) throw new AppError('Fee item not found', 404);
    const item = await prisma.feeItem.update({
      where: { id: existing.id },
      data: { paidAmount: Math.min(existing.amount, existing.paidAmount + req.body.amount), paidAt: new Date() },
    });
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

router.delete('/items/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.feeItem.findFirst({ where: { id: req.params.id, ...ownedBy(req) } });
    if (!existing) throw new AppError('Fee item not found', 404);
    await prisma.feeItem.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
