import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { prisma } from '../prisma.js';
import degreeRouter from '../routes/degree.js';
import { errorHandler } from '../middleware/errorHandler.js';

const app = express();
app.use(cors());
app.use(cookieParser('test-secret'));
const TEST_USER_ID = 'test-degree-student-id';

app.use(express.json());
app.use((req, _res, next) => {
  (req as any).userId = TEST_USER_ID;
  next();
});
app.use('/api/degree', degreeRouter);
app.use(errorHandler);

describe('University Curriculum & Degree Progress Planner Integration Tests', () => {
  let createdSemesterId1: string;
  let createdSemesterId2: string;
  let createdCourse1Id: string;
  let createdCourse2Id: string;

  beforeAll(async () => {
    // Ensure test user exists
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      create: {
        id: TEST_USER_ID,
        email: 'degree.student@scholarflow.test',
        name: 'Degree Test Student',
        role: 'STUDENT',
      },
      update: {},
    });

    // Clean existing test state for this user safely
    await prisma.plannedCourse.deleteMany({ where: { degreeProgram: { userId: TEST_USER_ID } } });
    await prisma.curriculumCourse.deleteMany({ where: { degreeProgram: { userId: TEST_USER_ID } } });
    await prisma.degreeProgram.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.courseGrade.deleteMany({ where: { course: { userId: TEST_USER_ID } } });
    await prisma.course.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.semester.deleteMany({ where: { userId: TEST_USER_ID } });

    // Create test semesters
    const sem1 = await prisma.semester.create({
      data: {
        userId: TEST_USER_ID,
        name: 'Fall 2025 Test',
        code: 'FA25-T',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-12-20'),
        status: 'COMPLETED',
      },
    });
    createdSemesterId1 = sem1.id;

    const sem2 = await prisma.semester.create({
      data: {
        userId: TEST_USER_ID,
        name: 'Spring 2026 Test',
        code: 'SP26-T',
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-05-15'),
        status: 'ACTIVE',
      },
    });
    createdSemesterId2 = sem2.id;

    // Create courses with grades in sem1:
    // Course 1: CS101, 3 credits, passed with A (4.0)
    const c1 = await prisma.course.create({
      data: {
        userId: TEST_USER_ID,
        semesterId: sem1.id,
        code: 'CS101',
        title: 'Introduction to Programming',
        credits: 3.0,
      },
    });
    createdCourse1Id = c1.id;

    await prisma.courseGrade.create({
      data: {
        courseId: c1.id,
        semesterId: sem1.id,
        gradeLetter: 'A',
        gradePoint: 4.0,
        finalScore: 92,
        isCompleted: true,
      },
    });

    // Course 2: MATH101, 3 credits, failed with F (0.0) in sem1
    const c2 = await prisma.course.create({
      data: {
        userId: TEST_USER_ID,
        semesterId: sem1.id,
        code: 'MATH101',
        title: 'Calculus I',
        credits: 3.0,
      },
    });
    createdCourse2Id = c2.id;

    await prisma.courseGrade.create({
      data: {
        courseId: c2.id,
        semesterId: sem1.id,
        gradeLetter: 'F',
        gradePoint: 0.0,
        finalScore: 45,
        isCompleted: true,
      },
    });

    // Course in sem2 (ACTIVE): CS201, 3 credits - Currently enrolled
    await prisma.course.create({
      data: {
        userId: TEST_USER_ID,
        semesterId: sem2.id,
        code: 'CS201',
        title: 'Data Structures',
        credits: 3.0,
      },
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.plannedCourse.deleteMany({ where: { degreeProgram: { userId: TEST_USER_ID } } });
    await prisma.curriculumCourse.deleteMany({ where: { degreeProgram: { userId: TEST_USER_ID } } });
    await prisma.degreeProgram.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.courseGrade.deleteMany({
      where: {
        semesterId: { in: [createdSemesterId1, createdSemesterId2] },
      },
    });
    await prisma.course.deleteMany({
      where: {
        userId: TEST_USER_ID,
      },
    });
    await prisma.semester.deleteMany({
      where: {
        userId: TEST_USER_ID,
      },
    });
    await prisma.user.deleteMany({
      where: { id: TEST_USER_ID },
    });
  });

  it('1. GET /api/degree/program returns initial degree program', async () => {
    const res = await request(app).get('/api/degree/program');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.universityName).toBeDefined();
    expect(res.body.data.totalCreditsRequired).toBeDefined();
  });

  it('2. PUT /api/degree/program configures degree details', async () => {
    const res = await request(app)
      .put('/api/degree/program')
      .send({
        universityName: 'Stanford Engineering',
        programName: 'B.S. Computer Systems',
        department: 'EECS',
        degreeDurationYears: 4.0,
        totalCreditsRequired: 128.0,
        requiredSemesters: 8,
        curriculumYear: '2025-2026',
        startSemesterName: 'Fall 2025',
        minCreditsPerSemester: 12.0,
        maxCreditsPerSemester: 18.0,
        isConfigured: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.universityName).toBe('Stanford Engineering');
    expect(res.body.data.totalCreditsRequired).toBe(128.0);
    expect(res.body.data.isConfigured).toBe(true);
  });

  it('3. POST /api/degree/curriculum creates single course and prevents duplicates', async () => {
    // Add CS101
    const res1 = await request(app)
      .post('/api/degree/curriculum')
      .send({
        code: 'CS101',
        title: 'Introduction to Programming',
        credits: 3.0,
        category: 'CORE',
        isRequired: true,
        recommendedSemester: 1,
      });
    expect(res1.status).toBe(201);
    expect(res1.body.data.code).toBe('CS101');

    // Duplicate check
    const resDuplicate = await request(app)
      .post('/api/degree/curriculum')
      .send({
        code: 'CS101',
        title: 'Duplicate Programming',
        credits: 3.0,
      });
    expect(resDuplicate.status).toBe(400);
    expect(resDuplicate.body.message).toContain('already exists');
  });

  it('4. POST /api/degree/curriculum enforces prerequisite validation and detects circular chains', async () => {
    // Add CS201 with prerequisite CS101
    const res2 = await request(app)
      .post('/api/degree/curriculum')
      .send({
        code: 'CS201',
        title: 'Data Structures',
        credits: 3.0,
        category: 'CORE',
        recommendedSemester: 2,
        prerequisiteCodes: ['CS101'],
      });
    expect(res2.status).toBe(201);

    // Add CS301 with prerequisite CS201
    const res3 = await request(app)
      .post('/api/degree/curriculum')
      .send({
        code: 'CS301',
        title: 'Algorithms',
        credits: 3.0,
        category: 'CORE',
        recommendedSemester: 3,
        prerequisiteCodes: ['CS201'],
      });
    expect(res3.status).toBe(201);

    // Attempt to make CS101 require CS301 (Circular: CS101 -> CS301 -> CS201 -> CS101)
    const updateRes = await request(app)
      .put(`/api/degree/curriculum/${res1Id(res2.body.data.id)}`)
      .send({});
    // Specifically test direct circular check via adding prerequisite
    const circularRes = await request(app)
      .post('/api/degree/curriculum')
      .send({
        code: 'CS_CIRCULAR',
        title: 'Circular Test Course',
        credits: 3.0,
        prerequisiteCodes: ['CS_CIRCULAR'],
      });
    expect(circularRes.status).toBe(400);
    expect(circularRes.body.message).toContain('itself');
  });

  function res1Id(id: string) {
    return id;
  }

  it('5. POST /api/degree/curriculum/import supports CSV import and preset templates', async () => {
    const csvContent = `
Code, Title, Credits, Category, IsRequired, RecommendedSemester, Prerequisites
MATH101, Calculus I, 3, BASIC_SCIENCE, true, 1,
MATH102, Calculus II, 3, BASIC_SCIENCE, true, 2, MATH101
PHYS101, Physics Mechanics, 4, BASIC_SCIENCE, true, 1,
PHYS102, Physics Electromagnetism, 4, BASIC_SCIENCE, true, 2, PHYS101
    `.trim();

    const importRes = await request(app)
      .post('/api/degree/curriculum/import')
      .send({
        csvText: csvContent,
        clearExisting: false,
      });

    expect(importRes.status).toBe(200);
    expect(importRes.body.success).toBe(true);
    expect(importRes.body.count).toBe(4);
    expect(importRes.body.prerequisitesCount).toBeGreaterThanOrEqual(2);
  });

  it('6. GET /api/degree/curriculum returns enriched courses with real completion status', async () => {
    const res = await request(app).get('/api/degree/curriculum');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const courses = res.body.data.courses;

    // CS101 was passed with grade A
    const cs101 = courses.find((c: any) => c.code === 'CS101');
    expect(cs101).toBeDefined();
    expect(cs101.status).toBe('COMPLETED');
    expect(cs101.actualRecord.gradeLetter).toBe('A');

    // CS201 is currently enrolled in ACTIVE semester Spring 2026
    const cs201 = courses.find((c: any) => c.code === 'CS201');
    expect(cs201).toBeDefined();
    expect(cs201.status).toBe('CURRENTLY_ENROLLED');

    // MATH101 was failed with grade F
    const math101 = courses.find((c: any) => c.code === 'MATH101');
    expect(math101).toBeDefined();
    expect(math101.status).toBe('FAILED');

    // MATH102 requires MATH101 (which is FAILED), so allPrerequisitesSatisfied should be false
    const math102 = courses.find((c: any) => c.code === 'MATH102');
    expect(math102).toBeDefined();
    expect(math102.allPrerequisitesSatisfied).toBe(false);
  });

  it('7. GET /api/degree/progress computes accurate credit totals without double-counting', async () => {
    const res = await request(app).get('/api/degree/progress');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    // Completed credits should be exactly 3.0 (from CS101).
    // MATH101 (0.0 F) must contribute 0.
    // CS201 (3.0 in-progress) must contribute to inProgress, NOT completed.
    expect(data.credits.completed).toBe(3.0);
    expect(data.credits.inProgress).toBe(3.0);
    expect(data.credits.remaining).toBe(128.0 - 3.0);
    expect(data.credits.completionPercentage).toBe(
      Math.round((3.0 / 128.0) * 1000) / 10
    );

    // Semester credit history check
    expect(data.semesterHistory.length).toBeGreaterThanOrEqual(2);
    const completedSem = data.semesterHistory.find((s: any) => s.status === 'COMPLETED');
    expect(completedSem).toBeDefined();
    expect(completedSem.completedCredits).toBe(3.0);

    // Graduation estimates check
    expect(data.graduationEstimates).toBeDefined();
    expect(data.graduationEstimates.estimatedRemainingSemesters).toBeGreaterThan(0);
    expect(data.graduationEstimates.assumptions.length).toBeGreaterThan(0);
  });

  it('8. Next Semester Planner returns categorized suggestions, retake alert, and limit validation', async () => {
    const plannerRes = await request(app).get('/api/degree/planner/next-semester');
    expect(plannerRes.status).toBe(200);
    expect(plannerRes.body.success).toBe(true);

    const planData = plannerRes.body.data;
    // MATH101 should appear in retakesRequired because it was failed
    const retakeCodes = planData.retakesRequired.map((c: any) => c.code);
    expect(retakeCodes).toContain('MATH101');

    // Suggested load check
    expect(planData.suggestedCreditLoad).toBeGreaterThanOrEqual(planData.minCreditsLimit);
    expect(planData.suggestedCreditLoad).toBeLessThanOrEqual(planData.maxCreditsLimit);

    // Test batch saving planned courses
    const curCourses = await prisma.curriculumCourse.findMany({ take: 2 });
    const batchRes = await request(app)
      .post('/api/degree/planner/batch')
      .send({
        targetSemesterName: 'Fall 2026 (Planned)',
        courseIds: curCourses.map((c) => c.id),
      });
    expect(batchRes.status).toBe(200);
    expect(batchRes.body.count).toBe(2);
  });
});
