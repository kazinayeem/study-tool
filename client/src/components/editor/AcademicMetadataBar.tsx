import React, { useMemo } from 'react';
import {
  GraduationCap,
  BookOpen,
  Folder,
  Tag as TagIcon,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronDown,
  X,
} from 'lucide-react';
import { Semester, Course, NoteFolder } from '../../types';
import { AcademicBreadcrumb } from '../common/AcademicBreadcrumb';

interface AcademicMetadataBarProps {
  semesters: Semester[];
  courses: Course[];
  folders: NoteFolder[];
  selectedSemesterId: string;
  selectedCourseId: string;
  selectedFolderId: string;
  tags: string[];
  saveStatus: 'saved' | 'saving' | 'error' | 'unsaved';
  errorMessage?: string | null;
  lastModified?: string | Date;
  onSemesterChange: (semesterId: string) => void;
  onCourseChange: (courseId: string) => void;
  onFolderChange: (folderId: string) => void;
  onTagsChange: (tags: string[]) => void;
  onManualSave?: () => void;
  isPersonalNote?: boolean;
  onTogglePersonal?: () => void;
}

export const AcademicMetadataBar: React.FC<AcademicMetadataBarProps> = ({
  semesters,
  courses,
  folders,
  selectedSemesterId,
  selectedCourseId,
  selectedFolderId,
  tags,
  saveStatus,
  errorMessage,
  lastModified,
  onSemesterChange,
  onCourseChange,
  onFolderChange,
  onTagsChange,
  onManualSave,
  isPersonalNote,
  onTogglePersonal,
}) => {
  // Filter courses strictly by selected semester
  const availableCourses = useMemo(() => {
    if (!selectedSemesterId) return courses;
    return courses.filter((c) => c.semesterId === selectedSemesterId);
  }, [courses, selectedSemesterId]);

  // Derived current names for breadcrumb
  const currentSemester = useMemo(
    () => semesters.find((s) => s.id === selectedSemesterId),
    [semesters, selectedSemesterId]
  );

  const currentCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId),
    [courses, selectedCourseId]
  );

  const handleSemesterSelect = (newSemesterId: string) => {
    onSemesterChange(newSemesterId);
    // If the currently selected course does NOT belong to the new semester, clear it!
    if (selectedCourseId) {
      const courseStillValid = courses.some(
        (c) => c.id === selectedCourseId && c.semesterId === newSemesterId
      );
      if (!courseStillValid) {
        onCourseChange('');
      }
    }
  };

  const [tagInput, setTagInput] = React.useState('');
  const [expanded, setExpanded] = React.useState(() => {
    try {
      return localStorage.getItem('scholarflow_note_details') === 'open';
    } catch {
      return false;
    }
  });
  const toggleExpanded = () => {
    setExpanded((prev) => {
      try {
        localStorage.setItem('scholarflow_note_details', prev ? 'closed' : 'open');
      } catch {
        /* storage unavailable */
      }
      return !prev;
    });
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^#/, '');
      if (clean && !tags.includes(clean)) {
        onTagsChange([...tags, clean]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="shrink-0 bg-[#fbfbfa] dark:bg-neutral-900 border-b border-[#e5e3df] dark:border-neutral-800 px-3 sm:px-4 py-1.5 transition-colors">
      {/* Top row: Academic Breadcrumb + Save Status Indicator */}
      <div className="flex items-center justify-between gap-3 min-h-8">
        <div className="hidden min-w-0 2xl:block overflow-hidden">
        <AcademicBreadcrumb
          semesterName={currentSemester?.name}
          courseCode={currentCourse?.code}
          courseName={currentCourse?.title}
          moduleName="Knowledge Base"
        />
        </div>

        {/* Save State & Timestamp */}
        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-2 text-xs">
         <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </span>
          )}

          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Saved to Cloud</span>
            </span>
          )}

          {saveStatus === 'unsaved' && (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Unsaved Changes</span>
            </span>
          )}

          {saveStatus === 'error' && (
            <div className="flex items-center gap-2">
              <span
                className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium cursor-help"
                title={errorMessage || 'Failed to save to server'}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Save Failed</span>
              </span>
              {onManualSave && (
                <button
                  type="button"
                  onClick={onManualSave}
                  className="px-2 py-0.5 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded hover:bg-rose-100 transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {lastModified && (
            <span className="text-[#787774] dark:text-neutral-500 flex items-center gap-1 ml-2 border-l border-neutral-300 dark:border-neutral-700 pl-2">
              <Clock className="w-3 h-3" />
              <span>
                {new Date(lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </span>
          )}
         </div>
          <button
            type="button"
            onClick={toggleExpanded}
            aria-expanded={expanded}
            className="flex h-8 items-center gap-1.5 rounded-md border border-[#e5e3df] bg-white px-2.5 font-medium text-[#37352f] hover:bg-[#f6f5f4] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          >
            <span className="max-w-[9rem] truncate">
              {currentCourse?.code || currentSemester?.name || 'Details'}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Relationship selectors (collapsed by default to give the page room) */}
      {expanded && (
      <div className="flex flex-wrap items-center gap-2 text-xs pt-2 pb-1">
        {/* Semester selector */}
        <div className="flex items-center bg-white dark:bg-neutral-800 rounded-md border border-[#e5e3df] dark:border-neutral-700 px-2 py-1 shadow-xs">
          <GraduationCap className="w-3.5 h-3.5 text-[#0f6b57] mr-1.5 shrink-0" />
          <span className="text-[#787774] dark:text-neutral-400 font-medium mr-1.5">Semester:</span>
          <select
            value={selectedSemesterId || ''}
            onChange={(e) => handleSemesterSelect(e.target.value)}
            className="bg-transparent text-[#37352f] dark:text-neutral-200 font-medium focus:outline-none cursor-pointer pr-1"
          >
            <option value="">(Personal / No Semester)</option>
            {semesters.map((sem) => (
              <option key={sem.id} value={sem.id}>
                {sem.name}
              </option>
            ))}
          </select>
        </div>

        {/* Course selector (Strictly filtered) */}
        <div className="flex items-center bg-white dark:bg-neutral-800 rounded-md border border-[#e5e3df] dark:border-neutral-700 px-2 py-1 shadow-xs">
          <BookOpen className="w-3.5 h-3.5 text-[#0f6b57] mr-1.5 shrink-0" />
          <span className="text-[#787774] dark:text-neutral-400 font-medium mr-1.5">Course:</span>
          <select
            value={selectedCourseId || ''}
            onChange={(e) => onCourseChange(e.target.value)}
            className="bg-transparent text-[#37352f] dark:text-neutral-200 font-medium focus:outline-none cursor-pointer pr-1 max-w-[200px] truncate"
          >
            <option value="">(No Course / Personal Note)</option>
            {availableCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.title}
              </option>
            ))}
          </select>
          {availableCourses.length === 0 && selectedSemesterId && (
            <span className="text-amber-600 dark:text-amber-400 text-[10px] ml-1.5 italic">
              No courses in this semester
            </span>
          )}
        </div>

        {/* Folder selector */}
        <div className="flex items-center bg-white dark:bg-neutral-800 rounded-md border border-[#e5e3df] dark:border-neutral-700 px-2 py-1 shadow-xs">
          <Folder className="w-3.5 h-3.5 text-amber-500 mr-1.5 shrink-0" />
          <span className="text-[#787774] dark:text-neutral-400 font-medium mr-1.5">Folder:</span>
          <select
            value={selectedFolderId || ''}
            onChange={(e) => onFolderChange(e.target.value)}
            className="bg-transparent text-[#37352f] dark:text-neutral-200 font-medium focus:outline-none cursor-pointer pr-1"
          >
            <option value="">(General Root)</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tags management */}
        <div className="flex items-center flex-wrap gap-1 bg-white dark:bg-neutral-800 rounded-md border border-[#e5e3df] dark:border-neutral-700 px-2 py-1 shadow-xs">
          <TagIcon className="w-3.5 h-3.5 text-[#787774] dark:text-neutral-400 mr-1 shrink-0" />
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 bg-teal-50 dark:bg-teal-950/40 text-[#0f6b57] dark:text-teal-300 text-[11px] px-1.5 py-0.5 rounded font-medium"
            >
              #{tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-teal-900 dark:hover:text-teal-100"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          <input
            type="text"
            placeholder="Add tag (Press Enter)..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            className="bg-transparent text-xs text-[#37352f] dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-none w-32"
          />
        </div>
      </div>
      )}
    </div>
  );
};
