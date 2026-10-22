import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bell,
  Mail,
  CheckCheck,
  Send,
  Activity,
  Calendar,
  AlertTriangle,
  Clock,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Globe,
  Settings2,
  RefreshCw,
  Sliders,
  Trash2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { NotificationPreference } from '../../types';

export const NotificationCenterPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'inApp' | 'history' | 'settings'>('inApp');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testEmailResult, setTestEmailResult] = useState<any>(null);

  // Queries
  const { data: inAppData, isLoading: inAppLoading } = useQuery({
    queryKey: ['inAppNotifications', unreadOnly],
    queryFn: () => api.getInAppNotifications(unreadOnly),
    refetchInterval: 15000,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['notificationHistory'],
    queryFn: () => api.getNotificationHistory(),
  });

  const { data: preferences, isLoading: prefsLoading } = useQuery<NotificationPreference>({
    queryKey: ['notificationPreferences'],
    queryFn: () => api.getNotificationPreferences(),
  });

  // Mutations
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

  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) => api.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inAppNotifications'] });
    },
  });

  const updatePrefsMutation = useMutation({
    mutationFn: (data: any) => api.updateNotificationPreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: (recipient?: string) => api.testEmailNotification(recipient),
    onSuccess: (res) => {
      setTestEmailResult({ success: true, message: res.message || 'Test email dispatched successfully' });
    },
    onError: (err: any) => {
      setTestEmailResult({ success: false, message: err.message || 'SMTP delivery failed' });
    },
  });

  const triggerSchedulerMutation = useMutation({
    mutationFn: () => api.triggerSchedulerCheck(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inAppNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationHistory'] });
    },
  });

  const notifications = inAppData?.notifications || [];
  const unreadCount = inAppData?.unreadCount || 0;
  const historyLogs = historyData?.logs || [];

  const handleToggleBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Browser notifications are not supported in this browser environment.');
      return;
    }
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        updatePrefsMutation.mutate({ enableBrowserNotifications: true });
      }
    } else {
      updatePrefsMutation.mutate({
        enableBrowserNotifications: !preferences?.enableBrowserNotifications,
      });
    }
  };

  return (
    <div className="min-h-full bg-slate-50 p-6 dark:bg-slate-950 sm:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/20">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Notification & Reminder Center
              </h1>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-bold text-white">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Idempotent SMTP reminders, in-app alerts, retry backoff, and delivery audit logs
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => triggerSchedulerMutation.mutate()}
            disabled={triggerSchedulerMutation.isPending}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            title="Force immediate scheduler check"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-slate-400 ${
                triggerSchedulerMutation.isPending ? 'animate-spin' : ''
              }`}
            />
            <span>Check Deadlines Now</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="btn-notion-primary text-xs shadow-2xs"
            >
              <CheckCheck className="h-4 w-4" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs: Notion Segmented Underline Tabs */}
      <div className="mb-6 flex border-b border-[#e5e3df] dark:border-[#2a2a2e]">
        <button
          onClick={() => setActiveTab('inApp')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'inApp'
              ? 'border-[#1a1a1a] text-[#1a1a1a] font-semibold dark:border-white dark:text-white'
              : 'border-transparent text-[#787671] hover:text-[#1a1a1a] dark:hover:text-white'
          }`}
        >
          <Bell className="h-4 w-4" />
          <span>In-App Alerts ({notifications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'history'
              ? 'border-[#1a1a1a] text-[#1a1a1a] font-semibold dark:border-white dark:text-white'
              : 'border-transparent text-[#787671] hover:text-[#1a1a1a] dark:hover:text-white'
          }`}
        >
          <Mail className="h-4 w-4" />
          <span>SMTP Delivery Audit Log ({historyLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'settings'
              ? 'border-[#1a1a1a] text-[#1a1a1a] font-semibold dark:border-white dark:text-white'
              : 'border-transparent text-[#787671] hover:text-[#1a1a1a] dark:hover:text-white'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Channels & Rules Configuration</span>
        </button>
      </div>

      {/* TAB 1: IN-APP NOTIFICATIONS */}
      {activeTab === 'inApp' && (
        <div className="space-y-4">
          <div className="card-notion flex items-center justify-between rounded-[12px] border border-[#e5e3df] bg-white p-3.5 shadow-2xs dark:border-[#2a2a2e] dark:bg-[#141416]">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-medium text-[#37352f] dark:text-[#f0eeec] cursor-pointer">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="rounded border-[#c8c4be] text-[#0f6b57] focus:ring-[#0f6b57]"
                />
                <span>Show Unread Only</span>
              </label>
            </div>
            <div className="text-xs text-[#787671]">
              Default Timezone: <span className="font-semibold text-[#1a1a1a] dark:text-white">Asia/Dhaka</span>
            </div>
          </div>

          {inAppLoading ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 w-full animate-pulse rounded-[12px] bg-[#f0eeec] dark:bg-[#202024]" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="card-notion rounded-[12px] border border-dashed border-[#c8c4be] bg-white p-12 text-center text-xs text-[#787671] shadow-2xs dark:border-[#37352f] dark:bg-[#141416]">
              <Bell className="mx-auto mb-3 h-8 w-8 text-[#a4a097]" />
              <p className="font-semibold text-[#1a1a1a] dark:text-white">No notifications found</p>
              <p className="mt-1">All clear! Upcoming assignment deadlines and exams will trigger notifications automatically.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {notifications.map((n: any) => {
                const isUnread = !n.read;
                let linkPath = '/';
                if (n.resourceType === 'ASSIGNMENT' && n.resourceId) linkPath = `/assignments`;
                else if (n.resourceType === 'EXAM' && n.resourceId) linkPath = `/exams`;
                else if (n.resourceType === 'STUDY_SESSION' && n.resourceId) linkPath = `/planner`;

                return (
                  <div
                    key={n.id}
                    className={`card-notion flex items-start justify-between rounded-[12px] border p-4 transition-all shadow-2xs ${
                      isUnread
                        ? 'border-[#a8dcc9] bg-[#dcf0e8]/30 dark:border-[#0d3b30] dark:bg-[#0d3b30]/20'
                        : 'border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] ${
                          isUnread
                            ? 'bg-[#0f6b57] text-white'
                            : 'bg-[#f0eeec] text-[#787671] dark:bg-[#252528] dark:text-[#a4a097]'
                        }`}
                      >
                        <Bell className="h-4 w-4" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4
                            className={`text-xs font-semibold ${
                              isUnread
                                ? 'text-[#1a1a1a] dark:text-white'
                                : 'text-[#5d5b54] dark:text-[#a4a097]'
                            }`}
                          >
                            {n.title}
                          </h4>
                          {isUnread && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[#e03131]" />
                          )}
                        </div>

                        <p className="mt-1 text-xs text-[#5d5b54] dark:text-[#a4a097] leading-relaxed">
                          {n.message}
                        </p>

                        <div className="mt-2 flex items-center gap-3 text-[11px] text-[#787671]">
                          <span>{formatDate(n.createdAt, 'MMM d, h:mm a')}</span>
                          {n.resourceType && (
                            <Link
                              to={linkPath}
                              className="font-semibold text-[#0f6b57] hover:underline dark:text-[#a8dcc9]"
                            >
                              View {n.resourceType.toLowerCase()} →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isUnread && (
                        <button
                          onClick={() => markReadMutation.mutate(n.id)}
                          className="p-1.5 rounded-[6px] text-[#787671] hover:text-[#0f6b57] hover:bg-[#ede9e4] dark:hover:bg-[#252528] text-xs font-medium cursor-pointer"
                          title="Mark as read"
                        >
                          <CheckCheck className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotificationMutation.mutate(n.id)}
                        className="p-1.5 rounded-[6px] text-[#787671] hover:text-[#e03131] hover:bg-[#fde0ec] dark:hover:bg-[#0d3b30]/40 text-xs font-medium cursor-pointer"
                        title="Delete notification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SMTP DELIVERY AUDIT LOG */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="card-notion rounded-[12px] border border-[#e5e3df] bg-white p-6 shadow-2xs dark:border-[#2a2a2e] dark:bg-[#141416]">
            <h3 className="text-base font-semibold text-[#1a1a1a] dark:text-white mb-1">
              Outbound Email Delivery Logs
            </h3>
            <p className="text-xs text-[#787671] mb-4">
              Detailed tracking of Nodemailer dispatches, retry attempts, and recipient status.
            </p>

            {historyLoading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 w-full animate-pulse rounded-[8px] bg-[#f0eeec] dark:bg-[#202024]" />
                ))}
              </div>
            ) : historyLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#787671]">
                <Mail className="mx-auto mb-2 h-8 w-8 text-[#a4a097]" />
                No outbound emails have been dispatched yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#ede9e4] text-[#787671] dark:border-[#252528]">
                      <th className="pb-3 font-semibold">Recipient</th>
                      <th className="pb-3 font-semibold">Subject</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Attempts</th>
                      <th className="pb-3 font-semibold">Sent At</th>
                      <th className="pb-3 font-semibold">Error / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ede9e4] dark:divide-[#252528]">
                    {historyLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-[#f6f5f4] dark:hover:bg-[#1c1c1f]">
                        <td className="py-3 font-medium text-[#1a1a1a] dark:text-[#f0eeec]">
                          {log.recipient}
                        </td>
                        <td className="py-3 font-semibold text-[#1a1a1a] dark:text-white max-w-xs truncate">
                          {log.subject}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              log.status === 'SENT'
                                ? 'bg-[#d9f3e1] text-[#1aae39]'
                                : log.status === 'FAILED'
                                ? 'bg-[#fde0ec] text-[#e03131]'
                                : 'bg-[#ffe8d4] text-[#dd5b00]'
                            }`}
                          >
                            {log.status === 'SENT' ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : log.status === 'FAILED' ? (
                              <XCircle className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 text-[#5d5b54] dark:text-[#a4a097]">
                          {log.attempts}
                        </td>
                        <td className="py-3 text-[#787671]">
                          {log.sentAt ? formatDate(log.sentAt, 'MMM d, h:mm a') : '—'}
                        </td>
                        <td className="py-3 text-[#787671] max-w-xs truncate">
                          {log.errorMessage || 'Delivered OK'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CHANNELS & RULES SETTINGS */}
      {activeTab === 'settings' && preferences && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Notification Channels Card */}
          <div className="card-notion rounded-[12px] border border-[#e5e3df] bg-white p-6 shadow-2xs dark:border-[#2a2a2e] dark:bg-[#141416]">
            <h3 className="text-base font-semibold text-[#1a1a1a] dark:text-white mb-1">
              Active Delivery Channels
            </h3>
            <p className="text-xs text-[#787671] mb-5">
              Control where and how urgent academic reminders are delivered.
            </p>

            <div className="space-y-4">
              {/* In-App Notifications Toggle */}
              <div className="flex items-center justify-between rounded-[8px] border border-[#ede9e4] p-4 dark:border-[#252528]">
                <div>
                  <h4 className="text-xs font-semibold text-[#1a1a1a] dark:text-white">
                    In-App Notification Center
                  </h4>
                  <p className="text-[11px] text-[#787671]">
                    Badge counters, dropdown alerts, and real-time banner notifications
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.enableInAppNotifications}
                  onChange={(e) =>
                    updatePrefsMutation.mutate({
                      enableInAppNotifications: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-[#c8c4be] text-[#0f6b57] focus:ring-[#0f6b57]"
                />
              </div>

              {/* SMTP Email Notifications Toggle */}
              <div className="flex items-center justify-between rounded-[8px] border border-[#ede9e4] p-4 dark:border-[#252528]">
                <div>
                  <h4 className="text-xs font-semibold text-[#1a1a1a] dark:text-white">
                    SMTP Email Notifications
                  </h4>
                  <p className="text-[11px] text-[#787671]">
                    HTML + plain-text email digests for upcoming exams and deadlines
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.enableEmailNotifications}
                  onChange={(e) =>
                    updatePrefsMutation.mutate({
                      enableEmailNotifications: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-[#c8c4be] text-[#0f6b57] focus:ring-[#0f6b57]"
                />
              </div>

              {/* Browser Desktop Notifications Toggle */}
              <div className="flex items-center justify-between rounded-[8px] border border-[#ede9e4] p-4 dark:border-[#252528]">
                <div>
                  <h4 className="text-xs font-semibold text-[#1a1a1a] dark:text-white">
                    Browser Desktop Notifications
                  </h4>
                  <p className="text-[11px] text-[#787671]">
                    Native OS banners when study sessions or Pomodoros finish
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleBrowserNotifications}
                  className={`btn-notion-secondary text-xs py-1 px-3 ${
                    preferences.enableBrowserNotifications
                      ? 'bg-[#d9f3e1] text-[#1aae39] border-[#1aae39]/40'
                      : ''
                  }`}
                >
                  {preferences.enableBrowserNotifications ? 'Enabled' : 'Enable'}
                </button>
              </div>
            </div>

            {/* Test Email Trigger Box */}
            <div className="mt-6 rounded-[8px] bg-[#fbfbfa] p-4 border border-[#ede9e4] dark:bg-[#19191c] dark:border-[#252528]">
              <h4 className="text-xs font-semibold text-[#1a1a1a] dark:text-white mb-2">
                Send Diagnostic Test Email
              </h4>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Recipient email (defaults to owner)"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  className="flex-1 h-[38px] rounded-[8px] border border-[#c8c4be] bg-white px-3 text-xs text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white focus:outline-none focus:border-2 focus:border-[#0f6b57]"
                />
                <button
                  onClick={() => testEmailMutation.mutate(testEmailRecipient || undefined)}
                  disabled={testEmailMutation.isPending}
                  className="btn-notion-primary text-xs h-[38px] px-3.5 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{testEmailMutation.isPending ? 'Sending...' : 'Test SMTP'}</span>
                </button>
              </div>

              {testEmailResult && (
                <div
                  className={`mt-3 rounded-[6px] p-2.5 text-xs flex items-center gap-2 ${
                    testEmailResult.success
                      ? 'bg-[#d9f3e1] text-[#1aae39] border border-[#1aae39]/30'
                      : 'bg-[#fde0ec] text-[#e03131] border border-[#d9480f]/30'
                  }`}
                >
                  {testEmailResult.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{testEmailResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Trigger Intervals & Category Rules Card */}
          <div className="card-notion rounded-[12px] border border-[#e5e3df] bg-white p-6 shadow-2xs dark:border-[#2a2a2e] dark:bg-[#141416]">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Category & Interval Rules
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Specify trigger schedules for assignments, exams, and study sessions.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Assignment Reminders
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Triggers before upcoming submission deadlines
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.notifyAssignments}
                  onChange={(e) =>
                    updatePrefsMutation.mutate({ notifyAssignments: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Exam & Quiz Reminders
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Triggers before midterms, finals, and class tests
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.notifyExams}
                  onChange={(e) =>
                    updatePrefsMutation.mutate({ notifyExams: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Study Session Reminders
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Alerts 2 hours before planned study block and at start time
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.notifyStudySessions}
                  onChange={(e) =>
                    updatePrefsMutation.mutate({ notifyStudySessions: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Calendar Event Reminders
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Consultations, presentations, and lab schedules
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.notifyCalendarEvents}
                  onChange={(e) =>
                    updatePrefsMutation.mutate({ notifyCalendarEvents: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
              </div>

              <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mb-2">
                  Configured Trigger Intervals
                </span>
                <div className="flex flex-wrap gap-2 text-xs">
                  {['7d', '3d', '1d', '2h', 'start'].map((interval) => (
                    <span
                      key={interval}
                      className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    >
                      ✓ {interval === '7d' ? '7 Days Before' : interval === '3d' ? '3 Days Before' : interval === '1d' ? '1 Day Before' : interval === '2h' ? '2 Hours Before' : 'At Event Start'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
