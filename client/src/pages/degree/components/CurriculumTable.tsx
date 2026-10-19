import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Check,
  ChevronDown,
  ArrowUpDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { CurriculumCourse } from '../../../types';

interface CurriculumTableProps {
  courses: CurriculumCourse[];
  onAddCourse: () => void;
  onEditCourse: (course: CurriculumCourse) => void;
  onDeleteCourse: (courseId: string) => void;
}

export const CurriculumTable: React.FC<CurriculumTableProps> = ({
  courses,
  onAddCourse,
  onEditCourse,
  onDeleteCourse,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [requirementFilter, setRequirementFilter] = useState('ALL');
  const [semesterFilter, setSemesterFilter] = useState('ALL');
  const [sortField, setSortField] = useState<'code' | 'title' | 'credits' | 'recommendedSemester' | 'status'>('recommendedSemester');
  const [sortAsc, setSortAsc] = useState(true);

  // Filtered & Sorted courses
  const filteredCourses = useMemo(() => {
    return courses
      .filter((c) => {
        // Search
        if (search) {
          const q = search.toLowerCase();
          const matchCode = c.code.toLowerCase().includes(q);
          const matchTitle = c.title.toLowerCase().includes(q);
          if (!matchCode && !matchTitle) return false;
        }

        // Category filter
        if (categoryFilter !== 'ALL' && c.category !== categoryFilter) {
          return false;
        }

        // Status filter
        if (statusFilter !== 'ALL' && c.status !== statusFilter) {
          return false;
        }

        // Requirement filter
        if (requirementFilter === 'REQUIRED' && !c.isRequired) return false;
        if (requirementFilter === 'ELECTIVE' && c.isRequired) return false;

        // Semester filter
        if (semesterFilter !== 'ALL') {
          const semNum = parseInt(semesterFilter, 10);
          if (c.recommendedSemester !== semNum) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'recommendedSemester') {
          valA = a.recommendedSemester ?? 999;
          valB = b.recommendedSemester ?? 999;
        }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [courses, search, categoryFilter, statusFilter, requirementFilter, semesterFilter, sortField, sortAsc]);

  const totalFilteredCredits = useMemo(() => {
    return filteredCourses.reduce((sum, c) => sum + c.credits, 0);
  }, [filteredCourses]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'CORE':
        return 'bg-[#dcecfa] text-[#0075de] dark:bg-[#102a45] dark:text-[#64b5f6]';
      case 'ELECTIVE':
        return 'bg-[#e6e0f5] text-[#5645d4] dark:bg-[#251545] dark:text-[#b39ddb]';
      case 'GENERAL_EDUCATION':
        return 'bg-[#d9f3e1] text-[#1aae39] dark:bg-[#13331c] dark:text-[#81c784]';
      case 'BASIC_SCIENCE':
        return 'bg-[#fef7d6] text-[#b45309] dark:bg-[#3a2e12] dark:text-[#fcd34d]';
      case 'LAB':
        return 'bg-[#fde0ec] text-[#d81b60] dark:bg-[#3d1226] dark:text-[#f48fb1]';
      case 'CAPSTONE':
        return 'bg-[#ffe8d4] text-[#dd5b00] dark:bg-[#40200e] dark:text-[#ffb74d]';
      default:
        return 'bg-[#f0eeec] text-[#787671] dark:bg-[#252528] dark:text-[#a4a097]';
    }
  };

  const getStatusBadge = (status: CurriculumCourse['status']) => {
    switch (status) {
      case 'COMPLETED':
        return {
          label: 'Completed',
          className: 'bg-[#d9f3e1] text-[#1aae39] border border-[#1aae39]/30 dark:bg-[#13331c] dark:text-[#81c784]',
        };
      case 'CURRENTLY_ENROLLED':
        return {
          label: 'Enrolled',
          className: 'bg-[#dcecfa] text-[#0075de] border border-[#0075de]/30 dark:bg-[#102a45] dark:text-[#64b5f6]',
        };
      case 'PLANNED':
        return {
          label: 'Planned',
          className: 'bg-[#e6e0f5] text-[#5645d4] border border-[#5645d4]/30 dark:bg-[#251545] dark:text-[#b39ddb]',
        };
      case 'ELIGIBLE':
        return {
          label: 'Eligible to Register',
          className: 'bg-[#e8f5e9] text-[#2e7d32] border border-[#81c784]/40 dark:bg-[#1b3320] dark:text-[#a5d6a7]',
        };
      case 'FAILED':
        return {
          label: 'Retake Required',
          className: 'bg-[#fde0ec] text-[#e03131] border border-[#e03131]/40 dark:bg-[#3d1226] dark:text-[#ef9a9a]',
        };
      default:
        return {
          label: 'Not Started',
          className: 'bg-[#f0eeec] text-[#787671] border border-[#c8c4be]/40 dark:bg-[#252528] dark:text-[#a4a097]',
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-[12px] border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416] shadow-2xs">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#a4a097]" />
            <input
              type="text"
              placeholder="Search code or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-[8px] border border-[#c8c4be] bg-white pl-8 pr-3 py-1.5 text-xs text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white focus:outline-none focus:border-[#5645d4]"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-[8px] border border-[#c8c4be] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white"
          >
            <option value="ALL">All Categories</option>
            <option value="CORE">Core</option>
            <option value="ELECTIVE">Elective</option>
            <option value="GENERAL_EDUCATION">General Education</option>
            <option value="BASIC_SCIENCE">Basic Science</option>
            <option value="LAB">Lab</option>
            <option value="CAPSTONE">Capstone</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-[8px] border border-[#c8c4be] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="CURRENTLY_ENROLLED">Currently Enrolled</option>
            <option value="ELIGIBLE">Eligible to Register</option>
            <option value="PLANNED">Planned</option>
            <option value="FAILED">Retake Required</option>
            <option value="NOT_STARTED">Not Started</option>
          </select>

          {/* Required vs Elective */}
          <select
            value={requirementFilter}
            onChange={(e) => setRequirementFilter(e.target.value)}
            className="rounded-[8px] border border-[#c8c4be] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white"
          >
            <option value="ALL">All Requirements</option>
            <option value="REQUIRED">Mandatory Core</option>
            <option value="ELECTIVE">Electives</option>
          </select>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onAddCourse}
            className="btn-notion-primary text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Course</span>
          </button>
        </div>
      </div>

      {/* Filter Totals Indicator */}
      <div className="flex items-center justify-between text-xs text-[#787671] dark:text-[#a4a097] px-1">
        <span>
          Showing <strong className="text-[#1a1a1a] dark:text-white">{filteredCourses.length}</strong> courses
          {' • '}
          <strong className="text-[#1a1a1a] dark:text-white">{totalFilteredCredits}</strong> total credits
        </span>
        {(search || categoryFilter !== 'ALL' || statusFilter !== 'ALL' || requirementFilter !== 'ALL') && (
          <button
            onClick={() => {
              setSearch('');
              setCategoryFilter('ALL');
              setStatusFilter('ALL');
              setRequirementFilter('ALL');
            }}
            className="text-[11px] text-[#5645d4] dark:text-[#8070f6] hover:underline cursor-pointer"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-[12px] border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416] shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#e5e3df] bg-[#fbfbfa] dark:border-[#2a2a2e] dark:bg-[#1a1a1e] text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097]">
              <th
                onClick={() => handleSort('code')}
                className="py-3 px-4 cursor-pointer hover:text-[#1a1a1a] dark:hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Code</span>
                  <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('title')}
                className="py-3 px-4 cursor-pointer hover:text-[#1a1a1a] dark:hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Course Title</span>
                  <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('credits')}
                className="py-3 px-3 cursor-pointer hover:text-[#1a1a1a] dark:hover:text-white text-center"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Cr</span>
                  <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3">Prerequisites</th>
              <th
                onClick={() => handleSort('recommendedSemester')}
                className="py-3 px-3 cursor-pointer hover:text-[#1a1a1a] dark:hover:text-white text-center"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Term</span>
                  <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                className="py-3 px-4 cursor-pointer hover:text-[#1a1a1a] dark:hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>
              <th className="py-3 px-3 text-center">Grade</th>
              <th className="py-3 px-3">Semester Taken</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e3df] dark:divide-[#2a2a2e]">
            {filteredCourses.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-[#787671] dark:text-[#a4a097]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Layers className="h-8 w-8 text-[#a4a097]" />
                    <p className="text-xs font-medium">No curriculum courses matched your filter criteria.</p>
                    <button
                      onClick={onAddCourse}
                      className="mt-1 text-xs text-[#5645d4] hover:underline font-semibold"
                    >
                      + Add a course to your curriculum
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredCourses.map((c) => {
                const statusBadge = getStatusBadge(c.status);
                const categoryBadge = getCategoryBadge(c.category);

                return (
                  <tr
                    key={c.id}
                    className="hover:bg-[#fbfbfa] dark:hover:bg-[#1a1a1e] transition-colors group"
                  >
                    {/* Course Code */}
                    <td className="py-3 px-4 font-bold text-[#1a1a1a] dark:text-white whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{c.code}</span>
                        {c.isRequired && (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-[#5645d4]"
                            title="Required Core Requirement"
                          />
                        )}
                      </div>
                    </td>

                    {/* Course Title */}
                    <td className="py-3 px-4 max-w-xs font-medium text-[#37352f] dark:text-[#f0eeec] truncate">
                      {c.title}
                    </td>

                    {/* Credits */}
                    <td className="py-3 px-3 text-center font-semibold text-[#1a1a1a] dark:text-white whitespace-nowrap">
                      {c.credits}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-[4px] text-[10px] font-semibold tracking-wide uppercase ${categoryBadge}`}>
                        {c.category.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Prerequisites */}
                    <td className="py-3 px-3">
                      {c.prerequisites.length === 0 ? (
                        <span className="text-[11px] text-[#a4a097] italic">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {c.prerequisites.map((p) => (
                            <span
                              key={p.id}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium border ${
                                p.isSatisfied
                                  ? 'bg-[#d9f3e1] text-[#1aae39] border-[#1aae39]/30'
                                  : 'bg-[#fde0ec] text-[#e03131] border-[#e03131]/30'
                              }`}
                              title={`${p.title} (${p.isSatisfied ? 'Satisfied' : 'Pending / Missing'})`}
                            >
                              {p.isSatisfied ? (
                                <Check className="h-2.5 w-2.5 shrink-0" />
                              ) : (
                                <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                              )}
                              <span>{p.code}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Recommended Semester */}
                    <td className="py-3 px-3 text-center text-[#787671] dark:text-[#a4a097] whitespace-nowrap">
                      {c.recommendedSemester ? `Term ${c.recommendedSemester}` : '—'}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-[4px] text-[10px] font-semibold ${statusBadge.className}`}>
                        {statusBadge.label}
                      </span>
                    </td>

                    {/* Grade */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {c.actualRecord?.gradeLetter ? (
                        <span className="font-semibold text-[#1a1a1a] dark:text-white">
                          {c.actualRecord.gradeLetter}{' '}
                          {c.actualRecord.gradePoint !== null && c.actualRecord.gradePoint !== undefined ? (
                            <span className="text-[10px] text-[#787671] font-normal">
                              ({c.actualRecord.gradePoint.toFixed(1)})
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-[#a4a097]">—</span>
                      )}
                    </td>

                    {/* Actual Semester */}
                    <td className="py-3 px-3 text-xs text-[#5d5b54] dark:text-[#a4a097] whitespace-nowrap">
                      {c.actualRecord?.semester ? (
                        <span>
                          {c.actualRecord.semester.name}{' '}
                          {c.actualRecord.isRetake && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-[#ffe8d4] text-[#dd5b00] font-semibold">
                              Retake
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[#a4a097]">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditCourse(c)}
                          className="p-1 rounded text-[#787671] hover:bg-[#f0eeec] hover:text-[#1a1a1a] dark:hover:bg-[#252528] dark:hover:text-white transition-colors"
                          title="Edit course"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteCourse(c.id)}
                          className="p-1 rounded text-[#787671] hover:bg-[#fde0ec] hover:text-[#e03131] dark:hover:bg-[#3d1226] transition-colors"
                          title="Remove course from curriculum"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
