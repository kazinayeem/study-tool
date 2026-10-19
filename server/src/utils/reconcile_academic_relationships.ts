import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function reconcileAcademicRelationships() {
  console.log('=== RUNNING ACADEMIC DATA INTEGRITY RECONCILIATION ===');

  const report = {
    notesChecked: 0,
    notesFixed: [] as any[],
    assignmentsChecked: 0,
    assignmentsFixed: [] as any[],
    examsChecked: 0,
    examsFixed: [] as any[],
    documentsChecked: 0,
    documentsFixed: [] as any[],
    assessmentsChecked: 0,
    assessmentsFixed: [] as any[],
    studySessionsChecked: 0,
    studySessionsFixed: [] as any[],
    calendarEventsChecked: 0,
    calendarEventsFixed: [] as any[],
  };

  // 1. Reconcile Notes
  const notes = await prisma.note.findMany({ include: { course: true, semester: true } });
  report.notesChecked = notes.length;
  for (const note of notes) {
    if (note.courseId && note.course) {
      if (note.semesterId !== note.course.semesterId) {
        console.log(`Reconciling Note "${note.title}" (${note.id}): updating semester from ${note.semesterId} to course semester ${note.course.semesterId}`);
        await prisma.note.update({
          where: { id: note.id },
          data: { semesterId: note.course.semesterId },
        });
        report.notesFixed.push({
          id: note.id,
          title: note.title,
          oldSemesterId: note.semesterId,
          newSemesterId: note.course.semesterId,
          courseCode: note.course.code,
        });
      }
    }
  }

  // 2. Reconcile Assignments
  const assignments = await prisma.assignment.findMany({ include: { course: true, semester: true } });
  report.assignmentsChecked = assignments.length;
  for (const a of assignments) {
    if (a.courseId && a.course) {
      if (a.semesterId !== a.course.semesterId) {
        console.log(`Reconciling Assignment "${a.title}" (${a.id}): updating semester to ${a.course.semesterId}`);
        await prisma.assignment.update({
          where: { id: a.id },
          data: { semesterId: a.course.semesterId },
        });
        report.assignmentsFixed.push({
          id: a.id,
          title: a.title,
          oldSemesterId: a.semesterId,
          newSemesterId: a.course.semesterId,
          courseCode: a.course.code,
        });
      }
    }
  }

  // 3. Reconcile Exams
  const exams = await prisma.exam.findMany({ include: { course: true, semester: true } });
  report.examsChecked = exams.length;
  for (const e of exams) {
    if (e.courseId && e.course) {
      if (e.semesterId !== e.course.semesterId) {
        console.log(`Reconciling Exam "${e.title}" (${e.id}): updating semester to ${e.course.semesterId}`);
        await prisma.exam.update({
          where: { id: e.id },
          data: { semesterId: e.course.semesterId },
        });
        report.examsFixed.push({
          id: e.id,
          title: e.title,
          oldSemesterId: e.semesterId,
          newSemesterId: e.course.semesterId,
          courseCode: e.course.code,
        });
      }
    }
  }

  // 4. Reconcile Documents
  const documents = await prisma.document.findMany({ include: { course: true, semester: true } });
  report.documentsChecked = documents.length;
  for (const d of documents) {
    if (d.courseId && d.course) {
      if (d.semesterId !== d.course.semesterId) {
        console.log(`Reconciling Document "${d.title}" (${d.id}): updating semester to ${d.course.semesterId}`);
        await prisma.document.update({
          where: { id: d.id },
          data: { semesterId: d.course.semesterId },
        });
        report.documentsFixed.push({
          id: d.id,
          title: d.title,
          oldSemesterId: d.semesterId,
          newSemesterId: d.course.semesterId,
          courseCode: d.course.code,
        });
      }
    }
  }

  // 5. Reconcile Assessments
  const assessments = await prisma.assessment.findMany({ include: { course: true, semester: true } });
  report.assessmentsChecked = assessments.length;
  for (const ass of assessments) {
    if (ass.courseId && ass.course) {
      if (ass.semesterId !== ass.course.semesterId) {
        console.log(`Reconciling Assessment "${ass.name}" (${ass.id}): updating semester to ${ass.course.semesterId}`);
        await prisma.assessment.update({
          where: { id: ass.id },
          data: { semesterId: ass.course.semesterId },
        });
        report.assessmentsFixed.push({
          id: ass.id,
          name: ass.name,
          oldSemesterId: ass.semesterId,
          newSemesterId: ass.course.semesterId,
          courseCode: ass.course.code,
        });
      }
    }
  }

  console.log('=== RECONCILIATION SUMMARY ===');
  console.log(JSON.stringify(report, null, 2));

  await prisma.$disconnect();
  return report;
}

reconcileAcademicRelationships().catch(console.error);
