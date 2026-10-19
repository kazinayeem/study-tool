import React from 'react';
import { ChevronRight, GraduationCap, BookOpen, Layers } from 'lucide-react';

interface AcademicBreadcrumbProps {
  semesterName?: string | null;
  courseName?: string | null;
  courseCode?: string | null;
  moduleName: string;
  subItemName?: string | null;
  className?: string;
}

export const AcademicBreadcrumb: React.FC<AcademicBreadcrumbProps> = ({
  semesterName,
  courseName,
  courseCode,
  moduleName,
  subItemName,
  className = '',
}) => {
  return (
    <nav
      aria-label="Academic Context Breadcrumb"
      className={`flex items-center flex-wrap gap-1.5 text-xs text-[#787774] dark:text-neutral-400 font-medium ${className}`}
    >
      {semesterName ? (
        <span className="flex items-center gap-1.5 text-[#37352f] dark:text-neutral-200 font-semibold bg-neutral-100 dark:bg-neutral-800/60 px-2 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700">
          <GraduationCap className="w-3.5 h-3.5 text-[#5645d4]" />
          <span>{semesterName}</span>
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[#787774] dark:text-neutral-400 italic">
          Personal / General
        </span>
      )}

      <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />

      {courseCode || courseName ? (
        <span className="flex items-center gap-1.5 text-[#37352f] dark:text-neutral-200 font-semibold bg-neutral-100 dark:bg-neutral-800/60 px-2 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700">
          <BookOpen className="w-3.5 h-3.5 text-[#5645d4]" />
          <span>{courseCode ? `${courseCode}${courseName ? ` - ${courseName}` : ''}` : courseName}</span>
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[#787774] dark:text-neutral-400 italic">
          No Course Assigned
        </span>
      )}

      <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />

      <span className="flex items-center gap-1.5 text-[#5645d4] dark:text-purple-400 font-semibold">
        <Layers className="w-3.5 h-3.5" />
        <span>{moduleName}</span>
      </span>

      {subItemName && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="text-[#37352f] dark:text-neutral-100 font-semibold truncate max-w-[200px]">
            {subItemName}
          </span>
        </>
      )}
    </nav>
  );
};
