import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Image as ImageIcon,
  X,
  Plus,
  Trash2,
  Calendar,
  BookOpen,
  MapPin,
  User,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Sparkles,
  Upload,
} from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { formatBytes } from '../../lib/utils';
import { Semester, Course, ClassSession } from '../../types';
import { CameraCaptureModal } from './CameraCaptureModal';

interface AddClassPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: ClassSession) => void;
  semesters: Semester[];
  courses: Course[];
  defaultSemesterId?: string;
  defaultCourseId?: string;
  defaultDate?: string;
  existingSession?: ClassSession | null; // If provided, adds photos directly to this session!
}

interface QueuedPhotoItem {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  errorMessage?: string;
}

export const AddClassPhotoModal: React.FC<AddClassPhotoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  semesters,
  courses,
  defaultSemesterId,
  defaultCourseId,
  defaultDate,
  existingSession,
}) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Live camera capture (getUserMedia) modal
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Form Fields
  const todayStr = new Date().toISOString().slice(0, 10);
  const [sessionDate, setSessionDate] = useState(defaultDate || todayStr);
  const [selectedSemesterId, setSelectedSemesterId] = useState(
    existingSession?.semesterId || defaultSemesterId || semesters[0]?.id || ''
  );
  const [selectedCourseId, setSelectedCourseId] = useState(
    existingSession?.courseId || defaultCourseId || ''
  );
  const [topic, setTopic] = useState(existingSession?.topic || '');
  const [teacherName, setTeacherName] = useState(existingSession?.teacherName || '');
  const [roomNumber, setRoomNumber] = useState(existingSession?.roomNumber || '');
  const [description, setDescription] = useState(existingSession?.description || '');

  // Queue State
  const [queue, setQueue] = useState<QueuedPhotoItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Filter courses for the selected semester
  const availableCourses = courses.filter((c) => c.semesterId === selectedSemesterId);

  // Auto-sync semester and course selection
  useEffect(() => {
    if (existingSession) {
      setSelectedSemesterId(existingSession.semesterId);
      setSelectedCourseId(existingSession.courseId);
      setTopic(existingSession.topic);
      setSessionDate(new Date(existingSession.sessionDate).toISOString().slice(0, 10));
      setTeacherName(existingSession.teacherName || '');
      setRoomNumber(existingSession.roomNumber || '');
      setDescription(existingSession.description || '');
      return;
    }

    if (defaultSemesterId) {
      setSelectedSemesterId(defaultSemesterId);
    } else if (!selectedSemesterId && semesters.length > 0) {
      const active = semesters.find((s) => s.status === 'ACTIVE') || semesters[0];
      setSelectedSemesterId(active.id);
    }
  }, [defaultSemesterId, semesters, existingSession]);

  useEffect(() => {
    if (existingSession) return;
    if (availableCourses.length > 0) {
      if (!selectedCourseId || !availableCourses.some((c) => c.id === selectedCourseId)) {
        const matching = defaultCourseId && availableCourses.some((c) => c.id === defaultCourseId)
          ? defaultCourseId
          : availableCourses[0].id;
        setSelectedCourseId(matching);
      }
    } else {
      setSelectedCourseId('');
    }
  }, [selectedSemesterId, availableCourses, defaultCourseId, existingSession]);

  // Autofill teacher and room from course when course changes
  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    const course = availableCourses.find((c) => c.id === courseId);
    if (course) {
      if (!teacherName && course.teacherName) setTeacherName(course.teacherName);
      if (!roomNumber && course.roomNumber) setRoomNumber(course.roomNumber);
      if (!topic) setTopic(`${course.code} Board Notes`);
    }
  };

  // Add files to queue
  const handleAddFiles = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;

    setGlobalError(null);
    const newItems: QueuedPhotoItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate format
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      const validExts = ['.jpg', '.jpeg', '.png', '.webp'];

      if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
        setGlobalError(`File "${file.name}" is not a supported format. Please upload JPEG, PNG, or WebP images.`);
        continue;
      }

      if (file.size > 25 * 1024 * 1024) {
        setGlobalError(`File "${file.name}" exceeds the 25MB maximum board photo size limit.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        previewUrl,
        caption: '',
        status: 'pending',
      });
    }

    setQueue((prev) => [...prev, ...newItems]);
  };

  const handleRemoveItem = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleUpdateCaption = (id: string, caption: string) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, caption } : item))
    );
  };

  // Submit flow
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedSemesterId) {
      setGlobalError('Please select a semester.');
      return;
    }
    if (!selectedCourseId) {
      setGlobalError('Please select a course.');
      return;
    }
    if (!topic.trim()) {
      setGlobalError('Please specify the class topic.');
      return;
    }
    if (queue.length === 0) {
      setGlobalError('Please capture or select at least one board photo.');
      return;
    }

    setGlobalError(null);
    setIsSubmitting(true);
    setUploadProgress(0);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      let targetSession: ClassSession;

      // 1. Create session if new, or use existing session
      if (existingSession) {
        targetSession = existingSession;
      } else {
        targetSession = await api.createClassSession({
          semesterId: selectedSemesterId,
          courseId: selectedCourseId,
          sessionDate: new Date(sessionDate).toISOString(),
          topic: topic.trim(),
          teacherName: teacherName.trim() || null,
          roomNumber: roomNumber.trim() || null,
          description: description.trim() || null,
        });
      }

      // 2. Identify pending/failed photos
      const pendingItems = queue.filter((item) => item.status !== 'completed');
      if (pendingItems.length === 0) {
        onSuccess(targetSession);
        onClose();
        return;
      }

      // Mark items as uploading
      setQueue((prev) =>
        prev.map((item) =>
          item.status !== 'completed' ? { ...item, status: 'uploading' } : item
        )
      );

      // Prepare FormData
      const formData = new FormData();
      const captions: string[] = [];

      for (const item of pendingItems) {
        formData.append('photos', item.file);
        captions.push(item.caption.trim());
      }
      formData.append('captions', JSON.stringify(captions));

      // 3. Upload with actual progress
      const uploadedPhotos = await api.uploadSessionPhotos(
        targetSession.id,
        formData,
        (progress) => setUploadProgress(progress),
        abortController.signal
      );

      // Mark all uploaded items as completed
      setQueue((prev) =>
        prev.map((item) => ({ ...item, status: 'completed' }))
      );

      // Fetch freshly populated session
      const refreshedSession = await api.getClassSession(targetSession.id);
      onSuccess(refreshedSession);
      onClose();
    } catch (err: any) {
      console.error('Photo journal save error:', err);
      const msg = err instanceof ApiError ? err.message : err?.message || 'Failed to save photos to class journal';
      setGlobalError(msg);

      // Mark pending items as failed
      setQueue((prev) =>
        prev.map((item) =>
          item.status === 'uploading' ? { ...item, status: 'failed', errorMessage: msg } : item
        )
      );
    } finally {
      setIsSubmitting(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsSubmitting(false);
      setGlobalError('Upload was cancelled.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#18181b] rounded-[12px] border border-[#e5e3df] dark:border-[#27272a] shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e3df] dark:border-[#27272a] bg-[#fbfbfa] dark:bg-[#1e1e24] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[8px] bg-[#5645d4]/10 text-[#5645d4] dark:bg-[#5645d4]/20 dark:text-[#8070f6]">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {existingSession ? 'Add Photos to Class Session' : 'Save to Class Photo Journal'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {existingSession
                  ? `Adding board photos to ${existingSession.topic}`
                  : 'Capture or upload whiteboard photos from university lecture'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-[8px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {globalError && (
            <div className="flex items-start gap-2.5 p-3 rounded-[8px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">{globalError}</div>
            </div>
          )}

          {/* Academic Scoping: Semester & Course */}
          {!existingSession && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Semester <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedSemesterId}
                  onChange={(e) => setSelectedSemesterId(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full text-sm bg-white dark:bg-slate-900 border border-[#e5e3df] dark:border-[#27272a] rounded-[8px] px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#5645d4]"
                >
                  {semesters.map((sem) => (
                    <option key={sem.id} value={sem.id}>
                      {sem.name} ({sem.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Subject / Course <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  disabled={isSubmitting || availableCourses.length === 0}
                  className="w-full text-sm bg-white dark:bg-slate-900 border border-[#e5e3df] dark:border-[#27272a] rounded-[8px] px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#5645d4]"
                >
                  {availableCourses.length === 0 ? (
                    <option value="">No courses in this semester</option>
                  ) : (
                    availableCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.title}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          )}

          {/* Class Date and Topic */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Class Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  disabled={isSubmitting || !!existingSession}
                  className="w-full text-sm bg-white dark:bg-slate-900 border border-[#e5e3df] dark:border-[#27272a] rounded-[8px] px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#5645d4]"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Class Topic / Lecture Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. RSA Public Key Cryptography & Theorems"
                disabled={isSubmitting || !!existingSession}
                className="w-full text-sm bg-white dark:bg-slate-900 border border-[#e5e3df] dark:border-[#27272a] rounded-[8px] px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#5645d4]"
              />
            </div>
          </div>

          {/* Optional Metadata: Teacher, Room, Description */}
          {!existingSession && (
            <div className="space-y-3 pt-1 border-t border-[#e5e3df]/60 dark:border-[#27272a]/60">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Teacher Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="e.g. Dr. Turing"
                    disabled={isSubmitting}
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-[#e5e3df] dark:border-[#27272a] rounded-[8px] px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#5645d4]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Room / Lab Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g. Lab 402"
                    disabled={isSubmitting}
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-[#e5e3df] dark:border-[#27272a] rounded-[8px] px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#5645d4]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Session Notes / Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key theorems written on the board, midterm reminders..."
                  disabled={isSubmitting}
                  className="w-full text-xs bg-white dark:bg-slate-900 border border-[#e5e3df] dark:border-[#27272a] rounded-[8px] px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#5645d4] resize-none"
                />
              </div>
            </div>
          )}

          {/* Capture & Upload Buttons */}
          <div className="pt-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Board Photos <span className="text-rose-500">*</span>
            </label>

            {/* Hidden native input (gallery / file picker) */}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => {
                handleAddFiles(e.target.files);
                e.target.value = '';
              }}
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Capture with Camera Button */}
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 p-3.5 rounded-[8px] border-2 border-dashed border-[#5645d4]/40 hover:border-[#5645d4] bg-[#5645d4]/5 hover:bg-[#5645d4]/10 text-[#5645d4] dark:text-[#8070f6] font-medium text-xs transition-all active:scale-[0.98]"
              >
                <Camera className="h-5 w-5" />
                <span>Capture Photo with Camera</span>
              </button>

              {/* Upload from Gallery / Files */}
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 p-3.5 rounded-[8px] border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-medium text-xs transition-all active:scale-[0.98]"
              >
                <ImageIcon className="h-5 w-5" />
                <span>Select from Gallery / Computer</span>
              </button>
            </div>
          </div>

          {/* Photo Previews Queue */}
          {queue.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Selected Photos ({queue.length})</span>
                <span className="text-[11px] font-normal">Add captions below before saving</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {queue.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex gap-3 p-2.5 rounded-[8px] border border-[#e5e3df] dark:border-[#27272a] bg-[#faf9f8] dark:bg-slate-900/60 relative group"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-20 h-20 rounded-[6px] overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0">
                      <img
                        src={item.previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-[3px] bg-black/60 text-[10px] text-white font-mono">
                        #{index + 1}
                      </span>
                    </div>

                    {/* Meta & Caption input */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-1">
                        <div className="truncate">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                            {item.file.name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {formatBytes(item.file.size)}
                          </p>
                        </div>
                        {!isSubmitting && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Remove photo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={item.caption}
                        onChange={(e) => handleUpdateCaption(item.id, e.target.value)}
                        placeholder="Caption (e.g. Board section 1, Theorem proof)"
                        disabled={isSubmitting}
                        className="w-full text-xs bg-white dark:bg-slate-800 border border-[#e5e3df] dark:border-[#27272a] rounded-[6px] px-2 py-1 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#5645d4]"
                      />

                      {/* Item Status */}
                      {item.status === 'uploading' && (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#5645d4]">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Uploading...</span>
                        </div>
                      )}
                      {item.status === 'completed' && (
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Ready & Saved</span>
                        </div>
                      )}
                      {item.status === 'failed' && (
                        <div className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
                          <AlertCircle className="h-3 w-3" />
                          <span>Upload failed</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Genuine Upload Progress Bar */}
          {isSubmitting && (
            <div className="p-3.5 rounded-[8px] bg-[#5645d4]/5 border border-[#5645d4]/20 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#5645d4] font-medium">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving photos to class journal...
                </span>
                <span className="font-mono">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-[#5645d4]/20 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#5645d4] h-1.5 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#e5e3df] dark:border-[#27272a] bg-[#fbfbfa] dark:bg-[#1e1e24] shrink-0">
          <div className="text-xs text-slate-400">
            {queue.length} photo{queue.length === 1 ? '' : 's'} staged
          </div>

          <div className="flex items-center gap-2.5">
            {isSubmitting ? (
              <button
                type="button"
                onClick={handleCancelUpload}
                className="px-3.5 py-2 rounded-[8px] text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel Upload
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-[8px] text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || queue.length === 0}
              className="px-4 py-2 rounded-[8px] text-xs font-semibold bg-[#5645d4] hover:bg-[#4636b8] text-white shadow-sm flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving ({uploadProgress}%)</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Save to Class Journal</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Live camera capture (getUserMedia) — replaces the mobile-only capture attribute */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(file) => handleAddFiles([file])}
        title="Capture Board Photo"
      />
    </div>
  );
};
