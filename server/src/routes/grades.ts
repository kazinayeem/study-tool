import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validateSemesterCourseConsistency } from '../utils/academicValidation.js';
import { ownedBy, ownerId } from '../middleware/ownership.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';


const router = Router();

// Default 4.0 grading scale if none exists
const DEFAULT_SCALE_DATA = [
  { letter: 'A+', points: 4.0, minMarks: 90 },
  { letter: 'A', points: 3.75, minMarks: 85 },
  { letter: 'A-', points: 3.5, minMarks: 80 },
  { letter: 'B+', points: 3.25, minMarks: 75 },
  { letter: 'B', points: 3.0, minMarks: 70 },
  { letter: 'B-', points: 2.75, minMarks: 65 },
  { letter: 'C+', points: 2.5, minMarks: 60 },
  { letter: 'C', points: 2.25, minMarks: 55 },
  { letter: 'D', points: 2.0, minMarks: 50 },
  { letter: 'F', points: 0.0, minMarks: 0 },
];

export function calculateGradeFromScore(score: number, scaleData: Array<{ letter: string; points: number; minMarks: number }>) {
  const sorted = [...scaleData].sort((a, b) => b.minMarks - a.minMarks);
  for (const item of sorted) {
    if (score >= item.minMarks) {
      return { letter: item.letter, points: item.points };
    }
  }
  const last = sorted[sorted.length - 1];
  return { letter: last?.letter || 'F', points: last?.points || 0.0 };
}

// 1. GET /api/grades/scale - Get grading scale
router.get('/scale', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let scale = await prisma.gradeScale.findUnique({ where: { id: 'default' } });
    if (!scale) {
      scale = await prisma.gradeScale.create({
        data: {
          id: 'default',
          name: 'Standard 4.0 Scale',
          minPassingGrade: 'D',
          scaleData: JSON.stringify(DEFAULT_SCALE_DATA),
          isDefault: true,
        },
      });
    }
    res.json({
      success: true,
      data: {
        ...scale,
        scaleData: JSON.parse(scale.scaleData),
      },
    });
  } catch (error) {
    next(error);
  }
});

// 2. PUT /api/grades/scale - Update grading scale
router.put('/scale', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, minPassingGrade, scaleData } = req.body;
    const updated = await prisma.gradeScale.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        name: name || 'Standard 4.0 Scale',
        minPassingGrade: minPassingGrade || 'D',
        scaleData: JSON.stringify(scaleData || DEFAULT_SCALE_DATA),
      },
      update: {
        ...(name && { name }),
        ...(minPassingGrade && { minPassingGrade }),
        ...(scaleData && { scaleData: JSON.stringify(scaleData) }),
      },
    });
    res.json({
      success: true,
      data: {
        ...updated,
        scaleData: JSON.parse(updated.scaleData),
      },
    });
  } catch (error) {
    next(error);
  }
});

// 3. GET /api/grades/assessments - List assessments
router.get('/assessments', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, semesterId } = req.query as { courseId?: string; semesterId?: string };
    const assessments = await prisma.assessment.findMany({
      where: {
        ...ownedBy(req),
        ...(courseId && { courseId }),
        ...(semesterId && { semesterId }),
      },
      orderBy: [{ assessmentDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        course: { select: { id: true, code: true, title: true, credits: true, color: true } },
        semester: { select: { id: true, name: true } },
      },
    });
    res.json({ success: true, data: assessments });
  } catch (error) {
    next(error);
  }
});

const assessmentSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  semesterId: z.string().min(1, 'Semester ID is required'),
  title: z.string().min(1, 'Title is required'),
  category: z.string().default('ASSIGNMENT'),
  maxMarks: z.number().positive('Maximum marks must be positive'),
  obtainedMarks: z.number().nullable().optional(),
  weightPercentage: z.number().min(0).max(100).nullable().optional(),
  assessmentDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isIncluded: z.boolean().default(true),
});

