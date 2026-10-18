import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Plus,
  LayoutGrid,
  List,
  Copy,
  Archive,
  Trash2,
  Edit,
  ExternalLink,
  GraduationCap,
  FolderOpen,
  CheckCircle2,
  Clock,
  MoreVertical,
  Check,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { Semester } from '../../types';

export const SemestersPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState<Semester | null>(null);
  const [editTarget, setEditTarget] = useState<Semester | null>(null);

  // Form states for Create/Edit
  const [semName, setSemName] = useState('');
  const [semCode, setSemCode] = useState('');
  const [semStart, setSemStart] = useState('');
  const [semEnd, setSemEnd] = useState('');
  const [semStatus, setSemStatus] = useState<'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'>('UPCOMING');
  const [semDesc, setSemDesc] = useState('');
  const [semGoals, setSemGoals] = useState('');
  const [semColor, setSemColor] = useState('#4f46e5');

  // Form states for Duplicate
  const [dupName, setDupName] = useState('');
  const [dupStart, setDupStart] = useState('');
  const [dupEnd, setDupEnd] = useState('');

  const queryClient = useQueryClient();

  const { data: semesters = [], isLoading } = useQuery<Semester[]>({
    queryKey: ['semesters', includeArchived],
    queryFn: () => api.getSemesters(includeArchived),
  });

  const handleOpenCreate = () => {
    setEditTarget(null);
    setSemName('');
    setSemCode('');
    setSemStart('');
    setSemEnd('');
    setSemStatus('UPCOMING');
    setSemDesc('');
    setSemGoals('');
    setSemColor('#4f46e5');
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (sem: Semester) => {
    setEditTarget(sem);
    setSemName(sem.name);
    setSemCode(sem.code || '');
    setSemStart(sem.startDate.slice(0, 10));
    setSemEnd(sem.endDate.slice(0, 10));
    setSemStatus(sem.status);
    setSemDesc(sem.description || '');
    setSemGoals(sem.academicGoals || '');
    setSemColor(sem.color || '#4f46e5');
    setIsCreateOpen(true);
  };

  const handleOpenDuplicate = (sem: Semester) => {
    setDuplicateTarget(sem);
    setDupName(`${sem.name} (Copy)`);
    setDupStart(sem.startDate.slice(0, 10));
    setDupEnd(sem.endDate.slice(0, 10));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: semName,
        code: semCode || null,
        startDate: new Date(semStart).toISOString(),
        endDate: new Date(semEnd).toISOString(),
        status: semStatus,
        description: semDesc || null,
        academicGoals: semGoals || null,
        color: semColor,
      };

      if (editTarget) {
        return api.updateSemester(editTarget.id, payload);
      } else {
        return api.createSemester(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsCreateOpen(false);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      if (!duplicateTarget) return;
      return api.duplicateSemester(duplicateTarget.id, {
        newName: dupName,
        newStartDate: dupStart ? new Date(dupStart).toISOString() : undefined,
        newEndDate: dupEnd ? new Date(dupEnd).toISOString() : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      setDuplicateTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSemester(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const toggleArchiveMutation = useMutation({
    mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
      api.updateSemester(id, { isArchived }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Term
          </span>
        );
      case 'UPCOMING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <Clock className="h-3 w-3" />
            Upcoming
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
            <Archive className="h-3 w-3" />
            Archived
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Semester Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Organize university terms, curriculum structures, goals, and academic workspaces.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'grid'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Card Layout"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'list'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="List Layout"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Archived toggle */}
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Show Archived
          </label>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-[0.98] transition-all"
          >
            <Plus className="h-4 w-4" />
            Create Semester
          </button>
        </div>
      </div>

      {/* Content: Grid or List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : semesters.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
          <CalendarDays className="h-10 w-10 mx-auto text-slate-400 mb-3" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">No semesters found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Get started by creating your first academic term like Fall 2026 or Spring 2027.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Create Semester
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* CARD LAYOUT */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {semesters.map((sem) => (
            <div
              key={sem.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
            >
              <div>
                {/* Header Badge & Actions */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  {getStatusBadge(sem.status)}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenDuplicate(sem)}
                      className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                      title="Duplicate semester structure"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(sem)}
                      className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                      title="Edit semester"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => toggleArchiveMutation.mutate({ id: sem.id, isArchived: !sem.isArchived })}
                      className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                      title={sem.isArchived ? 'Unarchive' : 'Archive'}
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${sem.name} and all its courses?`)) {
                          deleteMutation.mutate(sem.id);
                        }
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                      title="Delete semester"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title & Dates */}
                <Link to={`/semesters/${sem.id}`} className="block">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    {sem.name}
                  </h3>
                </Link>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <span>{formatDate(sem.startDate, 'MMM d, yyyy')}</span>
                  <span>–</span>
                  <span>{formatDate(sem.endDate, 'MMM d, yyyy')}</span>
                </p>

                {/* Description & Goals */}
                {sem.academicGoals && (
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                    <p className="font-semibold text-slate-900 dark:text-white text-[11px] mb-0.5">🎯 Academic Goal:</p>
                    <p className="line-clamp-2">{sem.academicGoals}</p>
                  </div>
                )}

                {/* Course pills */}
                {sem.courses && sem.courses.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {sem.courses.map((course) => (
                      <span
                        key={course.id}
                        className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        {course.code}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Workspace Links */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {sem._count?.courses || 0} courses
                  </span>
                  <span className="flex items-center gap-1">
                    <FolderOpen className="h-3.5 w-3.5" />
                    {sem._count?.documents || 0} docs
                  </span>
                </div>

                <Link
                  to={`/semesters/${sem.id}`}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Open Workspace <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST LAYOUT */
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {semesters.map((sem) => (
              <div
                key={sem.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 mt-0.5"
                    style={{ backgroundColor: sem.color || '#4f46e5' }}
                  >
                    {sem.code || 'TERM'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/semesters/${sem.id}`}
                        className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 text-sm"
                      >
                        {sem.name}
                      </Link>
                      {getStatusBadge(sem.status)}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDate(sem.startDate, 'MMM d, yyyy')} – {formatDate(sem.endDate, 'MMM d, yyyy')}
                      {sem.academicGoals ? ` • ${sem.academicGoals}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-xs text-slate-400 mr-2">
                    {sem._count?.courses || 0} courses • {sem._count?.documents || 0} docs
                  </span>
                  <button
                    onClick={() => handleOpenDuplicate(sem)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                    title="Duplicate semester structure"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(sem)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                    title="Edit semester"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <Link
                    to={`/semesters/${sem.id}`}
                    className="rounded-lg bg-indigo-50 dark:bg-indigo-950 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100"
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {editTarget ? 'Edit Semester' : 'Create New Semester'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Semester Name *</label>
                <input
                  type="text"
                  required
                  value={semName}
                  onChange={(e) => setSemName(e.target.value)}
                  placeholder="e.g. Fall 2026 or Spring 2027"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Short Code</label>
                  <input
                    type="text"
                    value={semCode}
                    onChange={(e) => setSemCode(e.target.value)}
                    placeholder="e.g. FA26"
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={semStatus}
                    onChange={(e) => setSemStatus(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="UPCOMING">Upcoming</option>
                    <option value="ACTIVE">Active (Current)</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={semStart}
                    onChange={(e) => setSemStart(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={semEnd}
                    onChange={(e) => setSemEnd(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={semDesc}
                  onChange={(e) => setSemDesc(e.target.value)}
                  placeholder="Focus areas, degree milestones, credits planned..."
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Academic Goals</label>
                <textarea
                  rows={2}
                  value={semGoals}
                  onChange={(e) => setSemGoals(e.target.value)}
                  placeholder="e.g. Maintain GPA >= 3.85 and master cryptographic engineering..."
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
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !semName || !semStart || !semEnd}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Saving...' : editTarget ? 'Save Changes' : 'Create Semester'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUPLICATE MODAL */}
      {duplicateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Duplicate Semester Structure</h3>
              <p className="text-xs text-slate-500 mt-1">
                Copies all course outlines and settings from <strong>{duplicateTarget.name}</strong> without duplicating uploaded files or past documents.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">New Semester Name *</label>
                <input
                  type="text"
                  required
                  value={dupName}
                  onChange={(e) => setDupName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={dupStart}
                    onChange={(e) => setDupStart(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={dupEnd}
                    onChange={(e) => setDupEnd(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDuplicateTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => duplicateMutation.mutate()}
                disabled={duplicateMutation.isPending || !dupName}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
              >
                {duplicateMutation.isPending ? 'Duplicating...' : 'Duplicate Structure'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
