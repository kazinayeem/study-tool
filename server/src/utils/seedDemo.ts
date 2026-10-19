import { prisma } from '../prisma.js';

export async function seedDemoUser(forceReset = false) {
  const demoEmail = 'demo.student@example.com';

  // 1. Ensure or retrieve Demo User
  let demoUser = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (!demoUser) {
    demoUser = await prisma.user.create({
      data: {
        email: demoEmail,
        name: 'Demo Student',
        role: 'DEMO',
        accountType: 'DEMO',
        status: 'ACTIVE',
      },
    });
    console.log('👤 [Seed] Seeded demo user:', demoEmail);
  }

  // 2. Check if demo user already has sample data
  const existingSemesters = await prisma.semester.findMany({
    where: { userId: demoUser.id },
  });

  if (existingSemesters.length > 0 && !forceReset) {
    // Already seeded
    return demoUser;
  }

  if (forceReset && existingSemesters.length > 0) {
    // Safe reset ONLY for the demo student's own records, NEVER touching real users!
    console.log('🔄 [Seed] Resetting sandboxed demo data for demo student...');
    await prisma.note.deleteMany({ where: { userId: demoUser.id } });
    await prisma.studySession.deleteMany({ where: { userId: demoUser.id } });
    await prisma.studyPlan.deleteMany({ where: { userId: demoUser.id } });
    await prisma.assessment.deleteMany({ where: { userId: demoUser.id } });
    await prisma.course.deleteMany({ where: { userId: demoUser.id } });
    await prisma.semester.deleteMany({ where: { userId: demoUser.id } });
  }

  // 3. Seed Realistic Academic Semesters
  const fallSemester = await prisma.semester.create({
    data: {
      name: 'Fall 2026',
      code: 'FA26',
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2026-12-24T23:59:59.000Z'),
      status: 'ACTIVE',
      description: 'Junior Year - First Term. Specializing in Systems and Data Architecture.',
      academicGoals: 'Maintain GPA >= 3.80 and master operating systems kernel internals.',
      color: '#4f46e5',
      isArchived: false,
      userId: demoUser.id,
    },
  });

  const springSemester = await prisma.semester.create({
    data: {
      name: 'Spring 2027',
      code: 'SP27',
      startDate: new Date('2027-01-15T00:00:00.000Z'),
      endDate: new Date('2027-05-20T23:59:59.000Z'),
      status: 'UPCOMING',
      description: 'Junior Year - Second Term.',
      academicGoals: 'Prepare for software engineering internships and complete distributed systems project.',
      color: '#059669',
      isArchived: false,
      userId: demoUser.id,
    },
  });

  // 4. Seed Realistic Courses
  const osCourse = await prisma.course.create({
    data: {
      semesterId: fallSemester.id,
      code: 'CS301',
      title: 'Operating Systems & Concurrency',
      credits: 4.0,
      section: '02',
      teacherName: 'Dr. Linus Vance',
      teacherEmail: 'lvance@university.edu',
      roomNumber: 'Science Hall 304',
      description: 'Concurrency, virtual memory, scheduling algorithms, and file system architecture.',
      syllabus: 'Topics: Threads vs Processes, Peterson algorithm, Semaphores, Page Replacement, ext4.',
      color: '#6366f1',
      icon: 'terminal',
      classSchedule: 'Mon, Wed 10:00 AM - 11:30 AM',
      examSchedule: 'Midterm: Nov 04, 2026 | Final: Dec 18, 2026',
      userId: demoUser.id,
    },
  });

  const dbCourse = await prisma.course.create({
    data: {
      semesterId: fallSemester.id,
      code: 'CS305',
      title: 'Database Systems & Architecture',
      credits: 3.0,
      section: '01',
      teacherName: 'Prof. Grace Hopper',
      teacherEmail: 'ghopper@university.edu',
      roomNumber: 'Engineering Lab 2',
      description: 'Relational algebra, SQL query optimization, B+ Tree indexing, and ACID transaction recovery.',
      syllabus: 'Topics: ER Modeling, 3NF/BCNF Normalization, Indexing, Buffer Management, WAL.',
      color: '#0ea5e9',
      icon: 'database',
      classSchedule: 'Tue, Thu 02:00 PM - 03:30 PM',
      examSchedule: 'Midterm: Nov 06, 2026 | Final: Dec 20, 2026',
      userId: demoUser.id,
    },
  });

  const mathCourse = await prisma.course.create({
    data: {
      semesterId: fallSemester.id,
      code: 'MATH220',
      title: 'Discrete Mathematics & Graph Theory',
      credits: 3.0,
      section: '01',
      teacherName: 'Dr. Donald Knuth',
      teacherEmail: 'dknuth@university.edu',
      roomNumber: 'Math Building 101',
      description: 'Combinatorics, proof techniques, graph theory, and algorithmic complexity.',
      color: '#10b981',
      icon: 'sigma',
      classSchedule: 'Fri 09:00 AM - 12:00 PM',
      userId: demoUser.id,
    },
  });

  // 5. Seed Assignments
  await prisma.assignment.create({
    data: {
      semesterId: fallSemester.id,
      courseId: osCourse.id,
      title: 'Assignment 1: Multithreaded Buffer Simulation',
      description: 'Implement a producer-consumer problem using POSIX mutexes and condition variables in C.',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      personalNotes: 'Focus on ensuring bounded buffer condition variable logic is deadlock-free.',
    },
  });

  await prisma.assignment.create({
    data: {
      semesterId: fallSemester.id,
      courseId: dbCourse.id,
      title: 'Lab Project: B+ Tree Query Engine',
      description: 'Implement in-memory B+ Tree node splitting and range scans with transaction locking.',
      deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
      status: 'NOT_STARTED',
      priority: 'MEDIUM',
      personalNotes: 'Refer to chapter 11 of Database System Concepts for splitting algorithm.',
    },
  });

  // 6. Seed Exams
  await prisma.exam.create({
    data: {
      semesterId: fallSemester.id,
      courseId: osCourse.id,
      title: 'Operating Systems Midterm Exam',
      examType: 'Midterm',
      examDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
      room: 'Science Hall 304',
      syllabus: 'Chapters 1-6: Processes, Threads, CPU Scheduling, Synchronization',
      preparationStatus: 'IN_PROGRESS',
      prepPercentage: 65,
    },
  });

  // 7. Seed Assessments & Grades for CGPA Calculator
  await prisma.assessment.create({
    data: {
      semesterId: fallSemester.id,
      courseId: osCourse.id,
      userId: demoUser.id,
      title: 'Quiz 1: CPU Scheduling',
      category: 'QUIZ',
      maxMarks: 20,
      obtainedMarks: 19,
      weightPercentage: 10,
      isIncluded: true,
      assessmentDate: new Date('2026-09-20'),
    },
  });

  await prisma.assessment.create({
    data: {
      semesterId: fallSemester.id,
      courseId: dbCourse.id,
      userId: demoUser.id,
      title: 'SQL & Normalization Quiz',
      category: 'QUIZ',
      maxMarks: 25,
      obtainedMarks: 24,
      weightPercentage: 10,
      isIncluded: true,
      assessmentDate: new Date('2026-09-25'),
    },
  });

  // 8. Seed Study Sessions
  await prisma.studySession.create({
    data: {
      semesterId: fallSemester.id,
      courseId: osCourse.id,
      userId: demoUser.id,
      title: 'Page Replacement Algorithms Deep Dive (LRU & Clock)',
      scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      durationMinutes: 90,
      topics: 'Virtual memory management, page fault frequencies, and working set models.',
      isCompleted: false,
      notes: 'Review textbook chapter 9 and solve end-of-chapter problems.',
    },
  });

  // 9. Seed Notes
  await prisma.note.create({
    data: {
      semesterId: fallSemester.id,
      courseId: osCourse.id,
      userId: demoUser.id,
      title: 'Lecture 04: Process Synchronization & Deadlock',
      content: `<h1>Process Synchronization & Deadlock Prevention</h1>
<p><strong>Course:</strong> CS301 | <strong>Instructor:</strong> Dr. Linus Vance</p>
<hr />
<h2>Key Concepts</h2>
<ul>
  <li><strong>Critical Section Problem:</strong> Mutual exclusion, progress, and bounded waiting must be guaranteed.</li>
  <li><strong>Dining Philosophers:</strong> Classic synchronization dilemma illustrating deadlocks and starvation.</li>
  <li><strong>Banker's Algorithm:</strong> Resource allocation algorithm used to avoid deadlocks by testing for safe states.</li>
</ul>
<h2>Action Items</h2>
<p>Implement Peterson's solution in C and verify memory barriers on x86 architectures.</p>`,
      isPinned: true,
      version: 1,
    },
  });

  await prisma.note.create({
    data: {
      semesterId: fallSemester.id,
      courseId: dbCourse.id,
      userId: demoUser.id,
      title: 'Database Normalization Quick Reference (1NF to BCNF)',
      content: `<h1>Database Normalization Guidelines</h1>
<p>Rules of thumb for eliminating data redundancy and anomalies in relational schema designs.</p>
<ul>
  <li><strong>1NF:</strong> Atomic values, no repeating groups.</li>
  <li><strong>2NF:</strong> 1NF + no partial functional dependencies on candidate keys.</li>
  <li><strong>3NF:</strong> 2NF + no transitive dependencies.</li>
  <li><strong>BCNF:</strong> For every functional dependency X -> Y, X must be a superkey.</li>
</ul>`,
      isPinned: false,
      version: 1,
    },
  });

  console.log('✅ [Seed] Successfully seeded realistic demo records for demo student.');
  return demoUser;
}