// 4. POST /api/grades/assessments - Create assessment with validation
router.post('/assessments', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validated = assessmentSchema.parse(req.body);

    if (validated.obtainedMarks !== null && validated.obtainedMarks !== undefined) {
      if (validated.obtainedMarks < 0) {
        return res.status(400).json({ success: false, error: 'Obtained marks cannot be negative' });
      }
      if (validated.obtainedMarks > validated.maxMarks) {
        return res.status(400).json({
          success: false,
          error: `Obtained marks (${validated.obtainedMarks}) cannot exceed maximum marks (${validated.maxMarks})`,
        });
      }
    }

    const academicValid = await validateSemesterCourseConsistency(validated.courseId, validated.semesterId);

    const ownedCourse = await prisma.course.findFirst({
      where: { id: academicValid.courseId!, ...ownedBy(req) },
      select: { id: true },
    });
    if (!ownedCourse) {
      throw new AppError('Course not found', 404);
    }

    const assessment = await prisma.assessment.create({
      data: {
        userId: ownerId(req),
        courseId: academicValid.courseId!,
        semesterId: academicValid.semesterId!,
        title: validated.title,
        category: validated.category,
        maxMarks: validated.maxMarks,
        obtainedMarks: validated.obtainedMarks,
        weightPercentage: validated.weightPercentage,
        assessmentDate: validated.assessmentDate ? new Date(validated.assessmentDate) : null,
        notes: validated.notes,
        isIncluded: validated.isIncluded,
      },

      include: {
        course: { select: { code: true, title: true } },
      },
    });

    res.status(201).json({ success: true, data: assessment });
  } catch (error) {
    next(error);
  }
});

// 5. PUT /api/grades/assessments/:id - Update assessment
router.put('/assessments/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.assessment.findFirst({ where: { id, ...ownedBy(req) } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }

    const maxMarks = body.maxMarks !== undefined ? Number(body.maxMarks) : existing.maxMarks;
    const obtainedMarks = body.obtainedMarks !== undefined ? (body.obtainedMarks === null ? null : Number(body.obtainedMarks)) : existing.obtainedMarks;

    if (obtainedMarks !== null && obtainedMarks !== undefined) {
      if (obtainedMarks < 0 || obtainedMarks > maxMarks) {
        return res.status(400).json({
          success: false,
          error: `Obtained marks (${obtainedMarks}) must be between 0 and maximum marks (${maxMarks})`,
        });
      }
    }

    const updated = await prisma.assessment.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.category && { category: body.category }),
        ...(body.maxMarks !== undefined && { maxMarks }),
        ...(body.obtainedMarks !== undefined && { obtainedMarks }),
        ...(body.weightPercentage !== undefined && { weightPercentage: body.weightPercentage ? Number(body.weightPercentage) : null }),
        ...(body.assessmentDate !== undefined && { assessmentDate: body.assessmentDate ? new Date(body.assessmentDate) : null }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.isIncluded !== undefined && { isIncluded: body.isIncluded }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// 6. DELETE /api/grades/assessments/:id - Delete assessment
router.delete('/assessments/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.assessment.findFirst({ where: { id, ...ownedBy(req) } });
    if (!existing) {
      throw new AppError('Assessment not found', 404);
    }
    await prisma.assessment.delete({ where: { id } });
    res.json({ success: true, message: 'Assessment deleted' });
  } catch (error) {
    next(error);
  }
});

