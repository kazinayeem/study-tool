import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function audit() {
  console.log('--- STARTING ACADEMIC RECORDS AUDIT ---');

  const semesters = await prisma.semester.findMany();
  const courses = await prisma.course.findMany();
  const notes = await prisma.note.findMany({ include: { course: true, semester: true } });
  const assignments = await prisma.assignment.findMany({ include: { course: true, semester: true } });
  const exams = await prisma.exam.findMany({ include: { course: true, semester: true } });
  const documents = await prisma.document.findMany({ include: { course: true, semester: true } });
  const assessments = await prisma.assessment.findMany({ include: { course: true, semester: true } });
  const classSessions = await prisma.classSession.findMany({ include: { course: true, semester: true } });
  const studySessions = await prisma.studySession.findMany({ include: { course: true, semester: true } });
  const calendarEvents = await prisma.calendarEvent.findMany({ include: { course: true, semester: true } });

  console.log(`Totals:
- Semesters: ${semesters.length}
- Courses: ${courses.length}
- Notes: ${notes.length}
- Assignments: ${assignments.length}
- Exams: ${exams.length}
- Documents: ${documents.length}
- Assessments: ${assessments.length}
- ClassSessions: ${classSessions.length}
- StudySessions: ${studySessions.length}
- CalendarEvents: ${calendarEvents.length}
`);

  let inconsistencies: any[] = [];

  // Check notes
  for (const n of notes) {
    if (n.courseId && !n.semesterId) {
      inconsistencies.push({ type: 'NOTE_MISSING_SEMESTER', id: n.id, title: n.title, courseCode: n.course?.code, courseSemesterId: n.course?.semesterId });
    } else if (n.courseId && n.semesterId && n.course && n.course.semesterId !== n.semesterId) {
      inconsistencies.push({ type: 'NOTE_SEMESTER_MISMATCH', id: n.id, title: n.title, noteSemesterId: n.semesterId, courseSemesterId: n.course.semesterId });
    }
  }

  // Check assignments
  for (const a of assignments) {
    if (a.courseId && !a.semesterId) {
      inconsistencies.push({ type: 'ASSIGNMENT_MISSING_SEMESTER', id: a.id, title: a.title, courseCode: a.course?.code, courseSemesterId: a.course?.semesterId });
    } else if (a.courseId && a.semesterId && a.course && a.course.semesterId !== a.semesterId) {
      inconsistencies.push({ type: 'ASSIGNMENT_SEMESTER_MISMATCH', id: a.id, title: a.title, assignmentSemesterId: a.semesterId, courseSemesterId: a.course.semesterId });
    }
  }

  // Check exams
  for (const e of exams) {
    if (e.courseId && !e.semesterId) {
      inconsistencies.push({ type: 'EXAM_MISSING_SEMESTER', id: e.id, title: e.title, courseCode: e.course?.code, courseSemesterId: e.course?.semesterId });
    } else if (e.courseId && e.semesterId && e.course && e.course.semesterId !== e.semesterId) {
      inconsistencies.push({ type: 'EXAM_SEMESTER_MISMATCH', id: e.id, title: e.title, examSemesterId: e.semesterId, courseSemesterId: e.course.semesterId });
    }
  }

  // Check documents
  for (const d of documents) {
    if (d.courseId && !d.semesterId) {
      inconsistencies.push({ type: 'DOCUMENT_MISSING_SEMESTER', id: d.id, title: d.title, courseCode: d.course?.code, courseSemesterId: d.course?.semesterId });
    } else if (d.courseId && d.semesterId && d.course && d.course.semesterId !== d.semesterId) {
      inconsistencies.push({ type: 'DOCUMENT_SEMESTER_MISMATCH', id: d.id, title: d.title, docSemesterId: d.semesterId, courseSemesterId: d.course.semesterId });
    }
  }

  // Check assessments
  for (const ass of assessments) {
    if (ass.courseId && !ass.semesterId) {
      inconsistencies.push({ type: 'ASSESSMENT_MISSING_SEMESTER', id: ass.id, name: ass.title, courseSemesterId: ass.course?.semesterId });
    } else if (ass.courseId && ass.semesterId && ass.course && ass.course.semesterId !== ass.semesterId) {
      inconsistencies.push({ type: 'ASSESSMENT_SEMESTER_MISMATCH', id: ass.id, name: ass.title, assSemesterId: ass.semesterId, courseSemesterId: ass.course.semesterId });
    }
  }

  // Check studySessions
  for (const s of studySessions) {
    if (s.courseId && !s.semesterId) {
      inconsistencies.push({ type: 'STUDY_SESSION_MISSING_SEMESTER', id: s.id, title: s.title, courseSemesterId: s.course?.semesterId });
    } else if (s.courseId && s.semesterId && s.course && s.course.semesterId !== s.semesterId) {
      inconsistencies.push({ type: 'STUDY_SESSION_SEMESTER_MISMATCH', id: s.id, title: s.title, sessionSemesterId: s.semesterId, courseSemesterId: s.course.semesterId });
    }
  }

  // Check calendarEvents
  for (const c of calendarEvents) {
    if (c.courseId && !c.semesterId) {
      inconsistencies.push({ type: 'CALENDAR_EVENT_MISSING_SEMESTER', id: c.id, title: c.title, courseSemesterId: c.course?.semesterId });
    } else if (c.courseId && c.semesterId && c.course && c.course.semesterId !== c.semesterId) {
      inconsistencies.push({ type: 'CALENDAR_EVENT_SEMESTER_MISMATCH', id: c.id, title: c.title, calSemesterId: c.semesterId, courseSemesterId: c.course.semesterId });
    }
  }

  console.log(`Found ${inconsistencies.length} inconsistencies:`);
  console.log(JSON.stringify(inconsistencies, null, 2));

  await prisma.$disconnect();
}

audit().catch(console.error);
