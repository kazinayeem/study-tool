/**
 * One-off, idempotent ownership backfill.
 *
 * Historical records created before per-user scoping was enforced were stored
 * with `userId = NULL`, even when their parent semester/course was owned by a
 * specific user (notably the demo sandbox). This script restores the correct
 * owner by inheriting it from the parent semester (preferred) or course.
 *
 * It only ever fills a NULL owner from a NON-NULL parent owner, so:
 *  - legitimately shared workspace records (null semester owner) stay null
 *    and remain visible only to admins;
 *  - demo records are returned to the demo user;
 *  - real users' records are returned to their owner.
 *
 * Safe to run multiple times. Run with: npx tsx prisma/backfill-ownership.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEMESTER_OWNED_TABLES = [
  'Assignment',
  'Exam',
  'CalendarEvent',
  'StudySession',
  'StudyPlan',
  'Assessment',
  'Project',
  'Note',
  'Document',
] as const;

async function run() {
  let total = 0;

  for (const table of SEMESTER_OWNED_TABLES) {
    const viaSemester = await prisma.$executeRawUnsafe(
      `UPDATE "${table}"
         SET "userId" = (
           SELECT s."userId" FROM "Semester" s WHERE s."id" = "${table}"."semesterId"
         )
       WHERE "userId" IS NULL
         AND "semesterId" IS NOT NULL
         AND (
           SELECT s."userId" FROM "Semester" s WHERE s."id" = "${table}"."semesterId"
         ) IS NOT NULL`
    );

    const viaCourse = await prisma.$executeRawUnsafe(
      `UPDATE "${table}"
         SET "userId" = (
           SELECT s."userId"
             FROM "Course" c JOIN "Semester" s ON c."semesterId" = s."id"
            WHERE c."id" = "${table}"."courseId"
         )
       WHERE "userId" IS NULL
         AND "semesterId" IS NULL
         AND "courseId" IS NOT NULL
         AND (
           SELECT s."userId"
             FROM "Course" c JOIN "Semester" s ON c."semesterId" = s."id"
            WHERE c."id" = "${table}"."courseId"
         ) IS NOT NULL`
    );

    total += viaSemester + viaCourse;
    console.log(`${table}: backfilled ${viaSemester} via semester, ${viaCourse} via course`);
  }

  console.log(`Ownership backfill complete. Rows updated: ${total}`);
}

run()
  .catch(err => {
    console.error('Ownership backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
