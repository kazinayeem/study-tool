import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileCode,
  Trash2,
  Check,
  ChevronRight,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate, formatRelativeDeadline } from '../../lib/utils';
import { Assignment, Course, Semester } from '../../types';

export const AssignmentsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newChecklistText, setNewChecklistText] = useState<Record<string, string>>({});

  // Create Form states
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [description, setDescription] = useState('');

  const queryClient = useQueryClient();

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => api.getCourses(),
  });

  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;
  if (courseFilter) params.courseId = courseFilter;

  const { data: assignments = [], isLoading } = useQuery<Assignment[]>({
    queryKey: ['assignments', params],
    queryFn: () => api.getAssignments(params),
  });

  const createAssignmentMutation = useMutation({
    mutationFn: () => {
      const selectedCourse = courses.find((c) => c.id === courseId);
      return api.createAssignment({
        title: title.trim(),
        courseId,
        semesterId: selectedCourse?.semesterId || '',
        deadline: new Date(deadline).toISOString(),
        priority,
        description: description.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsCreateOpen(false);
      setTitle('');
      setDeadline('');
      setDescription('');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateAssignment(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: ({ assignmentId, itemId }: { assignmentId: string; itemId: string }) =>
      api.toggleAssignmentChecklist(assignmentId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });

  const addChecklistMutation = useMutation({
    mutationFn: ({ assignmentId, text }: { assignmentId: string; text: string }) =>
      api.addAssignmentChecklist(assignmentId, text),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      setNewChecklistText((prev) => ({ ...prev, [variables.assignmentId]: '' }));
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: string) => api.deleteAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400';
      case 'HIGH':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const statusCategories = [
    { id: 'NOT_STARTED', label: 'Not Started' },
    { id: 'IN_PROGRESS', label: 'In Progress' },
    { id: 'SUBMITTED', label: 'Submitted' },
    { id: 'COMPLETED', label: 'Completed' },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Assignments & Tasks Tracker
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Keep track of course deliverables, sub-checklists, due dates, and supporting files.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Assignment
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="">All Statuses</option>
          <option value="NOT_STARTED">Not Started</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Kanban Columns or List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statusCategories.map((col) => {
          const colAssignments = assignments.filter((a) => a.status === col.id);
          return (
            <div
              key={col.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40 flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {col.label}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {colAssignments.length}
                </span>
              </div>

              {/* Task Cards Stack */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colAssignments.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-3 hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors"
                  >
                    <div>
                      {/* Course & Priority */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          {a.course?.code}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${getPriorityBadge(a.priority)}`}>
                          {a.priority}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                        {a.title}
                      </h4>

                      {a.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {a.description}
                        </p>
                      )}
                    </div>

                    {/* Deadline */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {formatDate(a.deadline, 'MMM d')}
                      </span>
                      <span className={`font-semibold ${a.isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}>
                        {formatRelativeDeadline(a.deadline)}
                      </span>
                    </div>

                    {/* Task Checklist Items */}
                    {a.checklist && a.checklist.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span>Checklist</span>
                          <span>{a.checklist.filter((i) => i.isCompleted).length}/{a.checklist.length}</span>
                        </div>
                        {a.checklist.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => toggleChecklistMutation.mutate({ assignmentId: a.id, itemId: item.id })}
                            className="flex items-start gap-1.5 cursor-pointer text-[11px] text-slate-600 dark:text-slate-300 hover:text-indigo-600"
                          >
                            <span className={`mt-0.5 h-3 w-3 rounded flex items-center justify-center border ${item.isCompleted ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                              {item.isCompleted && <Check className="h-2.5 w-2.5" />}
                            </span>
                            <span className={item.isCompleted ? 'line-through text-slate-400' : ''}>
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline add checklist item input */}
                    <div className="pt-1 flex items-center gap-1">
                      <input
                        type="text"
                        value={newChecklistText[a.id] || ''}
                        onChange={(e) => setNewChecklistText({ ...newChecklistText, [a.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (newChecklistText[a.id] || '').trim()) {
                            addChecklistMutation.mutate({ assignmentId: a.id, text: newChecklistText[a.id].trim() });
                          }
                        }}
                        placeholder="+ Add sub-task..."
                        className="w-full text-[10px] bg-slate-50 dark:bg-slate-800 rounded px-2 py-1 text-slate-700 dark:text-slate-200 focus:outline-none"
                      />
                    </div>

                    {/* Supporting Documents */}
                    {a.documents && a.documents.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        {a.documents.map((d) => (
                          <Link
                            key={d.id}
                            to={`/documents/${d.documentId}/view`}
                            className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                          >
                            <FileCode className="h-3 w-3 shrink-0" />
                            <span className="truncate">{d.document?.title}</span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Status Changer & Delete Footer */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <select
                        value={a.status}
                        onChange={(e) => updateStatusMutation.mutate({ id: a.id, status: e.target.value })}
                        className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <option value="NOT_STARTED">Not Started</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="SUBMITTED">Submitted</option>
                        <option value="COMPLETED">Completed</option>
                      </select>

                      <button
                        onClick={() => {
                          if (confirm(`Delete assignment "${a.title}"?`)) {
                            deleteAssignmentMutation.mutate(a.id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-500 p-1"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE ASSIGNMENT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Assignment Task</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Milestone 2 Deliverable"
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
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Deadline Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Task instructions and guidelines..."
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
                onClick={() => createAssignmentMutation.mutate()}
                disabled={createAssignmentMutation.isPending || !title || !courseId || !deadline}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
              >
                {createAssignmentMutation.isPending ? 'Creating...' : 'Create Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
