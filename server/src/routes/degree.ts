import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { ownedBy, ownerId } from '../middleware/ownership.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export const degreeRouter = Router();

// Helper to get or create DegreeProgram for the authenticated user
async function getOrCreateDegreeProgram(req: AuthenticatedRequest) {
  let program = await prisma.degreeProgram.findFirst({
    where: { ...ownedBy(req) },
    include: {
      _count: { select: { curriculumCourses: true } },
    },
  });

  if (!program) {
    program = await prisma.degreeProgram.create({
      data: {
        userId: ownerId(req),
        universityName: 'My University',
        programName: 'B.S. in Computer Science',
        department: 'School of Engineering & Physical Sciences',
        degreeDurationYears: 4.0,
        totalCreditsRequired: 120.0,
        requiredSemesters: 8,
        curriculumYear: '2024-2025',
        startSemesterName: 'Fall 2024',
        minCreditsPerSemester: 12.0,
        maxCreditsPerSemester: 18.0,
        isConfigured: false,
      },
      include: {
        _count: { select: { curriculumCourses: true } },
      },
    });
  }

  return program;
}

// Circular prerequisite detection using DFS
async function checkCircularPrerequisite(
  courseId: string,
  targetPrereqId: string,
  degreeProgramId: string
): Promise<boolean> {
  if (courseId === targetPrereqId) return true;

  const allPrereqs = await prisma.coursePrerequisite.findMany({
    where: {
      course: { degreeProgramId },
    },
    select: {
      courseId: true,
      prerequisiteCourseId: true,
    },
  });

  // Graph adjacency: prerequisiteCourseId -> courses that require it
  // We want to verify if adding courseId -> targetPrereqId creates a cycle:
  // i.e., does targetPrereqId already directly or indirectly depend on courseId?
  const visited = new Set<string>();
  const queue: string[] = [targetPrereqId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === courseId) {
      return true; // Cycle detected
    }
    if (!visited.has(current)) {
      visited.add(current);
      // Find all prerequisites OF current
      const nextPrereqs = allPrereqs
        .filter((p) => p.courseId === current)
        .map((p) => p.prerequisiteCourseId);
      for (const next of nextPrereqs) {
        if (!visited.has(next)) {
          queue.push(next);
        }
      }
    }
  }

  return false;
}

// Standard Curriculum Presets
const PRESET_TEMPLATES: Record<string, any[]> = {
  'cs-bs': [
    { code: 'CSE115', title: 'Programming Language I', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 1, prerequisites: [] },
    { code: 'CSE115L', title: 'Programming Language I Lab', credits: 1.0, category: 'LAB', isRequired: true, recommendedSemester: 1, prerequisites: [] },
    { code: 'MAT116', title: 'Precalculus Mathematics', credits: 3.0, category: 'BASIC_SCIENCE', isRequired: true, recommendedSemester: 1, prerequisites: [] },
    { code: 'ENG102', title: 'Introduction to Composition', credits: 3.0, category: 'GENERAL_EDUCATION', isRequired: true, recommendedSemester: 1, prerequisites: [] },
    { code: 'PHY107', title: 'General Physics I', credits: 3.0, category: 'BASIC_SCIENCE', isRequired: true, recommendedSemester: 1, prerequisites: [] },
    { code: 'PHY107L', title: 'General Physics I Lab', credits: 1.0, category: 'LAB', isRequired: true, recommendedSemester: 1, prerequisites: [] },

    { code: 'CSE215', title: 'Object Oriented Programming', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 2, prerequisites: ['CSE115'] },
    { code: 'CSE215L', title: 'Object Oriented Programming Lab', credits: 1.0, category: 'LAB', isRequired: true, recommendedSemester: 2, prerequisites: ['CSE115L'] },
    { code: 'MAT120', title: 'Calculus and Analytic Geometry I', credits: 3.0, category: 'BASIC_SCIENCE', isRequired: true, recommendedSemester: 2, prerequisites: ['MAT116'] },
    { code: 'ENG103', title: 'Intermediate Composition', credits: 3.0, category: 'GENERAL_EDUCATION', isRequired: true, recommendedSemester: 2, prerequisites: ['ENG102'] },
    { code: 'CHE101', title: 'General Chemistry', credits: 3.0, category: 'BASIC_SCIENCE', isRequired: true, recommendedSemester: 2, prerequisites: [] },

    { code: 'CSE225', title: 'Data Structures and Algorithms', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 3, prerequisites: ['CSE215'] },
    { code: 'CSE225L', title: 'Data Structures Lab', credits: 1.0, category: 'LAB', isRequired: true, recommendedSemester: 3, prerequisites: ['CSE215L'] },
    { code: 'MAT130', title: 'Calculus and Analytic Geometry II', credits: 3.0, category: 'BASIC_SCIENCE', isRequired: true, recommendedSemester: 3, prerequisites: ['MAT120'] },
    { code: 'CSE231', title: 'Discrete Mathematics', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 3, prerequisites: ['CSE115', 'MAT116'] },
    { code: 'GEN201', title: 'Ethics and Cyber Law', credits: 3.0, category: 'GENERAL_EDUCATION', isRequired: true, recommendedSemester: 3, prerequisites: [] },

    { code: 'CSE311', title: 'Database Management Systems', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 4, prerequisites: ['CSE225'] },
    { code: 'CSE311L', title: 'Database Systems Lab', credits: 1.0, category: 'LAB', isRequired: true, recommendedSemester: 4, prerequisites: ['CSE225L'] },
    { code: 'CSE331', title: 'Computer Organization & Architecture', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 4, prerequisites: ['CSE231'] },
    { code: 'MAT250', title: 'Linear Algebra with Applications', credits: 3.0, category: 'BASIC_SCIENCE', isRequired: true, recommendedSemester: 4, prerequisites: ['MAT120'] },
    { code: 'STA172', title: 'Probability & Statistics for Engineers', credits: 3.0, category: 'BASIC_SCIENCE', isRequired: true, recommendedSemester: 4, prerequisites: ['MAT120'] },

    { code: 'CSE373', title: 'Design and Analysis of Algorithms', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 5, prerequisites: ['CSE225'] },
    { code: 'CSE327', title: 'Software Engineering', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 5, prerequisites: ['CSE311'] },
    { code: 'CSE323', title: 'Operating Systems Design', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 5, prerequisites: ['CSE331'] },
    { code: 'CSE323L', title: 'Operating Systems Lab', credits: 1.0, category: 'LAB', isRequired: true, recommendedSemester: 5, prerequisites: ['CSE331'] },
    { code: 'ECO101', title: 'Introduction to Microeconomics', credits: 3.0, category: 'GENERAL_EDUCATION', isRequired: true, recommendedSemester: 5, prerequisites: [] },

    { code: 'CSE425', title: 'Computer Networks', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 6, prerequisites: ['CSE323'] },
    { code: 'CSE425L', title: 'Computer Networks Lab', credits: 1.0, category: 'LAB', isRequired: true, recommendedSemester: 6, prerequisites: ['CSE323L'] },
    { code: 'CSE470', title: 'Artificial Intelligence & Machine Learning', credits: 3.0, category: 'ELECTIVE', isRequired: false, recommendedSemester: 6, prerequisites: ['CSE373'] },
    { code: 'SOC101', title: 'Introduction to Sociology', credits: 3.0, category: 'GENERAL_EDUCATION', isRequired: true, recommendedSemester: 6, prerequisites: [] },

    { code: 'CSE498', title: 'Senior Capstone Design Project I', credits: 3.0, category: 'CAPSTONE', isRequired: true, recommendedSemester: 7, prerequisites: ['CSE327'] },
    { code: 'CSE465', title: 'Cybersecurity & Cryptography', credits: 3.0, category: 'ELECTIVE', isRequired: false, recommendedSemester: 7, prerequisites: ['CSE425'] },
    { code: 'CSE485', title: 'Cloud Computing & Distributed Systems', credits: 3.0, category: 'ELECTIVE', isRequired: false, recommendedSemester: 7, prerequisites: ['CSE311'] },
    { code: 'MGT301', title: 'Principles of Management', credits: 3.0, category: 'GENERAL_EDUCATION', isRequired: true, recommendedSemester: 7, prerequisites: [] },

    { code: 'CSE499', title: 'Senior Capstone Design Project II', credits: 3.0, category: 'CAPSTONE', isRequired: true, recommendedSemester: 8, prerequisites: ['CSE498'] },
    { code: 'CSE490', title: 'Advanced Topics in Computer Science', credits: 3.0, category: 'ELECTIVE', isRequired: false, recommendedSemester: 8, prerequisites: ['CSE373'] },
    { code: 'ELECT1', title: 'Open Technical Elective', credits: 3.0, category: 'ELECTIVE', isRequired: false, recommendedSemester: 8, prerequisites: [] },
    { code: 'BIO103', title: 'Biology for Engineers', credits: 3.0, category: 'BASIC_SCIENCE', isRequired: true, recommendedSemester: 8, prerequisites: [] },
  ],
  'se-bs': [
    { code: 'SE110', title: 'Introduction to Software Engineering', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 1, prerequisites: [] },
    { code: 'CSE115', title: 'Programming Language I', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 1, prerequisites: [] },
    { code: 'MAT116', title: 'Precalculus Mathematics', credits: 3.0, category: 'BASIC_SCIENCE', isRequired: true, recommendedSemester: 1, prerequisites: [] },
    { code: 'ENG102', title: 'Introduction to Composition', credits: 3.0, category: 'GENERAL_EDUCATION', isRequired: true, recommendedSemester: 1, prerequisites: [] },
    { code: 'SE210', title: 'Object-Oriented Design Patterns', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 2, prerequisites: ['CSE115'] },
    { code: 'SE310', title: 'Software Requirements Specification', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 3, prerequisites: ['SE210'] },
    { code: 'SE320', title: 'Software Quality Assurance & Testing', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 4, prerequisites: ['SE310'] },
    { code: 'SE410', title: 'Software Architecture & Cloud Deployments', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 5, prerequisites: ['SE320'] },
    { code: 'SE499', title: 'Capstone Software Project', credits: 4.0, category: 'CAPSTONE', isRequired: true, recommendedSemester: 6, prerequisites: ['SE410'] },
  ],
  'bba-mis': [
    { code: 'BUS101', title: 'Introduction to Business', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 1, prerequisites: [] },
    { code: 'ACT201', title: 'Financial Accounting', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 2, prerequisites: ['BUS101'] },
    { code: 'MIS205', title: 'E-Business & Management Information', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 2, prerequisites: [] },
    { code: 'FIN301', title: 'Managerial Finance', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 3, prerequisites: ['ACT201'] },
    { code: 'MKT301', title: 'Principles of Marketing', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 3, prerequisites: ['BUS101'] },
    { code: 'MIS310', title: 'Database Management for Business', credits: 3.0, category: 'CORE', isRequired: true, recommendedSemester: 4, prerequisites: ['MIS205'] },
    { code: 'BUS498', title: 'Strategic Management & Business Policy', credits: 3.0, category: 'CAPSTONE', isRequired: true, recommendedSemester: 5, prerequisites: ['FIN301', 'MKT301'] },
  ],
};

