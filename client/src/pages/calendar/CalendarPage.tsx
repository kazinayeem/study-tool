import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  CheckCircle2,
  Trash2,
  Edit,
  X,
  Filter,
  Download,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addDays,
  subDays,
} from 'date-fns';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { CalendarEvent, Course, Semester } from '../../types';

import { useParams, useSearchParams } from 'react-router-dom';
import { useActiveSemester } from '../../hooks/useActiveSemester';
import { AcademicBreadcrumb } from '../../components/common/AcademicBreadcrumb';


export const CalendarPage: React.FC = () => {
  const { id: paramSemesterId, semesterId: routeSemesterId } = useParams<{ id?: string; semesterId?: string }>();
  const [searchParams] = useSearchParams();
  const { activeSemesterId, semesters } = useActiveSemester();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const effectiveSemesterId = paramSemesterId || routeSemesterId || searchParams.get('semesterId') || activeSemesterId || '';
  const [selectedSemester, setSelectedSemester] = useState<string>(effectiveSemesterId);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');

  useEffect(() => {
    const sem = paramSemesterId || routeSemesterId || searchParams.get('semesterId');
    if (sem) {
      setSelectedSemester(sem);
    }
  }, [paramSemesterId, routeSemesterId, searchParams]);

  // Modal states
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editEventTarget, setEditEventTarget] = useState<CalendarEvent | null>(null);
  const [showConflictsModal, setShowConflictsModal] = useState(false);

  // Form states
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventCourseId, setEventCourseId] = useState('');
  const [eventCategory, setEventCategory] = useState('CLASS');
  const [eventPriority, setEventPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [eventLocation, setEventLocation] = useState('');
  const [eventIsAllDay, setEventIsAllDay] = useState(false);

  const queryClient = useQueryClient();

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses', selectedSemester],
    queryFn: () => api.getCourses(selectedSemester || undefined),
  });

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar', { category: selectedCategory, courseId: selectedCourse, semesterId: selectedSemester }],
    queryFn: () => {
      const p: Record<string, string> = {};
      if (selectedSemester) p.semesterId = selectedSemester;
      if (selectedCategory) p.category = selectedCategory;
      if (selectedCourse) p.courseId = selectedCourse;
      return api.getCalendarEvents(p);
    },
  });

  const { data: conflictData } = useQuery({
    queryKey: ['calendarConflicts'],
    queryFn: () => api.getCalendarConflicts(),
  });

  const upcomingCriticalEvents = events
    .filter((e) => {
      const isCritical = ['MIDTERM', 'FINAL', 'QUIZ', 'ASSIGNMENT', 'PROJECT', 'PRESENTATION'].includes(e.category);
      const isFuture = new Date(e.startDate).getTime() >= Date.now();
      return isCritical && isFuture;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 3);

  const saveEventMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: eventTitle.trim(),
        description: eventDesc.trim() || null,
        startDate: new Date(eventStartDate).toISOString(),
        endDate: new Date(eventEndDate).toISOString(),
        courseId: eventCourseId || null,
        category: eventCategory,
        priority: eventPriority,
        location: eventLocation.trim() || null,
        isAllDay: eventIsAllDay,
      };

      if (editEventTarget) {
        return api.updateCalendarEvent(editEventTarget.id, payload);
      } else {
        return api.createCalendarEvent(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsEventModalOpen(false);
    },
  });

  const toggleEventMutation = useMutation({
    mutationFn: (id: string) => api.toggleCalendarEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => api.deleteCalendarEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleOpenAddOnDate = (date: Date) => {
    setEditEventTarget(null);
    setEventTitle('');
    setEventDesc('');
    const dateStr = format(date, "yyyy-MM-dd'T'10:00");
    const endStr = format(date, "yyyy-MM-dd'T'11:30");
    setEventStartDate(dateStr);
    setEventEndDate(endStr);
    setEventCategory('STUDY_SESSION');
    setEventPriority('MEDIUM');
    setEventLocation('');
    setEventIsAllDay(false);
    setIsEventModalOpen(true);
  };

  const handleOpenEdit = (evt: CalendarEvent) => {
    setEditEventTarget(evt);
    setEventTitle(evt.title);
    setEventDesc(evt.description || '');
    setEventStartDate(evt.startDate.slice(0, 16));
    setEventEndDate(evt.endDate.slice(0, 16));
    setEventCourseId(evt.courseId || '');
    setEventCategory(evt.category);
    setEventPriority(evt.priority);
    setEventLocation(evt.location || '');
    setEventIsAllDay(evt.isAllDay);
    setIsEventModalOpen(true);
  };

  // Date navigation
  const nextPeriod = () => {
    if (viewMode === 'month') setCurrentDate((d) => addMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => addDays(d, 7));
    else if (viewMode === 'day') setCurrentDate((d) => addDays(d, 1));
  };

  const prevPeriod = () => {
    if (viewMode === 'month') setCurrentDate((d) => subMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => subDays(d, 7));
    else if (viewMode === 'day') setCurrentDate((d) => subDays(d, 1));
  };

  // Month Grid calculation
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const monthDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'MIDTERM':
      case 'FINAL':
        return 'bg-rose-500 text-white';
      case 'ASSIGNMENT':
      case 'PROJECT':
        return 'bg-amber-500 text-white';
      case 'CLASS':
        return 'bg-[#0f6b57] text-white';
      case 'STUDY_SESSION':
        return 'bg-emerald-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  const currentSemesterObj = semesters.find((s) => s.id === selectedSemester);
  const currentCourseObj = courses.find((c) => c.id === selectedCourse);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Academic Context Breadcrumb */}
      <AcademicBreadcrumb
        semesterName={currentSemesterObj?.name}
        courseCode={currentCourseObj?.code}
        courseName={currentCourseObj?.title}
        moduleName="Academic Calendar & Schedule"
      />

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Smart Academic Calendar & Deadlines
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Unified schedule for exams, project milestones, quizzes, classes, and study sessions with conflict detection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <a
            href="/api/calendar/export?format=ics"
            download="bornoflow_calendar.ics"
            className="flex items-center gap-1.5 rounded-[8px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Download standard RFC 5545 .ics file for Google Calendar, Apple Calendar, Outlook"
          >
            <Download className="h-3.5 w-3.5 text-[#0f6b57]" />
            Export .ICS
          </a>
          <a
            href="/api/calendar/export?format=csv"
            download="bornoflow_calendar.csv"
            className="flex items-center gap-1.5 rounded-[8px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Export calendar schedule to CSV"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600" />
            Export CSV
          </a>
          <button
            onClick={() => handleOpenAddOnDate(new Date())}
            className="flex items-center gap-2 rounded-[8px] bg-[#0f6b57] hover:bg-[#0b5645] px-4 py-2 text-xs font-semibold text-white shadow-xs active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Event
          </button>
        </div>
      </div>

      {/* Conflict / Tight Cluster Warning Banner */}
      {((conflictData?.conflicts?.length || 0) > 0 || (conflictData?.tightClusters?.length || 0) > 0) && (
        <div className="rounded-[12px] border border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/40 p-4 text-xs shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Schedule Conflict & Cluster Detection Alert</p>
                <p className="text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                  {conflictData?.conflicts?.length ? `${conflictData.conflicts.length} overlapping time slot conflicts` : ''}
                  {conflictData?.conflicts?.length && conflictData?.tightClusters?.length ? ' and ' : ''}
                  {conflictData?.tightClusters?.length ? `${conflictData.tightClusters.length} tight exam/deadline clusters (<24h)` : ''} detected.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowConflictsModal(true)}
              className="inline-flex items-center gap-1 font-bold text-[#0f6b57] dark:text-[#4ccba5] hover:underline shrink-0"
            >
              <span>View Details & Reschedule</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Exam & Critical Deadline Countdown Cards */}
      {upcomingCriticalEvents.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Upcoming Exam & Deadline Countdowns
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {upcomingCriticalEvents.map((evt) => {
              const diffMs = new Date(evt.startDate).getTime() - Date.now();
              const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
              return (
                <div
                  key={evt.id}
                  onClick={() => handleOpenEdit(evt)}
                  className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between cursor-pointer hover:border-[#0f6b57]/40 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${getCategoryColor(evt.category)}`}>
                      {evt.category}
                    </span>
                    <p className="font-semibold text-slate-900 dark:text-white text-xs mt-1 truncate">
                      {evt.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {format(new Date(evt.startDate), 'EEE, MMM d • h:mm a')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-2xl font-black text-[#0f6b57]">
                      {daysRemaining}
                    </span>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      {daysRemaining === 1 ? 'day left' : 'days left'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation & View Mode Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 card-notion p-3">
        {/* Date Stepper */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Today
          </button>
          <button
            onClick={prevPeriod}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextPeriod}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold text-slate-900 dark:text-white ml-2">
            {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : 'MMM d, yyyy')}
          </span>
        </div>

        {/* View mode toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="">All Categories</option>
            <option value="MIDTERM">Midterms</option>
            <option value="FINAL">Finals</option>
            <option value="ASSIGNMENT">Assignments</option>
            <option value="CLASS">Classes</option>
            <option value="STUDY_SESSION">Study Sessions</option>
          </select>

          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800 text-xs font-medium">
            {(['month', 'week', 'day', 'agenda'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                  viewMode === mode
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="card-notion overflow-hidden">
          {/* Day of Week Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 text-center text-xs font-semibold text-slate-500 py-2">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
            {monthDays.map((day) => {
              const dayEvents = events.filter((e) => isSameDay(new Date(e.startDate), day));
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isTodayDate = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => handleOpenAddOnDate(day)}
                  className={`min-h-[110px] p-2 flex flex-col justify-between cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                    !isCurrentMonth ? 'bg-slate-50/40 dark:bg-slate-950/40 text-slate-300 dark:text-slate-600' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-semibold rounded-full h-6 w-6 flex items-center justify-center ${
                        isTodayDate ? 'bg-[#0f6b57] text-white' : ''
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-400">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Day Events stack */}
                  <div className="flex-1 space-y-1 overflow-y-auto max-h-20">
                    {dayEvents.slice(0, 3).map((evt) => (
                      <div
                        key={evt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(evt);
                        }}
                        className={`truncate rounded px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer shadow-2xs ${getCategoryColor(
                          evt.category
                        )}`}
                        title={`${evt.title} (${formatDate(evt.startDate, 'h:mm a')})`}
                      >
                        {evt.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-[10px] text-slate-400 font-semibold px-1">
                        +{dayEvents.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AGENDA / LIST VIEW */}
      {(viewMode === 'agenda' || viewMode === 'week' || viewMode === 'day') && (
        <div className="card-notion overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {events.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No calendar events found for the active filter.
            </div>
          ) : (
            events.map((evt) => (
              <div
                key={evt.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleEventMutation.mutate(evt.id)}
                    className={`mt-0.5 p-1 rounded-full border ${
                      evt.isCompleted
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 text-transparent hover:border-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${getCategoryColor(evt.category)}`}>
                        {evt.category}
                      </span>
                      <h4 className={`text-sm font-semibold ${evt.isCompleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                        {evt.title}
                      </h4>
                    </div>
                    {evt.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{evt.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 text-xs text-slate-400">
                  <div className="text-left sm:text-right">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      {formatDate(evt.startDate, 'EEE, MMM d, yyyy')}
                    </p>
                    <p className="text-[11px]">
                      {formatDate(evt.startDate, 'h:mm a')} – {formatDate(evt.endDate, 'h:mm a')}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(evt)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete event "${evt.title}"?`)) {
                          deleteEventMutation.mutate(evt.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CREATE / EDIT EVENT MODAL */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg card-notion p-6 shadow-xl dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editEventTarget ? 'Edit Event' : 'Create Academic Event'}
              </h3>
              <button onClick={() => setIsEventModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. InfoSec Midterm Preparation Session"
                  className="w-full rounded-[8px] border border-slate-300 p-2.5 text-slate-900 focus:border-[#0f6b57] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventStartDate}
                    onChange={(e) => setEventStartDate(e.target.value)}
                    className="w-full rounded-[8px] border border-slate-300 p-2.5 text-slate-900 focus:border-[#0f6b57] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">End Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventEndDate}
                    onChange={(e) => setEventEndDate(e.target.value)}
                    className="w-full rounded-[8px] border border-slate-300 p-2.5 text-slate-900 focus:border-[#0f6b57] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value)}
                    className="w-full rounded-[8px] border border-slate-300 p-2.5 text-slate-900 focus:border-[#0f6b57] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="QUIZ">Quiz / Pop Test</option>
                    <option value="MIDTERM">Midterm Exam</option>
                    <option value="FINAL">Final Exam</option>
                    <option value="ASSIGNMENT">Assignment Deadline</option>
                    <option value="PROJECT">Project Deadline</option>
                    <option value="PRESENTATION">Presentation</option>
                    <option value="LAB_SUBMISSION">Lab Submission</option>
                    <option value="CLASS">Class Lecture</option>
                    <option value="STUDY_SESSION">Study Session</option>
                    <option value="PERSONAL">Personal Academic Event</option>
                    <option value="UNIVERSITY">University Event</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Course</label>
                  <select
                    value={eventCourseId}
                    onChange={(e) => setEventCourseId(e.target.value)}
                    className="w-full rounded-[8px] border border-slate-300 p-2.5 text-slate-900 focus:border-[#0f6b57] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">None (Personal)</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Location / Room</label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="e.g. Lab 4B or Online Zoom"
                  className="w-full rounded-[8px] border border-slate-300 p-2.5 text-slate-900 focus:border-[#0f6b57] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Details, chapters, agenda..."
                  className="w-full rounded-[8px] border border-slate-300 p-2.5 text-slate-900 focus:border-[#0f6b57] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-[8px] dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveEventMutation.mutate()}
                disabled={saveEventMutation.isPending || !eventTitle || !eventStartDate}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0f6b57] hover:bg-[#0b5645] rounded-[8px] disabled:opacity-50"
              >
                {saveEventMutation.isPending ? 'Saving...' : editEventTarget ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Conflicts & Clustered Deadlines Review */}
      {showConflictsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-xl card-notion p-6 shadow-xl dark:bg-slate-900 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Schedule Conflicts & Clustered Deadlines
                </h3>
              </div>
              <button onClick={() => setShowConflictsModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Overlapping conflicts */}
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Overlapping Time Slot Conflicts ({(conflictData?.conflicts || []).length})
                </h4>
                {(conflictData?.conflicts || []).length === 0 ? (
                  <p className="text-slate-400 italic">No direct overlapping time slot conflicts detected.</p>
                ) : (
                  <div className="space-y-2">
                    {(conflictData?.conflicts || []).map((c: any, i: number) => (
                      <div key={i} className="p-3 rounded-[8px] border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
                        <p className="font-bold text-amber-900 dark:text-amber-200">
                          {c.eventA?.title} <span className="font-normal">conflicts with</span> {c.eventB?.title}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                          Overlap starts {format(new Date(c.overlapStart), 'MMM d, h:mm a')} • {c.conflictMinutes} mins overlap
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tight clusters */}
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Tight Deadline Clusters (&lt;24 hours apart) ({(conflictData?.tightClusters || []).length})
                </h4>
                {(conflictData?.tightClusters || []).length === 0 ? (
                  <p className="text-slate-400 italic">No tight exam or deadline clusters detected within 24 hours.</p>
                ) : (
                  <div className="space-y-2">
                    {(conflictData?.tightClusters || []).map((c: any, i: number) => (
                      <div key={i} className="p-3 rounded-[8px] border border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20">
                        <p className="font-bold text-rose-900 dark:text-rose-200">
                          {c.eventA?.title} & {c.eventB?.title}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                          Only {c.hoursApart} hours apart. Review your preparation roadmap to avoid cramming.
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowConflictsModal(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0f6b57] hover:bg-[#0b5645] rounded-[8px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
