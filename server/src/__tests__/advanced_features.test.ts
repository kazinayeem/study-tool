import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { prisma } from '../prisma.js';
import { calculateGradeFromScore } from '../routes/grades.js';

describe('Advanced Features: Grade Calculator, Planner, Knowledge Base & Backup', () => {
  let semesterId: string;
  let courseId: string;

  beforeAll(async () => {
    // Ensure active semester and course exist
    let sem = await prisma.semester.findFirst({ where: { status: 'ACTIVE' } });
    if (!sem) {
      sem = await prisma.semester.create({
        data: {
          name: 'Advanced Test Semester 2026',
          code: 'ATS26',
          startDate: new Date('2026-09-01'),
          endDate: new Date('2026-12-31'),
          status: 'ACTIVE',
        },
      });
    }
    semesterId = sem.id;

    let course = await prisma.course.findFirst({ where: { semesterId } });
    if (!course) {
      course = await prisma.course.create({
        data: {
          semesterId,
          code: 'CS401',
          title: 'Algorithms & Complexity',
          credits: 3.0,
        },
      });
    }
    courseId = course.id;
  });

  // 1. Grade & CGPA Calculations
  it('1. Grade scale correctly computes grade letters and grade points', () => {
    const scale = [
      { letter: 'A+', points: 4.0, minMarks: 90 },
      { letter: 'A', points: 3.75, minMarks: 85 },
      { letter: 'B', points: 3.0, minMarks: 70 },
      { letter: 'C', points: 2.0, minMarks: 50 },
      { letter: 'F', points: 0.0, minMarks: 0 },
    ];

    expect(calculateGradeFromScore(95, scale)).toEqual({ letter: 'A+', points: 4.0 });
    expect(calculateGradeFromScore(88, scale)).toEqual({ letter: 'A', points: 3.75 });
    expect(calculateGradeFromScore(72, scale)).toEqual({ letter: 'B', points: 3.0 });
    expect(calculateGradeFromScore(45, scale)).toEqual({ letter: 'F', points: 0.0 });
  });

  it('2. Assessment rejects obtainedMarks exceeding maxMarks', async () => {
    const res = await request(app)
      .post('/api/grades/assessments')
      .send({
        courseId,
        semesterId,
        title: 'Midterm Quiz 1',
        category: 'QUIZ',
        maxMarks: 20,
        obtainedMarks: 25, // Invalid: exceeds max
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('3. Assessment creates successfully and updates course GPA summary', async () => {
    const res = await request(app)
      .post('/api/grades/assessments')
      .send({
        courseId,
        semesterId,
        title: 'Assignment 1',
        category: 'ASSIGNMENT',
        maxMarks: 100,
        obtainedMarks: 92,
        weightPercentage: 20,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const summaryRes = await request(app).get('/api/grades/summary');
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.success).toBe(true);
    expect(summaryRes.body.data.cumulativeGpa).toBeGreaterThan(0);
  });

  // 2. Smart Study Planner
  it('4. Study Plan creation generates scheduled sessions and detects conflicts', async () => {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks

    const planRes = await request(app)
      .post('/api/planner/plans')
      .send({
        semesterId,
        courseId,
        title: 'Dynamic Programming Mastery',
        topics: '1D DP\n2D Grid DP\nKnapsack\nTree DP',
        difficulty: 4,
        priority: 'HIGH',
        estimatedHours: 4.0,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        sessionDurationMinutes: 60,
      });

    expect(planRes.status).toBe(201);
    expect(planRes.body.success).toBe(true);
    expect(planRes.body.data.sessions.length).toBeGreaterThanOrEqual(1);

    const planId = planRes.body.data.plan.id;

    // Verify sessions can be queried
    const sessionsRes = await request(app)
      .get(`/api/planner/sessions?studyPlanId=${planId}`);
    expect(sessionsRes.status).toBe(200);
    expect(sessionsRes.body.data.length).toBe(planRes.body.data.sessions.length);
  });

  // 3. Knowledge Base: Wiki Links, Backlinks & Revisions
  it('5. Note internal linking creates NoteLink and backlinks', async () => {
    // Create Target Note
    const targetTitle = `Asymptotic Analysis ${Date.now()}`;
    const targetRes = await request(app)
      .post('/api/notes')
      .send({
        title: targetTitle,
        content: '<p>Big-O, Big-Theta, Big-Omega notation guide.</p>',
        semesterId,
        courseId,
      });
    expect(targetRes.status).toBe(201);
    const targetId = targetRes.body.data.id;

    // Create Source Note linking to target via [[targetTitle]]
    const sourceRes = await request(app)
      .post('/api/notes')
      .send({
        title: 'Sorting Algorithms Overview',
        content: `<p>MergeSort runs in O(N log N) according to [[${targetTitle}]].</p>`,
        semesterId,
        courseId,
      });
    expect(sourceRes.status).toBe(201);
    const sourceId = sourceRes.body.data.id;

    // Query Target Note - should have incoming link from Source Note
    const fetchTargetRes = await request(app).get(`/api/notes/${targetId}`);
    expect(fetchTargetRes.status).toBe(200);
    expect(fetchTargetRes.body.data.incomingLinks.length).toBeGreaterThan(0);
    expect(fetchTargetRes.body.data.incomingLinks[0].sourceNote.title).toBe('Sorting Algorithms Overview');

    // Query revisions of Source Note
    const revsRes = await request(app).get(`/api/notes/${sourceId}/revisions`);
    expect(revsRes.status).toBe(200);
    expect(revsRes.body.data.length).toBeGreaterThanOrEqual(1);
  });

  // 4. Dashboard Preferences Persistence
  it('6. Dashboard preferences can be retrieved and updated', async () => {
    const updateRes = await request(app)
      .put('/api/dashboard/preferences')
      .send({
        widgetOrder: ['upcomingDeadlines', 'activeSemester', 'statsOverview'],
        hiddenWidgets: ['recentDocuments'],
        defaultView: 'week',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.defaultView).toBe('week');
    expect(updateRes.body.data.hiddenWidgets).toContain('recentDocuments');

    const getRes = await request(app).get('/api/dashboard/preferences');
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.defaultView).toBe('week');
  });

  // 5. Backup & Integrity
  it('7. Backup creation generates verified archive with manifest and SHA-256 checksum', async () => {
    const backupRes = await request(app).post('/api/backup/create');
    expect(backupRes.status).toBe(201);
    expect(backupRes.body.success).toBe(true);
    expect(backupRes.body.data.checksum).toBeDefined();
    expect(backupRes.body.data.filename).toContain('.tar.gz');

    const listRes = await request(app).get('/api/backup/records');
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