// 7. GET /api/grades/summary - Full GPA, CGPA, Target and What-If Analysis
router.get('/summary', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { semesterId } = req.query as { semesterId?: string };

    // Get grading scale
    let scaleRecord = await prisma.gradeScale.findUnique({ where: { id: 'default' } });
    const scaleData = scaleRecord ? JSON.parse(scaleRecord.scaleData) : DEFAULT_SCALE_DATA;

    // Get Target CGPA Goal
    const targetGoal = await prisma.targetGpaGoal.findUnique({ where: { id: 'default' } });
    const targetCgpa = targetGoal?.targetCgpa ?? 3.8;

    // Load semesters and courses
    const semesters = await prisma.semester.findMany({
      where: { isArchived: false, ...ownedBy(req) },
      orderBy: { startDate: 'asc' },
      include: {
        courses: {
          where: { ...ownedBy(req) },
          include: {
            assessments: {
              where: { isIncluded: true, ...ownedBy(req) },
            },
            courseGrade: true,
          },
        },
      },
    });

    // Compute course grades and semester GPAs
    let totalAttemptedCredits = 0;
    let totalCompletedCredits = 0;
    let cumulativePointsWeighted = 0;

    const semesterSummaries = semesters.map((sem) => {
      let semAttemptedCredits = 0;
      let semEarnedCredits = 0;
      let semPointsWeighted = 0;

      const coursesWithGrades = sem.courses.map((course) => {
        semAttemptedCredits += course.credits;

        // Calculate score from assessments
        let computedScore: number | null = null;
        const validAssessments = course.assessments.filter((a) => a.obtainedMarks !== null && a.obtainedMarks !== undefined);

        if (validAssessments.length > 0) {
          const totalWeight = validAssessments.reduce((sum, a) => sum + (a.weightPercentage || 0), 0);

          if (totalWeight > 0) {
            // Weighted calculation
            const weightedScore = validAssessments.reduce((sum, a) => {
              const weight = a.weightPercentage || 0;
              const ratio = a.maxMarks > 0 ? (a.obtainedMarks! / a.maxMarks) : 0;
              return sum + (ratio * weight);
            }, 0);
            computedScore = Math.min(100, Math.round((weightedScore / totalWeight) * 100 * 10) / 10);
          } else {
            // Unweighted raw ratio calculation
            const totalObtained = validAssessments.reduce((sum, a) => sum + a.obtainedMarks!, 0);
            const totalMax = validAssessments.reduce((sum, a) => sum + a.maxMarks, 0);
            computedScore = totalMax > 0 ? Math.min(100, Math.round((totalObtained / totalMax) * 100 * 10) / 10) : null;
          }
        }

        // Check if override in CourseGrade exists
        const override = course.courseGrade;
        const finalScore = override?.finalScore ?? computedScore;
        const gradeInfo = finalScore !== null
          ? calculateGradeFromScore(finalScore, scaleData)
          : { letter: override?.gradeLetter || 'N/A', points: override?.gradePoint || 0.0 };

        const isPassed = gradeInfo.points >= 2.0; // Standard passing grade threshold
        if (isPassed && finalScore !== null) {
          semEarnedCredits += course.credits;
          semPointsWeighted += gradeInfo.points * course.credits;
        }

        return {
          id: course.id,
          code: course.code,
          title: course.title,
          credits: course.credits,
          color: course.color,
          finalScore,
          gradeLetter: gradeInfo.letter,
          gradePoint: gradeInfo.points,
          isPassed,
          isFinalized: override?.isCompleted || false,
          assessmentCount: course.assessments.length,
          completedAssessmentCount: validAssessments.length,
        };
      });

      const semesterGpa = semEarnedCredits > 0
        ? Math.round((semPointsWeighted / semEarnedCredits) * 100) / 100
        : 0.0;

      totalAttemptedCredits += semAttemptedCredits;
      totalCompletedCredits += semEarnedCredits;
      cumulativePointsWeighted += semPointsWeighted;

      return {
        id: sem.id,
        name: sem.name,
        code: sem.code,
        status: sem.status,
        attemptedCredits: semAttemptedCredits,
        earnedCredits: semEarnedCredits,
        gpa: semesterGpa,
        courses: coursesWithGrades,
      };
    });

    const cumulativeGpa = totalCompletedCredits > 0
      ? Math.round((cumulativePointsWeighted / totalCompletedCredits) * 100) / 100
      : 0.0;

    // What-If Simulator: Required GPA for target CGPA
    const remainingEstimatedCredits = 30.0; // standard remaining degree credits scenario
    const targetRequiredGpa = remainingEstimatedCredits > 0
      ? Math.round((((targetCgpa * (totalCompletedCredits + remainingEstimatedCredits)) - (cumulativeGpa * totalCompletedCredits)) / remainingEstimatedCredits) * 100) / 100
      : 0.0;

    // Grade Distribution
    const distribution: Record<string, number> = {};
    for (const sem of semesterSummaries) {
      for (const c of sem.courses) {
        if (c.gradeLetter && c.gradeLetter !== 'N/A') {
          distribution[c.gradeLetter] = (distribution[c.gradeLetter] || 0) + 1;
        }
      }
    }

    // Resolve the selected semester (route/query scoped) for the legacy-shaped fields
    const selectedSemester =
      semesterSummaries.find((s) => s.id === semesterId) ||
      semesterSummaries[semesterSummaries.length - 1] ||
      null;

    const courseGrades = selectedSemester
      ? selectedSemester.courses.map((c) => ({
          courseId: c.id,
          courseCode: c.code,
          courseTitle: c.title,
          credits: c.credits,
          totalMarks: c.finalScore,
          letterGrade: c.gradeLetter,
          gradePoint: c.gradePoint,
          isPassing: c.isPassed,
        }))
      : [];

    const semesterGpaHistory = semesterSummaries.reduce<Record<string, number>>((acc, sem) => {
      acc[sem.id] = sem.gpa;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        cumulativeGpa,
        totalAttemptedCredits,
        totalCompletedCredits,
        targetCgpa,
        targetRequiredGpa: Math.min(4.0, Math.max(0.0, targetRequiredGpa)),
        remainingEstimatedCredits,
        gradeDistribution: distribution,
        semesters: semesterSummaries,
        // Legacy aliases consumed by the Grades page
        cgpa: cumulativeGpa,
        semesterGpa: selectedSemester ? selectedSemester.gpa : cumulativeGpa,
        totalCreditsCompleted: totalCompletedCredits,
        totalCreditsAttempted: totalAttemptedCredits,
        courseGrades,
        semesterGpaHistory,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 8. POST /api/grades/target-goal - Update target CGPA goal
router.post('/target-goal', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { targetCgpa, notes } = req.body;
    const goal = await prisma.targetGpaGoal.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        targetCgpa: Number(targetCgpa) || 3.8,
        notes,
      },
      update: {
        targetCgpa: Number(targetCgpa) || 3.8,
        ...(notes !== undefined && { notes }),
      },
    });
    res.json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
});

