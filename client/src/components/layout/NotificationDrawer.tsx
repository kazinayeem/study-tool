import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  X,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle,
  CheckCheck,
  ExternalLink,
  Settings,
  Mail,
  History,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { InAppNotification } from '../../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'IN_APP' | 'SCHEDULED'>('IN_APP');

  // Query In-App notifications
  const { data: inAppData, refetch: refetchInApp } = useQuery({
    queryKey: ['inAppNotifications'],
    queryFn: () => api.getInAppNotifications(),
    enabled: isOpen,
    refetchInterval: isOpen ? 10000 : false,
  });

  // Query immediate upcoming calendar/assignment reminders
  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => api.getReminders(),
    enabled: isOpen,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markInAppNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inAppNotifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.markAllInAppNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inAppNotifications'] });
    },
  });

  const handleRequestBrowserPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('BornoFlow Notifications Enabled', {
          body: 'You will receive study session and deadline alerts while the tab is open.',
        });
      }
    }
  };

  if (!isOpen) return null;

  const notifications: InAppNotification[] = inAppData?.notifications || [];
  const unreadCount = inAppData?.unreadCount || 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 border-l border-[#e5e3df] dark:border-[#1e293b] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#e5e3df] dark:border-[#1e293b]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-[8px] bg-[#0f6b57]/10 dark:bg-[#0f6b57]/20 text-[#0f6b57] dark:text-[#4ccba5]">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Notification Center</h3>
              <p className="text-[11px] text-slate-400">
                {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="px-2.5 py-1 text-[11px] font-semibold text-[#0f6b57] hover:text-[#0b5645] dark:text-[#4ccba5] hover:bg-[#0f6b57]/10 rounded-[8px] flex items-center gap-1 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-[8px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-[#e5e3df] dark:border-[#1e293b] bg-[#f7f6f3]/50 dark:bg-slate-850 px-4 pt-2 text-xs">
          <button
            onClick={() => setActiveTab('IN_APP')}
            className={`pb-2 px-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'IN_APP'
                ? 'border-[#0f6b57] text-[#0f6b57] dark:border-[#4ccba5] dark:text-[#4ccba5]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            Inbox & Alerts
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-[4px] bg-rose-500 text-white text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('SCHEDULED')}
            className={`pb-2 px-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'SCHEDULED'
                ? 'border-[#0f6b57] text-[#0f6b57] dark:border-[#4ccba5] dark:text-[#4ccba5]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Upcoming Due ({reminders.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'IN_APP' && (
            <>
              {notifications.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  <CheckCircle className="h-8 w-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">No notifications</p>
                  <p className="mt-1 text-[11px]">When deadline reminders fire, they will appear here.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-[8px] border transition-all text-xs ${
                      !n.isRead
                        ? 'border-[#0f6b57]/30 dark:border-[#0f6b57]/40 bg-[#0f6b57]/5 dark:bg-[#0f6b57]/10'
                        : 'border-[#e5e3df] dark:border-[#1e293b] bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {n.category}
                          </span>
                          {!n.isRead && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[#0f6b57] dark:bg-[#4ccba5]" />
                          )}
                        </div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">{n.title}</h4>
                        <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                          {n.message}
                        </p>
                      </div>

                      {!n.isRead && (
                        <button
                          onClick={() => markReadMutation.mutate(n.id)}
                          className="p-1 rounded-[8px] text-slate-400 hover:text-[#0f6b57] dark:hover:text-[#4ccba5] transition-colors"
                          title="Mark as read"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#e5e3df] dark:border-[#1e293b] flex items-center justify-between text-[11px] text-slate-400">
                      <span>{formatDate(n.createdAt, 'MMM d, h:mm a')}</span>
                      {n.linkUrl && (
                        <Link
                          to={n.linkUrl}
                          onClick={onClose}
                          className="font-semibold text-[#0f6b57] hover:underline dark:text-[#4ccba5] flex items-center gap-1"
                        >
                          Open Details <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'SCHEDULED' && (
            <>
              {reminders.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  <CheckCircle className="h-8 w-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">All caught up!</p>
                  <p className="mt-1 text-[11px]">No urgent events or deadlines within the next 48 hours.</p>
                </div>
              ) : (
                reminders.map((event: any) => (
                  <div
                    key={event.id}
                    className="p-3.5 rounded-[8px] border border-[#e5e3df] dark:border-[#1e293b] bg-slate-50/50 dark:bg-slate-850 hover:border-[#0f6b57]/40 transition-all text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[#0f6b57]/10 text-[#0f6b57] dark:bg-[#0f6b57]/20 dark:text-[#4ccba5] mb-1">
                          {event.category}
                        </span>
                        <h4 className="font-semibold text-slate-900 dark:text-white">{event.title}</h4>
                        {event.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#e5e3df] dark:border-[#1e293b] flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#e5e3df] dark:border-[#1e293b] bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs">
          <Link
            to="/settings"
            onClick={onClose}
            className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300 hover:text-[#0f6b57] dark:hover:text-[#4ccba5] transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            Notification Preferences
          </Link>
          <Link
            to="/calendar"
            onClick={onClose}
            className="font-semibold text-[#0f6b57] dark:text-[#4ccba5] hover:underline"
          >
            Full Calendar &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
