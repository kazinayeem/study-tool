import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Plus,
  Flame,
  Award,
  BookOpen,
  CalendarDays,
  Target,
  Sparkles,
  Trash2,
  Check,
  ChevronRight,
  Filter,
  Download,
  BarChart2,
  TrendingUp,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import {
  StudyPlan,
  StudySession,
  PlannerStats,
  Course,
  Semester,
  Exam,
  Assignment,
} from '../../types';
import { useParams, useSearchParams } from 'react-router-dom';
import { useActiveSemester } from '../../hooks/useActiveSemester';
import { AcademicBreadcrumb } from '../../components/common/AcademicBreadcrumb';

export const PlannerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { id: paramSemesterId, semesterId: routeSemesterId } = useParams<{ id?: string; semesterId?: string }>();
  const [searchParams] = useSearchParams();
  const { activeSemesterId, activeSemester } = useActiveSemester();
  const effectiveSemesterId = paramSemesterId || routeSemesterId || searchParams.get('semesterId') || activeSemesterId || '';

  const [activeTab, setActiveTab] = useState<'agenda' | 'plans' | 'timer' | 'stats'>('agenda');

  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');

  // Modals
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalHoursInput, setGoalHoursInput] = useState<number>(15);

  // Focus Pomodoro Timer State
  const [timerMode, setTimerMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [activeTimerSessionId, setActiveTimerSessionId] = useState<string | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // Active Timer Recovery from Server (timestamp based)
  const { data: activeSessionData } = useQuery({
    queryKey: ['activeStudySession'],
    queryFn: () => api.getActiveStudySession(),
    staleTime: 5000,
  });

  useEffect(() => {
    if (activeSessionData?.session) {
      const s = activeSessionData.session;
      setActiveTimerSessionId(s.id);
      setIsTimerRunning(true);
      const startMs = new Date(s.startTime).getTime();
      const elapsedSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      const remainingSec = Math.max(0, 25 * 60 - elapsedSec);
      setTimerSecondsLeft(remainingSec);
    }
  }, [activeSessionData]);

  // Study Analytics & Goal Queries
  const { data: studyAnalytics } = useQuery({
    queryKey: ['studyAnalytics'],
    queryFn: () => api.getStudyAnalytics(),
  });

  const { data: studyGoalData } = useQuery({
    queryKey: ['studyGoal'],
    queryFn: () => api.getStudyGoal(),
  });

  const updateGoalMutation = useMutation({
    mutationFn: (targetMinutes: number) => api.setStudyGoal(targetMinutes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyGoal'] });
      queryClient.invalidateQueries({ queryKey: ['studyAnalytics'] });
      setIsEditingGoal(false);
    },
  });

  // New Study Plan Form
  const [planTitle, setPlanTitle] = useState('');
  const [planCourseId, setPlanCourseId] = useState('');
  const [planTopic, setPlanTopic] = useState('');
  const [planDifficulty, setPlanDifficulty] = useState(3);
  const [planPriority, setPlanPriority] = useState('MEDIUM');
  const [planEstimatedHours, setPlanEstimatedHours] = useState(6);
  const [planDailyHoursLimit, setPlanDailyHoursLimit] = useState(2);
  const [planStartDate, setPlanStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [planTargetDate, setPlanTargetDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [planExamId, setPlanExamId] = useState('');
  const [planAssignmentId, setPlanAssignmentId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // New Session Form
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionCourseId, setSessionCourseId] = useState('');
  const [sessionTopic, setSessionTopic] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState('');
  const [sessionEndTime, setSessionEndTime] = useState('');
  const [sessionPriority, setSessionPriority] = useState('MEDIUM');

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery<PlannerStats>({
    queryKey: ['plannerStats'],
    queryFn: () => api.getPlannerStats(),
  });

  const { data: plans = [] } = useQuery<StudyPlan[]>({
    queryKey: ['studyPlans'],
    queryFn: () => api.getStudyPlans(),
  });

  const sessionParams: Record<string, string> = {};
  if (selectedCourseFilter) sessionParams.courseId = selectedCourseFilter;
  if (selectedStatusFilter) sessionParams.status = selectedStatusFilter;
  if (activeSemesterId) sessionParams.semesterId = activeSemesterId;

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<StudySession[]>({
    queryKey: ['studySessions', sessionParams],
    queryFn: () => api.getStudySessions(sessionParams),
  });

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses', effectiveSemesterId],
    queryFn: () => api.getCourses(effectiveSemesterId || undefined),
  });

  const { data: exams = [] } = useQuery<Exam[]>({
    queryKey: ['exams', effectiveSemesterId],
    queryFn: () => api.getExams(effectiveSemesterId ? { semesterId: effectiveSemesterId } : undefined),
  });

  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ['assignments', effectiveSemesterId],
    queryFn: () => api.getAssignments(effectiveSemesterId ? { semesterId: effectiveSemesterId } : undefined),
  });

  // Pomodoro Ticker
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setIsTimerRunning(false);
            // Alert user
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('ScholarFlow Focus Timer', {
                body:
                  timerMode === 'focus'
                    ? 'Pomodoro complete! Time for a short break.'
                    : 'Break finished! Ready to focus?',
              });
            }
            // Auto increment Pomodoro count if active session
            if (activeTimerSessionId && timerMode === 'focus') {
              updateSessionMutation.mutate({
                id: activeTimerSessionId,
                data: {
                  actualDurationMinutes: (sessions.find(s => s.id === activeTimerSessionId)?.actualDurationMinutes || 0) + 25,
                  pomodoroCount: (sessions.find(s => s.id === activeTimerSessionId)?.pomodoroCount || 0) + 1,
                },
              });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, timerMode, activeTimerSessionId, sessions]);

  // Mutations
  const createPlanMutation = useMutation({
    mutationFn: (data: any) => api.createStudyPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyPlans'] });
      queryClient.invalidateQueries({ queryKey: ['studySessions'] });
      queryClient.invalidateQueries({ queryKey: ['plannerStats'] });
      setIsCreatePlanOpen(false);
      resetPlanForm();
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to generate study plan');
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: (data: any) => api.createStudySession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studySessions'] });
      queryClient.invalidateQueries({ queryKey: ['plannerStats'] });
      setIsCreateSessionOpen(false);
      resetSessionForm();
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.updateStudySession(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studySessions'] });
      queryClient.invalidateQueries({ queryKey: ['plannerStats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => api.deleteStudySession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studySessions'] });
      queryClient.invalidateQueries({ queryKey: ['plannerStats'] });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id: string) => api.deleteStudyPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyPlans'] });
      queryClient.invalidateQueries({ queryKey: ['studySessions'] });
      queryClient.invalidateQueries({ queryKey: ['plannerStats'] });
    },
  });

  const resetPlanForm = () => {
    setPlanTitle('');
    setPlanCourseId(courses[0]?.id || '');
    setPlanTopic('');
    setPlanDifficulty(3);
    setPlanPriority('MEDIUM');
    setPlanEstimatedHours(6);
    setPlanDailyHoursLimit(2);
    setPlanExamId('');
    setPlanAssignmentId('');
    setFormError(null);
  };

  const resetSessionForm = () => {
    setSessionTitle('');
    setSessionCourseId(courses[0]?.id || '');
    setSessionTopic('');
    setSessionStartTime('');
    setSessionEndTime('');
    setSessionPriority('MEDIUM');
  };

  const handleStartTimer = (sessionId?: string) => {
    if (sessionId) setActiveTimerSessionId(sessionId);
    setIsTimerRunning(true);
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
  };

  const handleResetTimer = (mode: 'focus' | 'shortBreak' | 'longBreak') => {
    setIsTimerRunning(false);
    setTimerMode(mode);
    if (mode === 'focus') setTimerSecondsLeft(25 * 60);
    else if (mode === 'shortBreak') setTimerSecondsLeft(5 * 60);
    else setTimerSecondsLeft(15 * 60);
  };

  const formatTimerDisplay = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCreatePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planTitle.trim()) {
      setFormError('Plan title is required');
      return;
    }
    if (!planCourseId) {
      setFormError('Please select a course');
      return;
    }

    createPlanMutation.mutate({
      title: planTitle.trim(),
      courseId: planCourseId,
      topic: planTopic.trim() || undefined,
      difficulty: Number(planDifficulty),
      priority: planPriority,
      estimatedHours: Number(planEstimatedHours),
      dailyHoursLimit: Number(planDailyHoursLimit),
      startDate: new Date(planStartDate).toISOString(),
      targetDate: new Date(planTargetDate).toISOString(),
      examId: planExamId || undefined,
      assignmentId: planAssignmentId || undefined,
    });
  };

  const currentCourseObj = courses.find((c) => c.id === selectedCourseFilter);

  return (
    <div className="min-h-full bg-slate-50 p-6 dark:bg-slate-950 sm:p-8 space-y-6">
      {/* Academic Context Breadcrumb */}
      <AcademicBreadcrumb
        semesterName={activeSemester?.name}
        courseCode={currentCourseObj?.code}
        courseName={currentCourseObj?.title}
        moduleName="Study Planner & Timer"
      />

      {/* Top Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#5645d4]/10 text-[#5645d4]">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Smart Study Planner
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deadline-aware schedule generator, conflict detection, and interactive Pomodoro focus sessions
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              resetPlanForm();
              setIsCreatePlanOpen(true);
            }}
            className="btn-notion-primary text-xs flex items-center gap-1.5"
          >
            <Sparkles className="h-4 w-4" />
            <span>Generate Study Plan</span>
          </button>

          <button
            onClick={() => {
              resetSessionForm();
              setIsCreateSessionOpen(true);
            }}
            className="btn-notion-secondary text-xs flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5 text-slate-400" />
            <span>Quick Session</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Streak */}
        <div className="card-notion p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Active Study Streak</span>
            <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-orange-600 dark:text-orange-400">
              {stats?.streakDays ?? 0}
            </span>
            <span className="text-xs text-slate-400">consecutive days</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Keep your momentum going!
          </div>
        </div>

        {/* Weekly Hours */}
        <div className="card-notion p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Time Logged (7 Days)</span>
            <Clock className="h-4 w-4 text-[#5645d4]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats?.totalHoursLogged.toFixed(1) ?? '0.0'}
            </span>
            <span className="text-xs text-slate-400">hours completed</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {stats?.completedSessions ?? 0} sessions finished
          </div>
        </div>

        {/* Completion Rate */}
        <div className="card-notion p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Completion Rate</span>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {stats?.completionRate ?? 0}%
            </span>
            <span className="text-xs text-slate-400">
              ({stats?.completedSessions ?? 0} / {stats?.totalSessions ?? 0})
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {stats?.missedSessions ?? 0} missed sessions
          </div>
        </div>

        {/* Active Plans */}
        <div className="card-notion p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Curated Plans</span>
            <Target className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-sky-600 dark:text-sky-400">
              {plans.length}
            </span>
            <span className="text-xs text-slate-400">active roadmaps</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Organized by topic & exam priority
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="mb-6 flex border-b border-[#e5e3df] dark:border-slate-800">
        <button
          onClick={() => setActiveTab('agenda')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === 'agenda'
              ? 'border-[#5645d4] text-[#5645d4]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          <span>Sessions Agenda ({sessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === 'plans'
              ? 'border-[#5645d4] text-[#5645d4]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Target className="h-4 w-4" />
          <span>Generated Study Plans ({plans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('timer')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === 'timer'
              ? 'border-[#5645d4] text-[#5645d4]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Pomodoro Focus Timer</span>
          {isTimerRunning && (
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* TAB 1: SESSIONS AGENDA */}
      {activeTab === 'agenda' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 card-notion p-3.5">
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                className="rounded-[8px] border border-[#e5e3df] bg-white px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 focus:outline-none focus:border-[#5645d4]"
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                ))}
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="rounded-[8px] border border-[#e5e3df] bg-white px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 focus:outline-none focus:border-[#5645d4]"
              >
                <option value="">All Statuses</option>
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="MISSED">Missed</option>
              </select>
            </div>

            <div className="text-xs text-slate-400">
              Showing {sessions.length} sessions
            </div>
          </div>

          {/* Sessions List */}
          {sessionsLoading ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 w-full animate-pulse card-notion bg-[#f0eeec] dark:bg-slate-900" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="card-notion p-12 text-center text-xs text-slate-400">
              <Calendar className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">No study sessions found</p>
              <p className="mt-1">Generate an automated study plan or create a session to begin.</p>
              <button
                onClick={() => setIsCreatePlanOpen(true)}
                className="btn-notion-primary text-xs mt-4"
              >
                Generate Study Plan
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {sessions.map((s) => {
                const isMissed = s.status === 'MISSED';
                const isCompleted = s.status === 'COMPLETED';
                const isInProgress = s.status === 'IN_PROGRESS';

                return (
                  <div
                    key={s.id}
                    className={`card-notion p-4 transition-all ${
                      isCompleted
                        ? 'border-emerald-200/60 bg-emerald-50/20 dark:border-emerald-950 dark:bg-emerald-950/10'
                        : isMissed
                        ? 'border-rose-200 bg-rose-50/30 dark:border-rose-950 dark:bg-rose-950/10'
                        : isInProgress
                        ? 'border-[#5645d4]/40 bg-[#5645d4]/5 dark:border-[#5645d4]/30'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {s.title}
                          </span>
                          <span
                            className={`rounded-[6px] px-1.5 py-0.5 text-[10px] font-bold ${
                              s.priority === 'URGENT'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : s.priority === 'HIGH'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-[#f0eeec] text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {s.priority}
                          </span>
                        </div>

                        {s.topic && (
                          <div className="text-xs text-[#5645d4] dark:text-[#8070f6] font-medium mt-0.5">
                            Topic: {s.topic}
                          </div>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          {s.course && (
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {s.course.code}
                            </span>
                          )}
                          {s.plannedStartTime && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(s.plannedStartTime, 'MMM d, h:mm a')}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {s.actualDurationMinutes || s.durationMinutes || 45} mins
                          </span>
                          {s.pomodoroCount > 0 && (
                            <span className="flex items-center gap-1 text-orange-500 font-medium">
                              🍅 {s.pomodoroCount}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Start in Pomodoro */}
                        {!isCompleted && (
                          <button
                            onClick={() => {
                              setActiveTab('timer');
                              handleStartTimer(s.id);
                            }}
                            className="p-1.5 rounded-[6px] text-[#5645d4] hover:bg-[#5645d4]/10 dark:text-[#8070f6]"
                            title="Focus on this session"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        )}

                        {/* Toggle Complete */}
                        <button
                          onClick={() => {
                            updateSessionMutation.mutate({
                              id: s.id,
                              data: {
                                status: isCompleted ? 'PLANNED' : 'COMPLETED',
                              },
                            });
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isCompleted
                              ? 'text-emerald-600 hover:bg-emerald-100 dark:text-emerald-400'
                              : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title={isCompleted ? 'Mark incomplete' : 'Mark completed'}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Delete session "${s.title}"?`)) {
                              deleteSessionMutation.mutate(s.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                          title="Delete session"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Reschedule prompt if missed */}
                    {isMissed && (
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-rose-100/60 p-2.5 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                        <span className="flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          Session was missed. Reschedule?
                        </span>
                        <button
                          onClick={() => {
                            const newDate = prompt(
                              'Enter new start time (YYYY-MM-DDTHH:MM):',
                              new Date().toISOString().slice(0, 16)
                            );
                            if (newDate) {
                              updateSessionMutation.mutate({
                                id: s.id,
                                data: {
                                  status: 'PLANNED',
                                  plannedStartTime: new Date(newDate).toISOString(),
                                  plannedEndTime: new Date(new Date(newDate).getTime() + 45 * 60000).toISOString(),
                                },
                              });
                            }
                          }}
                          className="font-bold underline hover:text-rose-900"
                        >
                          Reschedule
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GENERATED STUDY PLANS */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          {plans.length === 0 ? (
            <div className="card-notion p-12 text-center text-xs text-slate-400">
              <Sparkles className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">No study plans created yet</p>
              <p className="mt-1">Set up a roadmap with topic difficulty, target exam, and daily study budget.</p>
              <button
                onClick={() => setIsCreatePlanOpen(true)}
                className="btn-notion-primary text-xs mt-4"
              >
                Create First Plan
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className="card-notion p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        {p.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        {p.course && (
                          <span className="font-semibold text-[#5645d4] dark:text-[#8070f6]">
                            {p.course.code}
                          </span>
                        )}
                        <span>•</span>
                        <span>Difficulty: {p.difficulty}/5</span>
                        <span>•</span>
                        <span>Priority: {p.priority}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`Delete plan "${p.title}" and its generated sessions?`)) {
                          deletePlanMutation.mutate(p.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                      title="Delete Plan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Estimated</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{p.estimatedHours}h total</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Daily Target</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{p.dailyHoursLimit}h/day</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Target Date</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {formatDate(p.targetDate, 'MMM d')}
                      </span>
                    </div>
                  </div>

                  {p.sessions && p.sessions.length > 0 && (
                    <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800 text-xs">
                      <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span>Sessions Progress</span>
                        <span>
                          {p.sessions.filter((s: any) => s.status === 'COMPLETED').length} / {p.sessions.length}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-[#5645d4] transition-all"
                          style={{
                            width: `${
                              (p.sessions.filter((s: any) => s.status === 'COMPLETED').length /
                                p.sessions.length) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INTERACTIVE POMODORO FOCUS TIMER */}
      {activeTab === 'timer' && (
        <div className="mx-auto max-w-xl card-notion p-8 text-center">
          {/* Mode Selector */}
          <div className="mb-8 inline-flex rounded-[8px] bg-[#f0eeec] p-1 dark:bg-slate-800">
            <button
              onClick={() => handleResetTimer('focus')}
              className={`rounded-[6px] px-4 py-2 text-xs font-medium transition-all ${
                timerMode === 'focus'
                  ? 'bg-[#5645d4] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Focus (25m)
            </button>
            <button
              onClick={() => handleResetTimer('shortBreak')}
              className={`rounded-[6px] px-4 py-2 text-xs font-medium transition-all ${
                timerMode === 'shortBreak'
                  ? 'bg-[#5645d4] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Short Break (5m)
            </button>
            <button
              onClick={() => handleResetTimer('longBreak')}
              className={`rounded-[6px] px-4 py-2 text-xs font-medium transition-all ${
                timerMode === 'longBreak'
                  ? 'bg-[#5645d4] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Long Break (15m)
            </button>
          </div>

          {/* Huge Digits Clock */}
          <div className="mb-8 font-mono text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {formatTimerDisplay(timerSecondsLeft)}
          </div>

          {/* Active Session Label */}
          {activeTimerSessionId && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-[8px] bg-[#5645d4]/10 px-3 py-1.5 text-xs text-[#5645d4] dark:bg-[#5645d4]/20 dark:text-[#8070f6]">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                Linked Session: {sessions.find((s) => s.id === activeTimerSessionId)?.title}
              </span>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            {!isTimerRunning ? (
              <button
                onClick={() => handleStartTimer()}
                className="btn-notion-primary h-11 px-8 text-sm flex items-center gap-2"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>Start Focus</span>
              </button>
            ) : (
              <button
                onClick={handlePauseTimer}
                className="h-11 px-8 rounded-[8px] bg-amber-600 hover:bg-amber-700 text-sm font-medium text-white transition-colors flex items-center gap-2"
              >
                <Pause className="h-4 w-4 fill-white" />
                <span>Pause</span>
              </button>
            )}

            <button
              onClick={() => handleResetTimer(timerMode)}
              className="btn-notion-secondary h-11 px-5 text-sm flex items-center gap-2"
              title="Reset Timer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: STUDY TIME ANALYTICS & WEEKLY GOALS */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Header & Export */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-[#5645d4]" />
                Personal Study Time Analytics
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Private, real-time measurements calculated strictly from persisted timestamps.
              </p>
            </div>

            <a
              href="/api/planner/export.csv"
              download="scholarflow_study_sessions.csv"
              className="flex items-center gap-1.5 rounded-[8px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors self-start sm:self-auto"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              Export Study CSV
            </a>
          </div>

          {/* Weekly Study Goal Card */}
          <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-[#5645d4]" />
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Weekly Study Target Progress
                </span>
              </div>
              {!isEditingGoal ? (
                <button
                  onClick={() => {
                    setGoalHoursInput(Math.round(((studyGoalData?.targetMinutesPerWeek || 900) / 60) * 10) / 10);
                    setIsEditingGoal(true);
                  }}
                  className="text-xs font-bold text-[#5645d4] hover:underline"
                >
                  Adjust Goal
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="80"
                    step="0.5"
                    value={goalHoursInput}
                    onChange={(e) => setGoalHoursInput(Number(e.target.value))}
                    className="w-20 rounded-[6px] border border-slate-300 px-2 py-0.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <span className="text-xs text-slate-400">hours/wk</span>
                  <button
                    onClick={() => updateGoalMutation.mutate(Math.round(goalHoursInput * 60))}
                    disabled={updateGoalMutation.isPending}
                    className="rounded-[6px] bg-[#5645d4] px-2.5 py-1 text-xs font-bold text-white shadow-2xs"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingGoal(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  Logged: <strong className="text-slate-900 dark:text-white">{Math.round(((studyAnalytics?.weeklyMinutes || 0) / 60) * 10) / 10}h</strong> of{' '}
                  <strong className="text-slate-900 dark:text-white">{Math.round(((studyGoalData?.targetMinutesPerWeek || 900) / 60) * 10) / 10}h target</strong>
                </span>
                <span className="font-extrabold text-[#5645d4]">
                  {Math.min(100, Math.round(((studyAnalytics?.weeklyMinutes || 0) / (studyGoalData?.targetMinutesPerWeek || 900)) * 100))}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#5645d4] h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.round(((studyAnalytics?.weeklyMinutes || 0) / (studyGoalData?.targetMinutesPerWeek || 900)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* 4-Metric Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Today</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {studyAnalytics?.todayMinutes !== undefined ? `${Math.round((studyAnalytics.todayMinutes / 60) * 10) / 10}h` : '0h'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">{studyAnalytics?.todayMinutes || 0} minutes studied</p>
            </div>

            <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">This Week</p>
              <p className="text-2xl font-black text-[#5645d4] mt-1">
                {studyAnalytics?.weeklyMinutes !== undefined ? `${Math.round((studyAnalytics.weeklyMinutes / 60) * 10) / 10}h` : '0h'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">{studyAnalytics?.weeklyMinutes || 0} minutes studied</p>
            </div>

            <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">This Month</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {studyAnalytics?.monthlyMinutes !== undefined ? `${Math.round((studyAnalytics.monthlyMinutes / 60) * 10) / 10}h` : '0h'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">{studyAnalytics?.monthlyMinutes || 0} minutes studied</p>
            </div>

            <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg Session</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {studyAnalytics?.avgDurationMinutes || 0}m
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">{studyAnalytics?.completedSessionsCount || 0} completed sessions</p>
            </div>
          </div>

          {/* Planned vs Actual & Breakdown by Course */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Planned vs Actual */}
            <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                Planned vs. Actual Study Duration
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600 dark:text-slate-300">Planned Hours</span>
                    <span>{Math.round(((studyAnalytics?.plannedVsActual?.plannedMinutes || 0) / 60) * 10) / 10}h</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-slate-400 h-full rounded-full"
                      style={{ width: `${Math.min(100, ((studyAnalytics?.plannedVsActual?.plannedMinutes || 0) / Math.max(1, (studyAnalytics?.plannedVsActual?.plannedMinutes || 0) + (studyAnalytics?.plannedVsActual?.actualMinutes || 0))) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-[#5645d4] dark:text-[#8070f6]">Actual Hours Logged</span>
                    <span>{Math.round(((studyAnalytics?.plannedVsActual?.actualMinutes || 0) / 60) * 10) / 10}h</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#5645d4] h-full rounded-full"
                      style={{ width: `${Math.min(100, ((studyAnalytics?.plannedVsActual?.actualMinutes || 0) / Math.max(1, (studyAnalytics?.plannedVsActual?.plannedMinutes || 0) + (studyAnalytics?.plannedVsActual?.actualMinutes || 0))) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Study Time by Course */}
            <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Top Studied Courses
              </h3>
              {(!studyAnalytics?.byCourse || studyAnalytics.byCourse.length === 0) ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">No course-specific study sessions completed yet.</p>
              ) : (
                <div className="space-y-3">
                  {studyAnalytics.byCourse.map((c: any) => (
                    <div key={c.courseId} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{c.code} - {c.title}</span>
                        <span className="text-slate-500">{Math.round((c.minutes / 60) * 10) / 10}h ({c.minutes}m)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#5645d4] h-full rounded-full"
                          style={{ width: `${Math.min(100, (c.minutes / Math.max(1, studyAnalytics.weeklyMinutes || c.minutes)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Generate Study Plan */}
      {isCreatePlanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg card-notion p-6 shadow-xl dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-[#5645d4]" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Generate Smart Study Plan
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Rule-based schedule generator that calculates manageable session slots without overlapping your calendar events.
            </p>

            {formError && (
              <div className="mb-4 flex items-center gap-2 rounded-[8px] bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePlanSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Plan Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Comprehensive Revision, Discrete Math Proofs"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  className="w-full rounded-[8px] border border-[#e5e3df] bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-[#5645d4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Course *
                  </label>
                  <select
                    value={planCourseId}
                    onChange={(e) => setPlanCourseId(e.target.value)}
                    className="w-full rounded-[8px] border border-[#e5e3df] bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-[#5645d4]"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Topic / Module
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dynamic Programming"
                    value={planTopic}
                    onChange={(e) => setPlanTopic(e.target.value)}
                    className="w-full rounded-[8px] border border-[#e5e3df] bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-[#5645d4]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Topic Difficulty (1 - 5)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={planDifficulty}
                    onChange={(e) => setPlanDifficulty(Number(e.target.value))}
                    className="w-full accent-[#5645d4]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>1 (Easy)</span>
                    <span className="font-bold text-[#5645d4]">{planDifficulty}</span>
                    <span>5 (Challenging)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={planPriority}
                    onChange={(e) => setPlanPriority(e.target.value)}
                    className="w-full rounded-[8px] border border-[#e5e3df] bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-[#5645d4]"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent (Exam Soon)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Total Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={planEstimatedHours}
                    onChange={(e) => setPlanEstimatedHours(Number(e.target.value))}
                    className="w-full rounded-[8px] border border-[#e5e3df] bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-[#5645d4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Daily Limit (Hours/Day)
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    max="12"
                    value={planDailyHoursLimit}
                    onChange={(e) => setPlanDailyHoursLimit(Number(e.target.value))}
                    className="w-full rounded-[8px] border border-[#e5e3df] bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-[#5645d4]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={planStartDate}
                    onChange={(e) => setPlanStartDate(e.target.value)}
                    className="w-full rounded-[8px] border border-[#e5e3df] bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-[#5645d4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    value={planTargetDate}
                    onChange={(e) => setPlanTargetDate(e.target.value)}
                    className="w-full rounded-[8px] border border-[#e5e3df] bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-[#5645d4]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreatePlanOpen(false)}
                  className="btn-notion-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPlanMutation.isPending}
                  className="btn-notion-primary text-xs"
                >
                  {createPlanMutation.isPending ? 'Generating Schedule...' : 'Generate Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Quick Session Creation */}
      {isCreateSessionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md card-notion p-6 shadow-xl dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Add Study Session
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createSessionMutation.mutate({
                  title: sessionTitle.trim(),
                  courseId: sessionCourseId || undefined,
                  topic: sessionTopic.trim() || undefined,
                  plannedStartTime: sessionStartTime ? new Date(sessionStartTime).toISOString() : new Date().toISOString(),
                  plannedEndTime: sessionEndTime ? new Date(sessionEndTime).toISOString() : new Date(Date.now() + 45 * 60000).toISOString(),
                  priority: sessionPriority,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Session Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4 Practice Problems"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="w-full rounded-[8px] border border-[#e5e3df] bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-[#5645d4]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Course
                </label>
                <select
                  value={sessionCourseId}
                  onChange={(e) => setSessionCourseId(e.target.value)}
                  className="w-full rounded-[8px] border border-[#e5e3df] bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-[#5645d4]"
                >
                  <option value="">General Study</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={sessionStartTime}
                    onChange={(e) => setSessionStartTime(e.target.value)}
                    className="w-full rounded-[8px] border border-[#e5e3df] bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-[#5645d4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={sessionEndTime}
                    onChange={(e) => setSessionEndTime(e.target.value)}
                    className="w-full rounded-[8px] border border-[#e5e3df] bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-[#5645d4]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateSessionOpen(false)}
                  className="btn-notion-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSessionMutation.isPending}
                  className="btn-notion-primary text-xs"
                >
                  {createSessionMutation.isPending ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
