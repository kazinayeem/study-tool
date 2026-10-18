import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { SemestersPage } from './pages/semesters/SemestersPage';
import { SemesterDetailPage } from './pages/semesters/SemesterDetailPage';
import { CoursesPage } from './pages/courses/CoursesPage';
import { CourseDetailPage } from './pages/courses/CourseDetailPage';
import { DocumentsPage } from './pages/documents/DocumentsPage';
import { DocumentViewPage } from './pages/documents/DocumentViewPage';
import { NotesPage } from './pages/notes/NotesPage';
import { CalendarPage } from './pages/calendar/CalendarPage';
import { AssignmentsPage } from './pages/assignments/AssignmentsPage';
import { ExamsPage } from './pages/exams/ExamsPage';
import { SettingsPage } from './pages/settings/SettingsPage';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Dedicated Focused PDF Workspace (Independent Layout) */}
      <Route path="/documents/:id/view" element={<DocumentViewPage />} />

      {/* Main Standard Academic Workspace Layout */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/semesters" element={<SemestersPage />} />
        <Route path="/semesters/:id" element={<SemesterDetailPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:id" element={<CourseDetailPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/assignments" element={<AssignmentsPage />} />
        <Route path="/exams" element={<ExamsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
