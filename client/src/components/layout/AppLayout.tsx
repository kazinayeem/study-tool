import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Plus,
  Menu,
  Sparkles,
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  FileText,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { CommandPalette } from './CommandPalette';
import { NotificationDrawer } from './NotificationDrawer';
import { QuickAddModal } from './QuickAddModal';
import { ProfileDropdown } from './ProfileDropdown';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { PrintMenu } from '../common/PrintMenu';
import { api } from '../../lib/api';
import { useNavigate, Link } from 'react-router-dom';

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1280);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState('document');
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const { pathname } = useLocation();

  // Close the mobile drawer after navigating so the new page isn't hidden behind it.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => api.getReminders(),
  });

  const { data: inAppData } = useQuery({
    queryKey: ['inAppNotifications'],
    queryFn: () => api.getInAppNotifications(),
    refetchInterval: 15000,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
  });


  const { user, isDemo, logout } = useAuth();
  const navigate = useNavigate();

  const handleOpenQuickAdd = (type = 'document') => {
    setQuickAddType(type);
    setIsQuickAddOpen(true);
  };

  return (
    <div className="app-shell flex h-dvh w-full overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <div className="app-chrome hidden md:flex">
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          onOpenQuickAdd={() => handleOpenQuickAdd('document')}
        />
      </div>

      {/* Mobile Sidebar overlay */}
      {mobileMenuOpen && (
        <div className="app-chrome fixed inset-0 z-40 flex md:hidden bg-slate-900/60 backdrop-blur-xs">
          <div className="relative flex w-72 flex-col bg-white dark:bg-slate-900 shadow-xl">
            <Sidebar
              collapsed={false}
              setCollapsed={() => setMobileMenuOpen(false)}
              onOpenQuickAdd={() => {
                setMobileMenuOpen(false);
                handleOpenQuickAdd('document');
              }}
            />
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="app-shell-body flex flex-1 flex-col overflow-hidden min-w-0 bg-[#ffffff] dark:bg-[#0f0f11]">
        {/* Persistent Demo Mode Indicator Banner: Notion Bold Yellow */}
        {isDemo && (
          <div className="app-chrome bg-[#f9e79f] text-[#37352f] border-b border-[#ebd06b] px-4 py-2 text-xs font-medium flex items-center justify-between shrink-0 shadow-2xs z-30">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-[#0f6b57]" />
              <span className="font-bold text-[#1a1a1a]">{t('header.demoActive')}</span>
              <span className="hidden sm:inline text-[#5d5b54]">
                {t('header.demoText')}
              </span>
            </div>
            <button
              onClick={() => logout()}
              className="px-2.5 py-1 rounded-[8px] bg-white hover:bg-[#f6f5f4] text-[#1a1a1a] text-[11px] font-semibold border border-[#c8c4be] shadow-2xs transition-colors shrink-0 cursor-pointer"
            >
              {t('header.exitDemo')}
            </button>
          </div>
        )}

        {/* Top Header Bar: Notion Clean Surface & Hairline Border */}
        <header className="app-chrome flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416] px-3 sm:px-4 z-10 text-[#37352f] dark:text-[#f0eeec]">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label={t('nav.openMenu')}
              className="md:hidden -ml-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-[#5d5b54] hover:bg-[#f6f5f4] dark:text-[#a4a097] dark:hover:bg-[#202024]"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 overflow-hidden">
              <Breadcrumbs />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
            {/* Global Search Bar trigger (Notion search-pill: 8px rounded rectangle) */}
            <button
              onClick={() => setIsCommandOpen(true)}
              aria-label={t('header.searchLabel')}
              className="flex h-11 w-11 items-center justify-center gap-2.5 rounded-[8px] border-0 bg-transparent px-0 text-xs sm:h-auto sm:w-64 sm:justify-start sm:border sm:border-[#e5e3df] sm:bg-[#f6f5f4] sm:px-3 sm:py-1.5 sm:text-xs text-[#787671] hover:border-[#c8c4be] hover:bg-[#ede9e4] hover:text-[#1a1a1a] dark:border-[#2a2a2e] dark:bg-[#1c1c1f] dark:hover:border-[#3a3a40] dark:hover:text-white transition-all cursor-pointer"
            >
              <Search className="h-3.5 w-3.5 text-[#787671]" />
              <span className="hidden truncate sm:inline">{t('header.search')}</span>
              <kbd className="hidden sm:inline-block ml-auto rounded-[4px] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#787671] border border-[#e5e3df] dark:bg-[#252528] dark:border-[#37352f]">
                ⌘K
              </kbd>
            </button>

            {/* Notifications Trigger */}
            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="relative flex h-11 w-11 items-center justify-center rounded-[8px] text-[#787671] sm:h-9 sm:w-9 hover:bg-[#f6f5f4] hover:text-[#1a1a1a] dark:hover:bg-[#202024] dark:hover:text-white transition-colors cursor-pointer"
              title={t('header.notifications')}
            >
              <Bell className="h-4 w-4" />
              {(inAppData?.unreadCount ?? 0) > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-[#d9480f] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#141416]">
                  {inAppData!.unreadCount > 9 ? '9+' : inAppData!.unreadCount}
                </span>
              ) : reminders.length > 0 ? (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#0f6b57] ring-2 ring-white dark:ring-[#141416]" />
              ) : null}
            </button>

            <LanguageSwitcher variant="compact" className="hidden !h-9 sm:inline-flex" />

            <PrintMenu />

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="flex h-11 w-11 items-center justify-center rounded-[8px] text-[#787671] hover:bg-[#f6f5f4] hover:text-[#1a1a1a] dark:hover:bg-[#202024] dark:hover:text-white transition-colors cursor-pointer sm:h-9 sm:w-9"
              aria-label="Toggle theme"
              title={theme === 'dark' ? t('header.toLight') : t('header.toDark')}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-[#f5d75e]" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* User Profile Dropdown */}
            <div className="ml-1 pl-1 sm:pl-2 sm:ml-0 border-l border-[#e5e3df] dark:border-[#2a2a2e]">
              {user ? (
                <ProfileDropdown />
              ) : (
                <Link
                  to="/login"
                  className="btn-notion-primary text-xs py-1.5 px-3"
                >
                  {t('header.signIn')}
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="app-main relative flex-1 overflow-y-auto bg-[#ffffff] pb-[calc(4rem+env(safe-area-inset-bottom))] dark:bg-[#0f0f11] md:pb-0">
          <Outlet />
        </main>

        {/* Mobile bottom tab bar: primary destinations within thumb reach */}
        <nav
          aria-label="Primary"
          className="app-chrome fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#e5e3df] bg-white pb-[env(safe-area-inset-bottom)] dark:border-[#2a2a2e] dark:bg-[#141416] md:hidden"
        >
          {[
            { to: '/dashboard', label: t('nav.tabHome'), icon: LayoutDashboard },
            { to: '/semesters', label: t('nav.tabSemesters'), icon: CalendarDays },
            { to: '/assignments', label: t('nav.tabTasks'), icon: CheckSquare },
            { to: '/notes', label: t('nav.tabNotes'), icon: FileText },
          ].map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                  isActive
                    ? 'text-[#0f6b57] dark:text-[#4ccba5]'
                    : 'text-[#787671] dark:text-[#a4a097]'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-[#787671] dark:text-[#a4a097]"
          >
            <Menu className="h-5 w-5" />
            {t('nav.tabMore')}
          </button>
        </nav>
      </div>

      {/* Global Modals & Drawers */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onOpenQuickAdd={handleOpenQuickAdd}
      />
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        defaultTab={quickAddType}
      />
    </div>
  );
};
