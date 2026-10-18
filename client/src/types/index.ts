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
  isPinned: boolean;
  tags?: string | null;
  version: number;
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
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED';
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
  stats: {
    totalSemesters: number;
    totalCourses: number;
    totalDocuments: number;
    totalNotes: number;
    overdueCount: number;
    avgProgress: number;
    completedAssignmentsCount: number;
    totalAssignmentsCount: number;
  };
  upcomingExams: Exam[];
  upcomingAssignments: Assignment[];
  overdueAssignments: Assignment[];
  recentDocuments: DocumentItem[];
  recentNotes: Note[];
  todayEvents: CalendarEvent[];
}
