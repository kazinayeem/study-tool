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

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      data?.message || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }

  return data.data !== undefined ? data.data : data;
}

export const api = {
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
  uploadDocument: (formData: FormData) =>
    request<any>('/documents/upload', { method: 'POST', body: formData }),
  updateDocument: (id: string, data: any) =>
    request<any>(`/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  replaceDocument: (id: string, formData: FormData) =>
    request<any>(`/documents/${id}/replace`, { method: 'POST', body: formData }),
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

  // Global Search
  search: (query: string) => request<any>(`/search?q=${encodeURIComponent(query)}`),

  // Settings & Backup
  getSettings: () => request<any>('/settings'),
  updateSettings: (data: any) =>
    request<any>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getBackupIntegrity: () => request<any>('/backup/integrity'),
  cleanOrphanFiles: () => request<any>('/backup/clean-orphans', { method: 'POST' }),
};
