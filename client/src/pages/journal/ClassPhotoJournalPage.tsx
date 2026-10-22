import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  Calendar,
  Search,
  Filter,
  Plus,
  Grid,
  List,
  Sparkles,
  BookOpen,
  MapPin,
  User,
  Trash2,
  Edit2,
  Download,
  Maximize2,
  CalendarDays,
  ChevronRight,
  Info,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate, formatBytes } from '../../lib/utils';
import { Semester, Course, ClassSession, ClassPhoto } from '../../types';
import { AddClassPhotoModal } from '../../components/journal/AddClassPhotoModal';
import { PhotoLightboxModal } from '../../components/journal/PhotoLightboxModal';
import { AcademicBreadcrumb } from '../../components/common/AcademicBreadcrumb';

export const ClassPhotoJournalPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { id: routeId, semesterId: routeSemesterId, sessionId: routeSessionId } = useParams<{
    id?: string;
    semesterId?: string;
    sessionId?: string;
  }>();
  const queryClient = useQueryClient();

  // URL state query params
  const paramSemesterId = routeId || routeSemesterId || searchParams.get('semesterId');
  const paramCourseId = searchParams.get('courseId');
  const paramDate = searchParams.get('date');

  // Filters State
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>(paramSemesterId || '');
  const [selectedCourseId, setSelectedCourseId] = useState<string>(paramCourseId || '');
  const [selectedDate, setSelectedDate] = useState<string>(paramDate || '');
  const [quickFilter, setQuickFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<'sessions' | 'gallery'>('sessions');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeSessionForAdd, setActiveSessionForAdd] = useState<ClassSession | null>(null);
  const [lightboxSession, setLightboxSession] = useState<ClassSession | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Edit Session State
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);

  // Sync route semester ID
  useEffect(() => {
    const semId = routeId || routeSemesterId || searchParams.get('semesterId');
    if (semId) {
      setSelectedSemesterId(semId);
    }
  }, [routeId, routeSemesterId, searchParams]);
  const [editTopic, setEditTopic] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [editTeacher, setEditTeacher] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Delete Session Confirmation
  const [sessionToDelete, setSessionToDelete] = useState<ClassSession | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync state to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedSemesterId) params.set('semesterId', selectedSemesterId);
    if (selectedCourseId) params.set('courseId', selectedCourseId);
    if (selectedDate) params.set('date', selectedDate);
    setSearchParams(params, { replace: true });
  }, [selectedSemesterId, selectedCourseId, selectedDate, setSearchParams]);

  // Fetch Semesters
  const { data: semesters = [], isLoading: isSemestersLoading } = useQuery<Semester[]>({
    queryKey: ['semesters'],
    queryFn: () => api.getSemesters(),
  });

  // Automatically select active or first semester
  useEffect(() => {
    if (semesters.length > 0 && !selectedSemesterId) {
      const active = semesters.find((s) => s.status === 'ACTIVE') || semesters[0];
      setSelectedSemesterId(active.id);
    }
  }, [semesters, selectedSemesterId]);

  // Fetch Courses for active semester
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses', { semesterId: selectedSemesterId }],
    queryFn: () => api.getCourses(selectedSemesterId || undefined),
    enabled: !!selectedSemesterId,
  });

  // Filter courses strictly belonging to the selected semester
  const semesterCourses = useMemo(() => {
    return courses.filter((c) => c.semesterId === selectedSemesterId);
  }, [courses, selectedSemesterId]);

  // Reset or adjust course filter if changed semester
  useEffect(() => {
    if (selectedCourseId && !semesterCourses.some((c) => c.id === selectedCourseId)) {
      setSelectedCourseId('');
    }
  }, [selectedSemesterId, semesterCourses, selectedCourseId]);

  // Fetch Calendar date badges with photo counts
  const { data: dateBadges = [] } = useQuery({
    queryKey: ['classSessionDates', { semesterId: selectedSemesterId, courseId: selectedCourseId }],
    queryFn: () => api.getClassSessionDates(selectedSemesterId || undefined, selectedCourseId || undefined),
    enabled: !!selectedSemesterId,
  });

  // Fetch Class Sessions
  const { data: sessions = [], isLoading: isSessionsLoading } = useQuery<ClassSession[]>({
    queryKey: [
      'classSessions',
      {
        semesterId: selectedSemesterId,
        courseId: selectedCourseId,
        date: selectedDate,
        quickFilter,
        search: debouncedSearch,
      },
    ],
    queryFn: () =>
      api.getClassSessions({
        semesterId: selectedSemesterId || undefined,
        courseId: selectedCourseId || undefined,
        date: selectedDate || undefined,
        quickFilter: selectedDate ? undefined : quickFilter,
        search: debouncedSearch || undefined,
      }),
    enabled: !!selectedSemesterId,
  });

  // If a specific session ID is targeted in the URL route, auto-open lightbox
  useEffect(() => {
    if (routeSessionId && sessions.length > 0) {
      const match = sessions.find((s) => s.id === routeSessionId);
      if (match) {
        setLightboxSession(match);
        setLightboxIndex(0);
      }
    }
  }, [routeSessionId, sessions]);

  // Flat array of all photos for Gallery View
  const allPhotosWithSession = useMemo(() => {
    const list: { photo: ClassPhoto; session: ClassSession }[] = [];
    for (const session of sessions) {
      for (const photo of session.photos || []) {
        list.push({ photo, session });
      }
    }
    return list;
  }, [sessions]);

  // Current selected semester & course objects
  const currentSemester = semesters.find((s) => s.id === selectedSemesterId);
  const currentCourse = courses.find((c) => c.id === selectedCourseId);

  // Delete session mutation

  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => api.deleteClassSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSessions'] });
      queryClient.invalidateQueries({ queryKey: ['classSessionDates'] });
      setSessionToDelete(null);
    },
  });

  // Update session metadata mutation
  const updateSessionMutation = useMutation({
    mutationFn: (data: { id: string; topic: string; roomNumber?: string; teacherName?: string; description?: string }) =>
      api.updateClassSession(data.id, {
        topic: data.topic,
        roomNumber: data.roomNumber || null,
        teacherName: data.teacherName || null,
        description: data.description || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSessions'] });
      setEditingSession(null);
    },
  });

  const handleOpenAddModal = (session?: ClassSession) => {
    setActiveSessionForAdd(session || null);
    setIsAddModalOpen(true);
  };

  const handleOpenLightbox = (session: ClassSession, photoIndex: number) => {
    setLightboxSession(session);
    setLightboxIndex(photoIndex);
  };

  const handleQuickFilterClick = (filter: 'today' | 'week' | 'month' | 'all') => {
    setQuickFilter(filter);
    setSelectedDate('');
  };

  const handleDatePick = (dateVal: string) => {
    setSelectedDate(dateVal);
    setQuickFilter('all');
  };

  const clearAllFilters = () => {
    setSelectedCourseId('');
    setSelectedDate('');
    setQuickFilter('all');
    setSearchInput('');
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Academic Context Breadcrumb */}
      <AcademicBreadcrumb

        semesterName={currentSemester?.name}
        courseCode={currentCourse?.code}
        courseName={currentCourse?.title}
        moduleName="Class Photo Journal"
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e3df] dark:border-[#1e293b]">

        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-[8px] bg-[#0f6b57]/10 text-[#0f6b57] dark:bg-[#0f6b57]/20 dark:text-[#4ccba5]">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Smart Class Photo Journal
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Semester-based classroom whiteboard & blackboard photo archive
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-[8px] bg-[#0f6b57] hover:bg-[#0b5645] text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
          >
            <Camera className="h-4 w-4" />
            <span>+ Capture Board Photo</span>
          </button>
        </div>
      </div>

      {/* Semester Selector Tabs / Pill Bar */}
      <div className="card-notion p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1 shrink-0">
            Semester:
          </span>
          {semesters.map((sem) => (
            <button
              key={sem.id}
              onClick={() => {
                setSelectedSemesterId(sem.id);
                setSelectedCourseId('');
              }}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedSemesterId === sem.id
                  ? 'bg-[#0f6b57] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
              }`}
            >
              <span>{sem.name}</span>
              {sem.status === 'ACTIVE' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              )}
            </button>
          ))}
        </div>

        {currentSemester && (
          <Link
            to={`/semesters/${currentSemester.id}`}
            className="text-xs text-[#0f6b57] hover:underline flex items-center gap-1 shrink-0 font-medium"
          >
            <span>View {currentSemester.name} Overview</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {/* Filter & Calendar Controls Toolbar */}
      <div className="card-notion p-4 space-y-4">
        {/* Row 1: Search, Subject Filter, Date Picker, View Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search topic, course, caption..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-[#e5e3df] dark:border-[#27272a] rounded-[8px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0f6b57]"
            />
          </div>

          {/* Course Filter (only shows courses belonging to current semester) */}
          <div>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-white dark:bg-slate-900 border border-[#e5e3df] dark:border-[#27272a] rounded-[8px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0f6b57]"
            >
              <option value="">All Subjects / Courses</option>
              {semesterCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDatePick(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-white dark:bg-slate-900 border border-[#e5e3df] dark:border-[#27272a] rounded-[8px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0f6b57]"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => setViewMode('sessions')}
              className={`p-2 rounded-[8px] text-xs font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'sessions'
                  ? 'bg-[#0f6b57]/10 text-[#0f6b57] dark:bg-[#0f6b57]/20 dark:text-[#4ccba5]'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Timeline Sessions View"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Timeline</span>
            </button>
            <button
              onClick={() => setViewMode('gallery')}
              className={`p-2 rounded-[8px] text-xs font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'gallery'
                  ? 'bg-[#0f6b57]/10 text-[#0f6b57] dark:bg-[#0f6b57]/20 dark:text-[#4ccba5]'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Photo Gallery Grid View"
            >
              <Grid className="h-4 w-4" />
              <span className="hidden sm:inline">Photo Grid</span>
            </button>
          </div>
        </div>

        {/* Row 2: Quick Date Filter Chips & Highlights */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#e5e3df]/60 dark:border-[#1e293b]/60">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] font-medium text-slate-400">Quick Filters:</span>
            {(['today', 'week', 'month', 'all'] as const).map((qf) => (
              <button
                key={qf}
                onClick={() => handleQuickFilterClick(qf)}
                className={`px-2.5 py-1 rounded-[6px] text-xs font-medium capitalize transition-colors ${
                  quickFilter === qf && !selectedDate
                    ? 'bg-[#0f6b57] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {qf === 'all' ? 'All Dates' : qf === 'today' ? 'Today' : `This ${qf}`}
              </button>
            ))}

            {(selectedCourseId || selectedDate || debouncedSearch || quickFilter !== 'all') && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline ml-2"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Date Highlights Indicator */}
          {dateBadges.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>
                {dateBadges.length} class date{dateBadges.length === 1 ? '' : 's'} with photos archived
              </span>
            </div>
          )}
        </div>

        {/* Calendar Quick Days Strip (recent days with photos) */}
        {dateBadges.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-2 scrollbar-none">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider shrink-0">
              Days with Board Notes:
            </span>
            {dateBadges.slice(0, 8).map((badge) => (
              <button
                key={badge.date}
                onClick={() => handleDatePick(badge.date)}
                className={`px-2.5 py-1 rounded-[6px] text-xs font-mono transition-colors flex items-center gap-1.5 shrink-0 ${
                  selectedDate === badge.date
                    ? 'bg-[#0f6b57] text-white font-semibold'
                    : 'bg-[#0f6b57]/10 text-[#0f6b57] dark:bg-[#0f6b57]/20 dark:text-[#4ccba5] hover:bg-[#0f6b57]/20'
                }`}
              >
                <Calendar className="h-3 w-3" />
                <span>{badge.date}</span>
                <span className="px-1 py-0.2 rounded-full bg-white/30 text-[10px]">
                  {badge.photoCount}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {isSessionsLoading ? (
        <div className="space-y-4">
          <div className="h-32 card-notion bg-[#f0eeec] dark:bg-slate-800 animate-pulse" />
          <div className="h-48 card-notion bg-[#f0eeec] dark:bg-slate-800 animate-pulse" />
        </div>
      ) : sessions.length === 0 ? (
        /* Empty State */
        <div className="card-notion p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#0f6b57]/10 text-[#0f6b57] dark:bg-[#0f6b57]/20 dark:text-[#4ccba5] flex items-center justify-center mx-auto">
            <Camera className="h-7 w-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              No Board Photos Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {debouncedSearch || selectedDate || selectedCourseId
                ? 'No class sessions match your current filter criteria. Try clearing filters or searching another keyword.'
                : 'Never lose a blackboard or whiteboard formula again. Capture board photos during class and organize them by date and course.'}
            </p>
          </div>
          <div>
            <button
              onClick={() => handleOpenAddModal()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-[#0f6b57] hover:bg-[#0b5645] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Camera className="h-4 w-4" />
              <span>Capture Today's Board Notes</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'gallery' ? (
        /* Pure Photo Grid / Gallery View */
        <div className="space-y-4">
          <div className="text-xs text-slate-500 font-medium">
            Showing {allPhotosWithSession.length} board photo{allPhotosWithSession.length === 1 ? '' : 's'} across {sessions.length} class session{sessions.length === 1 ? '' : 's'}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {allPhotosWithSession.map(({ photo, session }) => (
              <div
                key={photo.id}
                onClick={() => {
                  const idx = session.photos.findIndex((p) => p.id === photo.id);
                  handleOpenLightbox(session, idx >= 0 ? idx : 0);
                }}
                className="group relative aspect-4/3 rounded-[10px] overflow-hidden bg-slate-900 border border-[#e5e3df] dark:border-[#27272a] shadow-xs cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all"
              >
                <img
                  src={api.getClassPhotoFileUrl(photo.id)}
                  alt={photo.caption || photo.originalFilename}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                />

                {/* Course Badge Overlay */}
                <div className="absolute top-2 left-2">
                  <span
                    className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold text-white shadow-xs"
                    style={{ backgroundColor: session.course?.color || '#0f6b57' }}
                  >
                    {session.course?.code}
                  </span>
                </div>

                {/* Hover Details Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5 text-white">
                  <p className="text-xs font-semibold truncate">
                    {photo.caption || session.topic}
                  </p>
                  <p className="text-[10px] text-slate-300">
                    {formatDate(session.sessionDate)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Timeline View: Chronological Session Cards */
        <div className="space-y-6">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="card-notion overflow-hidden border border-[#e5e3df] dark:border-[#27272a] shadow-xs transition-shadow hover:shadow-md"
            >
              {/* Session Header */}
              <div className="p-4 sm:p-5 border-b border-[#e5e3df]/70 dark:border-[#27272a]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#faf9f8] dark:bg-[#1c1c22]">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-3 self-stretch rounded-full shrink-0"
                    style={{ backgroundColor: session.course?.color || '#0f6b57' }}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className="px-2.5 py-0.5 text-xs font-bold rounded-[4px] text-white"
                        style={{ backgroundColor: session.course?.color || '#0f6b57' }}
                      >
                        {session.course?.code}
                      </span>
                      <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {session.topic}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                        <Calendar className="h-3.5 w-3.5 text-[#0f6b57]" />
                        {formatDate(session.sessionDate)}
                      </span>
                      {session.course?.title && (
                        <span className="hidden md:inline-block">
                          • {session.course.title}
                        </span>
                      )}
                      {session.teacherName && (
                        <span className="flex items-center gap-1">
                          • <User className="h-3 w-3" /> {session.teacherName}
                        </span>
                      )}
                      {session.roomNumber && (
                        <span className="flex items-center gap-1">
                          • <MapPin className="h-3 w-3" /> {session.roomNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Session Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleOpenAddModal(session)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] text-xs font-medium bg-[#0f6b57]/10 text-[#0f6b57] hover:bg-[#0f6b57]/20 dark:bg-[#0f6b57]/20 dark:text-[#4ccba5] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Photos</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingSession(session);
                      setEditTopic(session.topic);
                      setEditRoom(session.roomNumber || '');
                      setEditTeacher(session.teacherName || '');
                      setEditDescription(session.description || '');
                    }}
                    title="Edit Session Metadata"
                    className="p-1.5 rounded-[6px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => setSessionToDelete(session)}
                    title="Delete Class Session"
                    className="p-1.5 rounded-[6px] text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Description if present */}
              {session.description && (
                <div className="px-5 pt-3 pb-1 text-xs text-slate-600 dark:text-slate-300">
                  <p>{session.description}</p>
                </div>
              )}

              {/* Photo Thumbnails Grid */}
              <div className="p-4 sm:p-5">
                {session.photos.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-[#e5e3df] dark:border-[#27272a] rounded-[8px]">
                    No photos in this session yet.{' '}
                    <button
                      onClick={() => handleOpenAddModal(session)}
                      className="text-[#0f6b57] underline font-medium"
                    >
                      Click to capture/upload
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {session.photos.map((photo, pIdx) => (
                      <div
                        key={photo.id}
                        onClick={() => handleOpenLightbox(session, pIdx)}
                        className="group relative aspect-4/3 rounded-[8px] overflow-hidden bg-slate-900 border border-[#e5e3df] dark:border-[#27272a] shadow-xs cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                      >
                        <img
                          src={api.getClassPhotoFileUrl(photo.id)}
                          alt={photo.caption || photo.originalFilename}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                        />

                        {/* Hover Overlay with Caption */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 text-white">
                          <div className="flex justify-end">
                            <Maximize2 className="h-3.5 w-3.5 text-white/80" />
                          </div>
                          <div>
                            <p className="text-[11px] font-medium line-clamp-2 leading-tight">
                              {photo.caption || photo.originalFilename}
                            </p>
                            <span className="text-[9px] text-slate-300 font-mono">
                              {formatBytes(photo.fileSize)}
                            </span>
                          </div>
                        </div>

                        {/* Caption pill if set and not hovered */}
                        {photo.caption && (
                          <div className="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded-[4px] bg-black/70 text-[10px] text-slate-100 truncate group-hover:opacity-0 transition-opacity">
                            {photo.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Capture Photos Modal */}
      <AddClassPhotoModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setActiveSessionForAdd(null);
        }}
        onSuccess={(savedSession) => {
          queryClient.invalidateQueries({ queryKey: ['classSessions'] });
          queryClient.invalidateQueries({ queryKey: ['classSessionDates'] });
          setIsAddModalOpen(false);
          setActiveSessionForAdd(null);
          // Open lightbox directly on the newly saved session
          if (savedSession.photos.length > 0) {
            setLightboxSession(savedSession);
            setLightboxIndex(0);
          }
        }}
        semesters={semesters}
        courses={courses}
        defaultSemesterId={selectedSemesterId}
        defaultCourseId={selectedCourseId}
        defaultDate={selectedDate}
        existingSession={activeSessionForAdd}
      />

      {/* Lightbox Viewer */}
      {lightboxSession && (
        <PhotoLightboxModal
          isOpen={!!lightboxSession}
          onClose={() => setLightboxSession(null)}
          session={lightboxSession}
          initialPhotoIndex={lightboxIndex}
          onPhotoDeleted={() => {
            queryClient.invalidateQueries({ queryKey: ['classSessions'] });
            queryClient.invalidateQueries({ queryKey: ['classSessionDates'] });
          }}
          onPhotoUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['classSessions'] });
          }}
          onAddMorePhotos={(session) => {
            setLightboxSession(null);
            handleOpenAddModal(session);
          }}
        />
      )}

      {/* Edit Session Modal */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#18181b] rounded-[12px] border border-[#e5e3df] dark:border-[#27272a] p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Edit Class Session
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Topic Title
                </label>
                <input
                  type="text"
                  value={editTopic}
                  onChange={(e) => setEditTopic(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-900 border border-[#e5e3df] dark:border-[#27272a] rounded-[8px] px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0f6b57]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Room Number
                  </label>
                  <input
                    type="text"
                    value={editRoom}
                    onChange={(e) => setEditRoom(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-[#e5e3df] dark:border-[#27272a] rounded-[8px] px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0f6b57]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Teacher Name
                  </label>
                  <input
                    type="text"
                    value={editTeacher}
                    onChange={(e) => setEditTeacher(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-[#e5e3df] dark:border-[#27272a] rounded-[8px] px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0f6b57]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Description / Notes
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-900 border border-[#e5e3df] dark:border-[#27272a] rounded-[8px] px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0f6b57] resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="px-3.5 py-1.5 rounded-[8px] text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editTopic.trim()) return;
                  updateSessionMutation.mutate({
                    id: editingSession.id,
                    topic: editTopic.trim(),
                    roomNumber: editRoom.trim() || undefined,
                    teacherName: editTeacher.trim() || undefined,
                    description: editDescription.trim() || undefined,
                  });
                }}
                disabled={updateSessionMutation.isPending}
                className="px-4 py-1.5 rounded-[8px] text-xs font-semibold bg-[#0f6b57] hover:bg-[#0b5645] text-white"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#18181b] rounded-[12px] border border-[#e5e3df] dark:border-[#27272a] p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Delete Class Session?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Are you sure you want to delete <span className="font-semibold text-slate-700 dark:text-slate-200">"{sessionToDelete.topic}"</span> and all {sessionToDelete.photos?.length || 0} board photo(s)? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="px-3.5 py-1.5 rounded-[8px] text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteSessionMutation.mutate(sessionToDelete.id)}
                disabled={deleteSessionMutation.isPending}
                className="px-4 py-1.5 rounded-[8px] text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white"
              >
                Delete Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
