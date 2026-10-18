import React, { useState } from 'react';
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

export const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');

  // Modal states
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editEventTarget, setEditEventTarget] = useState<CalendarEvent | null>(null);

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
    queryKey: ['courses'],
    queryFn: () => api.getCourses(),
  });

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar', { category: selectedCategory, courseId: selectedCourse }],
    queryFn: () => {
      const p: Record<string, string> = {};
      if (selectedCategory) p.category = selectedCategory;
      if (selectedCourse) p.courseId = selectedCourse;
      return api.getCalendarEvents(p);
    },
  });

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
        return 'bg-indigo-600 text-white';
      case 'STUDY_SESSION':
        return 'bg-emerald-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Academic Calendar & Deadlines
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track midterm exams, finals, project milestones, class schedules, and study sessions.
          </p>
        </div>

        <button
          onClick={() => handleOpenAddOnDate(new Date())}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Event
        </button>
      </div>

      {/* Navigation & View Mode Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs dark:bg-slate-900 dark:border-slate-800">
        {/* Date Stepper */}
        <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-2">
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
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs dark:border-slate-800 dark:bg-slate-900">
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
                        isTodayDate ? 'bg-indigo-600 text-white' : ''
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
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs dark:border-slate-800 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
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
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
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
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">End Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventEndDate}
                    onChange={(e) => setEventEndDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="MIDTERM">Midterm Exam</option>
                    <option value="FINAL">Final Exam</option>
                    <option value="ASSIGNMENT">Assignment Deadline</option>
                    <option value="PROJECT">Project Submission</option>
                    <option value="LAB">Lab Session</option>
                    <option value="CLASS">Class Schedule</option>
                    <option value="STUDY_SESSION">Study Session</option>
                    <option value="REMINDER">Personal Reminder</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Course</label>
                  <select
                    value={eventCourseId}
                    onChange={(e) => setEventCourseId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Details, chapters, agenda..."
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveEventMutation.mutate()}
                disabled={saveEventMutation.isPending || !eventTitle || !eventStartDate}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
              >
                {saveEventMutation.isPending ? 'Saving...' : editEventTarget ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
