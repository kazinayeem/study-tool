import React, { useState } from 'react';
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
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate, formatBytes } from '../../lib/utils';
import { Semester, Course } from '../../types';

export const SemesterDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<'courses' | 'documents' | 'notes' | 'exams' | 'assignments'>('courses');
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);

  // New Course fields
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCredits, setCourseCredits] = useState(3.0);
  const [courseTeacher, setCourseTeacher] = useState('');
  const [courseRoom, setCourseRoom] = useState('');
  const [courseColor, setCourseColor] = useState('#4f46e5');

  const queryClient = useQueryClient();

  const { data: semester, isLoading } = useQuery<Semester>({
    queryKey: ['semester', id],
    queryFn: () => api.getSemester(id!),
    enabled: !!id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', { semesterId: id }],
    queryFn: () => api.getDocuments({ semesterId: id! }),
    enabled: !!id && tab === 'documents',
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['notes', { semesterId: id }],
    queryFn: () => api.getNotes({ semesterId: id! }),
    enabled: !!id && tab === 'notes',
  });

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
      <div className="p-8 space-y-6">
        <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!semester) {
    return (
      <div className="p-8 text-center text-slate-500">
        Semester workspace not found. <Link to="/semesters" className="text-indigo-600 underline">Return to Semesters</Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Semester Header Workspace */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                {semester.status}
              </span>
              <span className="text-xs text-slate-400">
                {formatDate(semester.startDate, 'MMM d, yyyy')} – {formatDate(semester.endDate, 'MMM d, yyyy')}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {semester.name}
            </h1>
            {semester.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                {semester.description}
              </p>
            )}
          </div>

          <button
            onClick={() => setIsCreateCourseOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 self-start md:self-auto"
          >
            <Plus className="h-4 w-4" />
            Add Course to Term
          </button>
        </div>

        {semester.academicGoals && (
          <div className="mt-4 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs">
            <span className="font-semibold text-indigo-900 dark:text-indigo-300">Term Goals: </span>
            <span className="text-slate-700 dark:text-slate-300">{semester.academicGoals}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mt-6 flex border-b border-slate-200 gap-6 text-xs font-semibold dark:border-slate-800">
          {[
            { id: 'courses', label: `Courses (${semester.courses?.length || 0})`, icon: GraduationCap },
            { id: 'documents', label: `Documents (${semester._count?.documents || 0})`, icon: FolderOpen },
            { id: 'notes', label: `Notes (${semester._count?.notes || 0})`, icon: FileText },
            { id: 'exams', label: `Exams (${semester._count?.exams || 0})`, icon: Award },
            { id: 'assignments', label: `Assignments (${semester._count?.assignments || 0})`, icon: CheckSquare },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`flex items-center gap-2 border-b-2 pb-3 transition-colors ${
                  tab === t.id
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT: COURSES */}
      {tab === 'courses' && (
        <div className="space-y-4">
          {(!semester.courses || semester.courses.length === 0) ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
              <GraduationCap className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No courses in this semester yet</p>
              <button
                onClick={() => setIsCreateCourseOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline"
              >
                + Add your first course
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {semester.courses.map((course: any) => (
                <div
                  key={course.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {course.code}
                      </span>
                      <span className="text-xs font-medium text-slate-400">{course.credits} Credits</span>
                    </div>
                    <Link
                      to={`/courses/${course.id}`}
                      className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 text-sm block"
                    >
                      {course.title}
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {course.teacherName || 'Instructor TBA'} {course.roomNumber ? `• ${course.roomNumber}` : ''}
                    </p>
                    {course.classSchedule && (
                      <p className="text-[11px] text-slate-400 mt-2 font-mono">
                        ⏰ {course.classSchedule}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {course._count?.documents || 0} docs • {course._count?.notes || 0} notes
                    </span>
                    <Link
                      to={`/courses/${course.id}`}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      Workspace <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: DOCUMENTS */}
      {tab === 'documents' && (
        <div className="space-y-3">
          {documents.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No documents uploaded for this semester.</p>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
              {documents.map((doc: any) => (
                <div key={doc.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <div className="flex items-center gap-3 truncate">
                    <div className="h-8 w-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                      PDF
                    </div>
                    <div className="truncate">
                      <Link to={`/documents/${doc.id}/view`} className="text-xs font-semibold text-slate-900 dark:text-white hover:text-indigo-600 truncate block">
                        {doc.title}
                      </Link>
                      <span className="text-[10px] text-slate-400">
                        {doc.category} • {formatBytes(doc.fileSize)} • {doc.pageCount} pages
                      </span>
                    </div>
                  </div>
                  <Link
                    to={`/documents/${doc.id}/view`}
                    className="text-xs font-semibold text-indigo-600 hover:underline shrink-0"
                  >
                    Open Viewer →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: NOTES */}
      {tab === 'notes' && (
        <div className="space-y-3">
          {notes.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No notes created for this semester.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notes.map((note: any) => (
                <Link
                  key={note.id}
                  to={`/notes?id=${note.id}`}
                  className="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-slate-300 transition-colors block"
                >
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{note.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Updated {formatDate(note.updatedAt, 'MMM d, yyyy')}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE COURSE MODAL */}
      {isCreateCourseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Course to {semester.name}</h3>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="e.g. CSE443"
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Credits</label>
                  <input
                    type="number"
                    step="0.5"
                    value={courseCredits}
                    onChange={(e) => setCourseCredits(parseFloat(e.target.value) || 3.0)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="e.g. Information System Security"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Instructor</label>
                  <input
                    type="text"
                    value={courseTeacher}
                    onChange={(e) => setCourseTeacher(e.target.value)}
                    placeholder="e.g. Dr. Alan Vance"
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Room</label>
                  <input
                    type="text"
                    value={courseRoom}
                    onChange={(e) => setCourseRoom(e.target.value)}
                    placeholder="e.g. Lab 4B"
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateCourseOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createCourseMutation.mutate()}
                disabled={createCourseMutation.isPending || !courseCode || !courseTitle}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
              >
                {createCourseMutation.isPending ? 'Adding...' : 'Add Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
