import { Router, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { UPLOAD_DIR } from '../config.js';

/**
 * Owner-only student overview: who the students are, how much storage each uses and what they are
 * working on. Deliberately limited to account metadata, counts, sizes and task/exam titles and
 * status. Note bodies, document contents and study logs are never returned.
 */
export const ownerStudentsRouter = Router();

const num = (v: unknown) => Number(v ?? 0);

/** Total size of everything under the uploads directory (what the disk actually holds). */
function directorySize(dir: string): number {
  let total = 0;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    try {
      total += entry.isDirectory() ? directorySize(full) : fs.statSync(full).size;
    } catch {
      /* file vanished mid-scan */
    }
  }
  return total;
}

const isDoneStatus = (s: string) => s === 'COMPLETED' || s === 'SUBMITTED' || s === 'CANCELLED';

async function storageByUser(): Promise<Map<string, { documents: number; photos: number; versions: number }>> {
  const [docs, photos, versions] = await Promise.all([
    prisma.document.groupBy({ by: ['userId'], _sum: { fileSize: true } }),
    prisma.classPhoto.groupBy({ by: ['userId'], _sum: { fileSize: true } }),
    prisma.$queryRaw<{ userId: string | null; total: unknown }[]>`
      SELECT d."userId" AS userId, SUM(v."fileSize") AS total
      FROM "DocumentVersion" v JOIN "Document" d ON d."id" = v."documentId"
      GROUP BY d."userId"`,
  ]);
  const map = new Map<string, { documents: number; photos: number; versions: number }>();
  const slot = (id: string | null) => {
    const key = id ?? '';
    if (!map.has(key)) map.set(key, { documents: 0, photos: 0, versions: 0 });
    return map.get(key)!;
  };
  docs.forEach((r) => (slot(r.userId).documents = num(r._sum.fileSize)));
  photos.forEach((r) => (slot(r.userId).photos = num(r._sum.fileSize)));
  versions.forEach((r) => (slot(r.userId).versions = num(r.total)));
  return map;
}

ownerStudentsRouter.get('/students', async (_req, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { not: 'ADMIN' } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, accountType: true, status: true, avatarUrl: true, lastLoginAt: true, createdAt: true },
    });

    const [storage, semesters, courses, notes, exams, assignmentRows, subs] = await Promise.all([
      storageByUser(),
      prisma.semester.groupBy({ by: ['userId'], _count: { _all: true } }),
      prisma.course.groupBy({ by: ['userId'], _count: { _all: true } }),
      prisma.note.groupBy({ by: ['userId'], _count: { _all: true } }),
      prisma.exam.groupBy({ by: ['userId'], _count: { _all: true } }),
      prisma.assignment.groupBy({ by: ['userId', 'status'], _count: { _all: true } }),
      prisma.subscription.findMany({
        where: { status: 'ACTIVE', endsAt: { gt: new Date() } },
        orderBy: { endsAt: 'desc' },
        select: { userId: true, planName: true, endsAt: true },
      }),
    ]);

    const countMap = (rows: { userId: string | null; _count: { _all: number } }[]) =>
      new Map(rows.map((r) => [r.userId ?? '', r._count._all]));
    const semMap = countMap(semesters);
    const courseMap = countMap(courses);
    const noteMap = countMap(notes);
    const examMap = countMap(exams);
    const taskMap = new Map<string, { total: number; done: number }>();
    for (const r of assignmentRows) {
      const key = r.userId ?? '';
      const cur = taskMap.get(key) ?? { total: 0, done: 0 };
      cur.total += r._count._all;
      if (isDoneStatus(r.status)) cur.done += r._count._all;
      taskMap.set(key, cur);
    }
    const subMap = new Map<string, { planName: string; endsAt: Date | null }>();
    for (const s of subs) if (!subMap.has(s.userId)) subMap.set(s.userId, { planName: s.planName, endsAt: s.endsAt });

    const students = users.map((u) => {
      const st = storage.get(u.id) ?? { documents: 0, photos: 0, versions: 0 };
      const tasks = taskMap.get(u.id) ?? { total: 0, done: 0 };
      return {
        ...u,
        counts: {
          semesters: semMap.get(u.id) ?? 0,
          courses: courseMap.get(u.id) ?? 0,
          notes: noteMap.get(u.id) ?? 0,
          exams: examMap.get(u.id) ?? 0,
          tasks: tasks.total,
          tasksDone: tasks.done,
        },
        storage: { ...st, total: st.documents + st.photos + st.versions },
        subscription: subMap.get(u.id) ?? null,
      };
    });

    const totalDb = students.reduce((s, x) => s + x.storage.total, 0);
    res.json({
      success: true,
      data: {
        students,
        totals: {
          students: students.filter((s) => s.role !== 'DEMO').length,
          storageBytes: totalDb,
          diskBytes: directorySize(UPLOAD_DIR),
          tasks: students.reduce((s, x) => s + x.counts.tasks, 0),
          notes: students.reduce((s, x) => s + x.counts.notes, 0),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

ownerStudentsRouter.get('/students/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, accountType: true, status: true, avatarUrl: true, lastLoginAt: true, createdAt: true },
    });
    if (!user || user.role === 'ADMIN') throw new AppError('Student not found', 404);

    const [semesters, assignments, exams, documents, subscriptions, storage] = await Promise.all([
      prisma.semester.findMany({
        where: { userId: id },
        orderBy: { startDate: 'desc' },
        select: { id: true, name: true, status: true, startDate: true, endDate: true, _count: { select: { courses: true, assignments: true } } },
      }),
      prisma.assignment.findMany({
        where: { userId: id },
        orderBy: { deadline: 'asc' },
        take: 150,
        select: { id: true, title: true, status: true, priority: true, progress: true, deadline: true, course: { select: { code: true } }, semester: { select: { name: true } } },
      }),
      prisma.exam.findMany({
        where: { userId: id },
        orderBy: { examDate: 'asc' },
        take: 50,
        select: { id: true, title: true, examType: true, examDate: true, preparationStatus: true, course: { select: { code: true } } },
      }),
      prisma.document.findMany({
        where: { userId: id },
        orderBy: { fileSize: 'desc' },
        take: 50,
        select: { id: true, title: true, category: true, mimeType: true, fileSize: true, createdAt: true },
      }),
      prisma.subscription.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
      storageByUser(),
    ]);

    const st = storage.get(id) ?? { documents: 0, photos: 0, versions: 0 };
    res.json({
      success: true,
      data: {
        user,
        storage: { ...st, total: st.documents + st.photos + st.versions },
        semesters,
        assignments,
        exams,
        documents,
        subscriptions,
      },
    });
  } catch (error) {
    next(error);
  }
});
