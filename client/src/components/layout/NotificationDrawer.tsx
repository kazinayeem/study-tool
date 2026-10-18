import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, X, Calendar, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const { data: reminders = [], refetch } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => api.getReminders(),
    enabled: isOpen,
  });

  const handleToggleComplete = async (eventId: string) => {
    try {
      await api.toggleCalendarEvent(eventId);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestBrowserPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('ScholarFlow Notifications Enabled', {
          body: 'You will receive study session and deadline alerts while the tab is open.',
        });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-slate-900 dark:text-white text-base">Academic Alerts & Reminders</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Browser notification permission banner */}
        {'Notification' in window && Notification.permission !== 'granted' && (
          <div className="m-4 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-xs">
            <div className="flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Enable Desktop Reminders?</p>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Get notified for exam times and assignment deadlines while active.
                </p>
                <button
                  onClick={handleRequestBrowserPermission}
                  className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 underline"
                >
                  Request permission
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reminders List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {reminders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <CheckCircle className="h-8 w-8 mx-auto text-emerald-500 mb-2 opacity-80" />
              <p className="font-medium text-slate-700 dark:text-slate-300">All caught up!</p>
              <p className="text-xs text-slate-400 mt-1">No urgent events or deadlines within the next 48 hours.</p>
            </div>
          ) : (
            reminders.map((event: any) => (
              <div
                key={event.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 mb-1.5">
                      {event.category}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{event.title}</h4>
                    {event.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleComplete(event.id)}
                    className="p-1 rounded-md text-slate-400 hover:text-emerald-600 transition-colors"
                    title="Mark complete"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {formatDate(event.startDate, 'MMM d, h:mm a')}
                  </span>
                  {event.course && (
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {event.course.code}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <Link
            to="/calendar"
            onClick={onClose}
            className="block text-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Open Full Academic Calendar →
          </Link>
        </div>
      </div>
    </div>
  );
};