// 9. GET /api/grades/export/csv - Export grades to CSV
router.get('/export/csv', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: { ...ownedBy(req) },
      include: {
        course: { select: { code: true, title: true, credits: true } },
        semester: { select: { name: true } },
      },
      orderBy: [{ semester: { startDate: 'asc' } }, { course: { code: 'asc' } }],
    });

    const headers = ['Semester', 'Course Code', 'Course Title', 'Credits', 'Assessment Title', 'Category', 'Max Marks', 'Obtained Marks', 'Percentage', 'Date'];
    const rows = assessments.map((a) => {
      const pct = a.obtainedMarks !== null && a.maxMarks > 0
        ? ((a.obtainedMarks / a.maxMarks) * 100).toFixed(1) + '%'
        : 'N/A';
      return [
        `"${a.semester.name}"`,
        `"${a.course.code}"`,
        `"${a.course.title.replace(/"/g, '""')}"`,
        a.course.credits,
        `"${a.title.replace(/"/g, '""')}"`,
        a.category,
        a.maxMarks,
        a.obtainedMarks ?? 'N/A',
        pct,
        a.assessmentDate ? a.assessmentDate.toISOString().split('T')[0] : 'N/A',
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="scholarflow_grades_export.csv"');
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

// 10. What-If Scenarios Endpoints
router.get('/scenarios', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const scenarios = await prisma.gradeScenario.findMany({
      where: { ...ownedBy(req) },
      orderBy: { createdAt: 'desc' },
    });
    const parsed = scenarios.map((s) => ({
      ...s,
      scenarioData: JSON.parse(s.scenarioData || '[]'),
    }));
    res.json({ success: true, data: parsed });
  } catch (error) {
    next(error);
  }
});

router.post('/scenarios', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, targetCgpa, scenarioData } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Scenario name is required' });

    const scenario = await prisma.gradeScenario.create({
      data: {
        userId: ownerId(req),
        name,
        targetCgpa: targetCgpa ? Number(targetCgpa) : null,
        scenarioData: typeof scenarioData === 'string' ? scenarioData : JSON.stringify(scenarioData || []),
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...scenario,
        scenarioData: JSON.parse(scenario.scenarioData),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/scenarios/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.gradeScenario.findFirst({ where: { id, ...ownedBy(req) } });
    if (!existing) {
      throw new AppError('Grade scenario not found', 404);
    }
    await prisma.gradeScenario.delete({ where: { id } });
    res.json({ success: true, message: 'Grade scenario deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
