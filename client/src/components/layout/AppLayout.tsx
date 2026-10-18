import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Plus,
  Menu,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { CommandPalette } from './CommandPalette';
import { NotificationDrawer } from './NotificationDrawer';
import { QuickAddModal } from './QuickAddModal';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../lib/api';

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

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
  });

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
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header Bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Breadcrumbs />
          </div>

          <div className="flex items-center gap-2.5">
            {/* Global Search Bar trigger */}
            <button
              onClick={() => setIsCommandOpen(true)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-100/70 px-3.5 py-1.5 text-xs text-slate-400 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-slate-700 dark:hover:text-slate-200 transition-all sm:w-64"
            >
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate">Search academic workspace...</span>
              <kbd className="hidden sm:inline-block ml-auto rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                ⌘K
              </kbd>
            </button>

            {/* Notifications Trigger */}
            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {reminders.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Student Avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-xs font-bold text-white shadow-xs">
                {settings?.studentName ? settings.studentName.charAt(0).toUpperCase() : 'S'}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto">
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
