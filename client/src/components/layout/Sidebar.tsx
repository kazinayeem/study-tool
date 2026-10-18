import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  GraduationCap,
  FolderOpen,
  FileText,
  Calendar,
  CheckSquare,
  Award,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (c: boolean | ((prev: boolean) => boolean)) => void;
  onOpenQuickAdd: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed, onOpenQuickAdd }) => {
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard(),
  });

  const activeSemester = dashboardData?.activeSemester;

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Semesters', icon: CalendarDays, path: '/semesters' },
    { label: 'Courses', icon: GraduationCap, path: '/courses' },
    { label: 'Documents', icon: FolderOpen, path: '/documents' },
    { label: 'Notes', icon: FileText, path: '/notes' },
    { label: 'Calendar', icon: Calendar, path: '/calendar' },
    { label: 'Assignments', icon: CheckSquare, path: '/assignments', count: dashboardData?.stats?.overdueCount },
    { label: 'Exams', icon: Award, path: '/exams' },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 select-none z-20',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800">
        <Link to="/" className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20">
            <BookOpen className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold tracking-tight text-slate-900 dark:text-white text-base">ScholarFlow</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Academic Workspace</span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Quick Action Button */}
      <div className="p-3">
        <button
          onClick={onOpenQuickAdd}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 font-medium text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition-all',
            collapsed ? 'px-0' : ''
          )}
          title="Quick Create"
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-sm">New Item</span>}
        </button>
      </div>

      {/* Active Semester Pill */}
      {!collapsed && activeSemester && (
        <div className="mx-3 mb-2 rounded-lg bg-indigo-50/60 p-2.5 border border-indigo-100/80 dark:bg-indigo-950/30 dark:border-indigo-900/40">
          <div className="flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-400 font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Semester
            </span>
            <span className="text-[11px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/60 font-semibold">
              {activeSemester.code || 'TERM'}
            </span>
          </div>
          <Link
            to={`/semesters/${activeSemester.id}`}
            className="text-xs font-semibold text-slate-800 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400 truncate block"
          >
            {activeSemester.name}
          </Link>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
              {!collapsed && <span className="truncate flex-1">{item.label}</span>}
              {!collapsed && item.count !== undefined && item.count > 0 && (
                <span className="ml-auto rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {item.count}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="border-t border-slate-100 p-3 dark:border-slate-800 text-xs text-slate-400">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <span className="truncate font-medium">Local SQLite Engine</span>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">v1.0</span>
          </div>
        ) : (
          <div className="flex justify-center text-[10px]">v1.0</div>
        )}
      </div>
    </aside>
  );
};
