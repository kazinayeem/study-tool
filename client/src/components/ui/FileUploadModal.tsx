import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  X,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCw,
  FolderOpen,
  Info,
  Ban,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatBytes, DOCUMENT_CATEGORIES } from '../../lib/utils';
import { Semester, Course, DocumentItem } from '../../types';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingDocuments?: DocumentItem[];
  semesters?: Semester[];
  courses?: Course[];
  defaultSemesterId?: string;
  defaultCourseId?: string;
  defaultCategory?: string;
  /** Heading shown in the modal header (defaults to the generic documents title). */
  dialogTitle?: string;
  /** Supporting line shown under the heading. */
  dialogSubtitle?: string;
  /** Human readable academic context (course/semester) rendered when the context is locked. */
  contextLabel?: string;
  /** Restrict selectable/uploadable extensions. Defaults to the full academic set. */
  allowedExtensions?: string[];
  /** Hide the semester/course selectors and keep the provided context fixed. */
  lockAcademicContext?: boolean;
  /** Show editable title & description fields per staged file. */
  showTitleDescription?: boolean;
  /** Close the modal automatically once every staged file has finished uploading. */
  autoCloseOnComplete?: boolean;
}

export type FileUploadStatus =
  | 'selected'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface PendingFileItem {
  id: string;
  file: File;
  title: string;
  category: string;
  semesterId: string;
  courseId: string;
  description: string;
  tags: string;
  progress: number;
  status: FileUploadStatus;
  errorMessage?: string;
  abortController?: AbortController;
  isDuplicate?: boolean;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.doc',
  '.pptx',
  '.ppt',
  '.xlsx',
  '.xls',
  '.txt',
  '.md',
  '.jpg',
  '.jpeg',
  '.png',
  '.zip',
];

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingDocuments = [],
  semesters = [],
  courses = [],
  defaultSemesterId = '',
  defaultCourseId = '',
  defaultCategory = DOCUMENT_CATEGORIES[0],
  dialogTitle = 'Upload Academic Documents',
  dialogSubtitle = 'Add lecture slides, assignments, or notes with instant categorization',
  contextLabel,
  allowedExtensions = ALLOWED_EXTENSIONS,
  lockAcademicContext = false,
  showTitleDescription = false,
  autoCloseOnComplete = false,
}) => {
  const [fileList, setFileList] = useState<PendingFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setGlobalError(null);
    }
  }, [isOpen]);

  // Close automatically once every staged file has completed uploading
  useEffect(() => {
    if (!isOpen || !autoCloseOnComplete || fileList.length === 0) return;
    const allDone = fileList.every((item) => item.status === 'completed');
    if (!allDone) return;
    const timer = window.setTimeout(onClose, 700);
    return () => window.clearTimeout(timer);
  }, [isOpen, autoCloseOnComplete, fileList, onClose]);

  if (!isOpen) return null;

  const checkDuplicate = (filename: string, _semesterId: string, _courseId: string) => {
    return existingDocuments.some(
      (doc) =>
        doc.title.toLowerCase() === filename.toLowerCase() ||
        (doc.originalFilename && doc.originalFilename.toLowerCase() === filename.toLowerCase()) ||
        (doc.storedFilename && doc.storedFilename.toLowerCase().includes(filename.toLowerCase()))
    );
  };

  const handleFilesSelected = (files: FileList | File[]) => {
    setGlobalError(null);
    const newItems: PendingFileItem[] = [];

    Array.from(files).forEach((f) => {
      // Validate file size
      if (f.size > MAX_FILE_SIZE) {
        setGlobalError(`File "${f.name}" exceeds the 50MB maximum limit.`);
        return;
      }

      // Check extension
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        setGlobalError(
          `File type "${ext}" is not supported here. Accepted types: ${allowedExtensions.join(', ')}.`
        );
        return;
      }

      const isDup = checkDuplicate(f.name, defaultSemesterId, defaultCourseId);

      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file: f,
        title: f.name.replace(/\.[^/.]+$/, ''),
        category: defaultCategory,
        semesterId: defaultSemesterId,
        courseId: defaultCourseId,
        description: '',
        tags: '',
        progress: 0,
        status: 'selected',
        isDuplicate: isDup,
      });
    });

    if (newItems.length > 0) {
      setFileList((prev) => [...prev, ...newItems]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const updateItem = (id: string, updates: Partial<PendingFileItem>) => {
    setFileList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const removeItem = (id: string) => {
    const item = fileList.find((i) => i.id === id);
    if (item?.abortController) {
      item.abortController.abort();
    }
    setFileList((prev) => prev.filter((i) => i.id !== id));
  };

  // Upload a single item with real progress
  const uploadSingleItem = async (id: string) => {
    const item = fileList.find((i) => i.id === id);
    if (!item || item.status === 'uploading' || item.status === 'completed') return;

    const controller = new AbortController();
    updateItem(id, {
      status: 'uploading',
      progress: 0,
      errorMessage: undefined,
      abortController: controller,
    });

    try {
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('title', item.title.trim() || item.file.name);
      formData.append('category', item.category);
      if (item.semesterId) formData.append('semesterId', item.semesterId);
      if (item.courseId) formData.append('courseId', item.courseId);
      if (item.description.trim()) formData.append('description', item.description.trim());
      if (item.tags.trim()) {
        const tagArr = item.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
        formData.append('tags', JSON.stringify(tagArr));
      }

      await api.uploadDocumentWithProgress(
        formData,
        (progress) => {
          if (progress >= 100) {
            updateItem(id, { progress: 100, status: 'processing' });
          } else {
            updateItem(id, { progress, status: 'uploading' });
          }
        },
        controller.signal
      );

      updateItem(id, {
        progress: 100,
        status: 'completed',
        abortController: undefined,
      });

      onSuccess();
    } catch (err: any) {
      if (err.message === 'Upload cancelled') {
        updateItem(id, {
          status: 'cancelled',
          progress: 0,
          abortController: undefined,
        });
      } else {
        updateItem(id, {
          status: 'failed',
          errorMessage: err?.message || 'Upload failed',
          abortController: undefined,
        });
      }
    }
  };

  const handleCancelItem = (id: string) => {
    const item = fileList.find((i) => i.id === id);
    if (item?.abortController) {
      item.abortController.abort();
    }
    updateItem(id, { status: 'cancelled', abortController: undefined });
  };

  const handleUploadAll = async () => {
    const readyItems = fileList.filter(
      (item) => item.status === 'selected' || item.status === 'failed' || item.status === 'cancelled'
    );
    for (const item of readyItems) {
      await uploadSingleItem(item.id);
    }
  };

  const isUploadingAny = fileList.some(
    (i) => i.status === 'uploading' || i.status === 'processing'
  );
  const allCompleted =
    fileList.length > 0 && fileList.every((i) => i.status === 'completed');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1530]/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="card-notion bg-white dark:bg-[#141416] w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[12px] border border-[#e5e3df] dark:border-[#2a2a2e] shadow-2xl overflow-hidden text-[#37352f] dark:text-[#f0eeec]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e3df] dark:border-[#2a2a2e] bg-[#fbfbfa] dark:bg-[#19191c]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#0f6b57] text-white">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#1a1a1a] dark:text-white">
                {dialogTitle}
              </h3>
              <p className="text-xs text-[#787671] dark:text-[#a4a097]">
                {dialogSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploadingAny}
            className="p-1.5 rounded-[6px] text-[#787671] hover:bg-[#ede9e4] hover:text-[#1a1a1a] dark:hover:bg-[#252528] dark:hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {globalError && (
            <div className="p-3.5 rounded-[8px] bg-[#fde0ec] border border-[#d9480f]/40 text-[#9a3412] text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{globalError}</span>
            </div>
          )}

          {lockAcademicContext && contextLabel && (
            <div className="flex items-center gap-2 p-3 rounded-[8px] bg-[#dcf0e8]/40 dark:bg-[#0f6b57]/15 border border-[#0f6b57]/25 text-xs text-[#37352f] dark:text-[#f0eeec]">
              <FolderOpen className="h-4 w-4 shrink-0 text-[#0f6b57]" />
              <span>
                Uploading directly into <span className="font-semibold">{contextLabel}</span>. This document
                will be linked to this course and semester automatically.
              </span>
            </div>
          )}

          {/* Drag and Drop Zone: Notion Dashed Surface */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-[12px] p-7 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#0f6b57] bg-[#dcf0e8]/30'
                : 'border-[#c8c4be] hover:border-[#0f6b57] bg-[#fbfbfa] dark:bg-[#1c1c1f] dark:border-[#37352f]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={allowedExtensions.join(',')}
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFilesSelected(e.target.files);
                e.target.value = '';
              }}
            />
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[8px] bg-white dark:bg-[#252528] text-[#0f6b57] border border-[#e5e3df] dark:border-[#37352f] shadow-2xs mb-3">
              <Upload className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-[#1a1a1a] dark:text-white">
              Drag and drop files here, or{' '}
              <span className="text-[#0f6b57] underline">browse</span>
            </p>
            <p className="text-xs text-[#787671] dark:text-[#a4a097] mt-1">
              Supports {allowedExtensions.join(', ')} (up to 50MB per file)
            </p>
          </div>

          {/* Selected Files Queue */}
          {fileList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-[#1a1a1a] dark:text-white">
                <span>Selected Documents ({fileList.length})</span>
                <button
                  onClick={() => setFileList([])}
                  disabled={isUploadingAny}
                  className="text-[#787671] hover:text-[#e03131] text-[11px] underline disabled:opacity-50"
                >
                  Clear Queue
                </button>
              </div>

              <div className="space-y-3">
                {fileList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-[8px] border border-[#e5e3df] dark:border-[#2a2a2e] bg-white dark:bg-[#19191c] space-y-3 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#f6f5f4] dark:bg-[#252528] text-[#0f6b57] border border-[#e5e3df] dark:border-[#37352f]">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#1a1a1a] dark:text-white truncate">
                            {item.file.name}
                          </p>
                          <p className="text-[11px] text-[#787671] dark:text-[#a4a097]">
                            {formatBytes(item.file.size)}
                          </p>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === 'selected' && (
                          <span className="px-2 py-0.5 rounded-[4px] bg-[#f6f5f4] text-[#5d5b54] text-[10px] font-semibold border border-[#e5e3df]">
                            Ready
                          </span>
                        )}
                        {item.status === 'uploading' && (
                          <span className="px-2 py-0.5 rounded-[4px] bg-[#dcf0e8] text-[#0f6b57] text-[10px] font-bold border border-[#a8dcc9] animate-pulse">
                            Uploading {item.progress}%
                          </span>
                        )}
                        {item.status === 'processing' && (
                          <span className="px-2 py-0.5 rounded-[4px] bg-[#fef7d6] text-[#793400] text-[10px] font-bold border border-[#f5d75e] animate-pulse">
                            Processing...
                          </span>
                        )}
                        {item.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#d9f3e1] text-[#1aae39] text-[10px] font-bold border border-[#1aae39]/30">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#fde0ec] text-[#e03131] text-[10px] font-bold border border-[#d9480f]/30">
                            <XCircle className="h-3 w-3" />
                            Failed
                          </span>
                        )}
                        {item.status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#f0eeec] text-[#787671] text-[10px] font-bold">
                            <Ban className="h-3 w-3" />
                            Cancelled
                          </span>
                        )}

                        {/* Actions */}
                        {item.status === 'uploading' ? (
                          <button
                            onClick={() => handleCancelItem(item.id)}
                            className="p-1 rounded-[4px] text-[#e03131] hover:bg-[#fde0ec] text-[11px] font-medium transition-colors"
                            title="Cancel Upload"
                          >
                            Cancel
                          </button>
                        ) : item.status === 'failed' || item.status === 'cancelled' ? (
                          <button
                            onClick={() => uploadSingleItem(item.id)}
                            className="p-1 rounded-[4px] text-[#0f6b57] hover:bg-[#dcf0e8] text-[11px] font-medium transition-colors inline-flex items-center gap-1"
                            title="Retry Upload"
                          >
                            <RotateCw className="h-3 w-3" />
                            Retry
                          </button>
                        ) : item.status === 'selected' ? (
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 rounded-[4px] text-[#787671] hover:text-[#e03131] hover:bg-[#fde0ec] transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* Progress Bar (Actual Honest Progress) */}
                    {(item.status === 'uploading' || item.status === 'processing') && (
                      <div className="w-full bg-[#ede9e4] dark:bg-[#252528] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#0f6b57] h-1.5 rounded-full transition-all duration-150"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}

                    {/* Duplicate Warning */}
                    {item.isDuplicate && item.status === 'selected' && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[#dd5b00] bg-[#ffe8d4] p-2 rounded-[6px] border border-[#dd5b00]/30">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span>A document with this filename already exists. Uploading will save as a distinct entry.</span>
                      </div>
                    )}

                    {/* Metadata Editing Form (Only if not completed) */}
                    {item.status !== 'completed' && (
                      <div className="space-y-2.5 pt-1 text-xs">
                        {showTitleDescription && (
                          <>
                            <div>
                              <label className="text-[10px] font-bold text-[#787671] uppercase">Title</label>
                              <input
                                type="text"
                                value={item.title}
                                disabled={item.status === 'uploading'}
                                onChange={(e) => updateItem(item.id, { title: e.target.value })}
                                placeholder="Document title"
                                className="w-full h-[36px] mt-0.5 px-2.5 rounded-[6px] border border-[#c8c4be] dark:border-[#37352f] bg-white dark:bg-[#1c1c1f] text-xs text-[#1a1a1a] dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-[#787671] uppercase">Description</label>
                              <textarea
                                value={item.description}
                                rows={2}
                                disabled={item.status === 'uploading'}
                                onChange={(e) => updateItem(item.id, { description: e.target.value })}
                                placeholder="Optional notes about this document"
                                className="w-full mt-0.5 px-2.5 py-2 rounded-[6px] border border-[#c8c4be] dark:border-[#37352f] bg-white dark:bg-[#1c1c1f] text-xs text-[#1a1a1a] dark:text-white resize-none"
                              />
                            </div>
                          </>
                        )}

                        <div className={lockAcademicContext ? '' : 'grid grid-cols-1 sm:grid-cols-3 gap-2.5'}>
                          <div>
                            <label className="text-[10px] font-bold text-[#787671] uppercase">Category</label>
                            <select
                              value={item.category}
                              disabled={item.status === 'uploading'}
                              onChange={(e) => updateItem(item.id, { category: e.target.value })}
                              className="w-full h-[36px] mt-0.5 px-2.5 rounded-[6px] border border-[#c8c4be] dark:border-[#37352f] bg-white dark:bg-[#1c1c1f] text-xs text-[#1a1a1a] dark:text-white"
                            >
                              {DOCUMENT_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>

                          {!lockAcademicContext && (
                            <div>
                              <label className="text-[10px] font-bold text-[#787671] uppercase">Semester</label>
                              <select
                                value={item.semesterId}
                                disabled={item.status === 'uploading'}
                                onChange={(e) => updateItem(item.id, { semesterId: e.target.value })}
                                className="w-full h-[36px] mt-0.5 px-2.5 rounded-[6px] border border-[#c8c4be] dark:border-[#37352f] bg-white dark:bg-[#1c1c1f] text-xs text-[#1a1a1a] dark:text-white"
                              >
                                <option value="">No Semester</option>
                                {semesters.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {!lockAcademicContext && (
                            <div>
                              <label className="text-[10px] font-bold text-[#787671] uppercase">Course</label>
                              <select
                                value={item.courseId}
                                disabled={item.status === 'uploading'}
                                onChange={(e) => updateItem(item.id, { courseId: e.target.value })}
                                className="w-full h-[36px] mt-0.5 px-2.5 rounded-[6px] border border-[#c8c4be] dark:border-[#37352f] bg-white dark:bg-[#1c1c1f] text-xs text-[#1a1a1a] dark:text-white"
                              >
                                <option value="">No Course</option>
                                {courses
                                  .filter((c) => !item.semesterId || c.semesterId === item.semesterId)
                                  .map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.code} - {c.title}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#e5e3df] dark:border-[#2a2a2e] bg-[#fbfbfa] dark:bg-[#19191c]">
          <span className="text-xs text-[#787671]">
            {fileList.length > 0
              ? `${fileList.filter((i) => i.status === 'completed').length}/${fileList.length} completed`
              : 'No files staged'}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isUploadingAny}
              className="btn-notion-secondary text-xs h-[38px] disabled:opacity-50"
            >
              {allCompleted ? 'Close' : 'Cancel'}
            </button>

            {fileList.length > 0 && !allCompleted && (
              <button
                onClick={handleUploadAll}
                disabled={isUploadingAny}
                className="btn-notion-primary text-xs h-[38px] disabled:opacity-50"
              >
                {isUploadingAny ? (
                  <>
                    <RotateCw className="h-3.5 w-3.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    Upload All ({fileList.filter((i) => i.status !== 'completed').length})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