// 1. GET /api/degree/program - Get user degree program setup
degreeRouter.get('/program', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const program = await getOrCreateDegreeProgram(req);
    res.json({ success: true, data: program });
  } catch (error) {
    next(error);
  }
});

// 2. PUT /api/degree/program - Update degree program setup
const degreeProgramSchema = z.object({
  universityName: z.string().min(1, 'University name is required'),
  programName: z.string().min(1, 'Program name is required'),
  department: z.string().nullable().optional(),
  degreeDurationYears: z.number().positive().default(4.0),
  totalCreditsRequired: z.number().positive('Total credits required must be positive'),
  requiredSemesters: z.number().int().positive().nullable().optional(),
  curriculumYear: z.string().nullable().optional(),
  startSemesterName: z.string().nullable().optional(),
  targetGraduationDate: z.string().nullable().optional(),
  minCreditsPerSemester: z.number().nonnegative().default(12.0),
  maxCreditsPerSemester: z.number().positive().default(18.0),
  isConfigured: z.boolean().default(true),
});

degreeRouter.put('/program', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validated = degreeProgramSchema.parse(req.body);
    const program = await getOrCreateDegreeProgram(req);

    const updated = await prisma.degreeProgram.update({
      where: { id: program.id },
      data: {
        universityName: validated.universityName,
        programName: validated.programName,
        department: validated.department || null,
        degreeDurationYears: validated.degreeDurationYears,
        totalCreditsRequired: validated.totalCreditsRequired,
        requiredSemesters: validated.requiredSemesters || null,
        curriculumYear: validated.curriculumYear || null,
        startSemesterName: validated.startSemesterName || null,
        targetGraduationDate: validated.targetGraduationDate ? new Date(validated.targetGraduationDate) : null,
        minCreditsPerSemester: validated.minCreditsPerSemester,
        maxCreditsPerSemester: validated.maxCreditsPerSemester,
        isConfigured: true,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// 3. GET /api/degree/curriculum - List all curriculum courses with matched actual course registrations
degreeRouter.get('/curriculum', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const program = await getOrCreateDegreeProgram(req);

    // Fetch curriculum courses
    const curriculumCourses = await prisma.curriculumCourse.findMany({
      where: { degreeProgramId: program.id },
      include: {
        prerequisites: {
          include: {
            prerequisiteCourse: {
              select: { id: true, code: true, title: true, credits: true },
            },
          },
        },
        prerequisiteFor: {
          include: {
            course: {
              select: { id: true, code: true, title: true },
            },
          },
        },
        plannedIn: true,
      },
      orderBy: [{ recommendedSemester: 'asc' }, { code: 'asc' }],
    });

    // Fetch actual course registrations across all semesters
    const actualCourses = await prisma.course.findMany({
      where: {
        ...ownedBy(req),
        semester: {
          isArchived: false,
        },
      },
      include: {
        semester: { select: { id: true, name: true, code: true, status: true, startDate: true } },
        courseGrade: true,
        assessments: { where: { isIncluded: true } },
      },
      orderBy: { semester: { startDate: 'desc' } }, // Latest attempt first
    });

    // Grading scale for score check
    const scaleRecord = await prisma.gradeScale.findUnique({ where: { id: 'default' } });
    const minPassingLetter = scaleRecord?.minPassingGrade || 'D';

    // Map curriculum courses to their dynamic progress statuses
    const courseMap = new Map<string, typeof actualCourses>();
    for (const c of actualCourses) {
      const normalizedCode = c.code.trim().toUpperCase();
      const existing = courseMap.get(normalizedCode) || [];
      existing.push(c);
      courseMap.set(normalizedCode, existing);
    }

    // Determine completion status for each curriculum course
    const completedCourseCodes = new Set<string>();

    // First pass to determine passed courses
    for (const cur of curriculumCourses) {
      const records = courseMap.get(cur.code.trim().toUpperCase()) || [];
      const passedAttempt = records.find((r) => {
        const gradePoint = r.courseGrade?.gradePoint;
        const gradeLetter = r.courseGrade?.gradeLetter;
        const isPassed =
          (gradePoint !== null && gradePoint !== undefined && gradePoint >= 2.0) ||
          (gradeLetter && gradeLetter !== 'F' && gradeLetter !== 'N/A');
        return isPassed;
      });
      if (passedAttempt) {
        completedCourseCodes.add(cur.code.trim().toUpperCase());
      }
    }

    // Second pass to build full enriched list
    const enriched = curriculumCourses.map((cur) => {
      const normCode = cur.code.trim().toUpperCase();
      const records = courseMap.get(normCode) || [];

      // Determine latest attempt
      const latestAttempt = records[0] || null;
      let status: 'NOT_STARTED' | 'ELIGIBLE' | 'PLANNED' | 'CURRENTLY_ENROLLED' | 'COMPLETED' | 'FAILED' = 'NOT_STARTED';

      let actualSemester: { id: string; name: string; code?: string | null; status: string } | null = null;
      let gradeLetter: string | null = null;
      let gradePoint: number | null = null;
      let finalScore: number | null = null;
      let isRetake = records.length > 1;

      // Check if passed
      const passedAttempt = records.find((r) => {
        const gp = r.courseGrade?.gradePoint;
        const gl = r.courseGrade?.gradeLetter;
        return (gp !== null && gp !== undefined && gp >= 2.0) || (gl && gl !== 'F' && gl !== 'N/A');
      });

      if (passedAttempt) {
        status = 'COMPLETED';
        actualSemester = passedAttempt.semester;
        gradeLetter = passedAttempt.courseGrade?.gradeLetter || null;
        gradePoint = passedAttempt.courseGrade?.gradePoint ?? null;
        finalScore = passedAttempt.courseGrade?.finalScore ?? null;
      } else if (latestAttempt) {
        actualSemester = latestAttempt.semester;
        gradeLetter = latestAttempt.courseGrade?.gradeLetter || null;
        gradePoint = latestAttempt.courseGrade?.gradePoint ?? null;
        finalScore = latestAttempt.courseGrade?.finalScore ?? null;

        if (latestAttempt.semester.status === 'ACTIVE' || latestAttempt.semester.status === 'UPCOMING') {
          status = 'CURRENTLY_ENROLLED';
        } else if (gradeLetter === 'F' || (gradePoint !== null && gradePoint < 2.0)) {
          status = 'FAILED';
        } else {
          status = 'CURRENTLY_ENROLLED';
        }
      } else if (cur.plannedIn.length > 0 && cur.plannedIn.some((p) => p.status === 'PLANNED')) {
        status = 'PLANNED';
      }

      // Check prerequisite satisfaction
      const prerequisitesWithStatus = cur.prerequisites.map((p) => {
        const isSatisfied = completedCourseCodes.has(p.prerequisiteCourse.code.trim().toUpperCase());
        return {
          id: p.id,
          prerequisiteCourseId: p.prerequisiteCourseId,
          code: p.prerequisiteCourse.code,
          title: p.prerequisiteCourse.title,
          credits: p.prerequisiteCourse.credits,
          minGradeLetter: p.minGradeLetter || minPassingLetter,
          isSatisfied,
        };
      });

      const allPrerequisitesSatisfied = prerequisitesWithStatus.every((p) => p.isSatisfied);

      if (status === 'NOT_STARTED' && allPrerequisitesSatisfied) {
        status = 'ELIGIBLE';
      }

      return {
        id: cur.id,
        code: cur.code,
        title: cur.title,
        credits: cur.credits,
        category: cur.category,
        isRequired: cur.isRequired,
        recommendedSemester: cur.recommendedSemester,
        minPassingGrade: cur.minPassingGrade || minPassingLetter,
        description: cur.description,
        status,
        allPrerequisitesSatisfied,
        prerequisites: prerequisitesWithStatus,
        prerequisiteFor: cur.prerequisiteFor.map((pf) => ({
          id: pf.id,
          code: pf.course.code,
          title: pf.course.title,
        })),
        actualRecord: latestAttempt
          ? {
              courseId: latestAttempt.id,
              semester: actualSemester,
              gradeLetter,
              gradePoint,
              finalScore,
              isRetake,
              attemptCount: records.length,
            }
          : null,
      };
    });

    res.json({
      success: true,
      data: {
        program,
        courses: enriched,
        totalCourses: enriched.length,
        totalCredits: enriched.reduce((sum, c) => sum + c.credits, 0),
      },
    });
  } catch (error) {
    next(error);
  }
});

// 4. POST /api/degree/curriculum - Add single curriculum course
const curriculumCourseSchema = z.object({
  code: z.string().min(1, 'Course code is required'),
  title: z.string().min(1, 'Course title is required'),
  credits: z.number().positive('Credits must be positive').default(3.0),
  category: z.string().default('CORE'),
  isRequired: z.boolean().default(true),
  recommendedSemester: z.number().int().positive().nullable().optional(),
  minPassingGrade: z.string().default('D'),
  description: z.string().nullable().optional(),
  prerequisiteCodes: z.array(z.string()).optional().default([]),
});

degreeRouter.post('/curriculum', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validated = curriculumCourseSchema.parse(req.body);
    const program = await getOrCreateDegreeProgram(req);

    const normalizedCode = validated.code.trim().toUpperCase();

    // Check duplicate code
    const existing = await prisma.curriculumCourse.findFirst({
      where: {
        degreeProgramId: program.id,
        code: normalizedCode,
      },
    });

    if (existing) {
      throw new AppError(`Curriculum course with code ${normalizedCode} already exists`, 400);
    }

    const created = await prisma.curriculumCourse.create({
      data: {
        degreeProgramId: program.id,
        code: normalizedCode,
        title: validated.title.trim(),
        credits: validated.credits,
        category: validated.category,
        isRequired: validated.isRequired,
        recommendedSemester: validated.recommendedSemester || null,
        minPassingGrade: validated.minPassingGrade,
        description: validated.description || null,
      },
    });

    // Link prerequisites if provided
    if (validated.prerequisiteCodes && validated.prerequisiteCodes.length > 0) {
      for (const prereqCode of validated.prerequisiteCodes) {
        const normPrereq = prereqCode.trim().toUpperCase();
        if (normPrereq === normalizedCode) {
          throw new AppError(`A course cannot have itself as a prerequisite`, 400);
        }

        const prereqCourse = await prisma.curriculumCourse.findFirst({
          where: { degreeProgramId: program.id, code: normPrereq },
        });

        if (prereqCourse) {
          const isCircular = await checkCircularPrerequisite(created.id, prereqCourse.id, program.id);
          if (isCircular) {
            throw new AppError(
              `Circular prerequisite detected: ${normalizedCode} cannot require ${normPrereq}`,
              400
            );
          }

          await prisma.coursePrerequisite.create({
            data: {
              courseId: created.id,
              prerequisiteCourseId: prereqCourse.id,
              minGradeLetter: validated.minPassingGrade,
            },
          });
        }
      }
    }

    // Auto-mark program as configured
    await prisma.degreeProgram.update({
      where: { id: program.id },
      data: { isConfigured: true },
    });

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
});

// 5. PUT /api/degree/curriculum/:id - Update curriculum course
degreeRouter.put('/curriculum/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validated = curriculumCourseSchema.partial().parse(req.body);

    const existing = await prisma.curriculumCourse.findFirst({
      where: { id, degreeProgram: { is: { ...ownedBy(req) } } },
      include: { degreeProgram: true },
    });

    if (!existing) {
      throw new AppError('Curriculum course not found', 404);
    }

    const normalizedCode = validated.code ? validated.code.trim().toUpperCase() : existing.code;

    // Check code collision if code changed
    if (validated.code && normalizedCode !== existing.code) {
      const duplicate = await prisma.curriculumCourse.findFirst({
        where: {
          degreeProgramId: existing.degreeProgramId,
          code: normalizedCode,
          NOT: { id },
        },
      });
      if (duplicate) {
        throw new AppError(`Course code ${normalizedCode} is already in use`, 400);
      }
    }

    const updated = await prisma.curriculumCourse.update({
      where: { id },
      data: {
        code: normalizedCode,
        ...(validated.title !== undefined && { title: validated.title.trim() }),
        ...(validated.credits !== undefined && { credits: validated.credits }),
        ...(validated.category !== undefined && { category: validated.category }),
        ...(validated.isRequired !== undefined && { isRequired: validated.isRequired }),
        ...(validated.recommendedSemester !== undefined && { recommendedSemester: validated.recommendedSemester }),
        ...(validated.minPassingGrade !== undefined && { minPassingGrade: validated.minPassingGrade }),
        ...(validated.description !== undefined && { description: validated.description }),
      },
    });

    // Update prerequisites if provided
    if (validated.prerequisiteCodes !== undefined) {
      // Remove old prerequisites
      await prisma.coursePrerequisite.deleteMany({
        where: { courseId: id },
      });

      for (const pCode of validated.prerequisiteCodes) {
        const normP = pCode.trim().toUpperCase();
        if (normP === normalizedCode) {
          throw new AppError('A course cannot be its own prerequisite', 400);
        }
        const pCourse = await prisma.curriculumCourse.findFirst({
          where: { degreeProgramId: existing.degreeProgramId, code: normP },
        });
        if (pCourse) {
          const isCircular = await checkCircularPrerequisite(id, pCourse.id, existing.degreeProgramId);
          if (isCircular) {
            throw new AppError(`Circular prerequisite detected: ${normalizedCode} cannot require ${normP}`, 400);
          }
          await prisma.coursePrerequisite.create({
            data: {
              courseId: id,
              prerequisiteCourseId: pCourse.id,
            },
          });
        }
      }
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// 6. DELETE /api/degree/curriculum/:id - Delete single curriculum course
degreeRouter.delete('/curriculum/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.curriculumCourse.findFirst({
      where: { id, degreeProgram: { is: { ...ownedBy(req) } } },
    });
    if (!existing) {
      throw new AppError('Curriculum course not found', 404);
    }
    await prisma.curriculumCourse.delete({ where: { id } });
    res.json({ success: true, message: 'Curriculum course removed' });
  } catch (error) {
    next(error);
  }
});

