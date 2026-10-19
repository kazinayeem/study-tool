import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Mail,
  Bell,
  History,
  Database,
  User,
  Sun,
  Moon,
  Check,
  AlertCircle,
  RefreshCw,
  Send,
  Download,
  ShieldCheck,
  Clock,
  Calendar,
  Filter,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { AppSetting, Semester, NotificationPreference, NotificationLog } from '../../types';
import { formatDate } from '../../lib/utils';

const AVAILABLE_INTERVALS = [
  { id: '7d', label: '7 days before' },
  { id: '3d', label: '3 days before' },
  { id: '1d', label: '1 day before (~24h)' },
  { id: 'due', label: 'On due date/time' },
];

const TIMEZONES = [
  { value: 'Asia/Dhaka', label: 'Asia/Dhaka (GMT+6) — Default' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New York (Eastern Time)' },
  { value: 'America/Chicago', label: 'America/Chicago (Central Time)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (Pacific Time)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
];

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'PROFILE' | 'NOTIFICATIONS' | 'HISTORY' | 'BACKUP'>('PROFILE');

  // Profile states
  const [studentName, setStudentName] = useState('');
  const [universityName, setUniversityName] = useState('');
  const [degree, setDegree] = useState('');
  const [currentSemesterId, setCurrentSemesterId] = useState('');
  const [autoSaveDelayMs, setAutoSaveDelayMs] = useState(1500);
  const [browserAlertsEnabled, setBrowserAlertsEnabled] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Notification Preference states
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [notifyAssignments, setNotifyAssignments] = useState(true);
  const [notifyQuizzes, setNotifyQuizzes] = useState(true);
  const [notifyMidterms, setNotifyMidterms] = useState(true);
  const [notifyFinals, setNotifyFinals] = useState(true);
  const [notifyProjects, setNotifyProjects] = useState(true);
  const [notifyCustomEvents, setNotifyCustomEvents] = useState(true);
  const [assignmentIntervals, setAssignmentIntervals] = useState<string[]>(['7d', '3d', '1d', 'due']);
  const [quizIntervals, setQuizIntervals] = useState<string[]>(['3d', '1d', 'due']);
  const [midtermIntervals, setMidtermIntervals] = useState<string[]>(['7d', '3d', '1d', 'due']);
  const [finalIntervals, setFinalIntervals] = useState<string[]>(['7d', '3d', '1d', 'due']);
  const [projectIntervals, setProjectIntervals] = useState<string[]>(['7d', '3d', '1d', 'due']);
  const [customEventIntervals, setCustomEventIntervals] = useState<string[]>(['1d', 'due']);
  const [timezone, setTimezone] = useState('Asia/Dhaka');
  const [prefsSaveSuccess, setPrefsSaveSuccess] = useState(false);

  // Test email states
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // History filter states
  const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('ALL');
  const [historyPage, setHistoryPage] = useState(1);

  // App settings query
  const { data: settings } = useQuery<AppSetting>({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
  });

  // Semesters query for active semester picker
  const { data: semesters = [] } = useQuery<Semester[]>({
    queryKey: ['semesters'],
    queryFn: () => api.getSemesters(),
  });

  // Notification Preferences query
  const { data: notifPrefs } = useQuery<NotificationPreference>({
    queryKey: ['notificationPreferences'],
    queryFn: () => api.getNotificationPreferences(),
  });

  // History query
  const { data: historyData, refetch: refetchHistory, isFetching: fetchingHistory } = useQuery({
    queryKey: ['notificationHistory', historyStatusFilter, historyTypeFilter, historyPage],
    queryFn: () =>
      api.getNotificationHistory({
        status: historyStatusFilter,
        type: historyTypeFilter,
        page: historyPage,
        limit: 20,
      }),
  });

  // Storage integrity audit query
  const { data: integrity, refetch: refetchIntegrity, isFetching: checkingIntegrity } = useQuery({
    queryKey: ['backupIntegrity'],
    queryFn: () => api.getBackupIntegrity(),
  });

  useEffect(() => {
    if (settings) {
      setStudentName(settings.studentName || '');
      setUniversityName(settings.universityName || '');
      setDegree(settings.degree || '');
      setCurrentSemesterId(settings.currentSemesterId || '');
      setAutoSaveDelayMs(settings.autoSaveDelayMs || 1500);
      setBrowserAlertsEnabled(settings.enableBrowserNotifications || false);
    }
  }, [settings]);

  useEffect(() => {
    if (notifPrefs) {
      setRecipientEmail(notifPrefs.recipientEmail || '');
      setTestEmailRecipient(notifPrefs.recipientEmail || '');
      setEmailEnabled(notifPrefs.emailEnabled ?? true);
      setNotifyAssignments(notifPrefs.notifyAssignments ?? true);
      setNotifyQuizzes(notifPrefs.notifyQuizzes ?? true);
      setNotifyMidterms(notifPrefs.notifyMidterms ?? true);
      setNotifyFinals(notifPrefs.notifyFinals ?? true);
      setNotifyProjects(notifPrefs.notifyProjects ?? true);
      setNotifyCustomEvents(notifPrefs.notifyCustomEvents ?? true);
      setAssignmentIntervals(notifPrefs.assignmentIntervals || ['7d', '3d', '1d', 'due']);
      setQuizIntervals(notifPrefs.quizIntervals || ['3d', '1d', 'due']);
      setMidtermIntervals(notifPrefs.midtermIntervals || ['7d', '3d', '1d', 'due']);
      setFinalIntervals(notifPrefs.finalIntervals || ['7d', '3d', '1d', 'due']);
      setProjectIntervals(notifPrefs.projectIntervals || ['7d', '3d', '1d', 'due']);
      setCustomEventIntervals(notifPrefs.customEventIntervals || ['1d', 'due']);
      setTimezone(notifPrefs.timezone || 'Asia/Dhaka');
    }
  }, [notifPrefs]);

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: () =>
      api.updateSettings({
        studentName: studentName.trim(),
        universityName: universityName.trim() || null,
        degree: degree.trim() || null,
        currentSemesterId: currentSemesterId || null,
        autoSaveDelayMs: Number(autoSaveDelayMs),
        enableBrowserNotifications: browserAlertsEnabled,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    },
  });

  const updatePrefsMutation = useMutation({
    mutationFn: () =>
      api.updateNotificationPreferences({
        recipientEmail: recipientEmail.trim(),
        emailEnabled,
        notifyAssignments,
        notifyQuizzes,
        notifyMidterms,
        notifyFinals,
        notifyProjects,
        notifyCustomEvents,
        assignmentIntervals,
        quizIntervals,
        midtermIntervals,
        finalIntervals,
        projectIntervals,
        customEventIntervals,
        timezone,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      setPrefsSaveSuccess(true);
      setTimeout(() => setPrefsSaveSuccess(false), 3000);
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: () => api.testEmailNotification(testEmailRecipient.trim() || recipientEmail.trim()),
    onSuccess: (res) => {
      setTestResult({
        success: true,
        message: res?.message || 'Test email dispatched successfully! Please check your inbox.',
      });
      refetchHistory();
    },
    onError: (err: any) => {
      setTestResult({
        success: false,
        message: err?.message || 'SMTP transmission check failed. Please verify credentials in .env.',
      });
      refetchHistory();
    },
  });

  const triggerSchedulerMutation = useMutation({
    mutationFn: () => api.triggerSchedulerCheck(),
    onSuccess: (res) => {
      refetchHistory();
      alert(`Scheduler run complete. Processed ${res.processed} pending jobs.`);
    },
  });

  const cleanOrphansMutation = useMutation({
    mutationFn: () => api.cleanOrphanFiles(),
    onSuccess: () => {
      refetchIntegrity();
    },
  });

  const toggleInterval = (list: string[], setList: (v: string[]) => void, intervalId: string) => {
    if (list.includes(intervalId)) {
      if (list.length === 1) return; // Keep at least one interval
      setList(list.filter((x) => x !== intervalId));
    } else {
      setList([...list, intervalId]);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="border-b border-[#e5e3df] pb-4 dark:border-[#1e293b] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-[#5645d4] dark:text-[#8070f6]" />
            Workspace & Notification Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure student profile, SMTP email schedules, delivery audit history, and data backup.
          </p>
        </div>

        {/* Manual Scheduler Run Button */}
        <button
          onClick={() => triggerSchedulerMutation.mutate()}
          disabled={triggerSchedulerMutation.isPending}
          className="btn-notion-secondary text-xs flex items-center gap-1.5 shrink-0"
          title="Manually process due notification jobs immediately"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${triggerSchedulerMutation.isPending ? 'animate-spin text-[#5645d4]' : ''}`} />
          Run Scheduler Now
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e5e3df] dark:border-[#1e293b] text-xs">
        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`pb-3 px-4 font-semibold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'PROFILE'
              ? 'border-[#5645d4] text-[#5645d4] dark:border-[#8070f6] dark:text-[#8070f6]'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <User className="h-4 w-4" /> Student & Appearance
        </button>

        <button
          onClick={() => setActiveTab('NOTIFICATIONS')}
          className={`pb-3 px-4 font-semibold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'NOTIFICATIONS'
              ? 'border-[#5645d4] text-[#5645d4] dark:border-[#8070f6] dark:text-[#8070f6]'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Mail className="h-4 w-4" /> Email & Reminder Preferences
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-3 px-4 font-semibold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'HISTORY'
              ? 'border-[#5645d4] text-[#5645d4] dark:border-[#8070f6] dark:text-[#8070f6]'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <History className="h-4 w-4" /> Delivery Audit History
        </button>

        <button
          onClick={() => setActiveTab('BACKUP')}
          className={`pb-3 px-4 font-semibold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'BACKUP'
              ? 'border-[#5645d4] text-[#5645d4] dark:border-[#8070f6] dark:text-[#8070f6]'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Database className="h-4 w-4" /> Data Safety & Integrity
        </button>
      </div>

      {/* ================= TAB 1: PROFILE ================= */}
      {activeTab === 'PROFILE' && (
        <div className="space-y-6">
          {profileSaveSuccess && (
            <div className="p-3.5 rounded-[8px] bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:border-emerald-900">
              <Check className="h-4 w-4" /> Profile settings updated successfully!
            </div>
          )}

          <div className="card-notion p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Student Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Your Full Name</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Default Active Semester</label>
                <select
                  value={currentSemesterId}
                  onChange={(e) => setCurrentSemesterId(e.target.value)}
                  className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Auto-detect active term</option>
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Degree / Academic Major</label>
                <input
                  type="text"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  placeholder="e.g. B.S. in Computer Science & Engineering"
                  className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">University / Department</label>
                <input
                  type="text"
                  value={universityName}
                  onChange={(e) => setUniversityName(e.target.value)}
                  placeholder="e.g. Department of CSE"
                  className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="card-notion p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Workspace Appearance & Autosave</h2>
            <div className="flex items-center gap-4 text-xs">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[8px] border transition-all ${
                  theme === 'light'
                    ? 'border-[#5645d4] bg-[#5645d4]/10 text-[#5645d4] font-semibold'
                    : 'border-[#e5e3df] text-slate-700 hover:bg-slate-50 dark:border-[#1e293b] dark:text-slate-300'
                }`}
              >
                <Sun className="h-4 w-4" /> Clean Light Mode
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[8px] border transition-all ${
                  theme === 'dark'
                    ? 'border-[#5645d4] bg-[#5645d4]/20 text-[#8070f6] font-semibold'
                    : 'border-[#e5e3df] text-slate-700 hover:bg-slate-50 dark:border-[#1e293b] dark:text-slate-300'
                }`}
              >
                <Moon className="h-4 w-4" /> Dark Study Mode
              </button>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => updateSettingsMutation.mutate()}
                disabled={updateSettingsMutation.isPending}
                className="btn-notion-primary text-xs"
              >
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Profile Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: NOTIFICATIONS ================= */}
      {activeTab === 'NOTIFICATIONS' && (
        <div className="space-y-6">
          {prefsSaveSuccess && (
            <div className="p-3.5 rounded-[8px] bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:border-emerald-900">
              <Check className="h-4 w-4" /> Notification preferences saved and upcoming schedules refreshed!
            </div>
          )}

          {/* 1. Global SMTP & Recipient Settings */}
          <div className="card-notion p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#5645d4] dark:text-[#8070f6]" />
              Recipient & Timezone Configuration
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  All scheduled reminders will be transmitted to this email address.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notification Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  All reminder deadlines and emails are formatted in this timezone.
                </p>
              </div>
            </div>

            {/* Global Email Notifications Toggle */}
            <div className="p-4 rounded-[8px] bg-slate-50 dark:bg-slate-800/40 border border-[#e5e3df] dark:border-[#1e293b] flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">
                  Enable SMTP Email Notifications Globally
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  When disabled, emails are suppressed while in-app notifications continue to record.
                </span>
              </div>
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="h-5 w-5 rounded-[4px] border-[#e5e3df] text-[#5645d4] focus:ring-[#5645d4] accent-[#5645d4]"
              />
            </div>
          </div>

          {/* 2. SMTP Diagnostic & Test Email */}
          <div className="card-notion p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Send className="h-5 w-5 text-[#5645d4] dark:text-[#8070f6]" />
              SMTP Connectivity & Test Email
            </h2>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Transmit a real test email through your configured SMTP credentials to verify transport acceptance.
            </p>

            {testResult && (
              <div
                className={`p-3.5 rounded-[8px] border text-xs font-semibold flex items-center gap-2.5 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                    : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                }`}
              >
                {testResult.success ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 text-xs">
              <input
                type="email"
                placeholder="Send test email to address..."
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                className="w-full sm:flex-1 rounded-[8px] border border-[#e5e3df] p-2.5 text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() => testEmailMutation.mutate()}
                disabled={testEmailMutation.isPending}
                className="btn-notion-primary text-xs flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto"
              >
                <Send className="h-3.5 w-3.5" />
                {testEmailMutation.isPending ? 'Testing SMTP...' : 'Send Test Email'}
              </button>
            </div>
          </div>

          {/* 3. Event-Type Toggles & Multi-Interval Schedules */}
          <div className="card-notion p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Reminder Schedules by Event Type
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select one or more reminder intervals for each academic category. If a deadline is tomorrow, an alert is sent approximately 24 hours prior according to your schedule.
              </p>
            </div>

            {/* Assignments */}
            <div className="p-4 rounded-[8px] border border-[#e5e3df] dark:border-[#1e293b] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-xs">Assignment Reminders</span>
                  <p className="text-[11px] text-slate-400">Homework, problem sets, and lab deliverables</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyAssignments}
                  onChange={(e) => setNotifyAssignments(e.target.checked)}
                  className="h-4 w-4 rounded-[4px] border-[#e5e3df] text-[#5645d4] focus:ring-[#5645d4] accent-[#5645d4]"
                />
              </div>

              {notifyAssignments && (
                <div className="pt-2 border-t border-[#e5e3df] dark:border-[#1e293b] flex flex-wrap gap-2 text-xs">
                  {AVAILABLE_INTERVALS.map((inv) => (
                    <button
                      type="button"
                      key={inv.id}
                      onClick={() => toggleInterval(assignmentIntervals, setAssignmentIntervals, inv.id)}
                      className={`px-3 py-1.5 rounded-[8px] border font-medium transition-all ${
                        assignmentIntervals.includes(inv.id)
                          ? 'border-[#5645d4] bg-[#5645d4]/10 text-[#5645d4] dark:bg-[#5645d4]/20 dark:text-[#8070f6] font-semibold'
                          : 'border-[#e5e3df] text-slate-500 hover:border-slate-300 dark:border-[#1e293b] dark:text-slate-400'
                      }`}
                    >
                      {inv.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quizzes */}
            <div className="p-4 rounded-[8px] border border-[#e5e3df] dark:border-[#1e293b] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-xs">Quiz Reminders</span>
                  <p className="text-[11px] text-slate-400">Class quizzes, short tests, and viva alerts</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyQuizzes}
                  onChange={(e) => setNotifyQuizzes(e.target.checked)}
                  className="h-4 w-4 rounded-[4px] border-[#e5e3df] text-[#5645d4] focus:ring-[#5645d4] accent-[#5645d4]"
                />
              </div>

              {notifyQuizzes && (
                <div className="pt-2 border-t border-[#e5e3df] dark:border-[#1e293b] flex flex-wrap gap-2 text-xs">
                  {AVAILABLE_INTERVALS.map((inv) => (
                    <button
                      type="button"
                      key={inv.id}
                      onClick={() => toggleInterval(quizIntervals, setQuizIntervals, inv.id)}
                      className={`px-3 py-1.5 rounded-[8px] border font-medium transition-all ${
                        quizIntervals.includes(inv.id)
                          ? 'border-[#5645d4] bg-[#5645d4]/10 text-[#5645d4] dark:bg-[#5645d4]/20 dark:text-[#8070f6] font-semibold'
                          : 'border-[#e5e3df] text-slate-500 hover:border-slate-300 dark:border-[#1e293b] dark:text-slate-400'
                      }`}
                    >
                      {inv.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Midterm Exams */}
            <div className="p-4 rounded-[8px] border border-[#e5e3df] dark:border-[#1e293b] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-xs">Midterm Exam Reminders</span>
                  <p className="text-[11px] text-slate-400">Midterm exams with syllabus revision details</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyMidterms}
                  onChange={(e) => setNotifyMidterms(e.target.checked)}
                  className="h-4 w-4 rounded-[4px] border-[#e5e3df] text-[#5645d4] focus:ring-[#5645d4] accent-[#5645d4]"
                />
              </div>

              {notifyMidterms && (
                <div className="pt-2 border-t border-[#e5e3df] dark:border-[#1e293b] flex flex-wrap gap-2 text-xs">
                  {AVAILABLE_INTERVALS.map((inv) => (
                    <button
                      type="button"
                      key={inv.id}
                      onClick={() => toggleInterval(midtermIntervals, setMidtermIntervals, inv.id)}
                      className={`px-3 py-1.5 rounded-[8px] border font-medium transition-all ${
                        midtermIntervals.includes(inv.id)
                          ? 'border-[#5645d4] bg-[#5645d4]/10 text-[#5645d4] dark:bg-[#5645d4]/20 dark:text-[#8070f6] font-semibold'
                          : 'border-[#e5e3df] text-slate-500 hover:border-slate-300 dark:border-[#1e293b] dark:text-slate-400'
                      }`}
                    >
                      {inv.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Final Exams */}
            <div className="p-4 rounded-[8px] border border-[#e5e3df] dark:border-[#1e293b] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-xs">Final Exam Reminders</span>
                  <p className="text-[11px] text-slate-400">End-of-term examinations and cheat sheets</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyFinals}
                  onChange={(e) => setNotifyFinals(e.target.checked)}
                  className="h-4 w-4 rounded-[4px] border-[#e5e3df] text-[#5645d4] focus:ring-[#5645d4] accent-[#5645d4]"
                />
              </div>

              {notifyFinals && (
                <div className="pt-2 border-t border-[#e5e3df] dark:border-[#1e293b] flex flex-wrap gap-2 text-xs">
                  {AVAILABLE_INTERVALS.map((inv) => (
                    <button
                      type="button"
                      key={inv.id}
                      onClick={() => toggleInterval(finalIntervals, setFinalIntervals, inv.id)}
                      className={`px-3 py-1.5 rounded-[8px] border font-medium transition-all ${
                        finalIntervals.includes(inv.id)
                          ? 'border-[#5645d4] bg-[#5645d4]/10 text-[#5645d4] dark:bg-[#5645d4]/20 dark:text-[#8070f6] font-semibold'
                          : 'border-[#e5e3df] text-slate-500 hover:border-slate-300 dark:border-[#1e293b] dark:text-slate-400'
                      }`}
                    >
                      {inv.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Project Deadlines */}
            <div className="p-4 rounded-[8px] border border-[#e5e3df] dark:border-[#1e293b] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-xs">Project Deadline Reminders</span>
                  <p className="text-[11px] text-slate-400">Academic milestone submissions and deliverables</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyProjects}
                  onChange={(e) => setNotifyProjects(e.target.checked)}
                  className="h-4 w-4 rounded-[4px] border-[#e5e3df] text-[#5645d4] focus:ring-[#5645d4] accent-[#5645d4]"
                />
              </div>

              {notifyProjects && (
                <div className="pt-2 border-t border-[#e5e3df] dark:border-[#1e293b] flex flex-wrap gap-2 text-xs">
                  {AVAILABLE_INTERVALS.map((inv) => (
                    <button
                      type="button"
                      key={inv.id}
                      onClick={() => toggleInterval(projectIntervals, setProjectIntervals, inv.id)}
                      className={`px-3 py-1.5 rounded-[8px] border font-medium transition-all ${
                        projectIntervals.includes(inv.id)
                          ? 'border-[#5645d4] bg-[#5645d4]/10 text-[#5645d4] dark:bg-[#5645d4]/20 dark:text-[#8070f6] font-semibold'
                          : 'border-[#e5e3df] text-slate-500 hover:border-slate-300 dark:border-[#1e293b] dark:text-slate-400'
                      }`}
                    >
                      {inv.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Events */}
            <div className="p-4 rounded-[8px] border border-[#e5e3df] dark:border-[#1e293b] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-xs">Custom Calendar Events</span>
                  <p className="text-[11px] text-slate-400">Personal study sessions and academic deadlines</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyCustomEvents}
                  onChange={(e) => setNotifyCustomEvents(e.target.checked)}
                  className="h-4 w-4 rounded-[4px] border-[#e5e3df] text-[#5645d4] focus:ring-[#5645d4] accent-[#5645d4]"
                />
              </div>

              {notifyCustomEvents && (
                <div className="pt-2 border-t border-[#e5e3df] dark:border-[#1e293b] flex flex-wrap gap-2 text-xs">
                  {AVAILABLE_INTERVALS.map((inv) => (
                    <button
                      type="button"
                      key={inv.id}
                      onClick={() => toggleInterval(customEventIntervals, setCustomEventIntervals, inv.id)}
                      className={`px-3 py-1.5 rounded-[8px] border font-medium transition-all ${
                        customEventIntervals.includes(inv.id)
                          ? 'border-[#5645d4] bg-[#5645d4]/10 text-[#5645d4] dark:bg-[#5645d4]/20 dark:text-[#8070f6] font-semibold'
                          : 'border-[#e5e3df] text-slate-500 hover:border-slate-300 dark:border-[#1e293b] dark:text-slate-400'
                      }`}
                    >
                      {inv.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Save Preferences Button */}
            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => updatePrefsMutation.mutate()}
                disabled={updatePrefsMutation.isPending}
                className="btn-notion-primary text-xs"
              >
                {updatePrefsMutation.isPending ? 'Saving Preferences...' : 'Save All Preferences'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: HISTORY ================= */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-6">
          <div className="card-notion p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-[#5645d4] dark:text-[#8070f6]" />
                  Email & Notification Delivery History
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Complete audit log of all scheduled reminder triggers, recipients, retry counts, and status.
                </p>
              </div>

              <button
                onClick={() => refetchHistory()}
                className="btn-notion-secondary text-xs flex items-center gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${fetchingHistory ? 'animate-spin' : ''}`} /> Refresh Log
              </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#e5e3df] dark:border-[#1e293b] text-xs">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Status:</span>
                <select
                  value={historyStatusFilter}
                  onChange={(e) => {
                    setHistoryStatusFilter(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="rounded-[8px] border border-[#e5e3df] bg-white px-2.5 py-1 text-slate-800 dark:border-[#1e293b] dark:bg-slate-800 dark:text-white focus:border-[#5645d4] focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Sent">Sent</option>
                  <option value="Pending">Pending</option>
                  <option value="Failed">Failed</option>
                  <option value="Skipped">Skipped</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Event Type:</span>
                <select
                  value={historyTypeFilter}
                  onChange={(e) => {
                    setHistoryTypeFilter(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="rounded-[8px] border border-[#e5e3df] bg-white px-2.5 py-1 text-slate-800 dark:border-[#1e293b] dark:bg-slate-800 dark:text-white focus:border-[#5645d4] focus:outline-none"
                >
                  <option value="ALL">All Event Types</option>
                  <option value="ASSIGNMENT">Assignment</option>
                  <option value="QUIZ">Quiz</option>
                  <option value="MIDTERM">Midterm Exam</option>
                  <option value="FINAL">Final Exam</option>
                  <option value="PROJECT">Project Deadline</option>
                  <option value="CUSTOM_EVENT">Calendar Event</option>
                  <option value="TEST_EMAIL">SMTP Diagnostic Test</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-[8px] border border-[#e5e3df] dark:border-[#1e293b]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f7f6f3] dark:bg-slate-850 border-b border-[#e5e3df] dark:border-[#1e293b] text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Type</th>
                    <th className="py-2.5 px-3 font-semibold">Related Task / Event</th>
                    <th className="py-2.5 px-3 font-semibold">Recipient</th>
                    <th className="py-2.5 px-3 font-semibold">Scheduled / Actual Time</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold">Retries</th>
                    <th className="py-2.5 px-3 font-semibold">Last Error Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e3df] dark:divide-[#1e293b]">
                  {!historyData?.logs || historyData.logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No delivery logs match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    historyData.logs.map((log: NotificationLog) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-bold">
                          <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {log.notificationType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white max-w-xs truncate">
                          {log.targetTitle || log.subject}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                          {log.recipient}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {log.actualSendTime
                            ? formatDate(log.actualSendTime, 'MMM d, h:mm a')
                            : formatDate(log.scheduledTime, 'MMM d, h:mm a')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase ${
                              log.status === 'Sent'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : log.status === 'Pending'
                                ? 'bg-[#5645d4]/10 text-[#5645d4] dark:bg-[#5645d4]/20 dark:text-[#8070f6]'
                                : log.status === 'Skipped'
                                ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                          {log.retryCount}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-xs truncate">
                          {log.lastError || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: BACKUP ================= */}
      {activeTab === 'BACKUP' && (
        <div className="space-y-6">
          <div className="card-notion p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-[#5645d4] dark:text-[#8070f6]" />
              Academic Database Backup & Integrity
            </h2>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Download complete JSON backups of all semesters, courses, notes, assignments, exams, and file attachments.
            </p>

            <div className="p-4 rounded-[8px] bg-slate-50 dark:bg-slate-800/40 border border-[#e5e3df] dark:border-[#1e293b] flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Export Full Database Backup</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Downloads a comprehensive JSON archive containing all academic records.
                </p>
              </div>
              <a
                href="/api/backup/export"
                download
                className="btn-notion-primary text-xs flex items-center gap-1.5 shrink-0 ml-4"
              >
                <Download className="h-4 w-4" /> Download Backup
              </a>
            </div>

            {integrity && (
              <div className="p-4 rounded-[8px] border border-[#e5e3df] dark:border-[#1e293b] space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Storage Integrity Audit
                  </span>
                  <button
                    onClick={() => refetchIntegrity()}
                    className="text-xs font-semibold text-[#5645d4] hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${checkingIntegrity ? 'animate-spin' : ''}`} /> Run Check
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-[8px] bg-slate-100 dark:bg-slate-800">
                    <span className="text-slate-400 text-[10px] block">Database Docs</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{integrity.data?.totalDbDocuments || 0}</span>
                  </div>
                  <div className="p-2 rounded-[8px] bg-slate-100 dark:bg-slate-800">
                    <span className="text-slate-400 text-[10px] block">Physical Files</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{integrity.data?.totalDiskFiles || 0}</span>
                  </div>
                  <div className="p-2 rounded-[8px] bg-slate-100 dark:bg-slate-800">
                    <span className="text-slate-400 text-[10px] block">Missing on Disk</span>
                    <span className={`font-bold text-sm ${integrity.data?.missingOnDiskCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {integrity.data?.missingOnDiskCount || 0}
                    </span>
                  </div>
                  <div className="p-2 rounded-[8px] bg-slate-100 dark:bg-slate-800">
                    <span className="text-slate-400 text-[10px] block">Orphaned Files</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{integrity.data?.orphanedFilesCount || 0}</span>
                  </div>
                </div>

                {integrity.data?.orphanedFilesCount > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-[#e5e3df] dark:border-[#1e293b]">
                    <span className="text-slate-500">Found {integrity.data.orphanedFilesCount} unindexed files on disk.</span>
                    <button
                      onClick={() => cleanOrphansMutation.mutate()}
                      className="px-3 py-1 rounded-[8px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs"
                    >
                      Clean Orphan Files
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
