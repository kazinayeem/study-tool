import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Download,
  Upload,
  ShieldCheck,
  Trash2,
  Bell,
  Sun,
  Moon,
  Check,
  AlertCircle,
  Database,
  RefreshCw,
  User,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { AppSetting, Semester } from '../../types';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const [studentName, setStudentName] = useState('');
  const [universityName, setUniversityName] = useState('');
  const [degree, setDegree] = useState('');
  const [currentSemesterId, setCurrentSemesterId] = useState('');
  const [autoSaveDelayMs, setAutoSaveDelayMs] = useState(1500);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  // Database integrity check query
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
      setNotificationEnabled(settings.enableBrowserNotifications || false);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: () =>
      api.updateSettings({
        studentName: studentName.trim(),
        universityName: universityName.trim() || null,
        degree: degree.trim() || null,
        currentSemesterId: currentSemesterId || null,
        autoSaveDelayMs: Number(autoSaveDelayMs),
        enableBrowserNotifications: notificationEnabled,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const cleanOrphansMutation = useMutation({
    mutationFn: () => api.cleanOrphanFiles(),
    onSuccess: () => {
      refetchIntegrity();
    },
  });

  const handleTestNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationEnabled(true);
        new Notification('ScholarFlow Notification Test', {
          body: 'Academic alerts and reminders are active and functional.',
        });
      } else {
        alert('Notification permission was blocked in your browser.');
      }
    } else {
      alert('Your browser does not support Web Notifications.');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Workspace Settings & Archives
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Customize student profile, default semester, appearance, and manage local database backups.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:border-emerald-900">
          <Check className="h-4 w-4" />
          Settings updated successfully!
        </div>
      )}

      {/* 1. Student Profile */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Student Profile</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Your Name</label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Active Semester</label>
            <select
              value={currentSemesterId}
              onChange={(e) => setCurrentSemesterId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Auto-detect active term</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Degree / Major</label>
            <input
              type="text"
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
              placeholder="e.g. B.S. in Computer Science"
              className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">University / Department</label>
            <input
              type="text"
              value={universityName}
              onChange={(e) => setUniversityName(e.target.value)}
              placeholder="e.g. Department of CSE"
              className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* 2. Theme & Preferences */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Workspace Appearance</h2>

        <div className="flex items-center gap-4 text-xs">
          <button
            onClick={() => setTheme('light')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
              theme === 'light'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
            }`}
          >
            <Sun className="h-4 w-4" /> Clean Light Mode
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
              theme === 'dark'
                ? 'border-indigo-500 bg-indigo-950 text-indigo-300 font-bold'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
            }`}
          >
            <Moon className="h-4 w-4" /> Dark Study Mode
          </button>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">Browser Deadline Reminders</p>
            <p className="text-slate-500 dark:text-slate-400">Receive notification alerts while the workspace tab is open.</p>
          </div>
          <button
            onClick={handleTestNotifications}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
          >
            Test Permission
          </button>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">Notes Autosave Interval</p>
            <p className="text-slate-500 dark:text-slate-400">Inactivity delay before saving edits to SQLite database.</p>
          </div>
          <select
            value={autoSaveDelayMs}
            onChange={(e) => setAutoSaveDelayMs(parseInt(e.target.value, 10))}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="1000">1.0 second</option>
            <option value="1500">1.5 seconds (Default)</option>
            <option value="2500">2.5 seconds</option>
          </select>
        </div>

        <div className="flex justify-end pt-3">
          <button
            onClick={() => updateSettingsMutation.mutate()}
            disabled={updateSettingsMutation.isPending}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs"
          >
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* 3. Backup, Export & Integrity Audit */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Data Safety, Export & Integrity</h2>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          This system runs entirely on your local SQLite database and safe file storage. Export regular backups to protect your academic records.
        </p>

        {/* Export JSON Button */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Export Academic Database Backup</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Downloads a complete JSON export of all semesters, courses, notes, exams, assignments, and file metadata.
            </p>
          </div>
          <a
            href="/api/backup/export"
            download
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs shrink-0 ml-4"
          >
            <Download className="h-4 w-4" /> Download Backup
          </a>
        </div>

        {/* Integrity Check */}
        {integrity && (
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Storage Integrity Audit
              </span>
              <button
                onClick={() => refetchIntegrity()}
                className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${checkingIntegrity ? 'animate-spin' : ''}`} /> Run Check
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                <span className="text-slate-400 text-[10px] block">Database Docs</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{integrity.data?.totalDbDocuments || 0}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                <span className="text-slate-400 text-[10px] block">Physical Files</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{integrity.data?.totalDiskFiles || 0}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                <span className="text-slate-400 text-[10px] block">Missing on Disk</span>
                <span className={`font-bold text-sm ${integrity.data?.missingOnDiskCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {integrity.data?.missingOnDiskCount || 0}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                <span className="text-slate-400 text-[10px] block">Orphaned Files</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{integrity.data?.orphanedFilesCount || 0}</span>
              </div>
            </div>

            {integrity.data?.orphanedFilesCount > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Found {integrity.data.orphanedFilesCount} unindexed files on disk.</span>
                <button
                  onClick={() => cleanOrphansMutation.mutate()}
                  className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs"
                >
                  Clean Orphan Files
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
