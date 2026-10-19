import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
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
  Share2,
  Copy,
  Kanban,
  List,
  Sparkles,
  FolderGit2,
  Flag,
  ExternalLink,
  Target,
  ArrowUpRight,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate, formatRelativeDeadline } from '../../lib/utils';
import { Assignment, Course, Semester } from '../../types';
import { ShareModal } from '../../components/sharing/ShareModal';
import { useActiveSemester } from '../../hooks/useActiveSemester';
import { AcademicBreadcrumb } from '../../components/common/AcademicBreadcrumb';


export const AssignmentsPage: React.FC = () => {
  const { id: paramSemesterId, semesterId: routeSemesterId, assignmentId: paramAssignmentId } = useParams<{
    id?: string;
    semesterId?: string;
    assignmentId?: string;
  }>();
  const [searchParams] = useSearchParams();
  const { activeSemesterId, semesters } = useActiveSemester();

  // If route is /assignments/:id, the param id is the assignmentId; otherwise if /semesters/:id/assignments it's semesterId
  const isDirectAssignmentRoute = Boolean(paramSemesterId && !routeSemesterId && !paramAssignmentId && window.location.pathname.startsWith('/assignments/'));
  const effectiveAssignmentId = isDirectAssignmentRoute ? paramSemesterId : paramAssignmentId;
  const effectiveSemesterId = isDirectAssignmentRoute ? '' : (paramSemesterId || routeSemesterId || searchParams.get('semesterId') || activeSemesterId || '');

  const [mainTab, setMainTab] = useState<'tasks' | 'projects'>('tasks');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [semesterFilter, setSemesterFilter] = useState<string>(effectiveSemesterId);
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [newChecklistText, setNewChecklistText] = useState<Record<string, string>>({});
  const [shareTarget, setShareTarget] = useState<Assignment | null>(null);

  useEffect(() => {
    if (!isDirectAssignmentRoute) {
      const sem = paramSemesterId || routeSemesterId || searchParams.get('semesterId');
      if (sem) {
        setSemesterFilter(sem);
      }
    }
  }, [paramSemesterId, routeSemesterId, searchParams, isDirectAssignmentRoute]);

  // Create Task Form states
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [description, setDescription] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<number | ''>(2);
  const [taskStatus, setTaskStatus] = useState<string>('TODO');

  // Create Project Form states
  const [projTitle, setProjTitle] = useState('');
  const [projCourseId, setProjCourseId] = useState('');
  const [projDescription, setProjDescription] = useState('');
  const [projDeadline, setProjDeadline] = useState('');
  const [projDeliverables, setProjDeliverables] = useState('');
  const [projImportantLinks, setProjImportantLinks] = useState('');

  const queryClient = useQueryClient();

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses', semesterFilter],
    queryFn: () => api.getCourses(semesterFilter || undefined),
  });

  const params: Record<string, string> = {};
  if (semesterFilter) params.semesterId = semesterFilter;
  if (statusFilter) params.status = statusFilter;
  if (courseFilter) params.courseId = courseFilter;

  const { data: assignments = [], isLoading } = useQuery<Assignment[]>({
    queryKey: ['assignments', params],
    queryFn: () => api.getAssignments(params),
  });

  const { data: recommendations = [] } = useQuery<any[]>({
    queryKey: ['taskRecommendations'],
    queryFn: () => api.getTaskRecommendations(),
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
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
        status: taskStatus,
        estimatedHours: estimatedHours ? Number(estimatedHours) : null,
        description: description.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['taskRecommendations'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsCreateOpen(false);
      setTitle('');
      setDeadline('');
      setDescription('');
      setEstimatedHours(2);
      setTaskStatus('TODO');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.duplicateAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['taskRecommendations'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateAssignment(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['taskRecommendations'] });
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
      queryClient.invalidateQueries({ queryKey: ['taskRecommendations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: () => {
      const selectedCourse = courses.find((c) => c.id === projCourseId);
      return api.createProject({
        title: projTitle.trim(),
        description: projDescription.trim() || undefined,
        courseId: projCourseId || undefined,
        semesterId: selectedCourse?.semesterId || undefined,
        targetDeadline: projDeadline ? new Date(projDeadline).toISOString() : undefined,
        deliverables: projDeliverables.trim() || undefined,
        importantLinks: projImportantLinks.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsCreateProjectOpen(false);
      setProjTitle('');
      setProjDescription('');
      setProjDeadline('');
      setProjDeliverables('');
      setProjImportantLinks('');
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
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
    { id: 'BACKLOG', label: 'Backlog', color: 'border-t-slate-400' },
    { id: 'TODO', label: 'To Do', color: 'border-t-blue-500' },
    { id: 'IN_PROGRESS', label: 'In Progress', color: 'border-t-amber-500' },
    { id: 'SUBMITTED', label: 'Submitted', color: 'border-t-purple-500' },
    { id: 'IN_REVIEW', label: 'In Review', color: 'border-t-[#5645d4]' },
    { id: 'COMPLETED', label: 'Completed', color: 'border-t-emerald-500' },
    { id: 'CANCELLED', label: 'Cancelled', color: 'border-t-rose-400' },
  ];

  const currentSemesterObj = semesters.find((s) => s.id === semesterFilter);
  const currentCourseObj = courses.find((c) => c.id === courseFilter);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Academic Context Breadcrumb */}
      <AcademicBreadcrumb
        semesterName={currentSemesterObj?.name}
        courseCode={currentCourseObj?.code}
        courseName={currentCourseObj?.title}
        moduleName="Assignments & Tasks"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Assignments & Project Workspace
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kanban workflow, smart prioritization recommendation engine, subtasks, and academic project milestones.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {mainTab === 'tasks' ? (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 rounded-[8px] bg-[#5645d4] hover:bg-[#4534b3] px-4 py-2 text-xs font-semibold text-white shadow-xs active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </button>
          ) : (
            <button
              onClick={() => setIsCreateProjectOpen(true)}
              className="flex items-center gap-2 rounded-[8px] bg-[#5645d4] hover:bg-[#4534b3] px-4 py-2 text-xs font-semibold text-white shadow-xs active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setMainTab('tasks')}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors ${
              mainTab === 'tasks'
                ? 'border-[#5645d4] text-[#5645d4]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Tasks & Assignments ({assignments.length})
          </button>
          <button
            onClick={() => setMainTab('projects')}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors ${
              mainTab === 'projects'
                ? 'border-[#5645d4] text-[#5645d4]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Project Workspace ({projects.length})
          </button>
        </div>

        {mainTab === 'tasks' && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-[8px] mb-2">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-[6px] text-xs font-medium flex items-center gap-1 ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Kanban Board"
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-[6px] text-xs font-medium flex items-center gap-1 ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="List View"
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
          </div>
        )}
      </div>

      {mainTab === 'tasks' ? (
        <div className="space-y-6">
          {/* Smart Task Recommendations Callout */}
          {recommendations.length > 0 && (
            <div className="card-notion p-4 bg-[#5645d4]/5 border-[#5645d4]/20 dark:bg-[#5645d4]/10">
              <div className="flex items-center gap-2 mb-2 text-[#5645d4] dark:text-[#8070f6] font-bold text-xs">
                <Sparkles className="h-4 w-4" />
                <span>AI Recommended Priority Focus — What to Work on First</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {recommendations.slice(0, 3).map((rec: any, idx: number) => (
                  <div
                    key={rec.id}
                    className="card-notion p-3 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[10px] text-[#5645d4] dark:text-[#8070f6]">
                        #{idx + 1} {rec.course?.code || 'Course'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#5645d4]/10 text-[#5645d4] dark:bg-[#5645d4]/20 dark:text-[#8070f6] font-semibold">
                        Score: {Math.round(rec.recommendationScore)}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {rec.title}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{formatRelativeDeadline(rec.deadline)}</span>
                      {rec.estimatedHours && <span>⏳ {rec.estimatedHours}h est.</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="rounded-[8px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-[#5645d4] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-[8px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-[#5645d4] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="">All Statuses (7 Available)</option>
              {statusCategories.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Kanban View */}
          {viewMode === 'kanban' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 overflow-x-auto pb-4">
              {statusCategories.map((col) => {
                const colAssignments = assignments.filter((a) => a.status === col.id);
                return (
                  <div
                    key={col.id}
                    className={`rounded-[12px] border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/40 flex flex-col min-h-[460px] border-t-4 ${col.color}`}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {col.label}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {colAssignments.length}
                      </span>
                    </div>

                    {/* Task Cards Stack */}
                    <div className="space-y-2.5 flex-1 overflow-y-auto">
                      {colAssignments.map((a) => (
                        <div
                          key={a.id}
                          className="rounded-[8px] border border-slate-200 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-2.5 hover:border-[#5645d4]/40 transition-colors"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
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

                          {/* Effort & Deadline */}
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span className="flex items-center gap-1 text-[10px]">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              {formatDate(a.deadline, 'MMM d')}
                            </span>
                            {a.estimatedHours && (
                              <span className="text-[10px] text-slate-400">
                                {a.estimatedHours}h est.
                              </span>
                            )}
                          </div>

                          {/* Checklist */}
                          {a.checklist && a.checklist.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 space-y-1">
                              <div className="flex justify-between text-[9px] text-slate-400">
                                <span>Checklist</span>
                                <span>{a.checklist.filter((i) => i.isCompleted).length}/{a.checklist.length}</span>
                              </div>
                              {a.checklist.slice(0, 3).map((item) => (
                                <div
                                  key={item.id}
                                  onClick={() => toggleChecklistMutation.mutate({ assignmentId: a.id, itemId: item.id })}
                                  className="flex items-start gap-1 cursor-pointer text-[10px] text-slate-600 dark:text-slate-300"
                                >
                                  <span className={`mt-0.5 h-2.5 w-2.5 rounded flex items-center justify-center border ${item.isCompleted ? 'bg-[#5645d4] border-[#5645d4] text-white' : 'border-slate-300'}`}>
                                    {item.isCompleted && <Check className="h-2 w-2" />}
                                  </span>
                                  <span className={item.isCompleted ? 'line-through text-slate-400' : ''}>
                                    {item.text}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Status changer & Actions */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <select
                              value={a.status}
                              onChange={(e) => updateStatusMutation.mutate({ id: a.id, status: e.target.value })}
                              className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[9px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {statusCategories.map((s) => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                              ))}
                            </select>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => duplicateMutation.mutate(a.id)}
                                className="text-slate-400 hover:text-[#5645d4] p-0.5"
                                title="Duplicate task template"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setShareTarget(a)}
                                className="text-slate-400 hover:text-[#5645d4] p-0.5"
                                title="Share"
                              >
                                <Share2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete assignment "${a.title}"?`)) {
                                    deleteAssignmentMutation.mutate(a.id);
                                  }
                                }}
                                className="text-slate-400 hover:text-rose-500 p-0.5"
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="rounded-[12px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-2xs">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {assignments.map((a) => (
                  <div key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{a.course?.code}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getPriorityBadge(a.priority)}`}>{a.priority}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">{a.status}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{a.title}</h4>
                      {a.description && <p className="text-xs text-slate-500 line-clamp-1">{a.description}</p>}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{formatDate(a.deadline, 'MMM d, h:mm a')}</p>
                        <p className="text-[11px] text-slate-400">{formatRelativeDeadline(a.deadline)}</p>
                      </div>

                      <select
                        value={a.status}
                        onChange={(e) => updateStatusMutation.mutate({ id: a.id, status: e.target.value })}
                        className="rounded-[8px] border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {statusCategories.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => duplicateMutation.mutate(a.id)}
                        className="p-1.5 rounded-[6px] text-slate-400 hover:text-[#5645d4] hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Duplicate task"
                      >
                        <Copy className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Delete assignment "${a.title}"?`)) {
                            deleteAssignmentMutation.mutate(a.id);
                          }
                        }}
                        className="p-1.5 rounded-[6px] text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* PROJECTS WORKSPACE TAB */
        <div className="space-y-6">
          {projects.length === 0 ? (
            <div className="rounded-[12px] border border-slate-200 bg-white p-12 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              <FolderGit2 className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Projects Created Yet</p>
              <p className="mt-1">Organize large semester projects, capstone roadmaps, milestones, and deliverables.</p>
              <button
                onClick={() => setIsCreateProjectOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-[8px] bg-[#5645d4] hover:bg-[#4534b3] px-4 py-2 text-xs font-semibold text-white shadow-xs"
              >
                <Plus className="h-4 w-4" />
                Create First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj: any) => (
                <div
                  key={proj.id}
                  className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-[#5645d4]/10 text-[#5645d4] dark:bg-[#5645d4]/20 dark:text-[#8070f6] uppercase">
                        {proj.course?.code || 'Academic Project'}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                        {proj.title}
                      </h3>
                      {proj.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {proj.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Delete project "${proj.title}"?`)) {
                          deleteProjectMutation.mutate(proj.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      <span>Milestones Progress</span>
                      <span>{proj.progressPercentage || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#5645d4] h-full rounded-full transition-all"
                        style={{ width: `${proj.progressPercentage || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Milestones list */}
                  {proj.milestones && proj.milestones.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Milestones</p>
                      {proj.milestones.map((m: any) => (
                        <div key={m.id} className="flex items-center justify-between text-xs py-1">
                          <span className={m.isCompleted ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}>
                            {m.title}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {m.targetDate ? formatDate(m.targetDate, 'MMM d') : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Deliverables / Links */}
                  {proj.importantLinks && (
                    <div className="text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">Links: </span>
                      <span className="text-[#5645d4] dark:text-[#8070f6] underline">{proj.importantLinks}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE ASSIGNMENT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md card-notion p-6 shadow-xl dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Academic Task</h3>
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
                  className="w-full rounded-[8px] border border-slate-300 p-2 text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Course *</label>
                  <select
                    required
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full rounded-[8px] border border-slate-300 p-2 text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
                    className="w-full rounded-[8px] border border-slate-300 p-2 text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Estimated Effort (Hours)</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value ? Number(e.target.value) : '')}
                    className="w-full rounded-[8px] border border-slate-300 p-2 text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Initial Status</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value)}
                    className="w-full rounded-[8px] border border-slate-300 p-2 text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {statusCategories.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
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
                  className="w-full rounded-[8px] border border-slate-300 p-2 text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Task instructions and guidelines..."
                  className="w-full rounded-[8px] border border-slate-300 p-2 text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-[8px] dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createAssignmentMutation.mutate()}
                disabled={createAssignmentMutation.isPending || !title || !courseId || !deadline}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#5645d4] hover:bg-[#4534b3] rounded-[8px] disabled:opacity-50"
              >
                {createAssignmentMutation.isPending ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      {isCreateProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md card-notion p-6 shadow-xl dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Academic Project</h3>
              <button onClick={() => setIsCreateProjectOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Project Title *</label>
                <input
                  type="text"
                  required
                  value={projTitle}
                  onChange={(e) => setProjTitle(e.target.value)}
                  placeholder="e.g. Distributed Database Capstone"
                  className="w-full rounded-[8px] border border-slate-300 p-2 text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Associated Course</label>
                <select
                  value={projCourseId}
                  onChange={(e) => setProjCourseId(e.target.value)}
                  className="w-full rounded-[8px] border border-slate-300 p-2 text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">General Project</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Target Deadline</label>
                <input
                  type="date"
                  value={projDeadline}
                  onChange={(e) => setProjDeadline(e.target.value)}
                  className="w-full rounded-[8px] border border-slate-300 p-2 text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Deliverables & Objectives</label>
                <textarea
                  rows={2}
                  value={projDeliverables}
                  onChange={(e) => setProjDeliverables(e.target.value)}
                  placeholder="Source code repo, report PDF, presentation slides..."
                  className="w-full rounded-[8px] border border-slate-300 p-2 text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Important Links</label>
                <input
                  type="text"
                  value={projImportantLinks}
                  onChange={(e) => setProjImportantLinks(e.target.value)}
                  placeholder="e.g. GitHub URL, Figma link, Google Drive"
                  className="w-full rounded-[8px] border border-slate-300 p-2 text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateProjectOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-[8px] dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createProjectMutation.mutate()}
                disabled={createProjectMutation.isPending || !projTitle}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#5645d4] hover:bg-[#4534b3] rounded-[8px] disabled:opacity-50"
              >
                {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {shareTarget && (
        <ShareModal
          isOpen={!!shareTarget}
          onClose={() => setShareTarget(null)}
          resourceType="ASSIGNMENT"
          resourceId={shareTarget.id}
          resourceTitle={shareTarget.title}
        />
      )}
    </div>
  );
};
