import React, { useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Award,
} from 'lucide-react';
import { SemesterCreditHistoryItem } from '../../../types';

interface SemesterCreditHistoryProps {
  semesters: SemesterCreditHistoryItem[];
}

export const SemesterCreditHistory: React.FC<SemesterCreditHistoryProps> = ({ semesters }) => {
  const [expandedSemesterIds, setExpandedSemesterIds] = useState<string[]>(
    semesters.length > 0 ? [semesters[0].id] : []
  );

  const toggleExpand = (id: string) => {
    setExpandedSemesterIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-[#d9f3e1] text-[#1aae39] border-[#1aae39]/30';
      case 'ACTIVE':
        return 'bg-[#fef7d6] text-[#b45309] border-[#f5d75e]/40';
      case 'UPCOMING':
        return 'bg-[#dcecfa] text-[#0075de] border-[#0075de]/30';
      default:
        return 'bg-[#f0eeec] text-[#787671] border-[#c8c4be]/40';
    }
  };

  return (
    <div className="space-y-4">
      {/* Overview Table */}
      <div className="overflow-x-auto rounded-[12px] border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416] shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#e5e3df] bg-[#fbfbfa] dark:border-[#2a2a2e] dark:bg-[#1a1a1e] text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097]">
              <th className="py-3 px-4">Semester</th>
              <th className="py-3 px-3 text-center">Courses</th>
              <th className="py-3 px-3 text-center">Registered Cr</th>
              <th className="py-3 px-3 text-center">Completed Cr</th>
              <th className="py-3 px-3 text-center">Incomplete Cr</th>
              <th className="py-3 px-3 text-center">Term GPA</th>
              <th className="py-3 px-3">Passed Courses</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e3df] dark:divide-[#2a2a2e]">
            {semesters.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-[#787671] dark:text-[#a4a097]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CalendarDays className="h-8 w-8 text-[#a4a097]" />
                    <p className="text-xs font-medium">No semester credit records available.</p>
                  </div>
                </td>
              </tr>
            ) : (
              semesters.map((sem) => {
                const isExpanded = expandedSemesterIds.includes(sem.id);
                const statusBadge = getStatusBadge(sem.status);

                return (
                  <React.Fragment key={sem.id}>
                    <tr
                      onClick={() => toggleExpand(sem.id)}
                      className="hover:bg-[#fbfbfa] dark:hover:bg-[#1a1a1e] transition-colors cursor-pointer select-none"
                    >
                      {/* Name & Code */}
                      <td className="py-3 px-4 font-semibold text-[#1a1a1a] dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="p-0.5 rounded text-[#787671] hover:text-[#1a1a1a]"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <span>{sem.name}</span>
                          {sem.code && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#f0eeec] dark:bg-[#252528] text-[#5d5b54] dark:text-[#a4a097]">
                              {sem.code}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Courses count */}
                      <td className="py-3 px-3 text-center font-medium text-[#1a1a1a] dark:text-white">
                        {sem.coursesCount}
                      </td>

                      {/* Registered credits */}
                      <td className="py-3 px-3 text-center font-semibold text-[#1a1a1a] dark:text-white">
                        {sem.registeredCredits}
                      </td>

                      {/* Completed credits */}
                      <td className="py-3 px-3 text-center font-semibold text-[#1aae39]">
                        {sem.status === 'COMPLETED' ? (
                          <span>{sem.completedCredits}</span>
                        ) : (
                          <span className="text-[11px] text-[#787671] italic">Pending</span>
                        )}
                      </td>

                      {/* Incomplete credits */}
                      <td className="py-3 px-3 text-center text-[#787671]">
                        {sem.uncompletedCredits > 0 ? (
                          <span className="text-[#e03131] font-medium">{sem.uncompletedCredits}</span>
                        ) : (
                          <span>0</span>
                        )}
                      </td>

                      {/* GPA */}
                      <td className="py-3 px-3 text-center font-bold text-[#1a1a1a] dark:text-white">
                        {sem.semesterGpa > 0 ? sem.semesterGpa.toFixed(2) : '—'}
                      </td>

                      {/* Passed pills */}
                      <td className="py-3 px-3 max-w-xs truncate">
                        {sem.passedCourses.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {sem.passedCourses.slice(0, 3).map((pc, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-1.5 py-0.2 rounded bg-[#d9f3e1] text-[#1aae39] font-medium"
                              >
                                {pc}
                              </span>
                            ))}
                            {sem.passedCourses.length > 3 && (
                              <span className="text-[10px] text-[#787671]">
                                +{sem.passedCourses.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#a4a097] text-[11px]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-[4px] text-[10px] font-semibold border ${statusBadge}`}>
                          {sem.status}
                        </span>
                      </td>

                      {/* Expand Button */}
                      <td className="py-3 px-3 text-right">
                        <span className="text-[11px] text-[#0f6b57] hover:underline">
                          {isExpanded ? 'Hide' : 'View'}
                        </span>
                      </td>
                    </tr>

                    {/* Expandable Course Breakdown Row */}
                    {isExpanded && (
                      <tr className="bg-[#fcfbf9] dark:bg-[#17171a]">
                        <td colSpan={9} className="py-3 px-6 border-b border-[#e5e3df] dark:border-[#2a2a2e]">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-[#5d5b54] dark:text-[#a4a097]">
                              <span>Registered Courses in {sem.name}</span>
                              <span>Total Load: {sem.registeredCredits} Credits</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {sem.courses.map((c) => (
                                <div
                                  key={c.id}
                                  className="p-2.5 rounded-[8px] border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416] flex items-center justify-between text-xs"
                                >
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-[#1a1a1a] dark:text-white">
                                        {c.code}
                                      </span>
                                      <span className="text-[10px] text-[#787671]">
                                        ({c.credits} cr)
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-[#5d5b54] dark:text-[#a4a097] truncate max-w-[180px]">
                                      {c.title}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <span
                                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                        c.gradeLetter === 'F'
                                          ? 'bg-[#fde0ec] text-[#e03131]'
                                          : c.gradePoint && c.gradePoint >= 2.0
                                          ? 'bg-[#d9f3e1] text-[#1aae39]'
                                          : 'bg-[#f0eeec] text-[#787671]'
                                      }`}
                                    >
                                      {c.gradeLetter || 'In Progress'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
