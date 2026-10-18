import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap,
  FolderOpen,
  FileText,
  Award,
  CheckSquare,
  Clock,
  BookOpen,
  Upload,
  Plus,
  ArrowRight,
  ShieldCheck,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate, formatBytes } from '../../lib/utils';
import { Course } from '../../types';

export const CourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<'overview' | 'documents' | 'notes' | 'exams' | 'assignments'>('overview');
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [progressVal, setProgressVal] = useState<number | null>(null);

  const queryClient = useQueryClient();

  const { data: course, isLoading } = useQuery<Course>({
    queryKey: ['course', id],
    queryFn: () => api.getCourse(id!),
    enabled: !!id,
  });

  const updateProgressMutation = useMutation({
    mutationFn: (newProgress: number) => api.updateCourse(id!, { progress: newProgress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', id] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8 text-center text-slate-500">
        Course not found. <Link to="/courses" className="text-indigo-600 underline">Return to Courses</Link>
      </div>
    );
  }

  const currentProgress = progressVal !== null ? progressVal : course.progress;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Course Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: course.color || '#4f46e5' }}
              />
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {course.code}
              </span>
              {course.section && (
                <span className="text-xs text-slate-400">Section {course.section}</span>
              )}
              {course.semester && (
                <Link
                  to={`/semesters/${course.semester.id}`}
                  className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {course.semester.name}
                </Link>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-2">
              {course.title}
            </h1>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Instructor: <strong>{course.teacherName || 'Faculty'}</strong>
              {course.teacherEmail ? ` (${course.teacherEmail})` : ''}
              {course.roomNumber ? ` • Room: ${course.roomNumber}` : ''}
            </p>
          </div>

          {/* Progress Control */}
          <div className="flex flex-col items-start md:items-end gap-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Syllabus Mastery:</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">{currentProgress}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={currentProgress}
              onChange={(e) => setProgressVal(parseInt(e.target.value, 10))}
              onMouseUp={() => updateProgressMutation.mutate(currentProgress)}
              onTouchEnd={() => updateProgressMutation.mutate(currentProgress)}
              className="h-1.5 w-36 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex border-b border-slate-200 gap-6 text-xs font-semibold dark:border-slate-800">
          {[
            { id: 'overview', label: 'Overview & Syllabus', icon: BookOpen },
            { id: 'documents', label: `Documents (${course.documents?.length || 0})`, icon: FolderOpen },
            { id: 'notes', label: `Study Notes (${course.notes?.length || 0})`, icon: FileText },
            { id: 'exams', label: `Exam Prep (${course.exams?.length || 0})`, icon: Award },
            { id: 'assignments', label: `Assignments (${course.assignments?.length || 0})`, icon: CheckSquare },
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

      {/* TAB: OVERVIEW */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Description & Syllabus */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Course Syllabus & Description</h3>
              {course.description && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {course.description}
                </p>
              )}
              {course.syllabus ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1.5">Syllabus Breakdown:</h4>
                  <p className="whitespace-pre-line leading-relaxed">{course.syllabus}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">No detailed syllabus added yet.</p>
              )}
            </div>

            {/* Preparation Notes for Midterm & Final */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-500" />
                  Midterm Exam Strategy
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {course.midtermPrepNotes || 'No specific midterm prep notes recorded.'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-rose-500" />
                  Final Exam Strategy
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {course.finalPrepNotes || 'No specific final prep notes recorded.'}
                </p>
              </div>
            </div>
          </div>

          {/* Right sidebar schedule & info */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">Schedule Information</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Class Hours:</span>
                  <p className="font-mono font-medium text-slate-800 dark:text-slate-200">
                    {course.classSchedule || 'Schedule not set'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Exam Timetable:</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {course.examSchedule || 'Exams not announced'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Classroom / Lab:</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {course.roomNumber || 'TBA'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: DOCUMENTS */}
      {tab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Lecture slides, question papers, syllabus, and lab reports for {course.code}.
            </p>
            <Link
              to="/documents"
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload PDF
            </Link>
          </div>

          {(!course.documents || course.documents.length === 0) ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
              <FolderOpen className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No documents uploaded for {course.code}</p>
              <Link to="/documents" className="mt-2 text-xs font-semibold text-indigo-600 underline inline-block">
                Upload your first lecture slide or previous question paper
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {course.documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {doc.category}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatBytes(doc.fileSize)}</span>
                    </div>

                    <Link to={`/documents/${doc.id}/view`} className="block">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white hover:text-indigo-600 truncate">
                        {doc.title}
                      </h4>
                    </Link>

                    {doc.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {doc.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">{doc.pageCount} pages</span>
                    <Link
                      to={`/documents/${doc.id}/view`}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      Open PDF <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: NOTES */}
      {tab === 'notes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Notion-style notes for {course.code}.</p>
            <Link
              to="/notes"
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" />
              New Study Note
            </Link>
          </div>

          {(!course.notes || course.notes.length === 0) ? (
            <p className="text-xs text-slate-400 py-8 text-center">No notes created for this course yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {course.notes.map((note: any) => (
                <Link
                  key={note.id}
                  to={`/notes?id=${note.id}`}
                  className="p-4 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-slate-300 transition-colors block"
                >
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{note.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Updated {formatDate(note.updatedAt, 'MMM d, yyyy h:mm a')}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: EXAMS */}
      {tab === 'exams' && (
        <div className="space-y-4">
          {(!course.exams || course.exams.length === 0) ? (
            <p className="text-xs text-slate-400 py-8 text-center">No exams scheduled for this course.</p>
          ) : (
            <div className="space-y-3">
              {course.exams.map((exam: any) => (
                <div
                  key={exam.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700 uppercase">
                      {exam.examType}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{exam.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDate(exam.examDate, 'EEE, MMM d, yyyy h:mm a')} {exam.room ? `• ${exam.room}` : ''}
                    </p>
                  </div>
                  <Link to="/exams" className="text-xs font-semibold text-indigo-600 hover:underline">
                    View Exam Tracker →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: ASSIGNMENTS */}
      {tab === 'assignments' && (
        <div className="space-y-4">
          {(!course.assignments || course.assignments.length === 0) ? (
            <p className="text-xs text-slate-400 py-8 text-center">No assignments found for this course.</p>
          ) : (
            <div className="space-y-3">
              {course.assignments.map((a: any) => (
                <div
                  key={a.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{a.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Deadline: {formatDate(a.deadline, 'MMM d, h:mm a')} • Priority: {a.priority}
                    </p>
                  </div>
                  <Link to="/assignments" className="text-xs font-semibold text-indigo-600 hover:underline">
                    Manage Task →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
