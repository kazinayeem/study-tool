import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Plus,
  Menu,
  Sparkles,
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
import { api } from '../../lib/api';
import { useNavigate, Link } from 'react-router-dom';

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState('document');
  const { theme, toggleTheme } = useTheme();

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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          onOpenQuickAdd={() => handleOpenQuickAdd('document')}
        />
      </div>

      {/* Mobile Sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden bg-slate-900/60 backdrop-blur-xs">
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
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 bg-[#ffffff] dark:bg-[#0f0f11]">
        {/* Persistent Demo Mode Indicator Banner: Notion Bold Yellow */}
        {isDemo && (
          <div className="bg-[#f9e79f] text-[#37352f] border-b border-[#ebd06b] px-4 py-2 text-xs font-medium flex items-center justify-between shrink-0 shadow-2xs z-30">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-[#5645d4]" />
              <span className="font-bold text-[#1a1a1a]">Demo Mode Active:</span>
              <span className="hidden sm:inline text-[#5d5b54]">
                Exploring ScholarFlow with pre-seeded sandboxed student records. Changes are isolated to this session.
              </span>
            </div>
            <button
              onClick={() => logout()}
              className="px-2.5 py-1 rounded-[8px] bg-white hover:bg-[#f6f5f4] text-[#1a1a1a] text-[11px] font-semibold border border-[#c8c4be] shadow-2xs transition-colors shrink-0 cursor-pointer"
            >
              Exit Demo
            </button>
          </div>
        )}

        {/* Top Header Bar: Notion Clean Surface & Hairline Border */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416] px-4 z-10 text-[#37352f] dark:text-[#f0eeec]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-[6px] text-[#787671] hover:bg-[#f6f5f4] dark:hover:bg-[#202024]"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Breadcrumbs />
          </div>

          <div className="flex items-center gap-2">
            {/* Global Search Bar trigger (Notion search-pill: 8px rounded rectangle) */}
            <button
              onClick={() => setIsCommandOpen(true)}
              className="flex items-center gap-2.5 rounded-[8px] border border-[#e5e3df] bg-[#f6f5f4] px-3 py-1.5 text-xs text-[#787671] hover:border-[#c8c4be] hover:bg-[#ede9e4] hover:text-[#1a1a1a] dark:border-[#2a2a2e] dark:bg-[#1c1c1f] dark:hover:border-[#3a3a40] dark:hover:text-white transition-all sm:w-64 cursor-pointer"
            >
              <Search className="h-3.5 w-3.5 text-[#787671]" />
              <span className="truncate">Search workspace...</span>
              <kbd className="hidden sm:inline-block ml-auto rounded-[4px] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#787671] border border-[#e5e3df] dark:bg-[#252528] dark:border-[#37352f]">
                ⌘K
              </kbd>
            </button>

            {/* Notifications Trigger */}
            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="relative rounded-[8px] p-2 text-[#787671] hover:bg-[#f6f5f4] hover:text-[#1a1a1a] dark:hover:bg-[#202024] dark:hover:text-white transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {(inAppData?.unreadCount ?? 0) > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-[#ff64c8] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#141416]">
                  {inAppData!.unreadCount > 9 ? '9+' : inAppData!.unreadCount}
                </span>
              ) : reminders.length > 0 ? (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#5645d4] ring-2 ring-white dark:ring-[#141416]" />
              ) : null}
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-[8px] p-2 text-[#787671] hover:bg-[#f6f5f4] hover:text-[#1a1a1a] dark:hover:bg-[#202024] dark:hover:text-white transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to light mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-[#f5d75e]" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* User Profile Dropdown */}
            <div className="pl-2 border-l border-[#e5e3df] dark:border-[#2a2a2e]">
              {user ? (
                <ProfileDropdown />
              ) : (
                <Link
                  to="/login"
                  className="btn-notion-primary text-xs py-1.5 px-3"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto bg-[#ffffff] dark:bg-[#0f0f11]">
          <Outlet />
        </main>
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
