import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
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
  ChevronDown,
  BookOpen,
  Calculator,
  Clock,
  Bell,
  Archive,
  Shield,
  Camera,
  Layers,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useActiveSemester } from '../../hooks/useActiveSemester';
import { useI18n } from '../../i18n/I18nContext';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (c: boolean | ((prev: boolean) => boolean)) => void;
  onOpenQuickAdd: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed, onOpenQuickAdd }) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const { activeSemester, activeSemesterId, semesters } = useActiveSemester();
  const [semesterExpanded, setSemesterExpanded] = useState(true);

  // Auto-expand semester tree if on any semester route
  useEffect(() => {
    if (location.pathname.startsWith('/semesters/')) {
      setSemesterExpanded(true);
    }
  }, [location.pathname]);

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard', activeSemesterId],
    queryFn: () => api.getDashboardWithParams({ ...(activeSemesterId && { semesterId: activeSemesterId }) }),
  });

  const { data: inAppData } = useQuery({
    queryKey: ['inAppNotifications'],
    queryFn: () => api.getInAppNotifications(),
    refetchInterval: 30000,
  });

  // Top level workspace navigation
  const workspaceItems = [
    { label: t('nav.dashboard'), icon: LayoutDashboard, path: '/dashboard' },
    { label: t('nav.semesters'), icon: CalendarDays, path: '/semesters', count: semesters.length > 0 ? semesters.length : undefined },
    {
      label: t('nav.degreeProgress'),
      icon: GraduationCap,
      path: '/degree-planner',
      altPath: '/degree-progress',
      aliases: activeSemester ? [`/semesters/${activeSemester.id}/degree-planner`, `/semesters/${activeSemester.id}/degree-progress`] : [],
    },
  ];

  // Active Semester child navigation links
  const semesterChildItems = activeSemester
    ? [
        { label: t('nav.overview'), icon: BookOpen, path: `/semesters/${activeSemester.id}`, end: true },
        { label: t('nav.courses'), icon: GraduationCap, path: `/semesters/${activeSemester.id}/courses`, altPath: '/courses' },
        {
          label: t('nav.assignments'),
          icon: CheckSquare,
          path: `/semesters/${activeSemester.id}/assignments`,
          altPath: '/assignments',
          count: dashboardData?.stats?.overdueCount,
        },
        { label: t('nav.exams'), icon: Award, path: `/semesters/${activeSemester.id}/exams`, altPath: '/exams' },
        { label: t('nav.grades'), icon: Calculator, path: `/semesters/${activeSemester.id}/grades`, altPath: '/grades' },
        { label: t('nav.fees'), icon: Wallet, path: `/semesters/${activeSemester.id}/fees`, altPath: '/fees' },
        { label: t('nav.degreeProgress'), icon: Layers, path: `/semesters/${activeSemester.id}/degree-planner`, altPath: '/degree-planner', aliases: ['/degree-progress'] },
        { label: t('nav.calendar'), icon: Calendar, path: `/semesters/${activeSemester.id}/calendar`, altPath: '/calendar' },
        {
          label: t('nav.planner'),
          icon: Clock,
          path: `/semesters/${activeSemester.id}/planner`,
          altPath: '/planner',
          aliases: [`/semesters/${activeSemester.id}/study-planner`, '/study-planner'],
        },
        {
          label: t('nav.journal'),
          icon: Camera,
          path: `/semesters/${activeSemester.id}/journal`,
          altPath: '/journal',
          aliases: [`/semesters/${activeSemester.id}/class-photos`, '/class-photos'],
        },
        { label: t('nav.documents'), icon: FolderOpen, path: `/semesters/${activeSemester.id}/documents`, altPath: '/documents' },
        { label: t('nav.notes'), icon: FileText, path: `/semesters/${activeSemester.id}/notes`, altPath: '/notes' },
      ]
    : [];

  // Personal and system items
  const personalItems = [
    { label: t('nav.notifications'), icon: Bell, path: '/notifications', count: inAppData?.unreadCount },
    { label: t('nav.backup'), icon: Archive, path: '/backup' },
    ...(user?.role === 'ADMIN' ? [{ label: t('nav.admin'), icon: Shield, path: '/admin' }] : []),
    { label: t('nav.settings'), icon: Settings, path: '/settings' },
  ];

  // Helper to determine if a route is active
  const isRouteActive = (itemPath: string, altPath?: string, end = false, aliases?: string[]) => {
    if (end) {
      return location.pathname === itemPath;
    }
    if (location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`)) {
      return true;
    }
    if (altPath && (location.pathname === altPath || location.pathname.startsWith(`${altPath}/`))) {
      return true;
    }
    if (aliases && aliases.some((a) => location.pathname === a || location.pathname.startsWith(`${a}/`))) {
      return true;
    }
    return false;
  };

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-[#e5e3df] bg-[#fbfbfa] transition-all duration-200 dark:border-[#2a2a2e] dark:bg-[#141416] select-none z-20 text-[#37352f] dark:text-[#f0eeec]',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-[#e5e3df] dark:border-[#2a2a2e]">
        <Link to="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#0f6b57] text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-[family-name:var(--font-display)] font-bold tracking-[-0.01em] text-[#14201c] dark:text-white text-base">ScholarFlow</span>
              <span className="text-[11px] text-[#787671] dark:text-[#a4a097]">Academic Workspace</span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden md:flex h-7 w-7 items-center justify-center rounded-[6px] text-[#787671] hover:bg-[#f0eeec] hover:text-[#1a1a1a] dark:hover:bg-[#252528] dark:hover:text-white transition-colors cursor-pointer"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Quick Action Button: Notion Purple (rounded 8px) */}
      <div className="p-3">
        <button
          onClick={onOpenQuickAdd}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#0f6b57] hover:bg-[#0b5645] active:bg-[#084436] px-3 py-2 font-medium text-white shadow-2xs transition-all cursor-pointer text-xs',
            collapsed ? 'px-0' : ''
          )}
          title="Quick Create"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span>{t('nav.newItem')}</span>}
        </button>
      </div>

      {/* Navigation Scroll Area */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 py-1 scrollbar-none">
        {/* 1. WORKSPACE SECTION */}
        <div>
          {!collapsed && (
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#a4a097] dark:text-[#787671]">
              {t('nav.workspace')}
            </div>
          )}
          <div className="space-y-0.5">
            {workspaceItems.map((item) => {
              const Icon = item.icon;
              const active = isRouteActive(item.path, item.altPath, item.path === '/');
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={cn(
                    'group flex items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                    active
                      ? 'bg-[#ede9e4] text-[#1a1a1a] dark:bg-[#252528] dark:text-white font-semibold'
                      : 'text-[#5d5b54] hover:bg-[#f0eeec] hover:text-[#1a1a1a] dark:text-[#a4a097] dark:hover:bg-[#202024] dark:hover:text-white'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
                  {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                  {!collapsed && item.count !== undefined && item.count > 0 && (
                    <span className="ml-auto rounded-full bg-[#f0eeec] dark:bg-[#252528] px-1.5 py-0.5 text-[10px] font-semibold text-[#5d5b54] dark:text-[#a4a097]">
                      {item.count}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* 2. ACTIVE SEMESTER SECTION */}
        <div>
          {!collapsed && (
            <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#a4a097] dark:text-[#787671]">
              <span>{t('nav.activeSemester')}</span>
              {activeSemester && (
                <button
                  type="button"
                  onClick={() => setSemesterExpanded((prev) => !prev)}
                  className="p-0.5 rounded hover:bg-[#f0eeec] dark:hover:bg-[#252528] text-[#787671] transition-colors"
                  title={semesterExpanded ? 'Collapse semester navigation' : 'Expand semester navigation'}
                >
                  {semesterExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
              )}
            </div>
          )}

          {!activeSemester ? (
            /* Empty State if No Active Semester */
            !collapsed ? (
              <div className="mx-1 my-1 p-2.5 rounded-[8px] bg-[#f8f5e8] dark:bg-[#1a2a52]/20 border border-[#ede9e4] dark:border-[#2a3d6e]/50 text-xs text-center space-y-1.5">
                <p className="text-[11px] font-medium text-[#523410] dark:text-[#f5d75e]">{t('nav.noActiveSemester')}</p>
                <Link
                  to="/semesters"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0f6b57] dark:text-[#4ccba5] hover:underline"
                >
                  <span>+ Select Semester</span>
                </Link>
              </div>
            ) : (
              <div className="flex justify-center py-2" title={t('nav.noActiveSemester')}>
                <span className="h-2 w-2 rounded-full bg-[#dd5b00]" />
              </div>
            )
          ) : (
            /* Active Semester Header & Nested Links */
            <div className="space-y-0.5">
              {!collapsed ? (
                /* Semester Header Card */
                <div
                  className={cn(
                    'group mx-1 mb-1 rounded-[8px] p-2 transition-colors border',
                    location.pathname.startsWith(`/semesters/${activeSemester.id}`)
                      ? 'bg-[#f8f5e8] border-[#ebd06b] dark:bg-[#1a2a52]/30 dark:border-[#2a3d6e]'
                      : 'bg-white dark:bg-[#1a1a1e] border-[#ede9e4] dark:border-[#252528] hover:border-[#c8c4be]'
                  )}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#1aae39]">
                      <span className="h-2 w-2 rounded-full bg-[#1aae39] animate-pulse" />
                      {t('nav.activeTerm')}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-[4px] bg-[#fef7d6] dark:bg-[#523410] font-semibold text-[#523410] dark:text-[#f5d75e] border border-[#f5d75e]/40">
                      {activeSemester.code || 'TERM'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/semesters/${activeSemester.id}`}
                      className="text-xs font-semibold text-[#1a1a1a] hover:text-[#0f6b57] dark:text-white dark:hover:text-[#a8dcc9] truncate block flex-1"
                      title={activeSemester.name}
                    >
                      {activeSemester.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setSemesterExpanded((e) => !e)}
                      className="p-1 rounded text-[#787671] hover:text-[#1a1a1a] hover:bg-[#ede9e4] dark:hover:bg-[#252528] transition-colors"
                      title={semesterExpanded ? 'Collapse' : 'Expand'}
                    >
                      {semesterExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              ) : (
                /* Collapsed Icon for Semester */
                <div className="flex justify-center py-2" title={`Active Semester: ${activeSemester.name}`}>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1aae39] opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#1aae39]" />
                  </span>
                </div>
              )}

              {/* Nested Semester Academic Links */}
              {semesterExpanded && (
                <div className={cn(!collapsed ? 'ml-3 pl-2.5 border-l border-[#e5e3df] dark:border-[#2a2a2e] space-y-0.5 mt-1' : 'space-y-0.5')}>
                  {semesterChildItems.map((child: any) => {
                    const Icon = child.icon;
                    const active = isRouteActive(child.path, child.altPath, child.end, child.aliases);
                    return (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        end={child.end}
                        className={cn(
                          'group flex items-center gap-2 rounded-[6px] text-[11.5px] font-medium transition-colors cursor-pointer',
                          !collapsed ? 'px-2 py-1' : 'justify-center p-2',
                          active
                            ? 'bg-[#ede9e4] text-[#1a1a1a] dark:bg-[#252528] dark:text-white font-semibold'
                            : 'text-[#5d5b54] hover:bg-[#f0eeec] hover:text-[#1a1a1a] dark:text-[#a4a097] dark:hover:bg-[#202024] dark:hover:text-white'
                        )}
                        title={collapsed ? child.label : undefined}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-105" />
                        {!collapsed && <span className="truncate flex-1">{child.label}</span>}
                        {!collapsed && child.count !== undefined && child.count > 0 && (
                          <span className="ml-auto rounded-full bg-[#d9480f] px-1.5 py-0.2 text-[9px] font-bold text-white shadow-2xs">
                            {child.count}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. PERSONAL & SYSTEM SECTION */}
        <div>
          {!collapsed && (
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#a4a097] dark:text-[#787671]">
              {t('nav.personalSystem')}
            </div>
          )}
          <div className="space-y-0.5">
            {personalItems.map((item) => {
              const Icon = item.icon;
              const active = isRouteActive(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'group flex items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                    active
                      ? 'bg-[#ede9e4] text-[#1a1a1a] dark:bg-[#252528] dark:text-white font-semibold'
                      : 'text-[#5d5b54] hover:bg-[#f0eeec] hover:text-[#1a1a1a] dark:text-[#a4a097] dark:hover:bg-[#202024] dark:hover:text-white'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
                  {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                  {!collapsed && item.count !== undefined && item.count > 0 && (
                    <span className="ml-auto rounded-full bg-[#0f6b57] px-1.5 py-0.5 text-[9px] font-bold text-white shadow-2xs">
                      {item.count}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer Info */}
      <div className="border-t border-[#e5e3df] p-3 dark:border-[#2a2a2e] text-[11px] text-[#787671]">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <span className="truncate">Local SQLite Engine</span>
            <span className="text-[10px] bg-[#ede9e4] dark:bg-[#252528] px-1.5 py-0.5 rounded-[4px] text-[#5d5b54] dark:text-[#a4a097]">
              v2.0
            </span>
          </div>
        ) : (
          <div className="flex justify-center text-[10px]">v2.0</div>
        )}
      </div>
    </aside>
  );
};