// 7. POST /api/degree/curriculum/import - Import via CSV, JSON, or Preset Template
degreeRouter.post('/curriculum/import', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const program = await getOrCreateDegreeProgram(req);
    const { template, csvText, courses: jsonCourses, clearExisting = false } = req.body;

    let coursesToImport: Array<{
      code: string;
      title: string;
      credits: number;
      category: string;
      isRequired: boolean;
      recommendedSemester?: number | null;
      minPassingGrade?: string;
      prerequisites?: string[];
    }> = [];

    // 1. Preset Template import
    if (template && PRESET_TEMPLATES[template]) {
      coursesToImport = PRESET_TEMPLATES[template];
    } else if (csvText && typeof csvText === 'string') {
      // 2. CSV parsing
      const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        // Find header row or assume standard order
        const header = lines[0].toLowerCase();
        const hasHeader = header.includes('code') || header.includes('title');
        const rows = hasHeader ? lines.slice(1) : lines;

        for (const row of rows) {
          const parts = row.split(',').map((p) => p.trim());
          if (parts.length >= 2) {
            const code = parts[0]?.toUpperCase();
            const title = parts[1];
            const credits = parts[2] ? parseFloat(parts[2]) || 3.0 : 3.0;
            const category = (parts[3] || 'CORE').toUpperCase();
            const isRequired = parts[4] ? parts[4].toLowerCase() !== 'false' : true;
            const recommendedSemester = parts[5] ? parseInt(parts[5], 10) || null : null;
            const prereqs = parts[6] ? parts[6].split(';').map((s) => s.trim().toUpperCase()).filter(Boolean) : [];

            if (code && title) {
              coursesToImport.push({
                code,
                title,
                credits,
                category,
                isRequired,
                recommendedSemester,
                prerequisites: prereqs,
              });
            }
          }
        }
      }
    } else if (Array.isArray(jsonCourses)) {
      coursesToImport = jsonCourses;
    } else {
      throw new AppError('No valid template, CSV text, or course array provided for import', 400);
    }

    if (coursesToImport.length === 0) {
      throw new AppError('No courses found to import', 400);
    }

    // Optionally clear existing curriculum
    if (clearExisting) {
      await prisma.curriculumCourse.deleteMany({
        where: { degreeProgramId: program.id },
      });
    }

    // Step A: Insert all courses
    const insertedMap = new Map<string, string>(); // code -> id

    // Existing courses in DB
    const existingDbCourses = await prisma.curriculumCourse.findMany({
      where: { degreeProgramId: program.id },
    });
    for (const ec of existingDbCourses) {
      insertedMap.set(ec.code.toUpperCase(), ec.id);
    }

    for (const item of coursesToImport) {
      const code = item.code.trim().toUpperCase();
      if (!insertedMap.has(code)) {
        const created = await prisma.curriculumCourse.create({
          data: {
            degreeProgramId: program.id,
            code,
            title: item.title.trim(),
            credits: item.credits || 3.0,
            category: item.category || 'CORE',
            isRequired: item.isRequired !== false,
            recommendedSemester: item.recommendedSemester || null,
            minPassingGrade: item.minPassingGrade || 'D',
          },
        });
        insertedMap.set(code, created.id);
      }
    }

    // Step B: Link prerequisites
    let prereqLinksCount = 0;
    for (const item of coursesToImport) {
      const code = item.code.trim().toUpperCase();
      const courseId = insertedMap.get(code);

      if (courseId && item.prerequisites && Array.isArray(item.prerequisites)) {
        for (const pCode of item.prerequisites) {
          const normP = pCode.trim().toUpperCase();
          const pCourseId = insertedMap.get(normP);
          if (pCourseId && pCourseId !== courseId) {
            // Check if link already exists
            const existingLink = await prisma.coursePrerequisite.findUnique({
              where: {
                courseId_prerequisiteCourseId: {
                  courseId,
                  prerequisiteCourseId: pCourseId,
                },
              },
            });
            if (!existingLink) {
              await prisma.coursePrerequisite.create({
                data: {
                  courseId,
                  prerequisiteCourseId: pCourseId,
                },
              });
              prereqLinksCount++;
            }
          }
        }
      }
    }

    // Update degree program total required credits if template specified
    const totalImportedCredits = coursesToImport.reduce((sum, c) => sum + (c.credits || 3.0), 0);
    await prisma.degreeProgram.update({
      where: { id: program.id },
      data: {
        isConfigured: true,
        ...(clearExisting && { totalCreditsRequired: totalImportedCredits }),
      },
    });

    res.json({
      success: true,
      message: `Successfully imported ${coursesToImport.length} curriculum courses with ${prereqLinksCount} prerequisite links`,
      count: coursesToImport.length,
      prerequisitesCount: prereqLinksCount,
    });
  } catch (error) {
    next(error);
  }
});

