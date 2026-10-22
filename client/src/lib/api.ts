import type { FeeSummary, FeeOverview, FeeItem } from '../types';
import type {
  ClassSession,
  ClassPhoto,
  ClassSessionDateBadge,
  DegreeProgram,
  CurriculumCourse,
  DegreeProgressData,
  NextSemesterPlannerData,
} from '../types';

const API_BASE = '/api';

export class ApiError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  // Automatically attach auth token if stored
  const token = localStorage.getItem('scholarflow_token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      data?.error || data?.message || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }

  return data.data !== undefined ? data.data : data;
}

export function uploadWithProgress<T>(
  endpoint: string,
  formData: FormData,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${API_BASE}${endpoint}`;

    if (signal) {
      if (signal.aborted) {
        return reject(new Error('Upload cancelled'));
      }
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new Error('Upload cancelled'));
      });
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // non-json response
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        resolve(data?.data !== undefined ? data.data : data);
      } else {
        reject(
          new ApiError(
            data?.error || data?.message || `Upload failed with status ${xhr.status}`,
            xhr.status,
            data
          )
        );
      }
    };

    xhr.onerror = () => {
      reject(new ApiError('Network connection failed during upload', 0));
    };

    xhr.onabort = () => {
      reject(new Error('Upload cancelled'));
    };

    xhr.open('POST', url);
    xhr.withCredentials = true;

    const token = localStorage.getItem('scholarflow_token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.send(formData);
  });
}

export const api = {
  // Authentication & Session
  getAuthStatus: () => request<any>('/auth/status'),
  login: (password: string, email = 'owner@scholarflow.local') =>
    request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  loginDemo: () => request<any>('/auth/demo', { method: 'POST' }),
  loginGoogle: (idToken: string) =>
    request<any>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),
  logout: () => request<any>('/auth/logout', { method: 'POST' }),
  getCurrentUser: () => request<any>('/auth/me'),
  getOwnerProfile: () => request<any>('/auth/me'),
  updateProfile: (data: { name?: string; avatarUrl?: string }) =>
    request<any>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Admin Dashboard & User Management
  getAdminOverview: () => request<any>('/admin/overview'),
  getAdminUsers: (params: { q?: string; role?: string; status?: string; page?: number; limit?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.role) searchParams.set('role', params.role);
    if (params.status) searchParams.set('status', params.status);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    return request<any>(`/admin/users?${searchParams.toString()}`);
  },
  getAdminUser: (id: string) => request<any>(`/admin/users/${id}`),
  updateUserStatus: (id: string, status: 'ACTIVE' | 'DISABLED') =>
    request<any>(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  getAdminActivity: (params: { eventType?: string; isDemo?: boolean; page?: number; limit?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.eventType) searchParams.set('eventType', params.eventType);
    if (params.isDemo !== undefined) searchParams.set('isDemo', String(params.isDemo));
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    return request<any>(`/admin/activity?${searchParams.toString()}`);
  },

  // Notification Preferences & SMTP Diagnostic
  getNotificationPreferences: () => request<any>('/notifications/preferences'),
  updateNotificationPreferences: (data: any) =>
    request<any>('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  testEmailNotification: (recipientEmail?: string) =>
    request<any>('/notifications/test', {
      method: 'POST',
      body: JSON.stringify({ recipientEmail }),
    }),
  getInAppNotifications: (unreadOnly = false) =>
    request<{ notifications: any[]; unreadCount: number }>(
      `/notifications/in-app?unreadOnly=${unreadOnly}`
    ),
  markInAppNotificationRead: (id: string) =>
    request<any>(`/notifications/in-app/${id}/read`, { method: 'PATCH' }),
  markAllInAppNotificationsRead: () =>
    request<any>('/notifications/in-app/mark-all-read', { method: 'POST' }),
  getNotificationHistory: (params: Record<string, any> = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.append(k, String(v));
      }
    });
    return request<any>(`/notifications/history?${searchParams.toString()}`);
  },
  triggerSchedulerCheck: () =>
    request<any>('/notifications/trigger-scheduler', { method: 'POST' }),

  // Public & Private Sharing
  createShareLink: (data: any) =>
    request<any>('/share/links', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getShareLinksForResource: (resourceType: string, resourceId: string) =>
    request<any[]>(`/share/links/resource/${resourceType}/${resourceId}`),
  revokeShareLink: (id: string) =>
    request<any>(`/share/links/${id}/revoke`, { method: 'PATCH' }),
  setResourcePrivate: (resourceType: string, resourceId: string) =>
    request<any>(`/share/resource/${resourceType}/${resourceId}/set-private`, {
      method: 'POST',
    }),
  getPublicShare: (token: string, password?: string) => {
    const headers: Record<string, string> = {};
    if (password) {
      headers['x-share-password'] = password;
    }
    return request<any>(`/share/${token}`, { headers });
  },
  verifySharePassword: (token: string, password: string) =>
    request<any>(`/share/${token}/verify-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  // Semesters
  getSemesters: (includeArchived = false) =>
    request<any[]>(`/semesters?includeArchived=${includeArchived}`),
  getSemester: (id: string) => request<any>(`/semesters/${id}`),
  createSemester: (data: any) =>
    request<any>('/semesters', { method: 'POST', body: JSON.stringify(data) }),
  updateSemester: (id: string, data: any) =>
    request<any>(`/semesters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  duplicateSemester: (id: string, data: any) =>
    request<any>(`/semesters/${id}/duplicate`, { method: 'POST', body: JSON.stringify(data) }),
  deleteSemester: (id: string) =>
    request<{ success: boolean }>(`/semesters/${id}`, { method: 'DELETE' }),

  // Courses
  getCourses: (semesterId?: string) =>
    request<any[]>(semesterId ? `/courses?semesterId=${semesterId}` : '/courses'),
  getCourse: (id: string) => request<any>(`/courses/${id}`),
  createCourse: (data: any) =>
    request<any>('/courses', { method: 'POST', body: JSON.stringify(data) }),
  updateCourse: (id: string, data: any) =>
    request<any>(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCourse: (id: string) =>
    request<{ success: boolean }>(`/courses/${id}`, { method: 'DELETE' }),

  // Documents
  getDocuments: (params: Record<string, string> = {}) => {
    const searchParams = new URLSearchParams(params);
    return request<any[]>(`/documents?${searchParams.toString()}`);
  },
  getDocument: (id: string) => request<any>(`/documents/${id}`),
  getDocumentFileUrl: (id: string) => {
    const token = localStorage.getItem('scholarflow_token');
    return token ? `/api/documents/${id}/file?token=${encodeURIComponent(token)}` : `/api/documents/${id}/file`;
  },
  getDocumentDownloadUrl: (id: string) => {
    const token = localStorage.getItem('scholarflow_token');
    return token ? `/api/documents/${id}/download?token=${encodeURIComponent(token)}` : `/api/documents/${id}/download`;
  },
  uploadDocument: (formData: FormData) =>
    request<any>('/documents/upload', { method: 'POST', body: formData }),
  uploadDocumentWithProgress: (
    formData: FormData,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ) => uploadWithProgress<any>('/documents/upload', formData, onProgress, signal),
  updateDocument: (id: string, data: any) =>
    request<any>(`/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  replaceDocument: (id: string, formData: FormData) =>
    request<any>(`/documents/${id}/replace`, { method: 'POST', body: formData }),
  replaceDocumentWithProgress: (
    id: string,
    formData: FormData,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ) => uploadWithProgress<any>(`/documents/${id}/replace`, formData, onProgress, signal),
  deleteDocument: (id: string) =>
    request<{ success: boolean }>(`/documents/${id}`, { method: 'DELETE' }),

  // Bookmarks
  getBookmarks: (documentId: string) =>
    request<any[]>(`/documents/${documentId}/bookmarks`),
  createBookmark: (documentId: string, data: any) =>
    request<any>(`/documents/${documentId}/bookmarks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteBookmark: (documentId: string, id: string) =>
    request<any>(`/documents/${documentId}/bookmarks/${id}`, { method: 'DELETE' }),

  // Annotations
  getAnnotations: (documentId: string, page?: number) =>
    request<any[]>(
      page !== undefined
        ? `/documents/${documentId}/annotations?page=${page}`
        : `/documents/${documentId}/annotations`
    ),
  createAnnotation: (documentId: string, data: any) =>
    request<any>(`/documents/${documentId}/annotations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAnnotation: (documentId: string, id: string, data: any) =>
    request<any>(`/documents/${documentId}/annotations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteAnnotation: (documentId: string, id: string) =>
    request<any>(`/documents/${documentId}/annotations/${id}`, { method: 'DELETE' }),

  // Notes
  getNotes: (params: Record<string, string> = {}) => {
    const searchParams = new URLSearchParams(params);
    return request<any[]>(`/notes?${searchParams.toString()}`);
  },
  getNote: (id: string) => request<any>(`/notes/${id}`),
  createNote: (data: any) =>
    request<any>('/notes', { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id: string, data: any) =>
    request<any>(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleNotePin: (id: string) =>

    request<any>(`/notes/${id}/pin`, { method: 'PATCH' }),
  toggleNoteArchive: (id: string) =>
    request<any>(`/notes/${id}/archive`, { method: 'PATCH' }),
  uploadNoteImage: (formData: FormData) =>
    request<{ url: string; filename: string; originalName: string; size: number }>('/notes/upload-image', {
      method: 'POST',
      body: formData,
    }),
  importDocxNote: (formData: FormData) =>
    request<{ title: string; html: string; warnings: string[] }>('/notes/import/docx', {
      method: 'POST',
      body: formData,
    }),
  getNoteDocxExportUrl: (id: string) => `/api/notes/${id}/export/docx`,
  deleteNote: (id: string) =>
    request<{ success: boolean }>(`/notes/${id}`, { method: 'DELETE' }),


  // Assignments
  getAssignments: (params: Record<string, string> = {}) => {
    const searchParams = new URLSearchParams(params);
    return request<any[]>(`/assignments?${searchParams.toString()}`);
  },
  getAssignment: (id: string) => request<any>(`/assignments/${id}`),
  createAssignment: (data: any) =>
    request<any>('/assignments', { method: 'POST', body: JSON.stringify(data) }),
  updateAssignment: (id: string, data: any) =>
    request<any>(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleAssignmentChecklist: (assignmentId: string, itemId: string) =>
    request<any>(`/assignments/${assignmentId}/checklist/${itemId}/toggle`, { method: 'PATCH' }),
  addAssignmentChecklist: (assignmentId: string, text: string) =>
    request<any>(`/assignments/${assignmentId}/checklist`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  deleteAssignmentChecklist: (assignmentId: string, itemId: string) =>
    request<any>(`/assignments/${assignmentId}/checklist/${itemId}`, { method: 'DELETE' }),
  deleteAssignment: (id: string) =>
    request<{ success: boolean }>(`/assignments/${id}`, { method: 'DELETE' }),

  // Exams
  getExams: (params: Record<string, string> = {}) => {
    const searchParams = new URLSearchParams(params);
    return request<any[]>(`/exams?${searchParams.toString()}`);
  },
  getExam: (id: string) => request<any>(`/exams/${id}`),
  createExam: (data: any) =>
    request<any>('/exams', { method: 'POST', body: JSON.stringify(data) }),
  updateExam: (id: string, data: any) =>
    request<any>(`/exams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleExamChecklist: (examId: string, itemId: string) =>
    request<any>(`/exams/${examId}/checklist/${itemId}/toggle`, { method: 'PATCH' }),
  addExamChecklist: (examId: string, text: string) =>
    request<any>(`/exams/${examId}/checklist`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  linkExamDocument: (examId: string, documentId: string, purpose?: string) =>
    request<any>(`/exams/${examId}/documents`, {
      method: 'POST',
      body: JSON.stringify({ documentId, purpose }),
    }),
  unlinkExamDocument: (examId: string, documentId: string) =>
    request<any>(`/exams/${examId}/documents/${documentId}`, { method: 'DELETE' }),
  deleteExam: (id: string) =>
    request<{ success: boolean }>(`/exams/${id}`, { method: 'DELETE' }),

  // Semester fees & costs
  getFeeSummary: (semesterId: string) =>
    request<FeeSummary>(`/fees/summary?semesterId=${encodeURIComponent(semesterId)}`),
  getFeeOverview: () => request<FeeOverview>('/fees/overview'),
  saveFeePlan: (data: {
    semesterId: string;
    currency: string;
    perCreditFee: number;
    waiverPercent: number;
    notes?: string | null;
  }) => request<FeeSummary>('/fees/plan', { method: 'PUT', body: JSON.stringify(data) }),
  addTuitionPayment: (semesterId: string, amount: number) =>
    request<FeeSummary>('/fees/tuition-payment', { method: 'POST', body: JSON.stringify({ semesterId, amount }) }),
  createFeeItem: (data: Record<string, unknown>) =>
    request<FeeItem>('/fees/items', { method: 'POST', body: JSON.stringify(data) }),
  updateFeeItem: (id: string, data: Record<string, unknown>) =>
    request<FeeItem>(`/fees/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  payFeeItem: (id: string, amount: number) =>
    request<FeeItem>(`/fees/items/${id}/pay`, { method: 'POST', body: JSON.stringify({ amount }) }),
  deleteFeeItem: (id: string) => request<{ success: boolean }>(`/fees/items/${id}`, { method: 'DELETE' }),

  // Calendar
  getCalendarEvents: (params: Record<string, string> = {}) => {
    const searchParams = new URLSearchParams(params);
    return request<any[]>(`/calendar?${searchParams.toString()}`);
  },
  getReminders: () => request<any[]>('/calendar/reminders'),
  createCalendarEvent: (data: any) =>
    request<any>('/calendar', { method: 'POST', body: JSON.stringify(data) }),
  updateCalendarEvent: (id: string, data: any) =>
    request<any>(`/calendar/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleCalendarEvent: (id: string) =>
    request<any>(`/calendar/${id}/toggle`, { method: 'PATCH' }),
  deleteCalendarEvent: (id: string) =>
    request<{ success: boolean }>(`/calendar/${id}`, { method: 'DELETE' }),

  // Dashboard
  getDashboard: () => request<any>('/dashboard'),
  getDashboardWithParams: (params: Record<string, string> = {}) => {
    const searchParams = new URLSearchParams(params);
    return request<any>(`/dashboard?${searchParams.toString()}`);
  },
  getDashboardPreferences: () => request<any>('/dashboard/preferences'),
  updateDashboardPreferences: (data: any) =>
    request<any>('/dashboard/preferences', { method: 'PUT', body: JSON.stringify(data) }),

  // Grade and CGPA Management (Feature 3)
  getGradeScale: () => request<any>('/grades/scale'),
  updateGradeScale: (data: any) =>
    request<any>('/grades/scale', { method: 'PUT', body: JSON.stringify(data) }),
  getAssessments: (params: Record<string, string> = {}) => {
    const searchParams = new URLSearchParams(params);
    return request<any[]>(`/grades/assessments?${searchParams.toString()}`);
  },
  createAssessment: (data: any) =>
    request<any>('/grades/assessments', { method: 'POST', body: JSON.stringify(data) }),
  updateAssessment: (id: string, data: any) =>
    request<any>(`/grades/assessments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAssessment: (id: string) =>
    request<{ success: boolean }>(`/grades/assessments/${id}`, { method: 'DELETE' }),
  getGradeSummary: (semesterId?: string) =>
    request<any>(semesterId ? `/grades/summary?semesterId=${semesterId}` : '/grades/summary'),
  updateTargetGoal: (targetCgpa: number, notes?: string) =>
    request<any>('/grades/target-goal', { method: 'POST', body: JSON.stringify({ targetCgpa, notes }) }),

  // Smart Study Planner (Feature 4)
  getStudyPlans: (params: Record<string, string> = {}) => {
    const searchParams = new URLSearchParams(params);
    return request<any[]>(`/planner/plans?${searchParams.toString()}`);
  },
  createStudyPlan: (data: any) =>
    request<any>('/planner/plans', { method: 'POST', body: JSON.stringify(data) }),
  deleteStudyPlan: (id: string) =>
    request<{ success: boolean }>(`/planner/plans/${id}`, { method: 'DELETE' }),
  getStudySessions: (params: Record<string, string> = {}) => {
    const searchParams = new URLSearchParams(params);
    return request<any[]>(`/planner/sessions?${searchParams.toString()}`);
  },
  createStudySession: (data: any) =>
    request<any>('/planner/sessions', { method: 'POST', body: JSON.stringify(data) }),
  updateStudySession: (id: string, data: any) =>
    request<any>(`/planner/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteStudySession: (id: string) =>
    request<{ success: boolean }>(`/planner/sessions/${id}`, { method: 'DELETE' }),
  getPlannerStats: () => request<any>('/planner/stats'),

  // Knowledge Base (Feature 5)
  getNoteFolders: () => request<any[]>('/notes/folders'),
  createNoteFolder: (data: any) =>
    request<any>('/notes/folders', { method: 'POST', body: JSON.stringify(data) }),
  deleteNoteFolder: (id: string) =>
    request<{ success: boolean }>(`/notes/folders/${id}`, { method: 'DELETE' }),
  getNoteTemplates: () => request<any[]>('/notes/templates'),
  getOrphanNotes: () => request<any[]>('/notes/orphan-notes'),
  getNoteRevisions: (noteId: string) => request<any[]>(`/notes/${noteId}/revisions`),
  restoreNoteRevision: (noteId: string, revId: string) =>
    request<any>(`/notes/${noteId}/revisions/${revId}/restore`, { method: 'POST' }),

  // Global Search
  search: (query: string) => request<any>(`/search?q=${encodeURIComponent(query)}`),

  // Settings & Backup
  getSettings: () => request<any>('/settings'),
  updateSettings: (data: any) =>
    request<any>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getBackupRecords: () => request<any[]>('/backup/records'),
  createBackup: () => request<any>('/backup/create', { method: 'POST' }),
  restoreBackup: (id: string) =>
    request<any>(`/backup/restore/${id}`, { method: 'POST' }),
  uploadRestoreBackup: (formData: FormData) =>
    request<any>('/backup/restore-upload', { method: 'POST', body: formData }),
  getBackupIntegrity: () => request<any>('/backup/integrity'),
  cleanOrphanFiles: () => request<any>('/backup/clean-orphans', { method: 'POST' }),

  // --- 7 MASTER FEATURES EXTENSIONS ---
  // Feature 1: Calendar Exports & Conflict Detection
  getCalendarConflicts: () => request<{ conflicts: any[]; tightClusters: any[] }>('/calendar/conflicts'),
  rescheduleCalendarEvent: (id: string, startTime: string, endTime?: string) =>
    request<any>(`/calendar/${id}/reschedule`, { method: 'PATCH', body: JSON.stringify({ startTime, endTime }) }),

  // Feature 2: Task Recommendations & Projects
  getTaskRecommendations: () => request<any[]>('/assignments/recommendations'),
  duplicateAssignment: (id: string) =>
    request<any>(`/assignments/${id}/duplicate`, { method: 'POST' }),
  getProjects: (params: Record<string, string> = {}) => {
    const searchParams = new URLSearchParams(params);
    return request<any[]>(`/projects?${searchParams.toString()}`);
  },
  getProject: (id: string) => request<any>(`/projects/${id}`),
  createProject: (data: any) =>
    request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: any) =>
    request<any>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProject: (id: string) =>
    request<any>(`/projects/${id}`, { method: 'DELETE' }),
  createMilestone: (projectId: string, data: any) =>
    request<any>(`/projects/${projectId}/milestones`, { method: 'POST', body: JSON.stringify(data) }),
  updateMilestone: (projectId: string, milestoneId: string, data: any) =>
    request<any>(`/projects/${projectId}/milestones/${milestoneId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteMilestone: (projectId: string, milestoneId: string) =>
    request<any>(`/projects/${projectId}/milestones/${milestoneId}`, { method: 'DELETE' }),

  // Feature 3: Study Time Analytics & Goal
  getActiveStudySession: () => request<any>('/planner/sessions/active'),
  getStudyAnalytics: (params: Record<string, string> = {}) => {
    const searchParams = new URLSearchParams(params);
    return request<any>(`/planner/analytics?${searchParams.toString()}`);
  },
  getStudyGoal: () => request<any>('/planner/goal'),
  setStudyGoal: (targetMinutesPerWeek: number) =>
    request<any>('/planner/goal', { method: 'POST', body: JSON.stringify({ targetMinutesPerWeek }) }),

  // Feature 4: What-If Grade Scenarios
  getGradeScenarios: () => request<any[]>('/grades/scenarios'),
  createGradeScenario: (data: any) =>
    request<any>('/grades/scenarios', { method: 'POST', body: JSON.stringify(data) }),
  deleteGradeScenario: (id: string) =>
    request<any>(`/grades/scenarios/${id}`, { method: 'DELETE' }),

  // Feature 5: Document Version History
  getDocumentVersions: (documentId: string) =>
    request<{ versions: any[] }>(`/documents/${documentId}/versions`),
  restoreDocumentVersion: (documentId: string, versionId: string, changeDescription?: string) =>
    request<any>(`/documents/${documentId}/versions/${versionId}/restore`, {
      method: 'POST',
      body: JSON.stringify({ changeDescription }),
    }),

  // Feature 6: Notification Inbox
  getNotificationsList: (params: { unreadOnly?: boolean; type?: string; page?: number; limit?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.unreadOnly) searchParams.set('unreadOnly', 'true');
    if (params.type) searchParams.set('type', params.type);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    return request<{ notifications: any[]; total: number; unreadCount: number; page: number; limit: number }>(
      `/notifications?${searchParams.toString()}`
    );
  },
  markNotificationRead: (id: string) =>
    request<any>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    request<any>('/notifications/read-all', { method: 'POST' }),
  deleteNotification: (id: string) =>
    request<any>(`/notifications/${id}`, { method: 'DELETE' }),

  // Feature 7: Admin Usage Analytics & Audit
  getAdminFeatureAnalytics: () => request<any>('/admin/analytics/features'),
  getAdminEngagement: () => request<any>('/admin/analytics/engagement'),
  getAdminAuditLogs: (params: { page?: number; limit?: number; action?: string } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.action) searchParams.set('action', params.action);
    return request<{ auditLogs: any[]; total: number; page: number; limit: number }>(
      `/admin/audit?${searchParams.toString()}`
    );
  },

  // Smart Class Photo Journal (Board Photo Archive)
  getClassSessions: (params: {
    semesterId?: string;
    courseId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    quickFilter?: 'today' | 'week' | 'month' | 'all';
    search?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.semesterId) searchParams.set('semesterId', params.semesterId);
    if (params.courseId) searchParams.set('courseId', params.courseId);
    if (params.date) searchParams.set('date', params.date);
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);
    if (params.quickFilter) searchParams.set('quickFilter', params.quickFilter);
    if (params.search) searchParams.set('search', params.search);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    return request<ClassSession[]>(`/class-sessions?${searchParams.toString()}`);
  },

  getClassSessionDates: (semesterId?: string, courseId?: string) => {
    const searchParams = new URLSearchParams();
    if (semesterId) searchParams.set('semesterId', semesterId);
    if (courseId) searchParams.set('courseId', courseId);
    return request<ClassSessionDateBadge[]>(`/class-sessions/dates?${searchParams.toString()}`);
  },

  getClassSession: (id: string) =>
    request<ClassSession>(`/class-sessions/${id}`),

  createClassSession: (data: {
    semesterId: string;
    courseId: string;
    sessionDate: string;
    topic: string;
    teacherName?: string | null;
    roomNumber?: string | null;
    description?: string | null;
  }) =>
    request<ClassSession>('/class-sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateClassSession: (
    id: string,
    data: Partial<{
      sessionDate: string;
      topic: string;
      teacherName?: string | null;
      roomNumber?: string | null;
      description?: string | null;
      courseId?: string;
    }>
  ) =>
    request<ClassSession>(`/class-sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteClassSession: (id: string) =>
    request<{ success: boolean; message: string }>(`/class-sessions/${id}`, {
      method: 'DELETE',
    }),

  uploadSessionPhotos: (
    sessionId: string,
    formData: FormData,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ) =>
    uploadWithProgress<ClassPhoto[]>(
      `/class-sessions/${sessionId}/photos`,
      formData,
      onProgress,
      signal
    ),

  updateClassPhoto: (id: string, data: { caption?: string | null; sortOrder?: number }) =>
    request<ClassPhoto>(`/class-photos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteClassPhoto: (id: string) =>
    request<{ success: boolean; message: string }>(`/class-photos/${id}`, {
      method: 'DELETE',
    }),

  getClassPhotoFileUrl: (id: string, download = false) => {
    return `/api/class-photos/${id}/file${download ? '?download=1' : ''}`;
  },

  // University Curriculum & Degree Progress Planner
  getDegreeProgram: () => request<DegreeProgram>('/degree/program'),
  updateDegreeProgram: (data: Partial<DegreeProgram>) =>
    request<DegreeProgram>('/degree/program', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getCurriculum: () =>
    request<{ program: DegreeProgram; courses: CurriculumCourse[]; totalCourses: number; totalCredits: number }>('/degree/curriculum'),
  createCurriculumCourse: (data: any) =>
    request<CurriculumCourse>('/degree/curriculum', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCurriculumCourse: (id: string, data: any) =>
    request<CurriculumCourse>(`/degree/curriculum/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCurriculumCourse: (id: string) =>
    request<{ success: boolean; message: string }>(`/degree/curriculum/${id}`, {
      method: 'DELETE',
    }),
  importCurriculum: (data: { template?: string; csvText?: string; courses?: any[]; clearExisting?: boolean }) =>
    request<{ success: boolean; message: string; count: number; prerequisitesCount: number }>('/degree/curriculum/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  clearCurriculum: () =>
    request<{ success: boolean; message: string }>('/degree/curriculum/clear', {
      method: 'DELETE',
    }),
  getDegreeProgress: () => request<DegreeProgressData>('/degree/progress'),
  getNextSemesterPlanner: () => request<NextSemesterPlannerData>('/degree/planner/next-semester'),
  addPlannedCourse: (curriculumCourseId: string, targetSemesterName?: string, notes?: string) =>
    request<any>('/degree/planner/courses', {
      method: 'POST',
      body: JSON.stringify({ curriculumCourseId, targetSemesterName, notes }),
    }),
  removePlannedCourse: (id: string) =>
    request<{ success: boolean; message: string }>(`/degree/planner/courses/${id}`, {
      method: 'DELETE',
    }),
  savePlannedScheduleBatch: (targetSemesterName: string, courseIds: string[]) =>
    request<{ success: boolean; message: string; count: number }>('/degree/planner/batch', {
      method: 'POST',
      body: JSON.stringify({ targetSemesterName, courseIds }),
    }),
};


