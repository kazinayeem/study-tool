import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Award,
  Plus,
  Calendar,
  Clock,
  BookOpen,
  FileCode,
  CheckCircle2,
  Trash2,
  Edit,
  Check,
  ChevronRight,
  X,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { Exam, Course, DocumentItem } from '../../types';

export const ExamsPage: React.FC = () => {
  const [courseFilter, setCourseFilter] = useState('');
  const [examTypeFilter, setExamTypeFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newChecklistText, setNewChecklistText] = useState<Record<string, string>>({});

  // Create form states
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [examType, setExamType] = useState('Midterm');
  const [examDate, setExamDate] = useState('');
  const [room, setRoom] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [prepStatus, setPrepStatus] = useState<'NOT_STARTED' | 'IN_PROGRESS' | 'REVISION_READY' | 'CONFIDENT'>('NOT_STARTED');

  const queryClient = useQueryClient();

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => api.getCourses(),
  });

  const params: Record<string, string> = {};
  if (courseFilter) params.courseId = courseFilter;
  if (examTypeFilter) params.examType = examTypeFilter;

  const { data: exams = [], isLoading } = useQuery<Exam[]>({
    queryKey: ['exams', params],
    queryFn: () => api.getExams(params),
  });

  const createExamMutation = useMutation({
    mutationFn: () => {
      const selectedCourse = courses.find((c) => c.id === courseId);
      return api.createExam({
        title: title.trim(),
        courseId,
        semesterId: selectedCourse?.semesterId || '',
        examType,
        examDate: new Date(examDate).toISOString(),
        room: room.trim() || null,
        syllabus: syllabus.trim() || null,
        preparationStatus: prepStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsCreateOpen(false);
      setTitle('');
      setExamDate('');
      setRoom('');
      setSyllabus('');
    },
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: ({ examId, itemId }: { examId: string; itemId: string }) =>
      api.toggleExamChecklist(examId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const addChecklistMutation = useMutation({
    mutationFn: ({ examId, text }: { examId: string; text: string }) =>
      api.addExamChecklist(examId, text),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setNewChecklistText((prev) => ({ ...prev, [variables.examId]: '' }));
    },
  });

  const updatePrepStatusMutation = useMutation({
    mutationFn: ({ id, preparationStatus }: { id: string; preparationStatus: string }) =>
      api.updateExam(id, { preparationStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
  });

  const deleteExamMutation = useMutation({
    mutationFn: (id: string) => api.deleteExam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const getPrepStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIDENT':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
      case 'REVISION_READY':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Exams & Preparation Tracker
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track midterm & final exams, link past question papers, and monitor topic checklists.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Exam
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="">All Courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
          ))}
        </select>

        <select
          value={examTypeFilter}
          onChange={(e) => setExamTypeFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="">All Exam Types</option>
          <option value="Quiz">Quiz</option>
          <option value="Midterm">Midterm</option>
          <option value="Final">Final</option>
          <option value="Practical">Practical</option>
          <option value="Viva">Viva</option>
        </select>
      </div>

      {/* Exam Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
          <Award className="h-10 w-10 mx-auto text-slate-400 mb-3" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">No exams recorded</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Schedule midterms and finals to attach past question papers and track your revision.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      {exam.examType}
                    </span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {exam.course?.code}
                    </span>
                  </div>

                  <select
                    value={exam.preparationStatus}
                    onChange={(e) => updatePrepStatusMutation.mutate({ id: exam.id, preparationStatus: e.target.value })}
                    className={`text-[10px] font-bold rounded-lg px-2 py-0.5 border-0 focus:outline-none uppercase ${getPrepStatusBadge(
                      exam.preparationStatus
                    )}`}
                  >
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVISION_READY">Revision Ready</option>
                    <option value="CONFIDENT">Confident</option>
                  </select>
                </div>

                {/* Exam Title */}
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {exam.title}
                </h3>

                {/* Date & Room */}
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                    <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                    {formatDate(exam.examDate, 'EEEE, MMM d, yyyy • h:mm a')}
                  </span>
                  {exam.room && <span>📍 {exam.room}</span>}
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                    {exam.daysRemaining === 0 ? 'Today!' : exam.daysRemaining && exam.daysRemaining > 0 ? `In ${exam.daysRemaining} days` : 'Past'}
                  </span>
                </div>

                {/* Prep Progress Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Revision Progress</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{exam.prepPercentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${exam.prepPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Syllabus Topics */}
                {exam.syllabus && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                    <span className="font-semibold text-slate-900 dark:text-white block mb-1">Exam Topics:</span>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{exam.syllabus}</p>
                  </div>
                )}

                {/* Revision Checklist */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Revision Checklist
                  </span>
                  {exam.checklist?.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => toggleChecklistMutation.mutate({ examId: exam.id, itemId: item.id })}
                      className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300 hover:text-indigo-600"
                    >
                      <span className={`h-3.5 w-3.5 rounded flex items-center justify-center border ${item.isCompleted ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                        {item.isCompleted && <Check className="h-3 w-3" />}
                      </span>
                      <span className={item.isCompleted ? 'line-through text-slate-400' : ''}>
                        {item.text}
                      </span>
                    </div>
                  ))}

                  <input
                    type="text"
                    value={newChecklistText[exam.id] || ''}
                    onChange={(e) => setNewChecklistText({ ...newChecklistText, [exam.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (newChecklistText[exam.id] || '').trim()) {
                        addChecklistMutation.mutate({ examId: exam.id, text: newChecklistText[exam.id].trim() });
                      }
                    }}
                    placeholder="+ Add topic / problem..."
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none mt-1"
                  />
                </div>

                {/* Linked Previous Year Question Papers & Materials */}
                {exam.questionPapers && exam.questionPapers.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      Linked Past Papers & Materials
                    </span>
                    {exam.questionPapers.map((qp) => (
                      <Link
                        key={qp.id}
                        to={`/documents/${qp.documentId}/view`}
                        className="flex items-center justify-between p-2 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100"
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <FileCode className="h-4 w-4 shrink-0" />
                          <span className="truncate">{qp.document?.title}</span>
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer Delete */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => {
                    if (confirm(`Delete exam "${exam.title}"?`)) {
                      deleteExamMutation.mutate(exam.id);
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-rose-500 flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Exam
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE EXAM MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Schedule New Examination</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Exam Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Midterm Examination - InfoSec"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Course *</label>
                  <select
                    required
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Select course...</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Exam Type</label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Quiz">Quiz</option>
                    <option value="Midterm">Midterm</option>
                    <option value="Final">Final</option>
                    <option value="Practical">Practical</option>
                    <option value="Viva">Viva</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Room / Hall</label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="e.g. Hall B, Seat 42"
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Syllabus / Topics</label>
                <textarea
                  rows={2}
                  value={syllabus}
                  onChange={(e) => setSyllabus(e.target.value)}
                  placeholder="Chapters, topics, discrete log calculations, AES modes..."
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createExamMutation.mutate()}
                disabled={createExamMutation.isPending || !title || !courseId || !examDate}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
              >
                {createExamMutation.isPending ? 'Scheduling...' : 'Schedule Exam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
