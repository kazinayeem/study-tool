import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Semester } from '../../types';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  customItems?: BreadcrumbItem[];
}

const FRIENDLY_NAMES: Record<string, string> = {
  dashboard: 'Dashboard',
  semesters: 'Semesters',
  courses: 'Courses',
  assignments: 'Assignments',
  exams: 'Exams',
  grades: 'Grades & CGPA',
  calendar: 'Academic Calendar',
  planner: 'Study Planner',
  'study-planner': 'Study Planner',
  journal: 'Class Photo Journal',
  'class-photos': 'Class Photo Journal',
  documents: 'Documents',
  notes: 'Knowledge Base',
  notifications: 'Notifications',
  backup: 'Backup & Restore',
  settings: 'Settings',
  admin: 'Admin Panel',
  overview: 'Overview',
  view: 'Document Viewer',
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ customItems }) => {
  const location = useLocation();

  const { data: semesters = [] } = useQuery<Semester[]>({
    queryKey: ['semesters'],
    queryFn: () => api.getSemesters(),
    staleTime: 60000,
  });

  if (customItems && customItems.length > 0) {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-slate-500">
        <Link to="/dashboard" className="hidden sm:flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          <Home className="h-3.5 w-3.5" />
        </Link>
        {customItems.map((item, idx) => {
          const isLast = idx === customItems.length - 1;
          return (
            <React.Fragment key={idx}>
              <ChevronRight className="hidden sm:block h-3 w-3 text-slate-300 dark:text-slate-600 shrink-0" />
              {item.href && !isLast ? (
                <Link to={item.href} className="hidden sm:inline hover:text-slate-700 dark:hover:text-slate-200 transition-colors truncate max-w-[150px]">
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {item.label}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    );
  }

  // Derive from pathname
  const pathSegments = location.pathname.split('/').filter(Boolean);
  if (pathSegments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-slate-500">
      <Link to="/dashboard" className="hidden sm:flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {pathSegments.map((segment, idx) => {
        const isLast = idx === pathSegments.length - 1;
        const href = `/${pathSegments.slice(0, idx + 1).join('/')}`;

        // Format label
        let label = FRIENDLY_NAMES[segment.toLowerCase()];
        if (!label) {
          // Check if it's a semester ID
          const matchedSemester = semesters.find((s) => s.id === segment);
          if (matchedSemester) {
            label = matchedSemester.name;
          } else if (segment.length > 20) {
            // It's a UUID or hash ID
            const prevSegment = idx > 0 ? pathSegments[idx - 1].toLowerCase() : '';
            if (prevSegment === 'courses') label = 'Course Details';
            else if (prevSegment === 'notes') label = 'Document';
            else if (prevSegment === 'assignments') label = 'Assignment';
            else if (prevSegment === 'exams') label = 'Exam';
            else if (prevSegment === 'documents') label = 'Document';
            else if (prevSegment === 'class-photos' || prevSegment === 'journal') label = 'Photo Session';
            else label = 'Record';
          } else {
            label = segment.charAt(0).toUpperCase() + segment.slice(1);
          }
        }

        return (
          <React.Fragment key={href}>
            <ChevronRight className="hidden sm:block h-3 w-3 text-slate-300 dark:text-slate-600 shrink-0" />
            {isLast ? (
              <span className="font-medium text-sm sm:text-xs text-slate-800 dark:text-slate-200 truncate max-w-[40vw] sm:max-w-[160px]">
                {label}
              </span>
            ) : (
              <Link to={href} className="hidden sm:inline hover:text-slate-700 dark:hover:text-slate-200 transition-colors truncate max-w-[160px]">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
