import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  GraduationCap,
  FolderOpen,
  FileText,
  AlertTriangle,
  Clock,
  ArrowRight,
  Plus,
  CheckCircle2,
  Calendar as CalendarIcon,
  BookOpen,
  FileCode,
  Layers,
  ChevronRight,
  CheckSquare,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate, formatRelativeDeadline, formatBytes } from '../../lib/utils';
import { DashboardData } from '../../types';

export const DashboardPage: React.FC = () => {
  const { data: dashboard, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard(),
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="p-8 text-center text-rose-500">
        Failed to load academic dashboard. Please ensure the backend server is running.
      </div>
    );
  }

  const {
    activeSemester,
    stats,
    upcomingExams = [],
    upcomingAssignments = [],
    overdueAssignments = [],
    recentDocuments = [],
    recentNotes = [],
    todayEvents = [],
  } = dashboard;

  // Empty state if brand new user without any semesters
  if (stats.totalSemesters === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[70vh]">
        <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
          <BookOpen className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Welcome to ScholarFlow</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-2 mb-6">
          Your personal academic workspace for university semesters, lecture slides, question papers, and rich notes.
        </p>
        <Link
          to="/semesters"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create First Semester
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Welcome & Active Semester */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Academic Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {activeSemester
              ? `Current Term: ${activeSemester.name} • ${formatDate(activeSemester.startDate, 'MMM yyyy')} - ${formatDate(activeSemester.endDate, 'MMM yyyy')}`
              : 'No active semester selected'}
          </p>
        </div>

        {/* Quick Access Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/documents"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FolderOpen className="h-3.5 w-3.5 text-indigo-500" />
            Upload PDF
          </Link>
          <Link
            to="/notes"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FileText className="h-3.5 w-3.5 text-emerald-500" />
            New Note
          </Link>
          <Link
            to="/assignments"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <CheckSquare className="h-3.5 w-3.5 text-amber-500" />
            Track Task
          </Link>
          <Link
            to="/calendar"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <CalendarIcon className="h-3.5 w-3.5 text-sky-500" />
            Calendar
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Semester Courses */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Courses Enrolled</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {activeSemester?.courses?.length || stats.totalCourses}
            </span>
            <span className="text-xs text-slate-400">active courses</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Overall Progress</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{stats.avgProgress}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${stats.avgProgress}%` }}
            />
          </div>
        </div>

        {/* Academic Documents */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Academic Archive</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <FolderOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.totalDocuments}
            </span>
            <span className="text-xs text-slate-400">documents & slides</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Indexed locally with PDF annotation support
          </p>
        </div>

        {/* Upcoming Deadlines */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Assignments</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {upcomingAssignments.length}
            </span>
            <span className="text-xs text-slate-400">pending tasks</span>
          </div>
          <div className="mt-2 text-xs flex items-center justify-between text-slate-500">
            <span>Completed</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {stats.completedAssignmentsCount} / {stats.totalAssignmentsCount}
            </span>
          </div>
        </div>

        {/* Overdue / Alerts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Overdue Alerts</span>
            <div className={`p-2 rounded-xl ${stats.overdueCount > 0 ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'}`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${stats.overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
              {stats.overdueCount}
            </span>
            <span className="text-xs text-slate-400">action required</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {stats.overdueCount > 0 ? 'Urgent attention recommended' : 'Everything is on schedule'}
          </p>
        </div>
      </div>

      {/* Main Grid: Left (Exams & Assignments) | Right (Recent Documents, Notes & Today's Schedule) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Examinations */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-rose-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Upcoming Examinations</h3>
              </div>
              <Link to="/exams" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {upcomingExams.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No upcoming exams scheduled in this semester.</p>
            ) : (
              <div className="space-y-3">
                {upcomingExams.map((exam: any) => (
                  <div
                    key={exam.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-xs"
                        style={{ backgroundColor: exam.course?.color || '#ef4444' }}
                      >
                        {exam.course?.code?.slice(0, 3) || 'EXM'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{exam.title}</h4>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 uppercase">
                            {exam.examType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {exam.course?.title} {exam.room ? `• ${exam.room}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-700">
                      <div className="text-left sm:text-right">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {formatDate(exam.examDate, 'EEE, MMM d, yyyy')}
                        </p>
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                          {exam.daysRemaining === 0 ? 'Today!' : exam.daysRemaining > 0 ? `In ${exam.daysRemaining} days` : 'Past'}
                        </p>
                      </div>
                      <div className="w-16">
                        <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                          <span>Prep</span>
                          <span>{exam.prepPercentage}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${exam.prepPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Assignments & Tasks */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Upcoming Assignments & Milestones</h3>
              </div>
              <Link to="/assignments" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {upcomingAssignments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No pending assignments. You are all caught up!</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {upcomingAssignments.map((a: any) => (
                  <div key={a.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 truncate">
                      <div className="mt-0.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${a.isOverdue ? 'bg-rose-500' : 'bg-amber-500'}`} />
                      </div>
                      <div className="truncate">
                        <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate hover:text-indigo-600 cursor-pointer">
                          {a.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {a.course?.code} - {a.course?.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div>
                        <span className={`text-[11px] font-semibold ${a.isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}>
                          {formatRelativeDeadline(a.deadline)}
                        </span>
                        <p className="text-[10px] text-slate-400">{formatDate(a.deadline, 'MMM d, h:mm a')}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 uppercase">
                        {a.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Today's Schedule & Recent Documents */}
        <div className="space-y-6">
          {/* Today's Schedule */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Today's Schedule</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {formatDate(new Date(), 'EEEE, MMM d')}
              </span>
            </div>

            {todayEvents.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                <p>No lectures or sessions on today's agenda.</p>
                <Link to="/calendar" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline mt-2 inline-block">
                  + Add schedule item
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayEvents.map((event: any) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white truncate">
                        {event.title}
                      </span>
                      <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 shrink-0">
                        {formatDate(event.startDate, 'h:mm a')}
                      </span>
                    </div>
                    {event.location && (
                      <p className="text-[11px] text-slate-400 mt-1">📍 {event.location}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recently Opened Documents */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Recently Opened Documents</h3>
              </div>
              <Link to="/documents" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                View all
              </Link>
            </div>

            {recentDocuments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No documents opened yet.</p>
            ) : (
              <div className="space-y-2.5">
                {recentDocuments.slice(0, 4).map((doc: any) => (
                  <Link
                    key={doc.id}
                    to={`/documents/${doc.id}/view`}
                    className="group flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-800/50 transition-all"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="h-8 w-8 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 flex items-center justify-center shrink-0 font-bold text-[10px]">
                        PDF
                      </div>
                      <div className="truncate">
                        <h4 className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 truncate">
                          {doc.title}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {doc.category} • {formatBytes(doc.fileSize)}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recently Edited Notes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Recent Study Notes</h3>
              </div>
              <Link to="/notes" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                View all
              </Link>
            </div>

            {recentNotes.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No notes created yet.</p>
            ) : (
              <div className="space-y-2">
                {recentNotes.slice(0, 3).map((note: any) => (
                  <Link
                    key={note.id}
                    to={`/notes?id=${note.id}`}
                    className="block p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                  >
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {note.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Updated {formatDate(note.updatedAt, 'MMM d, h:mm a')} {note.course ? `• ${note.course.code}` : ''}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
