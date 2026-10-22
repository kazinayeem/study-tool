export interface Semester {
  id: string;
  name: string;
  code?: string | null;
  startDate: string;
  endDate: string;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  description?: string | null;
  academicGoals?: string | null;
  color?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  courses?: Course[];
  _count?: {
    courses: number;
    documents: number;
    assignments: number;
    exams: number;
    notes: number;
  };
}

export interface Course {
  id: string;
  semesterId: string;
  semester?: Semester;
  code: string;
  title: string;
  credits: number;
  section?: string | null;
  teacherName?: string | null;
  teacherEmail?: string | null;
  roomNumber?: string | null;
  description?: string | null;
  syllabus?: string | null;
  color: string;
  icon?: string | null;
  classSchedule?: string | null;
  examSchedule?: string | null;
  midtermPrepNotes?: string | null;
  finalPrepNotes?: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
  documents?: DocumentItem[];
  notes?: Note[];
  assignments?: Assignment[];
  exams?: Exam[];
  calendarEvents?: CalendarEvent[];
  _count?: {
    documents: number;
    notes: number;
    assignments: number;
    exams: number;
  };
}

export interface Tag {
  id: string;
  name: string;
  color?: string | null;
}

export interface DocumentTag {
  id: string;
  documentId: string;
  tagId: string;
  tag: Tag;
}

