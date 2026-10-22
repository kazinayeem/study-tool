import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
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
  RefreshCw,
  Flame,
  Target,
  ChevronRight,
  CheckSquare,
  Award,
  Camera,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate, formatRelativeDeadline, formatBytes } from '../../lib/utils';
import { DashboardData } from '../../types';
import { useActiveSemester } from '../../hooks/useActiveSemester';

type StatTone = 'green' | 'red' | 'amber';
const STAT_TONES: Record<StatTone, string> = {
  green: 'bg-[#dcf0e8] text-[#0f6b57] dark:bg-[#0d3b30] dark:text-[#4ccba5]',
  red: 'bg-[#fde0ec] text-[#e03131] dark:bg-[#3a1620] dark:text-[#ff8787]',
  amber: 'bg-[#fff0c2] text-[#8a5a00] dark:bg-[#3a2c08] dark:text-[#ffd84d]',
};

const StatCard: React.FC<{
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: StatTone;
  value: React.ReactNode;
  unit?: string;
  hint: string;
  hintTone?: 'red';
}> = ({ to, label, icon: Icon, tone, value, unit, hint, hintTone }) => (
  <Link
    to={to}
    className="group flex min-h-[104px] flex-col justify-between rounded-[12px] border border-[#e5e3df] bg-white p-4 transition-colors hover:border-[#0f6b57] dark:border-[#2a2a2e] dark:bg-[#141416] dark:hover:border-[#4ccba5]"
  >
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs font-medium leading-tight text-[#5d5b54] dark:text-[#a4a097]">{label}</span>
      <span className={`shrink-0 rounded-[6px] p-1.5 ${STAT_TONES[tone]}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
    </div>
    <div>
      <div className="flex items-baseline gap-1.5 font-[family-name:var(--font-display)] text-[28px] font-bold leading-none tabular-nums text-[#14201c] dark:text-white">
        {value}
        {unit && <span className="font-[family-name:var(--font-sans)] text-xs font-normal text-[#787671]">{unit}</span>}
      </div>
      <span className={`mt-1.5 block truncate text-[11px] ${hintTone === 'red' ? 'font-medium text-[#e03131]' : 'text-[#787671] dark:text-[#a4a097]'}`}>
        {hint}
      </span>
    </div>
  </Link>
);

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeSemester,
    activeSemesterId,
    semesters,
    selectSemester,
    isLoading: isSemesterLoading,
  } = useActiveSemester();

  // Filter for upcoming activities: 'all' | 'assignments' | 'exams' | 'study'
  const [activityFilter, setActivityFilter] = useState<'all' | 'assignments' | 'exams' | 'study'>('all');

  // Fetch dashboard data parameterized by active semester
  const {
    data: dashboard,
    isLoading: isDashboardLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery<DashboardData>({
    queryKey: ['dashboard', activeSemesterId],
    queryFn: () =>
      api.getDashboardWithParams({
        ...(activeSemesterId ? { semesterId: activeSemesterId } : {}),
      }),
    enabled: !isSemesterLoading,
  });

  const { data: degreeProgress } = useQuery({
    queryKey: ['degreeProgress'],
    queryFn: () => api.getDegreeProgress(),
    staleTime: 60000,
  });

  const { data: plannerInfo } = useQuery({
    queryKey: ['nextSemesterPlanner'],
    queryFn: () => api.getNextSemesterPlanner(),
    staleTime: 60000,
  });

  const isLoading = isSemesterLoading || isDashboardLoading;

  // Semester Progress Calculation
  const semesterProgress = useMemo(() => {
    const sem = activeSemester || dashboard?.activeSemester;
    if (!sem?.startDate || !sem?.endDate) return null;
    const start = new Date(sem.startDate).getTime();
    const end = new Date(sem.endDate).getTime();
    const now = Date.now();
    if (isNaN(start) || isNaN(end) || end <= start) return null;

    const percentage = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
    return {
      percentage,
      startDate: sem.startDate,
      endDate: sem.endDate,
    };
  }, [activeSemester, dashboard?.activeSemester]);

  // Combined and sorted upcoming items
  const upcomingItems = useMemo(() => {
    if (!dashboard) return [];
    const items: Array<{
      id: string;
      title: string;
      courseCode?: string;
      courseColor?: string;
      date: string | Date;
      type: 'ASSIGNMENT' | 'EXAM' | 'STUDY_SESSION' | 'CALENDAR_EVENT';
      status?: string;
      isOverdue?: boolean;
      daysRemaining?: number;
      link: string;
    }> = [];

    // Assignments
    dashboard.upcomingAssignments?.forEach((a) => {
      items.push({
        id: a.id,
        title: a.title,
        courseCode: a.course?.code,
        courseColor: a.course?.color,
        date: a.deadline,
        type: 'ASSIGNMENT',
        status: a.isOverdue ? 'Overdue' : a.status,
        isOverdue: a.isOverdue,
        daysRemaining: a.daysRemaining,
        link: activeSemesterId ? `/semesters/${activeSemesterId}/assignments` : '/assignments',
      });
    });

    // Exams
    dashboard.upcomingExams?.forEach((e) => {
      items.push({
        id: e.id,
        title: `${e.examType ? `[${e.examType}] ` : ''}${e.title}`,
        courseCode: e.course?.code,
        courseColor: e.course?.color,
        date: e.examDate,
        type: 'EXAM',
        status: e.daysRemaining === 0 ? 'Today' : e.daysRemaining && e.daysRemaining < 0 ? 'Concluded' : `In ${e.daysRemaining} days`,
        isOverdue: false,
        daysRemaining: e.daysRemaining,
        link: activeSemesterId ? `/semesters/${activeSemesterId}/exams` : '/exams',
      });
    });

    // Study Sessions
    dashboard.studySessions?.forEach((s) => {
      items.push({
        id: s.id,
        title: `Study: ${s.title}`,
        courseCode: s.course?.code,
        courseColor: s.course?.color,
        date: s.scheduledDate,
        type: 'STUDY_SESSION',
        status: s.isCompleted || s.status === 'COMPLETED' ? 'Completed' : 'Planned',
        isOverdue: false,
        link: activeSemesterId ? `/semesters/${activeSemesterId}/planner` : '/planner',
      });
    });

    // Calendar Events
    dashboard.calendarEvents?.forEach((ev) => {
      items.push({
        id: ev.id,
        title: ev.title,
        courseCode: ev.course?.code,
        courseColor: ev.course?.color,
        date: ev.startDate,
        type: 'CALENDAR_EVENT',
        status: ev.category || 'Event',
        isOverdue: false,
        link: activeSemesterId ? `/semesters/${activeSemesterId}/calendar` : '/calendar',
      });
    });

    // Sort: overdue first, then chronological ascending
    return items.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [dashboard, activeSemesterId]);

  // Filtered upcoming items
  const filteredUpcoming = useMemo(() => {
    if (activityFilter === 'assignments') {
      return upcomingItems.filter((i) => i.type === 'ASSIGNMENT');
    }
    if (activityFilter === 'exams') {
      return upcomingItems.filter((i) => i.type === 'EXAM');
    }
    if (activityFilter === 'study') {
      return upcomingItems.filter((i) => i.type === 'STUDY_SESSION');
    }
    return upcomingItems;
  }, [upcomingItems, activityFilter]);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e5e3df] pb-5 dark:border-[#2a2a2e]">
          <div className="space-y-2">
            <div className="h-7 w-64 bg-[#f0eeec] dark:bg-[#202024] rounded-[8px] animate-pulse" />
            <div className="h-4 w-44 bg-[#f0eeec] dark:bg-[#202024] rounded-[6px] animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-40 bg-[#f0eeec] dark:bg-[#202024] rounded-[8px] animate-pulse" />
            <div className="h-9 w-24 bg-[#f0eeec] dark:bg-[#202024] rounded-full animate-pulse" />
          </div>
        </div>
        {/* Metric cards skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 rounded-[12px] bg-[#f0eeec] dark:bg-[#202024] border border-[#e5e3df] dark:border-[#2a2a2e] animate-pulse" />
          ))}
        </div>
        {/* Content grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 rounded-[12px] bg-[#f0eeec] dark:bg-[#202024] border border-[#e5e3df] dark:border-[#2a2a2e] animate-pulse" />
          <div className="h-96 rounded-[12px] bg-[#f0eeec] dark:bg-[#202024] border border-[#e5e3df] dark:border-[#2a2a2e] animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto">
        <div className="h-12 w-12 rounded-[8px] bg-[#fde0ec] text-[#e03131] flex items-center justify-center mx-auto mb-3 border border-[#d9480f]/30">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-[#1a1a1a] dark:text-white">Unable to load dashboard</h3>
        <p className="text-xs text-[#787671] mt-1 mb-4">Please verify that the backend API server is responsive.</p>
        <button
          onClick={() => refetch()}
          className="btn-notion-primary text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const {
    activeSemester: currentActiveSemester,
    activeCourses = [],
    stats = {
      totalSemesters: 0,
      totalCourses: 0,
      totalDocuments: 0,
      totalNotes: 0,
      overdueCount: 0,
      avgProgress: 0,
      completedAssignmentsCount: 0,
      totalAssignmentsCount: 0,
    },
    todayFocus = {
      tasksDueToday: [],
      todaySessions: [],
      todayPhotos: [],
      examsUpcoming: [],
    },
    recentActivity = [],
  } = dashboard;

  const resolvedSemester = activeSemester || currentActiveSemester;

  // Empty state if user has no semesters registered
  if (semesters.length === 0 && stats.totalSemesters === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[70vh]">
        <div className="h-16 w-16 rounded-[12px] bg-[#dcf0e8] text-[#0f6b57] flex items-center justify-center mb-4 shadow-2xs border border-[#a8dcc9]">
          <BookOpen className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold text-[#1a1a1a] dark:text-white">Welcome to ScholarFlow</h2>
        <p className="text-sm text-[#787671] dark:text-[#a4a097] max-w-md mt-2 mb-6">
          Your semester-centric academic workspace. Create your first semester to organize your courses, board photos, notes, and study plans.
        </p>
        <Link
          to="/semesters"
          className="btn-notion-primary text-sm shadow-2xs"
        >
          <Plus className="h-4 w-4" />
          Create First Semester
        </Link>
      </div>
    );
  }

  // Formatted date string (e.g., Monday, October 19, 2026)
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const semId = resolvedSemester?.id || '';

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* TOP HEADER: Welcome, Current Date, Active Semester & Semester Progress   */}
      {/* ========================================================================= */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 border-b border-[#e5e3df] pb-6 dark:border-[#2a2a2e]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#787671] dark:text-[#a4a097] mb-1">
            <CalendarIcon className="h-3.5 w-3.5 text-[#0f6b57]" />
            <span>{todayFormatted}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#14201c] dark:text-white flex flex-wrap items-center gap-x-3 gap-y-1.5">
            Academic Overview
            {resolvedSemester && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#dcf0e8] text-[#0d3b30] dark:bg-[#0d3b30]/50 dark:text-[#a8dcc9] border border-[#a8dcc9]/50">
                <span className="h-2 w-2 rounded-full bg-[#1aae39] animate-pulse" />
                {resolvedSemester.name} {resolvedSemester.code ? `• ${resolvedSemester.code}` : ''}
              </span>
            )}
          </h1>
          <p className="text-xs text-[#787671] dark:text-[#a4a097] mt-1">
            {resolvedSemester?.academicGoals || resolvedSemester?.description || 'Your active academic workspace telemetry & upcoming priorities.'}
          </p>

          {/* Semester Progress Bar (when dates are configured) */}
          {semesterProgress && (
            <div className="mt-3 max-w-md">
              <div className="flex items-center justify-between text-[11px] font-medium text-[#787671] dark:text-[#a4a097] mb-1">
                <span>Term Progress ({semesterProgress.percentage}%)</span>
                <span>
                  {formatDate(semesterProgress.startDate, 'MMM d')} – {formatDate(semesterProgress.endDate, 'MMM d, yyyy')}
                </span>
              </div>
              <div className="w-full bg-[#ede9e4] dark:bg-[#252528] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0f6b57] rounded-full transition-all duration-700"
                  style={{ width: `${semesterProgress.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Header Right: Semester Selector & Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Semester Switcher Dropdown */}
          <select
            value={activeSemesterId || ''}
            onChange={(e) => {
              if (e.target.value) {
                selectSemester(e.target.value);
              }
            }}
            aria-label="Select Active Semester"
            className="rounded-[8px] border border-[#c8c4be] bg-white px-3 h-10 sm:h-[34px] text-sm sm:text-xs font-medium text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white cursor-pointer focus:outline-none focus:border-2 focus:border-[#0f6b57]"
          >
            {semesters.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.code ? `(${s.code})` : ''} {s.status === 'ACTIVE' ? '★ Active' : ''}
              </option>
            ))}
          </select>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              to={semId ? `/semesters/${semId}/assignments` : '/assignments'}
              className="btn-notion-primary text-xs h-10 sm:h-[34px] px-3 gap-1 shadow-2xs"
              title="Add Assignment"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Assignment</span>
            </Link>

            <Link
              to={semId ? `/semesters/${semId}/exams` : '/exams'}
              className="btn-notion-secondary text-xs h-10 sm:h-[34px] px-2.5 gap-1"
              title="Add Exam"
            >
              <Plus className="h-3 w-3 text-[#0f6b57]" />
              <span>Exam</span>
            </Link>

            <Link
              to={semId ? `/semesters/${semId}/documents` : '/documents'}
              className="btn-notion-secondary text-xs h-10 sm:h-[34px] px-2.5 gap-1"
              title="Upload Document"
            >
              <Plus className="h-3 w-3 text-[#0f6b57]" />
              <span>Document</span>
            </Link>

            <Link
              to={semId ? `/semesters/${semId}/journal` : '/journal'}
              className="btn-notion-secondary text-xs h-10 sm:h-[34px] px-2.5 gap-1"
              title="Capture Board Photo"
            >
              <Camera className="h-3.5 w-3.5 text-[#0f6b57]" />
              <span>Photo</span>
            </Link>

            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              aria-label="Refresh Dashboard"
              className="btn-notion-secondary text-xs h-10 sm:h-[34px] px-2"
              title="Refresh statistics"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin text-[#0f6b57]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION B: Active Semester Summary (Meaningful Real Statistics)          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3">
        <StatCard
          to={semId ? `/semesters/${semId}/courses` : '/courses'}
          label="Courses"
          icon={GraduationCap}
          tone="green"
          value={activeCourses.length || stats.totalCourses || 0}
          hint={resolvedSemester?.name || 'Active term'}
        />
        <StatCard
          to={semId ? `/semesters/${semId}/assignments` : '/assignments'}
          label="Assignments left"
          icon={CheckSquare}
          tone={stats.overdueCount > 0 ? 'red' : 'green'}
          value={stats.pendingAssignmentsCount ?? (stats.totalAssignmentsCount - stats.completedAssignmentsCount)}
          unit={`of ${stats.totalAssignmentsCount || 0}`}
          hint={stats.overdueCount > 0 ? `${stats.overdueCount} overdue` : 'Nothing overdue'}
          hintTone={stats.overdueCount > 0 ? 'red' : undefined}
        />
        <StatCard
          to={semId ? `/semesters/${semId}/exams` : '/exams'}
          label="Upcoming exams"
          icon={Award}
          tone="green"
          value={stats.upcomingExamsCount ?? dashboard.upcomingExams?.length ?? 0}
          hint={`${todayFocus.examsUpcoming?.length || 0} within 14 days`}
        />
        <StatCard
          to={semId ? `/semesters/${semId}/planner` : '/planner'}
          label="Study sessions"
          icon={Clock}
          tone="amber"
          value={stats.completedSessionsCount || 0}
          unit={`of ${stats.totalSessionsCount || stats.completedSessionsCount || 0}`}
          hint={`${Math.round((stats.weeklyStudyMinutes || 0) / 60)} hrs this week`}
        />
        <StatCard
          to={semId ? `/semesters/${semId}/grades` : '/grades'}
          label="Semester GPA"
          icon={CheckCircle2}
          tone="green"
          value={
            stats.semesterGpa !== null && stats.semesterGpa !== undefined
              ? stats.semesterGpa.toFixed(2)
              : `${stats.avgProgress || 0}%`
          }
          hint={stats.semesterGpa !== null && stats.semesterGpa !== undefined ? 'Calculated GPA' : 'Average mastery'}
        />
        <StatCard
          to={semId ? `/semesters/${semId}/documents` : '/documents'}
          label="Documents"
          icon={FolderOpen}
          tone="green"
          value={stats.totalDocuments || 0}
          unit="files"
          hint={`${stats.classPhotoCount || 0} board photos`}
        />
      </div>

      {/* ========================================================================= */}
      {/* SECTION B2: Degree Progress & Graduation Trajectory (Actionable Summary)  */}
      {/* ========================================================================= */}
      {degreeProgress && (
        <div className="rounded-[12px] border border-[#e5e3df] bg-[#fbfbfa] dark:border-[#2a2a2e] dark:bg-[#141416] p-4 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-[10px] bg-[#0f6b57] text-white shrink-0">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#14201c] dark:text-white">
                    Degree Progress: {degreeProgress.program.programName}
                  </h3>
                  <span className="text-[10px] px-2 py-0.2 rounded-[4px] bg-[#dcf0e8] text-[#0f6b57] dark:bg-[#0a2a22] dark:text-[#4ccba5] font-bold">
                    {degreeProgress.credits.completionPercentage}% Complete
                  </span>
                </div>
                <p className="text-[11px] text-[#787671] dark:text-[#a4a097] mt-0.5">
                  <strong>{degreeProgress.credits.completed}</strong> credits completed • <strong>{degreeProgress.credits.inProgress}</strong> in-progress • <strong>{degreeProgress.credits.remaining}</strong> remaining of <strong>{degreeProgress.credits.totalRequired}</strong> total
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-[#787671] block">Est. Timeline</span>
                  <span className="font-bold text-[#1aae39] text-xs">
                    {degreeProgress.graduationEstimates.estimatedRemainingSemesters} Terms Remaining
                  </span>
                </div>
                {plannerInfo && plannerInfo.plannedCourses.length > 0 && (
                  <div className="text-right border-l border-[#e5e3df] dark:border-[#2a2a2e] pl-3">
                    <span className="text-[10px] text-[#787671] block">Next Term Plan</span>
                    <span className="font-bold text-[#0f6b57] text-xs">
                      {plannerInfo.totalSelectedCredits} cr ({plannerInfo.plannedCourses.length} courses)
                    </span>
                  </div>
                )}
                {plannerInfo && plannerInfo.retakesRequired.length > 0 && (
                  <div className="text-right border-l border-[#e5e3df] dark:border-[#2a2a2e] pl-3">
                    <span className="text-[10px] text-[#e03131] block">Retake Alert</span>
                    <span className="font-bold text-[#e03131] text-xs">
                      {plannerInfo.retakesRequired.length} Course{plannerInfo.retakesRequired.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              <Link
                to="/degree-planner"
                className="btn-notion-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 shrink-0"
              >
                <span>Open Degree Planner</span>
                <ChevronRight className="h-3.5 w-3.5 text-[#0f6b57]" />
              </Link>
            </div>
          </div>

          {/* Mini Progress Bar */}
          <div className="mt-3 w-full bg-[#ede9e4] dark:bg-[#252528] h-1.5 rounded-full overflow-hidden flex">
            <div
              className="bg-[#1aae39] h-full transition-all duration-500"
              style={{ width: `${degreeProgress.credits.completionPercentage}%` }}
              title={`Completed: ${degreeProgress.credits.completed} credits`}
            />
            <div
              className="bg-[#0075de] h-full opacity-60 transition-all duration-500"
              style={{
                width: `${
                  degreeProgress.credits.totalRequired > 0
                    ? Math.min(
                        100 - degreeProgress.credits.completionPercentage,
                        (degreeProgress.credits.inProgress / degreeProgress.credits.totalRequired) * 100
                      )
                    : 0
                }%`,
              }}
              title={`In Progress: ${degreeProgress.credits.inProgress} credits`}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION E: Quick Access Bar (Compact shortcuts across semester modules)  */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 text-xs text-[#787671]">
        <span className="font-semibold text-[#1a1a1a] dark:text-white shrink-0 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[#0f6b57]" />
          Quick Access:
        </span>
        <Link
          to={semId ? `/semesters/${semId}/courses` : '/courses'}
          className="px-2.5 py-1 rounded-[6px] bg-[#fbfbfa] border border-[#ede9e4] hover:bg-[#f6f5f4] dark:bg-[#19191c] dark:border-[#2a2a2e] dark:hover:bg-[#202024] shrink-0 font-medium text-[#1a1a1a] dark:text-white transition-colors"
        >
          Courses
        </Link>
        <Link
          to={semId ? `/semesters/${semId}/assignments` : '/assignments'}
          className="px-2.5 py-1 rounded-[6px] bg-[#fbfbfa] border border-[#ede9e4] hover:bg-[#f6f5f4] dark:bg-[#19191c] dark:border-[#2a2a2e] dark:hover:bg-[#202024] shrink-0 font-medium text-[#1a1a1a] dark:text-white transition-colors"
        >
          Assignments
        </Link>
        <Link
          to={semId ? `/semesters/${semId}/exams` : '/exams'}
          className="px-2.5 py-1 rounded-[6px] bg-[#fbfbfa] border border-[#ede9e4] hover:bg-[#f6f5f4] dark:bg-[#19191c] dark:border-[#2a2a2e] dark:hover:bg-[#202024] shrink-0 font-medium text-[#1a1a1a] dark:text-white transition-colors"
        >
          Exams
        </Link>
        <Link
          to={semId ? `/semesters/${semId}/documents` : '/documents'}
          className="px-2.5 py-1 rounded-[6px] bg-[#fbfbfa] border border-[#ede9e4] hover:bg-[#f6f5f4] dark:bg-[#19191c] dark:border-[#2a2a2e] dark:hover:bg-[#202024] shrink-0 font-medium text-[#1a1a1a] dark:text-white transition-colors"
        >
          Documents
        </Link>
        <Link
          to={semId ? `/semesters/${semId}/journal` : '/journal'}
          className="px-2.5 py-1 rounded-[6px] bg-[#fbfbfa] border border-[#ede9e4] hover:bg-[#f6f5f4] dark:bg-[#19191c] dark:border-[#2a2a2e] dark:hover:bg-[#202024] shrink-0 font-medium text-[#1a1a1a] dark:text-white transition-colors"
        >
          Photo Journal
        </Link>
        <Link
          to={semId ? `/semesters/${semId}/planner` : '/planner'}
          className="px-2.5 py-1 rounded-[6px] bg-[#fbfbfa] border border-[#ede9e4] hover:bg-[#f6f5f4] dark:bg-[#19191c] dark:border-[#2a2a2e] dark:hover:bg-[#202024] shrink-0 font-medium text-[#1a1a1a] dark:text-white transition-colors"
        >
          Study Planner
        </Link>
        <Link
          to={semId ? `/semesters/${semId}/grades` : '/grades'}
          className="px-2.5 py-1 rounded-[6px] bg-[#fbfbfa] border border-[#ede9e4] hover:bg-[#f6f5f4] dark:bg-[#19191c] dark:border-[#2a2a2e] dark:hover:bg-[#202024] shrink-0 font-medium text-[#1a1a1a] dark:text-white transition-colors"
        >
          Grades & CGPA
        </Link>
        {resolvedSemester && (
          <Link
            to={`/semesters/${resolvedSemester.id}`}
            className="px-2.5 py-1 rounded-[6px] bg-[#dcf0e8] text-[#0d3b30] hover:bg-[#a8dcc9] dark:bg-[#0d3b30]/40 dark:text-[#a8dcc9] shrink-0 font-semibold transition-colors ml-auto flex items-center gap-1"
          >
            <span>Semester Hub</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MAIN TWO-COLUMN LAYOUT: Upcoming Activities (Left) & Today/Recent (Right) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ======================================================================= */}
        {/* SECTION A: Upcoming Activities (Prominent Left 2-Column Section)         */}
        {/* ======================================================================= */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-notion bg-white dark:bg-[#141416] p-6 rounded-[12px] border border-[#e5e3df] dark:border-[#2a2a2e] shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-[#ede9e4] pb-4 dark:border-[#252528]">
              <div>
                <h2 className="text-base font-semibold text-[#1a1a1a] dark:text-white flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[#0f6b57]" />
                  Upcoming Activities & Deadlines
                </h2>
                <p className="text-xs text-[#787671] mt-0.5">
                  Chronological schedule of assignments, examinations, and study milestones
                </p>
              </div>

              {/* Filter Tabs (Notion Pill-Tabs) */}
              <div className="flex items-center rounded-full border border-[#e5e3df] dark:border-[#2a2a2e] p-0.5 bg-[#fbfbfa] dark:bg-[#19191c]">
                {(['all', 'assignments', 'exams', 'study'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActivityFilter(filter)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all capitalize cursor-pointer ${
                      activityFilter === filter
                        ? 'bg-[#000000] text-white shadow-2xs dark:bg-white dark:text-[#1a1a1a]'
                        : 'text-[#787671] hover:text-[#1a1a1a] dark:text-[#a4a097] dark:hover:text-white'
                    }`}
                  >
                    {filter === 'all'
                      ? 'All'
                      : filter === 'assignments'
                      ? 'Assignments'
                      : filter === 'exams'
                      ? 'Exams'
                      : 'Study Tasks'}
                  </button>
                ))}
              </div>
            </div>

            {/* List of upcoming items */}
            {filteredUpcoming.length === 0 ? (
              <div className="py-12 text-center text-[#787671]">
                <CheckCircle2 className="h-8 w-8 text-[#1aae39] mx-auto mb-2 opacity-80" />
                <p className="text-xs font-medium text-[#1a1a1a] dark:text-white">
                  No upcoming activities found for this filter.
                </p>
                <p className="text-[11px] text-[#787671] mt-1">
                  Enjoy your free time or schedule a study session.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredUpcoming.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    to={item.link}
                    className={`p-3.5 rounded-[8px] border transition-all flex items-center justify-between gap-3 block ${
                      item.isOverdue
                        ? 'border-[#d9480f]/40 bg-[#fde0ec]/20 hover:bg-[#fde0ec]/40 dark:bg-[#33111e]/20'
                        : 'border-[#ede9e4] bg-[#fbfbfa] hover:bg-[#f6f5f4] dark:border-[#2a2a2e] dark:bg-[#19191c] dark:hover:bg-[#202024]'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      {/* Icon */}
                      <div
                        className={`p-2 rounded-[6px] shrink-0 ${
                          item.isOverdue
                            ? 'bg-[#fde0ec] text-[#e03131]'
                            : item.type === 'EXAM'
                            ? 'bg-[#dcf0e8] text-[#0f6b57]'
                            : item.type === 'STUDY_SESSION'
                            ? 'bg-[#ffe8d4] text-[#dd5b00]'
                            : 'bg-[#d9f3e1] text-[#1aae39]'
                        }`}
                      >
                        {item.isOverdue ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : item.type === 'EXAM' ? (
                          <Award className="h-4 w-4" />
                        ) : item.type === 'STUDY_SESSION' ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          <CheckSquare className="h-4 w-4" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          {item.courseCode && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] text-white shrink-0"
                              style={{ backgroundColor: item.courseColor || '#0f6b57' }}
                            >
                              {item.courseCode}
                            </span>
                          )}
                          <span className="text-xs font-semibold text-[#1a1a1a] dark:text-white truncate">
                            {item.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#787671] dark:text-[#a4a097]">
                          <span>{formatDate(item.date, 'EEEE, MMM d, yyyy • h:mm a')}</span>
                          {item.status && (
                            <>
                              <span>•</span>
                              <span
                                className={`font-medium ${
                                  item.isOverdue ? 'text-[#e03131] font-semibold' : ''
                                }`}
                              >
                                {item.status}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Deadline urgency indicator badge */}
                    <div className="text-right shrink-0">
                      {item.isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-[4px] bg-[#fde0ec] text-[#e03131] border border-[#e03131]/30">
                          Overdue
                        </span>
                      ) : item.daysRemaining !== undefined ? (
                        <span className="text-[11px] font-semibold text-[#0f6b57] dark:text-[#a8dcc9] block">
                          {item.daysRemaining === 0
                            ? 'Due Today'
                            : item.daysRemaining === 1
                            ? 'Due Tomorrow'
                            : item.daysRemaining > 0
                            ? `In ${item.daysRemaining} days`
                            : 'Passed'}
                        </span>
                      ) : null}
                      <span className="text-[10px] text-[#787671] block mt-0.5">
                        {formatRelativeDeadline(item.date)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Active Courses Progress in this Semester */}
          {activeCourses.length > 0 && (
            <div className="card-notion bg-white dark:bg-[#141416] p-6 rounded-[12px] border border-[#e5e3df] dark:border-[#2a2a2e] shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white flex items-center gap-2">
                  <Target className="h-4 w-4 text-[#0f6b57]" />
                  Active Course Progress & Credits
                </h3>
                <Link
                  to={semId ? `/semesters/${semId}/courses` : '/courses'}
                  className="text-xs font-semibold text-[#0f6b57] hover:underline"
                >
                  View All ({activeCourses.length})
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {activeCourses.map((course: any) => (
                  <Link
                    key={course.id}
                    to={`/courses/${course.id}`}
                    className="p-3.5 rounded-[8px] border border-[#ede9e4] bg-[#fbfbfa] hover:bg-[#f6f5f4] dark:border-[#2a2a2e] dark:bg-[#19191c] dark:hover:bg-[#202024] transition-all block"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 truncate">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: course.color || '#0f6b57' }} />
                        <span className="text-xs font-semibold text-[#1a1a1a] dark:text-white truncate">{course.code}</span>
                        <span className="text-[10px] text-[#787671] truncate">{course.credits ? `${course.credits} cr` : ''}</span>
                      </div>
                      <span className="text-xs font-semibold text-[#0f6b57] dark:text-[#a8dcc9] shrink-0">
                        {course.progress || 0}%
                      </span>
                    </div>
                    <p className="text-xs text-[#5d5b54] dark:text-[#a4a097] truncate mb-2">
                      {course.title || course.name}
                    </p>
                    <div className="w-full bg-[#ede9e4] dark:bg-[#252528] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${course.progress || 0}%`,
                          backgroundColor: course.color || '#0f6b57',
                        }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: Today's Focus & Recent Activity Feed                      */}
        {/* ======================================================================= */}
        <div className="space-y-6 order-first lg:order-none">
          {/* ===================================================================== */}
          {/* SECTION C: Today's Focus                                              */}
          {/* ===================================================================== */}
          <div className="card-notion bg-white dark:bg-[#141416] p-6 rounded-[12px] border border-[#e5e3df] dark:border-[#2a2a2e] shadow-2xs">
            <div className="flex items-center justify-between mb-4 border-b border-[#ede9e4] pb-3 dark:border-[#252528]">
              <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white flex items-center gap-2">
                <Flame className="h-4 w-4 text-[#dd5b00]" />
                Today's Focus
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-[#ffe8d4] text-[#dd5b00]">
                {todayFocus.tasksDueToday.length + todayFocus.todaySessions.length + todayFocus.examsUpcoming.length} items
              </span>
            </div>

            {/* If no urgent items for today */}
            {todayFocus.tasksDueToday.length === 0 &&
            todayFocus.todaySessions.length === 0 &&
            todayFocus.examsUpcoming.length === 0 &&
            todayFocus.todayPhotos.length === 0 ? (
              <div className="py-6 text-center text-[#787671]">
                <CheckCircle2 className="h-6 w-6 text-[#1aae39] mx-auto mb-2 opacity-80" />
                <p className="text-xs font-semibold text-[#1a1a1a] dark:text-white">
                  Nothing urgent scheduled for today!
                </p>
                <p className="text-[11px] text-[#787671] mt-1 mb-3">
                  You are completely caught up on assignments and exam preparation.
                </p>
                <div className="flex justify-center gap-2">
                  <Link
                    to={semId ? `/semesters/${semId}/planner` : '/planner'}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-[#dcf0e8] text-[#0f6b57] text-[11px] font-semibold hover:bg-[#a8dcc9] transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Plan Study
                  </Link>
                  <Link
                    to={semId ? `/semesters/${semId}/journal` : '/journal'}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-[#fbfbfa] border border-[#ede9e4] text-[#1a1a1a] text-[11px] font-semibold hover:bg-[#f6f5f4] transition-colors"
                  >
                    <Camera className="h-3 w-3" />
                    Capture Board
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 1. Tasks Due Today */}
                {todayFocus.tasksDueToday.map((task: any) => (
                  <Link
                    key={task.id}
                    to={semId ? `/semesters/${semId}/assignments` : '/assignments'}
                    className="p-3 rounded-[8px] border border-[#d9480f]/30 bg-[#fde0ec]/20 hover:bg-[#fde0ec]/40 block transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#e03131] flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        Due Today: {task.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#787671] mt-0.5 block">
                      {task.course?.code || 'Course'} • Deadline {formatDate(task.deadline, 'h:mm a')}
                    </span>
                  </Link>
                ))}

                {/* 2. Today's Study Sessions */}
                {todayFocus.todaySessions.map((session: any) => (
                  <Link
                    key={session.id}
                    to={semId ? `/semesters/${semId}/planner` : '/planner'}
                    className="p-3 rounded-[8px] border border-[#ede9e4] bg-[#fbfbfa] dark:bg-[#19191c] hover:bg-[#f6f5f4] block transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#1a1a1a] dark:text-white flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#dd5b00] shrink-0" />
                        {session.title}
                      </span>
                      <span className="text-[10px] text-[#787671]">
                        {session.durationMinutes}m
                      </span>
                    </div>
                    <span className="text-[10px] text-[#787671] mt-0.5 block">
                      {session.course?.code || 'Self-Study'} • Scheduled for today
                    </span>
                  </Link>
                ))}

                {/* 3. Upcoming Exams Requiring Prep (Next 14 Days) */}
                {todayFocus.examsUpcoming.slice(0, 2).map((exam: any) => (
                  <Link
                    key={exam.id}
                    to={semId ? `/semesters/${semId}/exams` : '/exams'}
                    className="p-3 rounded-[8px] border border-[#a8dcc9]/40 bg-[#dcf0e8]/30 hover:bg-[#dcf0e8]/60 block transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#0d3b30] dark:text-[#a8dcc9] flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 text-[#0f6b57] shrink-0" />
                        {exam.examType || 'Exam'}: {exam.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#787671] mt-0.5 block">
                      {exam.course?.code || 'Course'} • {formatDate(exam.examDate, 'EEE, MMM d')}
                    </span>
                  </Link>
                ))}

                {/* 4. Today's Captured Board Photos */}
                {todayFocus.todayPhotos.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[11px] font-semibold text-[#787671] block mb-1.5">
                      Today's Class Board Photos ({todayFocus.todayPhotos.length})
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {todayFocus.todayPhotos.map((photo: any) => (
                        <Link
                          key={photo.id}
                          to={semId ? `/semesters/${semId}/journal` : '/journal'}
                          className="rounded-[6px] border border-[#ede9e4] overflow-hidden bg-[#fbfbfa] hover:opacity-90 transition-opacity block group"
                        >
                          <div className="h-14 bg-[#ede9e4] relative overflow-hidden flex items-center justify-center">
                            {photo.filePath ? (
                              <img
                                src={photo.filePath.startsWith('http') ? photo.filePath : `http://localhost:5001${photo.filePath}`}
                                alt="Class board"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Camera className="h-4 w-4 text-[#787671]" />
                            )}
                          </div>
                          <div className="p-1.5 text-[10px] text-[#1a1a1a] dark:text-white truncate font-medium">
                            {photo.session?.course?.code || 'Class'}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ===================================================================== */}
          {/* SECTION D: Recent Academic Activity Timeline                          */}
          {/* ===================================================================== */}
          <div className="card-notion bg-white dark:bg-[#141416] p-6 rounded-[12px] border border-[#e5e3df] dark:border-[#2a2a2e] shadow-2xs">
            <div className="flex items-center justify-between mb-4 border-b border-[#ede9e4] pb-3 dark:border-[#252528]">
              <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#0f6b57]" />
                Recent Academic Activity
              </h3>
              <span className="text-[10px] text-[#787671]">Authorized logs</span>
            </div>

            {recentActivity.length === 0 ? (
              <p className="text-xs text-[#787671] py-4 text-center">No recent activity recorded.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 6).map((activity) => (
                  <Link
                    key={`${activity.type}-${activity.id}`}
                    to={activity.link}
                    className="flex items-start gap-3 p-2.5 rounded-[8px] hover:bg-[#fbfbfa] dark:hover:bg-[#19191c] transition-colors block group"
                  >
                    <div
                      className={`p-1.5 rounded-[6px] shrink-0 mt-0.5 ${
                        activity.type === 'PHOTO'
                          ? 'bg-[#ffe8d4] text-[#dd5b00]'
                          : activity.type === 'ASSIGNMENT'
                          ? 'bg-[#fde0ec] text-[#e03131]'
                          : activity.type === 'NOTE'
                          ? 'bg-[#dcf0e8] text-[#0f6b57]'
                          : 'bg-[#d9f3e1] text-[#1aae39]'
                      }`}
                    >
                      {activity.type === 'PHOTO' ? (
                        <Camera className="h-3.5 w-3.5" />
                      ) : activity.type === 'ASSIGNMENT' ? (
                        <CheckSquare className="h-3.5 w-3.5" />
                      ) : activity.type === 'NOTE' ? (
                        <FileText className="h-3.5 w-3.5" />
                      ) : (
                        <FolderOpen className="h-3.5 w-3.5" />
                      )}
                    </div>

                    <div className="truncate flex-1">
                      <div className="flex items-center gap-1.5">
                        {activity.courseCode && (
                          <span
                            className="text-[9px] font-bold px-1 py-0.2 rounded-[3px] text-white shrink-0"
                            style={{ backgroundColor: activity.courseColor || '#0f6b57' }}
                          >
                            {activity.courseCode}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-[#1a1a1a] dark:text-white truncate group-hover:text-[#0f6b57] transition-colors">
                          {activity.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#787671]">
                        <span>{activity.detail || activity.type}</span>
                        <span>•</span>
                        <span>{formatRelativeDeadline(activity.timestamp)}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-[#787671] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
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