// 8. DELETE /api/degree/curriculum/clear - Clear all curriculum courses
degreeRouter.delete('/curriculum/clear', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const program = await getOrCreateDegreeProgram(req);
    await prisma.curriculumCourse.deleteMany({
      where: { degreeProgramId: program.id },
    });
    res.json({ success: true, message: 'All curriculum courses cleared' });
  } catch (error) {
    next(error);
  }
});

// 9. GET /api/degree/progress - Master degree progress calculation
degreeRouter.get('/progress', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const program = await getOrCreateDegreeProgram(req);

    // Fetch curriculum courses with prerequisites
    const curriculumCourses = await prisma.curriculumCourse.findMany({
      where: { degreeProgramId: program.id },
      include: {
        prerequisites: {
          include: {
            prerequisiteCourse: { select: { id: true, code: true, title: true } },
          },
        },
      },
    });

    // Fetch all semesters with courses & grades
    const semesters = await prisma.semester.findMany({
      where: {
        isArchived: false,
        ...ownedBy(req),
      },
      orderBy: { startDate: 'asc' },
      include: {
        courses: {
          include: {
            courseGrade: true,
            assessments: { where: { isIncluded: true } },
          },
        },
      },
    });

    // Grading scale
    const scaleRecord = await prisma.gradeScale.findUnique({ where: { id: 'default' } });
    const minPassingLetter = scaleRecord?.minPassingGrade || 'D';

    // Map all user course attempts by normalized code
    // A course might be taken multiple times (retakes).
    // Rule:
    // 1. Each completed course only counts ONCE toward completed credits.
    // 2. Failed courses contribute 0 completed credits.
    // 3. Courses in ACTIVE/UPCOMING semesters count as inProgressCredits and NOT completed.
    const courseAttemptsMap = new Map<string, any[]>();
    for (const sem of semesters) {
      for (const c of sem.courses) {
        const normCode = c.code.trim().toUpperCase();
        const list = courseAttemptsMap.get(normCode) || [];
        list.push({ ...c, semester: sem });
        courseAttemptsMap.set(normCode, list);
      }
    }

    // Compute semester credit history
    let cumulativeEarnedCredits = 0;
    let cumulativeAttemptedCredits = 0;
    let cumulativeWeightedPoints = 0;

    const semesterHistory = semesters.map((sem) => {
      let regCredits = 0;
      let completedCredits = 0;
      let uncompletedCredits = 0;
      let semPointsWeighted = 0;
      const passedList: string[] = [];
      const failedList: string[] = [];

      for (const c of sem.courses) {
        regCredits += c.credits;
        const gp = c.courseGrade?.gradePoint;
        const gl = c.courseGrade?.gradeLetter;

        const isFinalized = c.courseGrade?.isCompleted || sem.status === 'COMPLETED';
        const isPassed =
          isFinalized &&
          ((gp !== null && gp !== undefined && gp >= 2.0) || (gl && gl !== 'F' && gl !== 'N/A'));

        if (isPassed) {
          completedCredits += c.credits;
          passedList.push(`${c.code} (${gl || 'Pass'})`);
          if (gp !== null && gp !== undefined) {
            semPointsWeighted += gp * c.credits;
          }
        } else if (sem.status === 'COMPLETED' || gl === 'F' || (gp !== null && gp < 2.0)) {
          uncompletedCredits += c.credits;
          failedList.push(`${c.code} (${gl || 'Fail'})`);
        } else {
          // In progress / pending
          uncompletedCredits += c.credits;
        }
      }

      const semGpa = completedCredits > 0 ? Math.round((semPointsWeighted / completedCredits) * 100) / 100 : 0.0;

      if (sem.status === 'COMPLETED') {
        cumulativeEarnedCredits += completedCredits;
        cumulativeAttemptedCredits += regCredits;
        cumulativeWeightedPoints += semPointsWeighted;
      }

      return {
        id: sem.id,
        name: sem.name,
        code: sem.code,
        status: sem.status,
        coursesCount: sem.courses.length,
        registeredCredits: regCredits,
        completedCredits: sem.status === 'COMPLETED' ? completedCredits : 0,
        uncompletedCredits,
        semesterGpa: semGpa,
        passedCourses: passedList,
        failedCourses: failedList,
        courses: sem.courses.map((c) => ({
          id: c.id,
          code: c.code,
          title: c.title,
          credits: c.credits,
          gradeLetter: c.courseGrade?.gradeLetter || '—',
          gradePoint: c.courseGrade?.gradePoint ?? null,
          status:
            sem.status === 'ACTIVE'
              ? 'Enrolled'
              : c.courseGrade?.gradeLetter === 'F'
              ? 'Failed'
              : c.courseGrade?.gradePoint && c.courseGrade.gradePoint >= 2.0
              ? 'Passed'
              : sem.status,
        })),
      };
    });

    // Degree Progress metrics with deduplication across retakes
    let totalEligibleCompletedCredits = 0;
    let totalInProgressCredits = 0;
    const passedCodes = new Set<string>();
    const inProgressCodes = new Set<string>();
    const failedCodes = new Set<string>();

    for (const [code, attempts] of courseAttemptsMap.entries()) {
      // Find if any attempt is passed
      const pass = attempts.find((a) => {
        const isFin = a.courseGrade?.isCompleted || a.semester.status === 'COMPLETED';
        const gp = a.courseGrade?.gradePoint;
        const gl = a.courseGrade?.gradeLetter;
        return isFin && ((gp !== null && gp !== undefined && gp >= 2.0) || (gl && gl !== 'F' && gl !== 'N/A'));
      });

      if (pass) {
        passedCodes.add(code);
        totalEligibleCompletedCredits += pass.credits;
      } else {
        // Check if currently active or enrolled
        const active = attempts.find((a) => a.semester.status === 'ACTIVE' || a.semester.status === 'UPCOMING');
        if (active) {
          inProgressCodes.add(code);
          totalInProgressCredits += active.credits;
        } else {
          // Check if failed
          const failed = attempts.find((a) => a.courseGrade?.gradeLetter === 'F' || (a.courseGrade?.gradePoint !== null && a.courseGrade?.gradePoint < 2.0));
          if (failed) {
            failedCodes.add(code);
          }
        }
      }
    }

    const totalRequiredCredits = program.totalCreditsRequired || 120.0;
    const remainingCredits = Math.max(0, totalRequiredCredits - totalEligibleCompletedCredits);
    const completedProgressPercentage =
      totalRequiredCredits > 0
        ? Math.min(100, Math.round((totalEligibleCompletedCredits / totalRequiredCredits) * 1000) / 10)
        : 0;

    // Course counts based on curriculum if available
    let totalCurriculumCourses = curriculumCourses.length;
    let completedCurriculumCourses = 0;
    let inProgressCurriculumCourses = 0;
    let remainingCurriculumCourses = 0;
    let totalRequiredCourses = 0;
    let completedRequiredCourses = 0;

    for (const cur of curriculumCourses) {
      const code = cur.code.trim().toUpperCase();
      if (cur.isRequired) totalRequiredCourses++;

      if (passedCodes.has(code)) {
        completedCurriculumCourses++;
        if (cur.isRequired) completedRequiredCourses++;
      } else if (inProgressCodes.has(code)) {
        inProgressCurriculumCourses++;
      } else {
        remainingCurriculumCourses++;
      }
    }

    // Category breakdown
    const categoryTotals: Record<
      string,
      { totalCredits: number; completedCredits: number; inProgressCredits: number; totalCourses: number; completedCourses: number }
    > = {};

    for (const cur of curriculumCourses) {
      const cat = cur.category || 'OTHER';
      if (!categoryTotals[cat]) {
        categoryTotals[cat] = {
          totalCredits: 0,
          completedCredits: 0,
          inProgressCredits: 0,
          totalCourses: 0,
          completedCourses: 0,
        };
      }
      categoryTotals[cat].totalCredits += cur.credits;
      categoryTotals[cat].totalCourses += 1;

      const code = cur.code.trim().toUpperCase();
      if (passedCodes.has(code)) {
        categoryTotals[cat].completedCredits += cur.credits;
        categoryTotals[cat].completedCourses += 1;
      } else if (inProgressCodes.has(code)) {
        categoryTotals[cat].inProgressCredits += cur.credits;
      }
    }

    const categoryBreakdown = Object.entries(categoryTotals).map(([cat, data]) => ({
      category: cat,
      totalCredits: data.totalCredits,
      completedCredits: data.completedCredits,
      inProgressCredits: data.inProgressCredits,
      remainingCredits: Math.max(0, data.totalCredits - data.completedCredits),
      completionPercentage:
        data.totalCredits > 0 ? Math.min(100, Math.round((data.completedCredits / data.totalCredits) * 100)) : 0,
      totalCourses: data.totalCourses,
      completedCourses: data.completedCourses,
    }));

    // Graduation & Remaining Semesters Estimates
    // 1. Average credit capacity (target average: program max or default 15.0)
    const avgCreditsCapacity = Math.min(
      program.maxCreditsPerSemester || 18.0,
      Math.max(program.minCreditsPerSemester || 12.0, 15.0)
    );
    const simpleCreditBasedRemainingSemesters =
      remainingCredits > 0 ? Math.ceil(remainingCredits / avgCreditsCapacity) : 0;

    // 2. Prerequisite-aware Critical Path Depth:
    // Build DAG of uncompleted curriculum courses and find the longest chain
    const uncompletedSet = new Set(
      curriculumCourses.filter((c) => !passedCodes.has(c.code.trim().toUpperCase())).map((c) => c.id)
    );

    const prereqGraph = new Map<string, string[]>(); // courseId -> array of uncompleted prerequisite courseIds
    for (const cur of curriculumCourses) {
      if (uncompletedSet.has(cur.id)) {
        const uncompletedPrereqIds = cur.prerequisites
          .map((p) => p.prerequisiteCourseId)
          .filter((id) => uncompletedSet.has(id));
        prereqGraph.set(cur.id, uncompletedPrereqIds);
      }
    }

    // Memoized longest path search
    const memoPath = new Map<string, number>();
    function getLongestPrereqChain(courseId: string, visited = new Set<string>()): number {
      if (memoPath.has(courseId)) return memoPath.get(courseId)!;
      if (visited.has(courseId)) return 1; // avoid infinite loop on malformed cycles
      visited.add(courseId);

      const prereqs = prereqGraph.get(courseId) || [];
      if (prereqs.length === 0) {
        memoPath.set(courseId, 1);
        return 1;
      }

      let maxChain = 0;
      for (const pId of prereqs) {
        maxChain = Math.max(maxChain, getLongestPrereqChain(pId, new Set(visited)));
      }
      const result = 1 + maxChain;
      memoPath.set(courseId, result);
      return result;
    }

    let criticalPathDepth = 0;
    for (const id of uncompletedSet) {
      criticalPathDepth = Math.max(criticalPathDepth, getLongestPrereqChain(id));
    }

    // The estimated remaining semesters is the maximum of credit-based and prerequisite chain depth
    const estimatedRemainingSemesters = Math.max(simpleCreditBasedRemainingSemesters, criticalPathDepth);

    // Conservative plan (uses minCreditsPerSemester e.g. 12 credits/sem)
    const conservativeSemesters =
      remainingCredits > 0 ? Math.ceil(remainingCredits / (program.minCreditsPerSemester || 12.0)) : 0;

    // Active semester details
    const activeSem = semesters.find((s) => s.status === 'ACTIVE');

    res.json({
      success: true,
      data: {
        isConfigured: program.isConfigured,
        program: {
          id: program.id,
          universityName: program.universityName,
          programName: program.programName,
          department: program.department,
          degreeDurationYears: program.degreeDurationYears,
          totalCreditsRequired: totalRequiredCredits,
          minCreditsPerSemester: program.minCreditsPerSemester || 12.0,
          maxCreditsPerSemester: program.maxCreditsPerSemester || 18.0,
          curriculumYear: program.curriculumYear,
          startSemesterName: program.startSemesterName,
          targetGraduationDate: program.targetGraduationDate,
        },
        credits: {
          totalRequired: totalRequiredCredits,
          completed: totalEligibleCompletedCredits,
          inProgress: totalInProgressCredits,
          remaining: remainingCredits,
          completionPercentage: completedProgressPercentage,
        },
        courses: {
          totalCurriculum: totalCurriculumCourses,
          completed: completedCurriculumCourses,
          inProgress: inProgressCurriculumCourses,
          remaining: remainingCurriculumCourses,
          requiredTotal: totalRequiredCourses,
          requiredCompleted: completedRequiredCourses,
          requiredRemaining: Math.max(0, totalRequiredCourses - completedRequiredCourses),
        },
        activeSemester: activeSem
          ? {
              id: activeSem.id,
              name: activeSem.name,
              code: activeSem.code,
              inProgressCredits: totalInProgressCredits,
              coursesCount: activeSem.courses.length,
            }
          : null,
        categoryBreakdown,
        semesterHistory,
        graduationEstimates: {
          simpleCreditBasedSemesters: simpleCreditBasedRemainingSemesters,
          criticalPathDepth,
          estimatedRemainingSemesters,
          conservativeSemesters: Math.max(conservativeSemesters, criticalPathDepth),
          averageCreditsNeededPerSemester:
            estimatedRemainingSemesters > 0
              ? Math.round((remainingCredits / estimatedRemainingSemesters) * 10) / 10
              : 0,
          assumptions: [
            `Based on ${remainingCredits} remaining credits out of ${totalRequiredCredits} total degree requirement.`,
            `Credit-based estimate uses average load of ${avgCreditsCapacity} credits per semester.`,
            criticalPathDepth > simpleCreditBasedRemainingSemesters
              ? `Prerequisite chain analysis extends timeline to ${criticalPathDepth} semesters because of sequenced courses (longest prerequisite chain: ${criticalPathDepth} terms).`
              : `Curriculum prerequisites permit completion within credit-capacity timeline.`,
            `Retaken course credits are counted strictly once upon passing.`,
            `In-progress courses are tracked separately and not counted as completed.`,
          ],
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// 10. GET /api/degree/planner/next-semester - Next Semester Credit Planner suggestions & limits
degreeRouter.get('/planner/next-semester', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const program = await getOrCreateDegreeProgram(req);

    // Fetch curriculum courses with prerequisites
    const curriculumCourses = await prisma.curriculumCourse.findMany({
      where: { degreeProgramId: program.id },
      include: {
        prerequisites: {
          include: {
            prerequisiteCourse: { select: { id: true, code: true, title: true } },
          },
        },
        plannedIn: true,
      },
    });

    // Fetch user course attempts
    const courses = await prisma.course.findMany({
      where: {
        ...ownedBy(req),
        semester: {
          isArchived: false,
        },
      },
      include: {
        semester: true,
        courseGrade: true,
      },
    });

    const passedCodes = new Set<string>();
    const failedCodes = new Set<string>();
    const enrolledCodes = new Set<string>();

    for (const c of courses) {
      const code = c.code.trim().toUpperCase();
      const isFin = c.courseGrade?.isCompleted || c.semester.status === 'COMPLETED';
      const gp = c.courseGrade?.gradePoint;
      const gl = c.courseGrade?.gradeLetter;

      if (isFin && ((gp !== null && gp !== undefined && gp >= 2.0) || (gl && gl !== 'F' && gl !== 'N/A'))) {
        passedCodes.add(code);
      } else if (c.semester.status === 'ACTIVE' || c.semester.status === 'UPCOMING') {
        enrolledCodes.add(code);
      } else if (gl === 'F' || (gp !== null && gp < 2.0)) {
        failedCodes.add(code);
      }
    }

    // Determine target planned semester name
    const semesters = await prisma.semester.findMany({
      where: {
        isArchived: false,
        ...ownedBy(req),
      },
      orderBy: { startDate: 'desc' },
    });
    const upcomingSem = semesters.find((s) => s.status === 'UPCOMING');
    const targetSemesterName = upcomingSem ? upcomingSem.name : 'Next Term (Planned)';

    // Fetch currently planned courses in PlannedCourse
    const plannedRecords = await prisma.plannedCourse.findMany({
      where: {
        degreeProgramId: program.id,
        targetSemesterName,
        status: 'PLANNED',
      },
      include: {
        curriculumCourse: {
          include: {
            prerequisites: {
              include: {
                prerequisiteCourse: { select: { id: true, code: true, title: true } },
              },
            },
          },
        },
      },
    });

    const plannedCourseIds = new Set(plannedRecords.map((p) => p.curriculumCourseId));

    // Categorize available curriculum courses
    const retakesRequired: any[] = [];
    const criticalPrerequisiteBlockers: any[] = [];
    const recommendedForUpcoming: any[] = [];
    const otherEligible: any[] = [];
    const ineligible: any[] = [];

    // Helper: which courses depend on cur?
    const allPrereqLinks = await prisma.coursePrerequisite.findMany({
      where: { course: { degreeProgramId: program.id } },
    });

    for (const cur of curriculumCourses) {
      const code = cur.code.trim().toUpperCase();
      const isPassed = passedCodes.has(code);
      const isEnrolled = enrolledCodes.has(code);
      const isFailed = failedCodes.has(code) && !isPassed;

      // Check prerequisites
      const unmetPrereqs = cur.prerequisites
        .filter((p) => !passedCodes.has(p.prerequisiteCourse.code.trim().toUpperCase()))
        .map((p) => p.prerequisiteCourse.code);

      const isEligible = unmetPrereqs.length === 0;

      const courseDto = {
        id: cur.id,
        code: cur.code,
        title: cur.title,
        credits: cur.credits,
        category: cur.category,
        isRequired: cur.isRequired,
        recommendedSemester: cur.recommendedSemester,
        isEligible,
        unmetPrerequisites: unmetPrereqs,
        isPlanned: plannedCourseIds.has(cur.id),
      };

      if (isPassed) {
        // Already completed
        continue;
      }

      if (isEnrolled) {
        // Currently taking
        continue;
      }

      if (isFailed) {
        // Needs retake!
        retakesRequired.push({ ...courseDto, isRetake: true });
        continue;
      }

      if (!isEligible) {
        ineligible.push(courseDto);
        continue;
      }

      // Check if this course is a blocker for downstream courses
      const downstreamCount = allPrereqLinks.filter((l) => l.prerequisiteCourseId === cur.id).length;
      if (downstreamCount >= 2) {
        criticalPrerequisiteBlockers.push({ ...courseDto, downstreamUnlockCount: downstreamCount });
      } else if (cur.recommendedSemester !== null && cur.recommendedSemester !== undefined) {
        recommendedForUpcoming.push(courseDto);
      } else {
        otherEligible.push(courseDto);
      }
    }

    // Suggested load calculation
    const totalSelectedCredits = plannedRecords.reduce((sum, p) => sum + p.curriculumCourse.credits, 0);

    // Calculate remaining degree credits
    let completedCreditsTotal = 0;
    for (const c of courses) {
      const code = c.code.trim().toUpperCase();
      if (passedCodes.has(code)) {
        completedCreditsTotal += c.credits;
      }
    }
    const remainingCredits = Math.max(0, (program.totalCreditsRequired || 120) - completedCreditsTotal);

    // Suggested next semester credit load recommendation
    const suggestedLoad = Math.min(
      program.maxCreditsPerSemester || 18.0,
      Math.max(program.minCreditsPerSemester || 12.0, Math.ceil(remainingCredits / 4))
    );

    // Warnings validation
    const warnings: string[] = [];
    if (totalSelectedCredits > (program.maxCreditsPerSemester || 18.0)) {
      warnings.push(
        `Selected credit load (${totalSelectedCredits} credits) exceeds maximum allowed limit (${program.maxCreditsPerSemester || 18.0} credits).`
      );
    }
    if (totalSelectedCredits > 0 && totalSelectedCredits < (program.minCreditsPerSemester || 12.0)) {
      warnings.push(
        `Selected credit load (${totalSelectedCredits} credits) is below minimum recommended load (${program.minCreditsPerSemester || 12.0} credits).`
      );
    }

    // Prerequisite warnings for planned courses
    for (const p of plannedRecords) {
      const unmet = p.curriculumCourse.prerequisites
        .filter((pr) => !passedCodes.has(pr.prerequisiteCourse.code.trim().toUpperCase()))
        .map((pr) => pr.prerequisiteCourse.code);
      if (unmet.length > 0) {
        warnings.push(
          `Prerequisite alert for ${p.curriculumCourse.code}: missing required prerequisite(s) [${unmet.join(', ')}].`
        );
      }
    }

    res.json({
      success: true,
      data: {
        targetSemesterName,
        minCreditsLimit: program.minCreditsPerSemester || 12.0,
        maxCreditsLimit: program.maxCreditsPerSemester || 18.0,
        suggestedCreditLoad: suggestedLoad,
        totalSelectedCredits,
        plannedCourses: plannedRecords.map((p) => ({
          id: p.id,
          curriculumCourseId: p.curriculumCourseId,
          code: p.curriculumCourse.code,
          title: p.curriculumCourse.title,
          credits: p.curriculumCourse.credits,
          category: p.curriculumCourse.category,
          isRequired: p.curriculumCourse.isRequired,
        })),
        retakesRequired,
        criticalPrerequisiteBlockers,
        recommendedForUpcoming,
        otherEligible,
        ineligible,
        warnings,
        assumptions: {
          formula: 'ceiling(remainingRequiredCredits / estimatedRemainingSemesters)',
          remainingCredits,
          recommendedMin: program.minCreditsPerSemester || 12.0,
          recommendedMax: program.maxCreditsPerSemester || 18.0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// 11. POST /api/degree/planner/courses - Add course to next semester plan
degreeRouter.post('/planner/courses', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const program = await getOrCreateDegreeProgram(req);
    const { curriculumCourseId, targetSemesterName = 'Next Term (Planned)', notes } = req.body;

    if (!curriculumCourseId) {
      throw new AppError('Curriculum course ID is required', 400);
    }

    const course = await prisma.curriculumCourse.findFirst({
      where: { id: curriculumCourseId, degreeProgramId: program.id },
      include: {
        prerequisites: {
          include: { prerequisiteCourse: true },
        },
      },
    });

    if (!course) {
      throw new AppError('Curriculum course not found', 404);
    }

    const planned = await prisma.plannedCourse.upsert({
      where: {
        degreeProgramId_curriculumCourseId_targetSemesterName: {
          degreeProgramId: program.id,
          curriculumCourseId,
          targetSemesterName,
        },
      },
      create: {
        degreeProgramId: program.id,
        curriculumCourseId,
        targetSemesterName,
        status: 'PLANNED',
        notes: notes || null,
      },
      update: {
        status: 'PLANNED',
        ...(notes !== undefined && { notes }),
      },
    });

    res.status(201).json({ success: true, data: planned });
  } catch (error) {
    next(error);
  }
});

// 12. DELETE /api/degree/planner/courses/:id - Remove course from next semester plan
degreeRouter.delete('/planner/courses/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.plannedCourse.findFirst({
      where: { id, degreeProgram: { is: { ...ownedBy(req) } } },
    });
    if (!existing) {
      throw new AppError('Planned course not found', 404);
    }
    await prisma.plannedCourse.delete({ where: { id } });
    res.json({ success: true, message: 'Planned course removed' });
  } catch (error) {
    next(error);
  }
});

// 13. POST /api/degree/planner/batch - Save whole next semester planned list
degreeRouter.post('/planner/batch', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const program = await getOrCreateDegreeProgram(req);
    const { targetSemesterName = 'Next Term (Planned)', courseIds = [] } = req.body;

    if (!Array.isArray(courseIds)) {
      throw new AppError('courseIds must be an array of curriculum course IDs', 400);
    }

    const uniqueCourseIds = Array.from(new Set(courseIds as string[]));
    if (uniqueCourseIds.length > 0) {
      const ownedCourses = await prisma.curriculumCourse.findMany({
        where: { id: { in: uniqueCourseIds }, degreeProgramId: program.id },
        select: { id: true },
      });
      if (ownedCourses.length !== uniqueCourseIds.length) {
        throw new AppError('One or more curriculum courses were not found', 404);
      }
    }

    // Delete existing planned courses for target semester
    await prisma.plannedCourse.deleteMany({
      where: {
        degreeProgramId: program.id,
        targetSemesterName,
      },
    });

    // Create new planned courses
    for (const cId of courseIds) {
      await prisma.plannedCourse.create({
        data: {
          degreeProgramId: program.id,
          curriculumCourseId: cId,
          targetSemesterName,
          status: 'PLANNED',
        },
      });
    }

    res.json({
      success: true,
      message: `Updated planned schedule with ${courseIds.length} courses`,
      count: courseIds.length,
    });
  } catch (error) {
    next(error);
  }
});

export default degreeRouter;