export interface DocumentBookmark {
  id: string;
  documentId: string;
  pageNumber: number;
  title: string;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentAnnotation {
  id: string;
  documentId: string;
  pageNumber: number;
  type: 'highlight' | 'note' | 'underline' | 'strike';
  color: string;
  selectedText?: string | null;
  comment?: string | null;
  rectJson?: string | null; // { x, y, width, height }
  positionData?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentItem {
  id: string;
  semesterId?: string | null;
  semester?: Semester | null;
  courseId?: string | null;
  course?: Course | null;
  title: string;
  originalFilename: string;
  storedFilename: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  category: string;
  description?: string | null;
  comments?: string | null;
  isPdf: boolean;
  pageCount: number;
  lastOpenedPage: number;
  lastOpenedAt?: string | null;
  isScanned: boolean;
  createdAt: string;
  updatedAt: string;
  tags?: DocumentTag[];
  bookmarks?: DocumentBookmark[];
  annotations?: DocumentAnnotation[];
  _count?: {
    bookmarks: number;
    annotations: number;
  };
}

export interface Note {
  id: string;
  semesterId?: string | null;
  semester?: Semester | null;
  courseId?: string | null;
  course?: Course | null;
  documentId?: string | null;
  document?: DocumentItem | null;
  assignmentId?: string | null;
  assignment?: Assignment | null;
  examId?: string | null;
  exam?: Exam | null;
  title: string;
  content: string;
  /** Canonical versioned Lexical editor state (JSON string). */
  contentJson?: string | null;
  isPinned: boolean;
  isArchived?: boolean;
  tags?: string | null;

  version: number;
  folderId?: string | null;
  folder?: NoteFolder | null;
  backlinks?: Array<{
    id: string;
    sourceNoteId: string;
    sourceNote?: { id: string; title: string };
  }>;
  reminderDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskChecklistItem {
  id: string;
  assignmentId?: string | null;
  examId?: string | null;
  text: string;
  isCompleted: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  semesterId: string;
  semester?: Semester;
  courseId: string;
  course?: Course;
  title: string;
  description?: string | null;
  deadline: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'BACKLOG' | 'TODO' | 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';
  progress?: number;
  estimatedHours?: number | null;
  submissionDate?: string | null;
  submissionLink?: string | null;
  isSubmittedOnTime?: boolean | null;
  projectId?: string | null;
  personalNotes?: string | null;
  daysRemaining?: number;
  isOverdue?: boolean;
  checklistProgress?: number;
  checklist?: TaskChecklistItem[];
  documents?: Array<{
    id: string;
    assignmentId: string;
    documentId: string;
    document: DocumentItem;
    purpose: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Exam {
  id: string;
  semesterId: string;
  semester?: Semester;
  courseId: string;
  course?: Course;
  title: string;
  examType: 'Quiz' | 'Midterm' | 'Final' | 'Practical' | 'Viva';
  examDate: string;
  room?: string | null;
  syllabus?: string | null;
  personalNotes?: string | null;
  preparationStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'REVISION_READY' | 'CONFIDENT';
  prepPercentage: number;
  daysRemaining?: number;
  isPast?: boolean;
  checklist?: TaskChecklistItem[];
  questionPapers?: Array<{
    id: string;
    examId: string;
    documentId: string;
    document: DocumentItem;
    purpose: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  semesterId?: string | null;
  semester?: Semester | null;
  courseId?: string | null;
  course?: Course | null;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isCompleted: boolean;
  location?: string | null;
  notes?: string | null;
  reminderMinutesBefore?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppSetting {
  id: string;
  theme: 'light' | 'dark' | 'system';
  studentName: string;
  universityName?: string | null;
  degree?: string | null;
  currentSemesterId?: string | null;
  enableBrowserNotifications: boolean;
  autoSaveDelayMs: number;
}

export interface DashboardData {
  activeSemester: Semester | null;
  activeCourses?: Course[];
  stats: {
    totalSemesters: number;
    totalCourses: number;
    totalDocuments: number;
    totalNotes: number;
    classPhotoCount?: number;
    overdueCount: number;
    avgProgress: number;
    completedAssignmentsCount: number;
    totalAssignmentsCount: number;
    pendingAssignmentsCount?: number;
    upcomingExamsCount?: number;
    weeklyStudyMinutes?: number;
    weeklyPlannedMinutes?: number;
    completedSessionsCount?: number;
    totalSessionsCount?: number;
    semesterGpa?: number | null;
  };
  upcomingExams: (Exam & { daysRemaining?: number })[];
  upcomingAssignments: (Assignment & { daysRemaining?: number; isOverdue?: boolean })[];
  overdueAssignments: Assignment[];
  recentDocuments: DocumentItem[];
  recentNotes: Note[];
  studySessions?: any[];
  todayEvents?: CalendarEvent[];
  calendarEvents?: CalendarEvent[];
  todayFocus?: {
    tasksDueToday: Assignment[];
    todaySessions: any[];
    todayPhotos: any[];
    examsUpcoming: Exam[];
  };
  recentActivity?: Array<{
    id: string;
    type: 'ASSIGNMENT' | 'NOTE' | 'DOCUMENT' | 'PHOTO';
    title: string;
    courseCode?: string;
    courseColor?: string;
    timestamp: string | Date;
    detail?: string;
    link: string;
  }>;
}

export interface NotificationPreference {
  id: string;
  recipientEmail: string;
  emailEnabled: boolean;
  enableInAppNotifications: boolean;
  enableEmailNotifications: boolean;
  enableBrowserNotifications: boolean;
  notifyAssignments: boolean;
  notifyExams: boolean;
  notifyStudySessions: boolean;
  notifyCalendarEvents: boolean;
  notifyQuizzes: boolean;
  notifyMidterms: boolean;
  notifyFinals: boolean;
  notifyProjects: boolean;
  notifyCustomEvents: boolean;
  assignmentIntervals: string[];
  examIntervals: string[];
  studySessionIntervals: string[];
  quizIntervals: string[];
  midtermIntervals: string[];
  finalIntervals: string[];
  projectIntervals: string[];
  customEventIntervals: string[];
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLog {
  id: string;
  jobId?: string | null;
  notificationType: string;
  targetId?: string | null;
  targetTitle?: string | null;
  recipient: string;
  subject: string;
  scheduledTime: string;
  actualSendTime?: string | null;
  status: 'Pending' | 'Sent' | 'Failed' | 'Skipped';
  retryCount: number;
  lastError?: string | null;
  createdAt: string;
}

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  category: string;
  targetType?: string | null;
  targetId?: string | null;
  linkUrl?: string | null;
  isRead: boolean;
  scheduledFor?: string | null;
  createdAt: string;
}

export interface ShareLink {
  id: string;
  token: string;
  resourceType: 'DOCUMENT' | 'NOTE' | 'COURSE' | 'ASSIGNMENT' | 'EXAM';
  resourceId: string;
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  title?: string | null;
  isPasswordProtected: boolean;
  allowDownload: boolean;
  allowIndexing: boolean;
  viewMode: 'FULL_ORIGINAL' | 'PREVIEW' | 'METADATA_ONLY';
  expiresAt?: string | null;
  isRevoked: boolean;
  accessCount: number;
  lastAccessedAt?: string | null;
  createdAt: string;
}

export interface PublicShareData {
  token: string;
  resourceType: 'DOCUMENT' | 'NOTE' | 'COURSE' | 'ASSIGNMENT' | 'EXAM';
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  viewMode: string;
  allowDownload: boolean;
  allowIndexing: boolean;
  createdAt: string;
  expiresAt?: string | null;
  resource: any;
}

// ==================== ADVANCED TYPES ====================

// 1. Dashboard Preferences (Feature 1)
export interface DashboardPreference {
  id: string;
  widgetOrder: string[];
  hiddenWidgets: string[];
  defaultView: 'today' | 'week' | 'upcoming';
  selectedSemesterId?: string | null;
  selectedCourseId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 2. Grade and CGPA (Feature 3)
export interface GradeScaleItem {
  letter: string;
  points: number;
  minMarks: number;
}

export interface GradeScale {
  id: string;
  name?: string;
  scaleName?: string;
  minPassingGrade: number | string;
  rules?: any;
  scaleData?: GradeScaleItem[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Assessment {
  id: string;
  courseId: string;
  course?: { id: string; code: string; title: string; credits: number; color: string };
  semesterId?: string;
  semester?: { id: string; name: string };
  title: string;
  category: 'ATTENDANCE' | 'CLASS_TEST' | 'QUIZ' | 'ASSIGNMENT' | 'MIDTERM' | 'FINAL' | 'FINAL_EXAM' | 'LAB' | 'PROJECT' | 'OTHER' | string;
  maxMarks: number;
  obtainedMarks?: number | null;
  weightPercentage?: number | null;
  date?: string | null;
  assessmentDate?: string | null;
  notes?: string | null;
  isIncluded?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseGradeSummary {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  credits: number;
  totalMarks: number | null;
  letterGrade: string;
  gradePoint: number;
  isPassing: boolean;
}

export interface GradeSummaryResponse {
  cgpa: number;
  semesterGpa: number;
  totalCreditsCompleted: number;
  totalCreditsAttempted: number;
  targetCgpa: number;
  courseGrades: CourseGradeSummary[];
  semesterGpaHistory: Record<string, number>;
  cumulativeGpa?: number;
  totalCompletedCredits?: number;
  totalAttemptedCredits?: number;
  gradeDistribution?: Record<string, number>;
  semesters?: any[];
}

// 3. Smart Study Planner (Feature 4)
export interface StudyPlan {
  id: string;
  semesterId?: string;
  semester?: Semester;
  courseId?: string | null;
  course?: Course | null;
  title: string;
  targetExamId?: string | null;
  targetExam?: Exam | null;
  targetAssignmentId?: string | null;
  targetAssignment?: Assignment | null;
  topic?: string | null;
  topics?: string | null;
  difficulty: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;
  estimatedHours: number;
  dailyHoursLimit?: number;
  availableHoursPerWeek?: number | null;
  startDate: string;
  targetDate?: string;
  endDate?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | string;
  sessions?: StudySession[];
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  semesterId?: string | null;
  semester?: Semester | null;
  courseId?: string | null;
  course?: Course | null;
  studyPlanId?: string | null;
  studyPlan?: { id: string; title: string; priority: string } | null;
  examId?: string | null;
  exam?: Exam | null;
  assignmentId?: string | null;
  assignment?: Assignment | null;
  documentId?: string | null;
  title: string;
  topic?: string | null;
  scheduledDate?: string;
  plannedStartTime?: string | null;
  plannedEndTime?: string | null;
  durationMinutes?: number;
  actualDurationMinutes: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;
  status: 'SCHEDULED' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED' | 'CANCELLED' | string;
  pomodoroCount: number;
  isCompleted?: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlannerStats {
  streakDays: number;
  totalHoursLogged: number;
  completedSessions: number;
  totalSessions: number;
  missedSessions: number;
  completionRate: number;
  totalSessionsCount?: number;
  completedCount?: number;
  missedCount?: number;
  totalPlannedMinutes?: number;
  totalActualMinutes?: number;
  totalPomodoros?: number;
}

// 4. Knowledge Base (Feature 5)
export interface NoteFolder {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  parentId?: string | null;
  createdAt: string;
  _count?: { notes: number };
}

export interface NoteRevision {
  id: string;
  noteId: string;
  version: number;
  title: string;
  content: string;
  contentJson?: string | null;
  createdReason: string;
  createdAt: string;
}

export interface NoteLink {
  id: string;
  sourceNoteId: string;
  targetNoteId?: string | null;
  targetNote?: { id: string; title: string };
  targetDocumentId?: string | null;
  targetDocument?: { id: string; title: string };
  targetExamId?: string | null;
  targetAssignmentId?: string | null;
  targetCalendarEventId?: string | null;
  linkType: 'NOTE' | 'DOCUMENT' | 'EXAM' | 'ASSIGNMENT' | 'CALENDAR';
  anchorText?: string | null;
  pageNumber?: number | null;
  createdAt: string;
}

export interface NoteTemplate {
  id: string;
  title: string;
  description: string;
  content: string;
}

// 5. Backup Record (Feature 7)
export interface BackupRecord {
  id: string;
  filename: string;
  filePath: string;
  sizeBytes: number;
  checksum: string;
  itemCount: number;
  manifestJson?: string | null;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string | null;
  createdAt: string;
}

// 6. Smart Class Photo Journal (Board Photo Archive)
export interface ClassPhoto {
  id: string;
  sessionId: string;
  userId?: string | null;
  originalFilename: string;
  storedFilename: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  width?: number | null;
  height?: number | null;
  caption?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClassSession {
  id: string;
  semesterId: string;
  semester?: {
    id: string;
    name: string;
    code?: string | null;
    status?: string;
  };
  courseId: string;
  course?: {
    id: string;
    code: string;
    title: string;
    color: string;
    teacherName?: string | null;
    roomNumber?: string | null;
  };
  userId?: string | null;
  sessionDate: string;
  topic: string;
  teacherName?: string | null;
  roomNumber?: string | null;
  description?: string | null;
  photos: ClassPhoto[];
  _count?: {
    photos: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ClassSessionDateBadge {
  date: string;
  sessionCount: number;
  photoCount: number;
}

// 7. University Curriculum & Degree Progress Planner
export interface DegreeProgram {
  id: string;
  userId?: string | null;
  universityName: string;
  programName: string;
  department?: string | null;
  degreeDurationYears?: number | null;
  totalCreditsRequired: number;
  requiredSemesters?: number | null;
  curriculumYear?: string | null;
  startSemesterName?: string | null;
  targetGraduationDate?: string | null;
  minCreditsPerSemester: number;
  maxCreditsPerSemester: number;
  isConfigured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumCoursePrerequisite {
  id: string;
  prerequisiteCourseId: string;
  code: string;
  title: string;
  credits: number;
  minGradeLetter?: string;
  isSatisfied: boolean;
}

export interface CurriculumCourse {
  id: string;
  code: string;
  title: string;
  credits: number;
  category: string;
  isRequired: boolean;
  recommendedSemester?: number | null;
  minPassingGrade: string;
  description?: string | null;
  status: 'NOT_STARTED' | 'ELIGIBLE' | 'PLANNED' | 'CURRENTLY_ENROLLED' | 'COMPLETED' | 'FAILED' | 'EXEMPTED_OR_TRANSFERRED';
  allPrerequisitesSatisfied: boolean;
  prerequisites: CurriculumCoursePrerequisite[];
  prerequisiteFor?: Array<{ id: string; code: string; title: string }>;
  actualRecord?: {
    courseId: string;
    semester?: { id: string; name: string; code?: string | null; status: string } | null;
    gradeLetter?: string | null;
    gradePoint?: number | null;
    finalScore?: number | null;
    isRetake: boolean;
    attemptCount: number;
  } | null;
}

export interface SemesterCreditHistoryItem {
  id: string;
  name: string;
  code?: string | null;
  status: string;
  coursesCount: number;
  registeredCredits: number;
  completedCredits: number;
  uncompletedCredits: number;
  semesterGpa: number;
  passedCourses: string[];
  failedCourses: string[];
  courses: Array<{
    id: string;
    code: string;
    title: string;
    credits: number;
    gradeLetter: string;
    gradePoint?: number | null;
    status: string;
  }>;
}

export interface CategoryBreakdownItem {
  category: string;
  totalCredits: number;
  completedCredits: number;
  inProgressCredits: number;
  remainingCredits: number;
  completionPercentage: number;
  totalCourses: number;
  completedCourses: number;
}

export interface DegreeProgressData {
  isConfigured: boolean;
  program: DegreeProgram;
  credits: {
    totalRequired: number;
    completed: number;
    inProgress: number;
    remaining: number;
    completionPercentage: number;
  };
  courses: {
    totalCurriculum: number;
    completed: number;
    inProgress: number;
    remaining: number;
    requiredTotal: number;
    requiredCompleted: number;
    requiredRemaining: number;
  };
  activeSemester?: {
    id: string;
    name: string;
    code?: string | null;
    inProgressCredits: number;
    coursesCount: number;
  } | null;
  categoryBreakdown: CategoryBreakdownItem[];
  semesterHistory: SemesterCreditHistoryItem[];
  graduationEstimates: {
    simpleCreditBasedSemesters: number;
    criticalPathDepth: number;
    estimatedRemainingSemesters: number;
    conservativeSemesters: number;
    averageCreditsNeededPerSemester: number;
    assumptions: string[];
  };
}

export interface PlannedCourseItem {
  id: string;
  curriculumCourseId: string;
  code: string;
  title: string;
  credits: number;
  category: string;
  isRequired: boolean;
}

export interface NextSemesterPlannerData {
  targetSemesterName: string;
  minCreditsLimit: number;
  maxCreditsLimit: number;
  suggestedCreditLoad: number;
  totalSelectedCredits: number;
  plannedCourses: PlannedCourseItem[];
  retakesRequired: Array<CurriculumCourse & { isRetake: boolean }>;
  criticalPrerequisiteBlockers: Array<CurriculumCourse & { downstreamUnlockCount: number }>;
  recommendedForUpcoming: CurriculumCourse[];
  otherEligible: CurriculumCourse[];
  ineligible: Array<CurriculumCourse & { unmetPrerequisites: string[] }>;
  warnings: string[];
  assumptions: {
    formula: string;
    remainingCredits: number;
    recommendedMin: number;
    recommendedMax: number;
  };
}

// ---- Semester fees & costs ----
export type FeeCategory =
  | 'REGISTRATION'
  | 'MID_EXAM'
  | 'FINAL_EXAM'
  | 'LAB'
  | 'LIBRARY'
  | 'ACTIVITY'
  | 'TRANSPORT'
  | 'HOSTEL'
  | 'OTHER';

export type FeeStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export interface FeeItem {
  id: string;
  semesterId: string;
  courseId: string | null;
  category: FeeCategory;
  label: string;
  amount: number;
  paidAmount: number;
  dueAmount?: number;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  status?: FeeStatus;
}

export interface FeeSummary {
  semester: { id: string; name: string; code: string | null };
  plan: { currency: string; perCreditFee: number; waiverPercent: number; tuitionPaid: number; notes: string | null; configured: boolean };
  credits: { total: number; courses: number };
  tuition: { gross: number; waiver: number; net: number; paid: number; due: number };
  byCategory: Record<string, { amount: number; paid: number }>;
  items: FeeItem[];
  perCourse: { id: string; code: string; title: string; credits: number; color?: string | null; tuition: number; courseFees: number; total: number }[];
  totals: { total: number; paid: number; due: number; percentPaid: number; overdueCount: number };
}

export interface FeeOverview {
  rows: { semesterId: string; name: string; currency: string; credits: number; total: number; paid: number; due: number }[];
  grand: { total: number; paid: number; due: number };
}
