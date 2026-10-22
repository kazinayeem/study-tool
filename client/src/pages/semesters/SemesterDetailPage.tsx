import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  GraduationCap,
  FolderOpen,
  FileText,
  Award,
  CheckSquare,
  Calendar,
  Plus,
  ArrowRight,
  BookOpen,
  CheckCircle,
  FileCode,
  Camera,
  ExternalLink,
  Clock,
  AlertTriangle,
  Target,
  Sparkles,
  BarChart2,
  Check,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate, formatBytes, formatRelativeDeadline } from '../../lib/utils';
import { Semester, Course, ClassSession, Assignment, Exam } from '../../types';
import { AddClassPhotoModal } from '../../components/journal/AddClassPhotoModal';
import { PhotoLightboxModal } from '../../components/journal/PhotoLightboxModal';
import { useActiveSemester } from '../../hooks/useActiveSemester';

export const SemesterDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { activeSemesterId, selectSemester } = useActiveSemester();

  const [tab, setTab] = useState<'overview' | 'courses' | 'assignments' | 'exams' | 'journal' | 'documents' | 'notes' | 'grades'>('overview');
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [isAddPhotoOpen, setIsAddPhotoOpen] = useState(false);
  const [lightboxSession, setLightboxSession] = useState<ClassSession | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // New Course fields
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCredits, setCourseCredits] = useState(3.0);
  const [courseTeacher, setCourseTeacher] = useState('');
  const [courseRoom, setCourseRoom] = useState('');
  const [courseColor, setCourseColor] = useState('#0f6b57');

  const queryClient = useQueryClient();

  // 1. Fetch Semester Details
  const { data: semester, isLoading } = useQuery<Semester>({
    queryKey: ['semester', id],
    queryFn: () => api.getSemester(id!),
    enabled: !!id,
  });

  // 2. Fetch Assignments for this semester
  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ['assignments', { semesterId: id }],
    queryFn: () => api.getAssignments({ semesterId: id! }),
    enabled: !!id,
  });

  // 3. Fetch Exams for this semester
  const { data: exams = [] } = useQuery<Exam[]>({
    queryKey: ['exams', { semesterId: id }],
    queryFn: () => api.getExams({ semesterId: id! }),
    enabled: !!id,
  });

  // 4. Fetch Documents for this semester
  const { data: documents = [] } = useQuery({
    queryKey: ['documents', { semesterId: id }],
    queryFn: () => api.getDocuments({ semesterId: id! }),
    enabled: !!id,
  });

  // 5. Fetch Notes for this semester
  const { data: notes = [] } = useQuery({
    queryKey: ['notes', { semesterId: id }],
    queryFn: () => api.getNotes({ semesterId: id! }),
    enabled: !!id,
  });

  // 6. Fetch Class Photo Journal Sessions for this semester
  const { data: journalSessions = [] } = useQuery<ClassSession[]>({
    queryKey: ['classSessions', { semesterId: id }],
    queryFn: () => api.getClassSessions({ semesterId: id! }),
    enabled: !!id,
  });

  // 7. Fetch Assessments / Grades for this semester
  const { data: assessments = [] } = useQuery<any[]>({
    queryKey: ['assessments', { semesterId: id }],
    queryFn: () => api.getAssessments({ semesterId: id! }),
    enabled: !!id,
  });

  const totalBoardPhotos = journalSessions.reduce((acc, s) => acc + (s.photos?.length || 0), 0);
  const isCurrentlyActive = semester?.id === activeSemesterId || semester?.status === 'ACTIVE';

  // Semester Progress Calculation
  const progressPercent = useMemo(() => {
    if (!semester?.startDate || !semester?.endDate) return null;
    const start = new Date(semester.startDate).getTime();
    const end = new Date(semester.endDate).getTime();
    const now = Date.now();
    if (isNaN(start) || isNaN(end) || end <= start) return null;
    return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  }, [semester]);

  // Set Active Mutation
  const setActiveMutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      await selectSemester(id);
      await api.updateSemester(id, { status: 'ACTIVE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semester', id] });
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Create Course Mutation
  const createCourseMutation = useMutation({
    mutationFn: () =>
      api.createCourse({
        semesterId: id!,
        code: courseCode.trim().toUpperCase(),
        title: courseTitle.trim(),
        credits: Number(courseCredits),
        teacherName: courseTeacher.trim() || null,
        roomNumber: courseRoom.trim() || null,
        color: courseColor,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semester', id] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setIsCreateCourseOpen(false);
      setCourseCode('');
      setCourseTitle('');
      setCourseTeacher('');
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="h-40 card-notion bg-[#f0eeec] dark:bg-[#202024] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-60 card-notion bg-[#f0eeec] dark:bg-[#202024] animate-pulse" />
          <div className="h-60 card-notion bg-[#f0eeec] dark:bg-[#202024] animate-pulse" />
          <div className="h-60 card-notion bg-[#f0eeec] dark:bg-[#202024] animate-pulse" />
        </div>
      </div>
    );
  }

  if (!semester) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <AlertTriangle className="h-10 w-10 text-[#e03131] mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-[#1a1a1a] dark:text-white">Semester Workspace Not Found</h2>
        <p className="text-xs text-[#787671] mt-1 mb-4">
          The requested semester could not be found or may have been deleted.
        </p>
        <Link to="/semesters" className="btn-notion-primary text-xs">
          Return to Semesters
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* SEMESTER HERO HEADER WORKSPACE                                            */}
      {/* ========================================================================= */}
      <div className="card-notion p-6 bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] rounded-[12px] shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {isCurrentlyActive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d9f3e1] px-2.5 py-0.5 text-xs font-semibold text-[#1aae39] dark:bg-[#1aae39]/20 dark:text-[#1aae39] border border-[#1aae39]/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1aae39] animate-pulse" />
                  Active Semester
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#dcf0e8] px-2.5 py-0.5 text-xs font-semibold text-[#0f6b57] dark:bg-[#0d3b30]/50 dark:text-[#a8dcc9] border border-[#a8dcc9]/50">
                  {semester.status}
                </span>
              )}

              {semester.code && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-[4px] bg-[#ede9e4] dark:bg-[#252528] text-[#5d5b54] dark:text-[#a4a097]">
                  Code: {semester.code}
                </span>
              )}

              <span className="text-xs text-[#787671] flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5 text-[#0f6b57]" />
                {formatDate(semester.startDate, 'MMM d, yyyy')} – {formatDate(semester.endDate, 'MMM d, yyyy')}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a] dark:text-white">
              {semester.name}
            </h1>

            {semester.description && (
              <p className="text-xs text-[#787671] dark:text-[#a4a097] mt-1 max-w-2xl leading-[1.45]">
                {semester.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {!isCurrentlyActive && (
              <button
                onClick={() => setActiveMutation.mutate()}
                disabled={setActiveMutation.isPending}
                className="btn-notion-secondary text-xs h-[34px] px-3 gap-1.5 text-[#0f6b57]"
                title="Make this your active academic semester"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Set as Active</span>
              </button>
            )}

            <button
              onClick={() => setIsAddPhotoOpen(true)}
              className="btn-notion-secondary text-xs h-[34px] px-3 gap-1.5"
            >
              <Camera className="h-3.5 w-3.5 text-[#0f6b57]" />
              <span>Capture Photo</span>
            </button>

            <button
              onClick={() => setIsCreateCourseOpen(true)}
              className="btn-notion-primary text-xs h-[34px] px-3 gap-1.5 shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Course</span>
            </button>
          </div>
        </div>

        {/* Progress Bar & Academic Goals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#ede9e4] dark:border-[#252528]">
          {progressPercent !== null && (
            <div>
              <div className="flex items-center justify-between text-[11px] font-medium text-[#787671] mb-1">
                <span>Semester Progress ({progressPercent}%)</span>
                <span>Term Timeline</span>
              </div>
              <div className="w-full bg-[#ede9e4] dark:bg-[#252528] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0f6b57] rounded-full transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {semester.academicGoals && (
            <div className="text-xs p-2 rounded-[6px] bg-[#fbfbfa] dark:bg-[#19191c] border border-[#ede9e4] dark:border-[#2a2a2e] flex items-center gap-1.5">
              <span className="font-semibold text-[#0f6b57] shrink-0">🎯 Goal:</span>
              <span className="text-[#5d5b54] dark:text-[#a4a097] truncate">{semester.academicGoals}</span>
            </div>
          )}
        </div>

        {/* TAB NAVIGATION */}
        <div className="pt-2 flex border-b border-[#ede9e4] gap-5 text-xs font-semibold dark:border-[#252528] overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', label: 'Overview Hub', icon: Target },
            { id: 'courses', label: `Courses (${semester.courses?.length || 0})`, icon: GraduationCap },
            { id: 'assignments', label: `Assignments (${assignments.length})`, icon: CheckSquare },
            { id: 'exams', label: `Exams (${exams.length})`, icon: Award },
            { id: 'journal', label: `Board Photos (${totalBoardPhotos})`, icon: Camera },
            { id: 'documents', label: `Documents (${documents.length})`, icon: FolderOpen },
            { id: 'notes', label: `Notes (${notes.length})`, icon: FileText },
            { id: 'grades', label: 'Grades & CGPA', icon: BarChart2 },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`flex items-center gap-1.5 border-b-2 pb-2.5 transition-colors cursor-pointer shrink-0 ${
                  tab === t.id
                    ? 'border-[#0f6b57] text-[#0f6b57] dark:border-[#a8dcc9] dark:text-[#a8dcc9]'
                    : 'border-transparent text-[#787671] hover:text-[#1a1a1a] dark:text-[#a4a097] dark:hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW HUB (Executive Summary of this Semester)                   */}
      {/* ========================================================================= */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics summary row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-[10px] border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416]">
              <span className="text-[11px] font-medium text-[#787671] block">Courses</span>
              <div className="text-xl font-bold text-[#1a1a1a] dark:text-white mt-1">
                {semester.courses?.length || 0}
              </div>
            </div>
            <div className="p-3.5 rounded-[10px] border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416]">
              <span className="text-[11px] font-medium text-[#787671] block">Assignments</span>
              <div className="text-xl font-bold text-[#1a1a1a] dark:text-white mt-1">
                {assignments.length}
              </div>
            </div>
            <div className="p-3.5 rounded-[10px] border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416]">
              <span className="text-[11px] font-medium text-[#787671] block">Exams</span>
              <div className="text-xl font-bold text-[#1a1a1a] dark:text-white mt-1">
                {exams.length}
              </div>
            </div>
            <div className="p-3.5 rounded-[10px] border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416]">
              <span className="text-[11px] font-medium text-[#787671] block">Board Photos</span>
              <div className="text-xl font-bold text-[#1a1a1a] dark:text-white mt-1">
                {totalBoardPhotos}
              </div>
            </div>
            <div className="p-3.5 rounded-[10px] border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416]">
              <span className="text-[11px] font-medium text-[#787671] block">Documents</span>
              <div className="text-xl font-bold text-[#1a1a1a] dark:text-white mt-1">
                {documents.length}
              </div>
            </div>
            <div className="p-3.5 rounded-[10px] border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416]">
              <span className="text-[11px] font-medium text-[#787671] block">Notes</span>
              <div className="text-xl font-bold text-[#1a1a1a] dark:text-white mt-1">
                {notes.length}
              </div>
            </div>
          </div>

          {/* Two-column overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Upcoming Assignments & Exams */}
            <div className="card-notion p-5 bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] rounded-[12px] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#0f6b57]" />
                  Upcoming Assignments & Exams
                </h3>
                <button onClick={() => setTab('assignments')} className="text-xs text-[#0f6b57] hover:underline font-medium">
                  View All
                </button>
              </div>

              {assignments.length === 0 && exams.length === 0 ? (
                <p className="text-xs text-[#787671] py-6 text-center">No assignments or exams recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {assignments.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      className="p-3 rounded-[8px] border border-[#ede9e4] bg-[#fbfbfa] dark:bg-[#19191c] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-[#1a1a1a] dark:text-white block">{a.title}</span>
                        <span className="text-[10px] text-[#787671]">{a.course?.code || 'Course'} • Deadline {formatDate(a.deadline, 'MMM d, h:mm a')}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-[#fde0ec] text-[#e03131]">
                        {a.status}
                      </span>
                    </div>
                  ))}

                  {exams.slice(0, 2).map((e) => (
                    <div
                      key={e.id}
                      className="p-3 rounded-[8px] border border-[#ede9e4] bg-[#fbfbfa] dark:bg-[#19191c] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-[#1a1a1a] dark:text-white block">[{e.examType}] {e.title}</span>
                        <span className="text-[10px] text-[#787671]">{e.course?.code || 'Course'} • {formatDate(e.examDate, 'MMM d, h:mm a')}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-[#dcf0e8] text-[#0f6b57]">
                        Exam
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Recent Board Photos & Documents */}
            <div className="card-notion p-5 bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] rounded-[12px] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white flex items-center gap-2">
                  <Camera className="h-4 w-4 text-[#0f6b57]" />
                  Recent Class Board Photos
                </h3>
                <button onClick={() => setTab('journal')} className="text-xs text-[#0f6b57] hover:underline font-medium">
                  Open Journal
                </button>
              </div>

              {totalBoardPhotos === 0 ? (
                <div className="text-center py-6 text-[#787671]">
                  <p className="text-xs">No whiteboard photos captured yet.</p>
                  <button
                    onClick={() => setIsAddPhotoOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0f6b57] mt-2 hover:underline"
                  >
                    + Capture board photo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {journalSessions.flatMap((s) => s.photos).slice(0, 4).map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => {
                        const sess = journalSessions.find((s) => s.photos.some((p) => p.id === photo.id));
                        if (sess) {
                          setLightboxSession(sess);
                          setLightboxIndex(sess.photos.findIndex((p) => p.id === photo.id));
                        }
                      }}
                      className="aspect-4/3 rounded-[6px] overflow-hidden bg-slate-900 cursor-pointer hover:opacity-90 relative"
                    >
                      <img
                        src={api.getClassPhotoFileUrl(photo.id)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Semester Documents Preview */}
              <div className="pt-2 border-t border-[#ede9e4] dark:border-[#252528]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#1a1a1a] dark:text-white flex items-center gap-1.5">
                    <FolderOpen className="h-3.5 w-3.5 text-[#0f6b57]" />
                    Semester Documents ({documents.length})
                  </span>
                  <button onClick={() => setTab('documents')} className="text-[11px] text-[#0f6b57] hover:underline">
                    All Files
                  </button>
                </div>
                {documents.slice(0, 2).map((doc: any) => (
                  <Link
                    key={doc.id}
                    to={`/documents/${doc.id}/view`}
                    className="p-2 rounded-[6px] hover:bg-[#fbfbfa] dark:hover:bg-[#19191c] flex items-center justify-between text-xs block truncate"
                  >
                    <span className="truncate text-[#1a1a1a] dark:text-white">{doc.title}</span>
                    <span className="text-[10px] text-[#787671] shrink-0 ml-2">{formatBytes(doc.fileSize)}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COURSES                                                            */}
      {/* ========================================================================= */}
      {tab === 'courses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white">
              Courses in {semester.name} ({semester.courses?.length || 0})
            </h3>
            <button
              onClick={() => setIsCreateCourseOpen(true)}
              className="btn-notion-primary text-xs flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Course
            </button>
          </div>

          {(!semester.courses || semester.courses.length === 0) ? (
            <div className="card-notion p-8 text-center bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] rounded-[12px]">
              <GraduationCap className="h-8 w-8 mx-auto text-[#787671] mb-2" />
              <p className="text-sm font-semibold text-[#1a1a1a] dark:text-white">No courses in this semester yet</p>
              <button
                onClick={() => setIsCreateCourseOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f6b57] hover:underline"
              >
                + Add your first course
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {semester.courses.map((course: any) => (
                <div
                  key={course.id}
                  className="card-notion p-5 bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] rounded-[12px] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-[4px] text-white"
                        style={{ backgroundColor: course.color || '#0f6b57' }}
                      >
                        {course.code}
                      </span>
                      <span className="text-xs font-medium text-[#787671]">{course.credits || 3.0} Credits</span>
                    </div>
                    <Link
                      to={`/courses/${course.id}`}
                      className="font-bold text-[#1a1a1a] dark:text-white hover:text-[#0f6b57] text-sm block"
                    >
                      {course.title || course.name}
                    </Link>
                    <p className="text-xs text-[#787671] mt-1">
                      {course.teacherName || 'Instructor TBA'} {course.roomNumber ? `• ${course.roomNumber}` : ''}
                    </p>
                    {course.classSchedule && (
                      <p className="text-[11px] text-[#787671] mt-2 font-mono">
                        ⏰ {course.classSchedule}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#ede9e4] dark:border-[#252528] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-[#787671]">
                      <span>{course._count?.documents || 0} docs</span>
                      <span>•</span>
                      <Link
                        to={`/journal?semesterId=${id}&courseId=${course.id}`}
                        className="hover:text-[#0f6b57] flex items-center gap-1 font-medium transition-colors"
                      >
                        <Camera className="h-3 w-3" />
                        <span>
                          {journalSessions
                            .filter((s) => s.courseId === course.id)
                            .reduce((acc, s) => acc + (s.photos?.length || 0), 0)}{' '}
                          photos
                        </span>
                      </Link>
                    </div>
                    <Link
                      to={`/courses/${course.id}`}
                      className="text-xs font-semibold text-[#0f6b57] hover:underline flex items-center gap-1"
                    >
                      Workspace <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ASSIGNMENTS                                                        */}
      {/* ========================================================================= */}
      {tab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white">
              Assignments in {semester.name} ({assignments.length})
            </h3>
            <Link
              to={`/semesters/${id}/assignments`}
              className="text-xs font-semibold text-[#0f6b57] hover:underline flex items-center gap-1"
            >
              <span>Full Assignments Board</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {assignments.length === 0 ? (
            <p className="text-xs text-[#787671] py-8 text-center">No assignments found for this semester.</p>
          ) : (
            <div className="space-y-2.5">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="p-3.5 rounded-[8px] border border-[#ede9e4] bg-white dark:bg-[#141416] dark:border-[#2a2a2e] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1a1a1a] dark:text-white truncate">{a.title}</span>
                      <span className="text-[10px] text-[#787671]">({a.course?.code || 'Course'})</span>
                    </div>
                    <span className="text-[11px] text-[#787671] mt-0.5 block">
                      Deadline: {formatDate(a.deadline, 'EEEE, MMM d, yyyy • h:mm a')}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-[4px] bg-[#fde0ec] text-[#e03131]">
                      {a.status}
                    </span>
                    <span className="text-[10px] text-[#787671] block mt-0.5">
                      {formatRelativeDeadline(a.deadline)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: EXAMS                                                              */}
      {/* ========================================================================= */}
      {tab === 'exams' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white">
              Exams & Quizzes in {semester.name} ({exams.length})
            </h3>
            <Link
              to={`/semesters/${id}/exams`}
              className="text-xs font-semibold text-[#0f6b57] hover:underline flex items-center gap-1"
            >
              <span>Full Exams Board</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {exams.length === 0 ? (
            <p className="text-xs text-[#787671] py-8 text-center">No exams scheduled for this semester.</p>
          ) : (
            <div className="space-y-2.5">
              {exams.map((e) => (
                <div
                  key={e.id}
                  className="p-3.5 rounded-[8px] border border-[#ede9e4] bg-white dark:bg-[#141416] dark:border-[#2a2a2e] flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] bg-[#dcf0e8] text-[#0f6b57]">
                        {e.examType}
                      </span>
                      <span className="font-semibold text-[#1a1a1a] dark:text-white">{e.title}</span>
                    </div>
                    <span className="text-[11px] text-[#787671] mt-0.5 block">
                      {e.course?.code || 'Course'} • {formatDate(e.examDate, 'EEEE, MMM d, yyyy • h:mm a')}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-semibold text-[#0f6b57] block">
                      {formatRelativeDeadline(e.examDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: CLASS PHOTO JOURNAL                                                */}
      {/* ========================================================================= */}
      {tab === 'journal' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 card-notion bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] rounded-[12px]">
            <div>
              <h3 className="text-sm font-bold text-[#1a1a1a] dark:text-white flex items-center gap-2">
                <Camera className="h-4 w-4 text-[#0f6b57]" />
                Class Board Photo Archive ({totalBoardPhotos} photos)
              </h3>
              <p className="text-xs text-[#787671]">
                Whiteboard and blackboard notes captured during {semester.name} classes
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/journal?semesterId=${semester.id}`}
                className="btn-notion-secondary text-xs h-[32px] px-3 gap-1"
              >
                <span>Full Archive</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => setIsAddPhotoOpen(true)}
                className="btn-notion-primary text-xs h-[32px] px-3 gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Capture Photo</span>
              </button>
            </div>
          </div>

          {journalSessions.length === 0 ? (
            <div className="card-notion p-8 text-center space-y-3 bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] rounded-[12px]">
              <Camera className="h-8 w-8 mx-auto text-[#787671]" />
              <p className="text-sm font-semibold text-[#1a1a1a] dark:text-white">
                No class board photos archived in {semester.name} yet
              </p>
              <p className="text-xs text-[#787671] max-w-sm mx-auto">
                Take photos of whiteboard formulas, diagrams, and lecture notes directly with your camera.
              </p>
              <button
                onClick={() => setIsAddPhotoOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f6b57] hover:underline"
              >
                + Capture your first board photo
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {journalSessions.map((session) => (
                <div
                  key={session.id}
                  className="card-notion p-4 space-y-3 bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] rounded-[12px]"
                >
                  <div className="flex items-center justify-between border-b border-[#ede9e4] dark:border-[#252528] pb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 text-[11px] font-bold rounded-[4px] text-white"
                        style={{ backgroundColor: session.course?.color || '#0f6b57' }}
                      >
                        {session.course?.code}
                      </span>
                      <h4 className="text-xs font-bold text-[#1a1a1a] dark:text-white">
                        {session.topic}
                      </h4>
                    </div>
                    <span className="text-xs text-[#787671] font-medium">
                      {formatDate(session.sessionDate)}
                    </span>
                  </div>

                  {session.photos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                      {session.photos.map((photo, pIdx) => (
                        <div
                          key={photo.id}
                          onClick={() => {
                            setLightboxSession(session);
                            setLightboxIndex(pIdx);
                          }}
                          className="group relative aspect-4/3 rounded-[6px] overflow-hidden bg-slate-900 cursor-pointer hover:opacity-90 shadow-xs transition-transform hover:scale-[1.02]"
                        >
                          <img
                            src={api.getClassPhotoFileUrl(photo.id)}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                          {photo.caption && (
                            <div className="absolute bottom-0 inset-x-0 p-1 bg-black/60 text-[9px] text-white truncate">
                              {photo.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#787671] italic">No photos attached to this session.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: DOCUMENTS                                                          */}
      {/* ========================================================================= */}
      {tab === 'documents' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white">
              Documents in {semester.name} ({documents.length})
            </h3>
            <Link
              to={`/semesters/${id}/documents`}
              className="text-xs font-semibold text-[#0f6b57] hover:underline flex items-center gap-1"
            >
              <span>Document Drive</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {documents.length === 0 ? (
            <p className="text-xs text-[#787671] py-8 text-center">No documents uploaded for this semester.</p>
          ) : (
            <div className="card-notion overflow-hidden divide-y divide-[#ede9e4] dark:divide-[#252528] bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] rounded-[12px]">
              {documents.map((doc: any) => (
                <div key={doc.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-[#fbfbfa] dark:hover:bg-[#19191c]">
                  <div className="flex items-center gap-3 truncate">
                    <div className="h-8 w-8 rounded-[6px] bg-[#fde0ec] text-[#e03131] flex items-center justify-center font-bold text-[10px] shrink-0">
                      PDF
                    </div>
                    <div className="truncate">
                      <Link to={`/documents/${doc.id}/view`} className="text-xs font-semibold text-[#1a1a1a] dark:text-white hover:text-[#0f6b57] truncate block">
                        {doc.title}
                      </Link>
                      <span className="text-[10px] text-[#787671]">
                        {doc.category} • {formatBytes(doc.fileSize)} • {doc.pageCount} pages
                      </span>
                    </div>
                  </div>
                  <Link
                    to={`/documents/${doc.id}/view`}
                    className="text-xs font-semibold text-[#0f6b57] hover:underline shrink-0"
                  >
                    Open Viewer →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: NOTES                                                              */}
      {/* ========================================================================= */}
      {tab === 'notes' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white">
              Notes in {semester.name} ({notes.length})
            </h3>
            <Link
              to={`/notes`}
              className="text-xs font-semibold text-[#0f6b57] hover:underline flex items-center gap-1"
            >
              <span>All Notes</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {notes.length === 0 ? (
            <p className="text-xs text-[#787671] py-8 text-center">No notes created for this semester.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notes.map((note: any) => (
                <Link
                  key={note.id}
                  to={`/notes?id=${note.id}`}
                  className="p-4 card-notion bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] rounded-[10px] hover:border-[#c8c4be] transition-colors block"
                >
                  <h4 className="text-xs font-bold text-[#1a1a1a] dark:text-white truncate">{note.title}</h4>
                  <p className="text-[11px] text-[#787671] mt-1">Updated {formatDate(note.updatedAt, 'MMM d, yyyy')}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: GRADES & CGPA                                                      */}
      {/* ========================================================================= */}
      {tab === 'grades' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white">
              Grade Assessments in {semester.name} ({assessments.length})
            </h3>
            <Link
              to={`/semesters/${id}/grades`}
              className="text-xs font-semibold text-[#0f6b57] hover:underline flex items-center gap-1"
            >
              <span>Grades & CGPA Calculator</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {assessments.length === 0 ? (
            <div className="card-notion p-8 text-center bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] rounded-[12px]">
              <BarChart2 className="h-8 w-8 mx-auto text-[#787671] mb-2" />
              <p className="text-sm font-semibold text-[#1a1a1a] dark:text-white">No grade assessments recorded for this semester</p>
              <Link
                to={`/semesters/${id}/grades`}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f6b57] hover:underline"
              >
                + Record course grade assessment
              </Link>
            </div>
          ) : (
            <div className="card-notion overflow-hidden divide-y divide-[#ede9e4] dark:divide-[#252528] bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] rounded-[12px]">
              {assessments.map((ass: any) => (
                <div key={ass.id} className="p-3.5 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="font-semibold text-[#1a1a1a] dark:text-white block">{ass.name}</span>
                    <span className="text-[10px] text-[#787671]">{ass.course?.code || 'Course'} • Weight {ass.weight}%</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#1aae39]">
                      {ass.obtainedMarks !== null ? `${ass.obtainedMarks} / ${ass.maxMarks}` : 'Ungraded'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE COURSE MODAL */}
      {isCreateCourseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1530]/60 backdrop-blur-xs">
          <div className="w-full max-w-md card-notion p-6 shadow-xl bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] rounded-[12px] space-y-4">
            <h3 className="text-base font-bold text-[#1a1a1a] dark:text-white">Add Course to {semester.name}</h3>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#1a1a1a] dark:text-white mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="e.g. CSE443"
                    className="w-full rounded-[8px] border border-[#c8c4be] p-2.5 text-[#1a1a1a] focus:border-[#0f6b57] focus:outline-none dark:border-[#37352f] dark:bg-[#19191c] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#1a1a1a] dark:text-white mb-1">Credits</label>
                  <input
                    type="number"
                    step="0.5"
                    value={courseCredits}
                    onChange={(e) => setCourseCredits(parseFloat(e.target.value) || 3.0)}
                    className="w-full rounded-[8px] border border-[#c8c4be] p-2.5 text-[#1a1a1a] focus:border-[#0f6b57] focus:outline-none dark:border-[#37352f] dark:bg-[#19191c] dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-[#1a1a1a] dark:text-white mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="e.g. Information System Security"
                  className="w-full rounded-[8px] border border-[#c8c4be] p-2.5 text-[#1a1a1a] focus:border-[#0f6b57] focus:outline-none dark:border-[#37352f] dark:bg-[#19191c] dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#1a1a1a] dark:text-white mb-1">Instructor</label>
                  <input
                    type="text"
                    value={courseTeacher}
                    onChange={(e) => setCourseTeacher(e.target.value)}
                    placeholder="e.g. Dr. Alan Vance"
                    className="w-full rounded-[8px] border border-[#c8c4be] p-2.5 text-[#1a1a1a] focus:border-[#0f6b57] focus:outline-none dark:border-[#37352f] dark:bg-[#19191c] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#1a1a1a] dark:text-white mb-1">Room</label>
                  <input
                    type="text"
                    value={courseRoom}
                    onChange={(e) => setCourseRoom(e.target.value)}
                    placeholder="e.g. Lab 4B"
                    className="w-full rounded-[8px] border border-[#c8c4be] p-2.5 text-[#1a1a1a] focus:border-[#0f6b57] focus:outline-none dark:border-[#37352f] dark:bg-[#19191c] dark:text-white"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-[#ede9e4] dark:border-[#252528]">
              <button
                type="button"
                onClick={() => setIsCreateCourseOpen(false)}
                className="btn-notion-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createCourseMutation.mutate()}
                disabled={createCourseMutation.isPending || !courseCode || !courseTitle}
                className="btn-notion-primary text-xs"
              >
                {createCourseMutation.isPending ? 'Adding...' : 'Add Course'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PHOTO MODAL */}
      {isAddPhotoOpen && (
        <AddClassPhotoModal
          isOpen={isAddPhotoOpen}
          onClose={() => setIsAddPhotoOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['classSessions', { semesterId: id }] });
            setIsAddPhotoOpen(false);
          }}
          semesters={[semester]}
          courses={semester.courses || []}
          defaultSemesterId={semester.id}
        />
      )}

      {/* LIGHTBOX VIEWER */}
      {lightboxSession && (
        <PhotoLightboxModal
          isOpen={!!lightboxSession}
          onClose={() => setLightboxSession(null)}
          session={lightboxSession}
          initialPhotoIndex={lightboxIndex}
          onPhotoDeleted={() => {
            queryClient.invalidateQueries({ queryKey: ['classSessions', { semesterId: id }] });
          }}
          onPhotoUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['classSessions', { semesterId: id }] });
          }}
        />
      )}
    </div>
  );
};
