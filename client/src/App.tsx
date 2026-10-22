import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { useAuth } from './context/AuthContext';

// Lazy-loaded routes for code splitting and optimal bundle performance
const DashboardPage = React.lazy(() =>
  import('./pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const SemestersPage = React.lazy(() =>
  import('./pages/semesters/SemestersPage').then((m) => ({ default: m.SemestersPage }))
);
const SemesterDetailPage = React.lazy(() =>
  import('./pages/semesters/SemesterDetailPage').then((m) => ({ default: m.SemesterDetailPage }))
);
const CoursesPage = React.lazy(() =>
  import('./pages/courses/CoursesPage').then((m) => ({ default: m.CoursesPage }))
);
const CourseDetailPage = React.lazy(() =>
  import('./pages/courses/CourseDetailPage').then((m) => ({ default: m.CourseDetailPage }))
);
const DocumentsPage = React.lazy(() =>
  import('./pages/documents/DocumentsPage').then((m) => ({ default: m.DocumentsPage }))
);
const DocumentViewPage = React.lazy(() =>
  import('./pages/documents/DocumentViewPage').then((m) => ({ default: m.DocumentViewPage }))
);
const NotesPage = React.lazy(() =>
  import('./pages/notes/NotesPage').then((m) => ({ default: m.NotesPage }))
);
const CalendarPage = React.lazy(() =>
  import('./pages/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage }))
);
const AssignmentsPage = React.lazy(() =>
  import('./pages/assignments/AssignmentsPage').then((m) => ({ default: m.AssignmentsPage }))
);
const ExamsPage = React.lazy(() =>
  import('./pages/exams/ExamsPage').then((m) => ({ default: m.ExamsPage }))
);
const SettingsPage = React.lazy(() =>
  import('./pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const PublicShareViewer = React.lazy(() =>
  import('./pages/share/PublicShareViewer').then((m) => ({ default: m.PublicShareViewer }))
);
const GradesPage = React.lazy(() =>
  import('./pages/grades/GradesPage').then((m) => ({ default: m.GradesPage }))
);
const PlannerPage = React.lazy(() =>
  import('./pages/planner/PlannerPage').then((m) => ({ default: m.PlannerPage }))
);
const NotificationCenterPage = React.lazy(() =>
  import('./pages/notifications/NotificationCenterPage').then((m) => ({
    default: m.NotificationCenterPage,
  }))
);
const BackupPage = React.lazy(() =>
  import('./pages/backup/BackupPage').then((m) => ({ default: m.BackupPage }))
);
const LoginPage = React.lazy(() =>
  import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const AdminDashboardPage = React.lazy(() =>
  import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const ClassPhotoJournalPage = React.lazy(() =>
  import('./pages/journal/ClassPhotoJournalPage').then((m) => ({ default: m.ClassPhotoJournalPage }))
);
const DegreePlannerPage = React.lazy(() =>
  import('./pages/degree/DegreePlannerPage').then((m) => ({ default: m.DegreePlannerPage }))
);
const LandingPage = React.lazy(() =>
  import('./pages/landing/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const NotFoundPage = React.lazy(() =>
  import('./pages/common/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

const PageSkeleton: React.FC = () => (
  <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
    <div className="flex items-center justify-between pb-4 border-b border-[#e5e3df] dark:border-[#1e293b]">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-[#f0eeec] dark:bg-slate-800 rounded-[8px]" />
        <div className="h-4 w-72 bg-[#f0eeec] dark:bg-slate-800 rounded-[6px]" />
      </div>
      <div className="h-9 w-28 bg-[#f0eeec] dark:bg-slate-800 rounded-[8px]" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="h-40 card-notion bg-[#f0eeec] dark:bg-slate-800" />
      <div className="h-40 card-notion bg-[#f0eeec] dark:bg-slate-800" />
      <div className="h-40 card-notion bg-[#f0eeec] dark:bg-slate-800" />
    </div>
    <div className="h-72 card-notion bg-[#f0eeec] dark:bg-slate-800" />
  </div>
);

/**
 * AuthGuard ensures unauthenticated users cannot access /dashboard or any
 * workspace sub-routes. If not logged in, redirects them to /login with return intent.
 */
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[#ffffff] dark:bg-[#0f0f11]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 rounded-full border-2 border-[#0f6b57] border-t-transparent" />
          <span className="text-xs font-medium text-[#787671] dark:text-[#a4a097]">
            Loading your academic workspace...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};



const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-[#0f6b57] border-t-transparent" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ error: 'admin_required', from: location }} />;
  }
  // Signed-in non-admins would bounce /admin -> /login -> /admin forever; send them home instead.
  if (user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        {/* Root Route: ALWAYS shows Landing Page. Logged-in users see a "Go to Dashboard" bar inside. */}
        <Route path="/" element={<LandingPage />} />

        {/* /landing alias — same landing page */}
        <Route path="/landing" element={<LandingPage />} />


        {/* Public Shared Resource Viewer (Independent Layout) */}
        <Route path="/share/:token" element={<PublicShareViewer />} />

        {/* Authentication Login Page (Independent Clean Layout) */}
        <Route path="/login" element={<LoginPage />} />

        {/* Dedicated Focused PDF Workspace (Protected by AuthGuard) */}
        <Route
          path="/documents/:id/view"
          element={
            <AuthGuard>
              <div className="h-dvh w-full overflow-hidden">
                <DocumentViewPage />
              </div>
            </AuthGuard>
          }
        />

        {/* Main Academic Workspace Layout (Strictly Protected by AuthGuard) */}
        <Route
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Semester Workspace Routes */}
          <Route path="/semesters" element={<SemestersPage />} />
          <Route path="/semesters/:id" element={<SemesterDetailPage />} />
          <Route path="/semesters/:id/overview" element={<SemesterDetailPage />} />
          <Route path="/semesters/:id/courses" element={<CoursesPage />} />
          <Route path="/semesters/:id/courses/:courseId" element={<CourseDetailPage />} />
          <Route path="/semesters/:id/assignments" element={<AssignmentsPage />} />
          <Route path="/semesters/:id/assignments/:assignmentId" element={<AssignmentsPage />} />
          <Route path="/semesters/:id/exams" element={<ExamsPage />} />
          <Route path="/semesters/:id/exams/:examId" element={<ExamsPage />} />
          <Route path="/semesters/:id/grades" element={<GradesPage />} />
          <Route path="/semesters/:id/calendar" element={<CalendarPage />} />
          <Route path="/semesters/:id/planner" element={<PlannerPage />} />
          <Route path="/semesters/:id/study-planner" element={<PlannerPage />} />
          <Route path="/semesters/:id/journal" element={<ClassPhotoJournalPage />} />
          <Route path="/semesters/:id/class-photos" element={<ClassPhotoJournalPage />} />
          <Route path="/semesters/:id/class-photos/:sessionId" element={<ClassPhotoJournalPage />} />
          <Route path="/semesters/:id/degree-planner" element={<DegreePlannerPage />} />
          <Route path="/semesters/:id/degree-progress" element={<DegreePlannerPage />} />
          <Route path="/semesters/:id/documents" element={<DocumentsPage />} />
          <Route path="/semesters/:id/documents/:documentId" element={<DocumentViewPage />} />
          <Route path="/semesters/:id/notes" element={<NotesPage />} />
          <Route path="/semesters/:id/notes/:noteId" element={<NotesPage />} />

          {/* Global / Direct Academic Module Routes */}
          <Route path="/degree-planner" element={<DegreePlannerPage />} />
          <Route path="/degree-progress" element={<DegreePlannerPage />} />
          <Route path="/journal" element={<ClassPhotoJournalPage />} />
          <Route path="/class-photos" element={<ClassPhotoJournalPage />} />
          <Route path="/class-photos/:sessionId" element={<ClassPhotoJournalPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:id" element={<CourseDetailPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/:id" element={<DocumentViewPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/:id" element={<NotesPage />} />
          <Route path="/grades" element={<GradesPage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/study-planner" element={<PlannerPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/assignments" element={<AssignmentsPage />} />
          <Route path="/assignments/:id" element={<AssignmentsPage />} />
          <Route path="/exams" element={<ExamsPage />} />
          <Route path="/exams/:id" element={<ExamsPage />} />
          <Route path="/notifications" element={<NotificationCenterPage />} />
          <Route path="/backup" element={<BackupPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Protected Admin Dashboard Route */}
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminDashboardPage />
              </AdminGuard>
            }
          />

          {/* 404 Catch-All within App Layout */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default App;
