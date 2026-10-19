import { prisma } from '../prisma.js';
import { AppError } from '../middleware/errorHandler.js';


/**
 * Validates and enforces Semester -> Course relationship integrity across all academic records.
 * 
 * Rules:
 * 1. If courseId is provided, the course must exist in the database.
 * 2. If both courseId and semesterId are provided, the course MUST belong to the specified semester.
 * 3. If courseId is provided without semesterId, semesterId is automatically derived from the course.
 * 4. If semesterId is provided without courseId, verifies that the semester exists (allows semester-level records).
 * 5. If neither is provided, allows personal/unaffiliated records (e.g. personal notes).
 */
export async function validateSemesterCourseConsistency(
  courseId?: string | null,
  semesterId?: string | null
): Promise<{ courseId: string | null; semesterId: string | null }> {
  // If no course and no semester specified
  if (!courseId && !semesterId) {
    return { courseId: null, semesterId: null };
  }

  // If courseId is provided
  if (courseId) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, code: true, title: true, semesterId: true },
    });

    if (!course) {
      throw new AppError(`Invalid course selection: Course with ID ${courseId} not found`, 404);
    }

    if (semesterId && course.semesterId !== semesterId) {
      throw new AppError(
        `Academic data integrity violation: Course ${course.code} (${course.title}) does not belong to the selected semester`,
        400
      );
    }

    return {
      courseId: course.id,
      semesterId: course.semesterId, // Enforce consistency
    };
  }

  // If only semesterId is provided
  if (semesterId) {
    const semester = await prisma.semester.findUnique({
      where: { id: semesterId },
      select: { id: true, name: true },
    });

    if (!semester) {
      throw new AppError(`Invalid semester selection: Semester with ID ${semesterId} not found`, 404);
    }

    return {
      courseId: null,
      semesterId: semester.id,
    };
  }

  return { courseId: null, semesterId: null };
}
