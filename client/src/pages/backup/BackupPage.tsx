import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  Database,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ShieldAlert,
  HardDrive,
  Upload,
  RefreshCw,
  Trash2,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { BackupRecord } from '../../types';

export const BackupPage: React.FC = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [restoreMessage, setRestoreMessage] = useState<{
    success: boolean;
    message: string;
    safetyBackup?: string;
  } | null>(null);

  // Queries
  const { data: records = [], isLoading: recordsLoading } = useQuery<BackupRecord[]>({
    queryKey: ['backupRecords'],
    queryFn: () => api.getBackupRecords(),
  });

  const { data: integrity, isLoading: integrityLoading } = useQuery({
    queryKey: ['backupIntegrity'],
    queryFn: () => api.getBackupIntegrity(),
  });

  // Mutations
  const createBackupMutation = useMutation({
    mutationFn: () => api.createBackup(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backupRecords'] });
      queryClient.invalidateQueries({ queryKey: ['backupIntegrity'] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.restoreBackup(id),
    onSuccess: (res) => {
      setRestoreMessage({
        success: true,
        message: res.message || 'Restoration completed successfully!',
        safetyBackup: res.safetyBackup,
      });
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      setRestoreMessage({
        success: false,
        message: err.message || 'Restoration failed integrity verification',
      });
    },
  });

  const uploadRestoreMutation = useMutation({
    mutationFn: (formData: FormData) => api.uploadRestoreBackup(formData),
    onSuccess: (res) => {
      setRestoreMessage({
        success: true,
        message: res.message || 'Restoration completed successfully!',
        safetyBackup: res.safetyBackup,
      });
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      setRestoreMessage({
        success: false,
        message: err.message || 'Uploaded archive validation failed',
      });
    },
  });

  const cleanOrphansMutation = useMutation({
    mutationFn: () => api.cleanOrphanFiles(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backupIntegrity'] });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.tar.gz') && !file.name.endsWith('.tgz')) {
      alert('Please upload a valid BornoFlow .tar.gz backup archive');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to upload and restore "${file.name}"? A safety backup of your current database will be created first.`
      )
    ) {
      return;
    }

    const formData = new FormData();
    formData.append('backup', file);
    uploadRestoreMutation.mutate(formData);
  };

  const handleDownload = (id: string) => {
    window.open(`/api/backup/${id}/download`, '_blank');
  };

  const handleExportJson = (resource: string) => {
    window.open(`/api/${resource}`, '_blank');
  };

  return (
    <div className="min-h-full bg-slate-50 p-6 dark:bg-slate-950 sm:p-8">
      {/* Top Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-emerald-600 text-white shadow-md shadow-sky-500/20">
            <Archive className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Backup, Restore & Integrity Center
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verified SQLite snapshots, SHA-256 manifests, uploaded document bundling, and safe staged restores
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".tar.gz,.tgz"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadRestoreMutation.isPending}
            className="btn-notion-secondary text-xs h-[38px] shadow-2xs"
            title="Upload and verify external backup archive"
          >
            <Upload className="h-3.5 w-3.5 text-[#787671]" />
            <span>Upload Archive</span>
          </button>

          <button
            onClick={() => createBackupMutation.mutate()}
            disabled={createBackupMutation.isPending}
            className="btn-notion-primary text-xs h-[38px] shadow-2xs disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            <span>{createBackupMutation.isPending ? 'Bundling Backup...' : 'Create Full Backup'}</span>
          </button>
        </div>
      </div>

      {/* Restore Alert Result */}
      {restoreMessage && (
        <div
          className={`mb-6 rounded-[8px] p-4 text-xs shadow-2xs flex items-start justify-between ${
            restoreMessage.success
              ? 'bg-[#d9f3e1] text-[#1aae39] border border-[#1aae39]/30'
              : 'bg-[#fde0ec] text-[#e03131] border border-[#d9480f]/30'
          }`}
        >
          <div className="flex items-start gap-3">
            {restoreMessage.success ? (
              <CheckCircle2 className="h-5 w-5 text-[#1aae39] shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-[#e03131] shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold text-sm">{restoreMessage.message}</div>
              {restoreMessage.safetyBackup && (
                <div className="mt-1 text-[11px] opacity-90">
                  Pre-restore safety database snapshot saved at:{' '}
                  <span className="font-mono">{restoreMessage.safetyBackup}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setRestoreMessage(null)}
            className="text-xs font-semibold hover:underline opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Storage & Checksum Integrity Card */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card-notion rounded-[12px] border border-[#e5e3df] bg-white p-5 shadow-2xs dark:border-[#2a2a2e] dark:bg-[#141416]">
          <div className="flex items-center justify-between text-xs text-[#787671]">
            <span className="font-medium">Active Database State</span>
            <Database className="h-4 w-4 text-[#0f6b57]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-semibold text-[#1a1a1a] dark:text-white">
              SQLite (WAL Mode)
            </span>
          </div>
          <div className="mt-2 text-xs text-[#1aae39] font-medium">
            ✓ Checkpointing enabled before snapshots
          </div>
        </div>

        <div className="card-notion rounded-[12px] border border-[#e5e3df] bg-white p-5 shadow-2xs dark:border-[#2a2a2e] dark:bg-[#141416]">
          <div className="flex items-center justify-between text-xs text-[#787671]">
            <span className="font-medium">Physical Uploads Verified</span>
            <FileCheck className="h-4 w-4 text-[#1aae39]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[#1aae39]">
              {integrity?.verifiedFiles ?? 0}
            </span>
            <span className="text-xs text-[#787671]">files matching DB records</span>
          </div>
          <div className="mt-2 text-xs text-[#787671]">
            {integrity?.missingFiles?.length ?? 0} missing physical files
          </div>
        </div>

        <div className="card-notion rounded-[12px] border border-[#e5e3df] bg-white p-5 shadow-2xs dark:border-[#2a2a2e] dark:bg-[#141416]">
          <div className="flex items-center justify-between text-xs text-[#787671]">
            <span className="font-medium">Orphaned Files</span>
            <HardDrive className="h-4 w-4 text-[#dd5b00]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[#dd5b00]">
              {integrity?.orphanFiles?.length ?? 0}
            </span>
            <span className="text-xs text-[#787671]">unreferenced files</span>
          </div>
          {integrity?.orphanFiles?.length > 0 && (
            <button
              onClick={() => cleanOrphansMutation.mutate()}
              disabled={cleanOrphansMutation.isPending}
              className="mt-2 text-xs font-semibold text-[#e03131] hover:underline"
            >
              Clean orphaned files
            </button>
          )}
        </div>
      </div>

      {/* Backup Archives Table */}
      <div className="card-notion rounded-[12px] border border-[#e5e3df] bg-white p-6 shadow-2xs dark:border-[#2a2a2e] dark:bg-[#141416] mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#1a1a1a] dark:text-white">
              Full Verified Backups
            </h2>
            <p className="text-xs text-[#787671]">
              Archives include SQLite binary, manifest.json with SHA-256 hashes, and uploads
            </p>
          </div>
          <span className="text-xs text-[#787671]">
            {records.length} archives recorded
          </span>
        </div>

        {recordsLoading ? (
          <div className="space-y-3 py-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 w-full animate-pulse rounded-[8px] bg-[#f0eeec] dark:bg-[#202024]" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <Archive className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-700" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No backup records yet</p>
            <p className="mt-1">Click "Create Full Backup" above to bundle a complete verifiable snapshot.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
                  <th className="pb-3 font-semibold">Archive Filename</th>
                  <th className="pb-3 font-semibold">Size</th>
                  <th className="pb-3 font-semibold">SHA-256 Checksum</th>
                  <th className="pb-3 font-semibold">Created Date</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <Archive className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="font-mono text-xs">{r.filename}</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">
                      {(r.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                    </td>
                    <td className="py-3 font-mono text-[11px] text-slate-400 max-w-xs truncate" title={r.checksum}>
                      {r.checksum.slice(0, 16)}...
                    </td>
                    <td className="py-3 text-slate-400">
                      {formatDate(r.createdAt, 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownload(r.id)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          title="Download archive file"
                        >
                          <Download className="h-3.5 w-3.5 text-slate-400" />
                          <span>Download</span>
                        </button>

                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `CRITICAL: Restore database and uploads from "${r.filename}"?\n\nA safety backup of your current database will be created first.`
                              )
                            ) {
                              restoreMutation.mutate(r.id);
                            }
                          }}
                          disabled={restoreMutation.isPending}
                          className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                          title="Restore from this verified backup"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Restore</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Data Export Center */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          Individual Data Exports
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Export specific collections to CSV or JSON formats for offline analysis.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <button
            onClick={() => window.open('/api/grades/export/csv', '_blank')}
            className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
          >
            <Download className="h-4 w-4 text-emerald-500" />
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Grades & CGPA</div>
              <div className="text-[10px] text-slate-400">CSV Spreadsheet</div>
            </div>
          </button>

          <button
            onClick={() => handleExportJson('courses')}
            className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
          >
            <FileText className="h-4 w-4 text-emerald-500" />
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Courses & Terms</div>
              <div className="text-[10px] text-slate-400">Structured JSON</div>
            </div>
          </button>

          <button
            onClick={() => handleExportJson('assignments')}
            className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
          >
            <FileText className="h-4 w-4 text-sky-500" />
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Assignments</div>
              <div className="text-[10px] text-slate-400">Structured JSON</div>
            </div>
          </button>

          <button
            onClick={() => handleExportJson('notes')}
            className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
          >
            <FileText className="h-4 w-4 text-amber-500" />
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Notes & Knowledge</div>
              <div className="text-[10px] text-slate-400">Structured JSON</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
