import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  CalendarDays,
  GraduationCap,
  FileText,
  FileCode,
  CheckSquare,
  Award,
  Calendar,
  ArrowRight,
  PlusCircle,
  Camera,
} from 'lucide-react';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickAdd: (defaultType?: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onOpenQuickAdd }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Search API debounce
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.search(query.trim());
        setResults(data);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleSelect = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleQuickAction = (type: string) => {
    onClose();
    onOpenQuickAdd(type);
  };

  const hasResults =
    results &&
    (results.semesters?.length > 0 ||
      results.courses?.length > 0 ||
      results.documents?.length > 0 ||
      results.notes?.length > 0 ||
      results.assignments?.length > 0 ||
      results.exams?.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl overflow-hidden card-notion shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-[#e5e3df] px-4 py-3 dark:border-[#1e293b]">
          <Search className="h-5 w-5 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search semesters, courses, documents, notes, exams... (or type a keyword)"
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-[8px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[11px] font-semibold text-slate-400 bg-slate-100 rounded-[6px] border border-[#e5e3df] dark:bg-slate-800 dark:border-[#1e293b]">
            ESC
          </kbd>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {loading && (
            <div className="py-8 text-center text-xs text-slate-400">
              Searching database records...
            </div>
          )}

          {!loading && !query && (
            <div className="space-y-3 p-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Quick Actions
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <button
                  onClick={() => handleQuickAction('document')}
                  className="flex items-center gap-2.5 rounded-[8px] p-2.5 text-left text-slate-700 hover:bg-[#0f6b57]/10 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <PlusCircle className="h-4 w-4 text-[#0f6b57]" />
                  <span>Upload PDF Document</span>
                </button>
                <button
                  onClick={() => handleQuickAction('note')}
                  className="flex items-center gap-2.5 rounded-[8px] p-2.5 text-left text-slate-700 hover:bg-[#0f6b57]/10 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <FileText className="h-4 w-4 text-emerald-500" />
                  <span>Create Study Note</span>
                </button>
                <button
                  onClick={() => handleQuickAction('assignment')}
                  className="flex items-center gap-2.5 rounded-[8px] p-2.5 text-left text-slate-700 hover:bg-[#0f6b57]/10 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <CheckSquare className="h-4 w-4 text-amber-500" />
                  <span>Add Assignment Deadline</span>
                </button>
                <button
                  onClick={() => handleQuickAction('event')}
                  className="flex items-center gap-2.5 rounded-[8px] p-2.5 text-left text-slate-700 hover:bg-[#0f6b57]/10 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <Calendar className="h-4 w-4 text-[#0f6b57]" />
                  <span>Schedule Study Session</span>
                </button>
                <button
                  onClick={() => handleSelect('/journal')}
                  className="flex items-center gap-2.5 rounded-[8px] p-2.5 text-left text-slate-700 hover:bg-[#0f6b57]/10 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <Camera className="h-4 w-4 text-[#0f6b57]" />
                  <span>Class Photo Journal (Board Notes)</span>
                </button>
              </div>
            </div>
          )}

          {!loading && query && !hasResults && (
            <div className="py-8 text-center text-sm text-slate-500">
              No academic records matching "<span className="font-medium text-slate-700 dark:text-slate-300">{query}</span>"
            </div>
          )}

          {hasResults && (
            <div className="space-y-4">
              {/* Documents */}
              {results.documents?.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-1">
                    Documents ({results.documents.length})
                  </div>
                  {results.documents.map((doc: any) => (
                    <div
                      key={doc.id}
                      onClick={() => handleSelect(`/documents/${doc.id}/view`)}
                      className="group flex items-center justify-between p-2 rounded-[8px] hover:bg-[#0f6b57]/10 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <FileCode className="h-4 w-4 text-[#0f6b57] shrink-0" />
                        <div className="truncate">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-[#0f6b57] dark:group-hover:text-[#4ccba5] truncate">
                            {doc.title}
                          </p>
                          <p className="text-xs text-slate-400">
                            {doc.category} {doc.course ? `• ${doc.course.code}` : ''}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              )}

              {/* Courses */}
              {results.courses?.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-1">
                    Courses ({results.courses.length})
                  </div>
                  {results.courses.map((course: any) => (
                    <div
                      key={course.id}
                      onClick={() => handleSelect(`/courses/${course.id}`)}
                      className="group flex items-center justify-between p-2 rounded-[8px] hover:bg-[#0f6b57]/10 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <GraduationCap className="h-4 w-4 text-sky-500 shrink-0" />
                        <div className="truncate">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-[#0f6b57] dark:group-hover:text-[#4ccba5] truncate">
                            {course.code} - {course.title}
                          </p>
                          <p className="text-xs text-slate-400">
                            {course.teacherName || 'Faculty'} {course.semester ? `• ${course.semester.name}` : ''}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              {results.notes?.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-1">
                    Notes ({results.notes.length})
                  </div>
                  {results.notes.map((note: any) => (
                    <div
                      key={note.id}
                      onClick={() => handleSelect(`/notes?id=${note.id}`)}
                      className="group flex items-center justify-between p-2 rounded-[8px] hover:bg-[#0f6b57]/10 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
                        <div className="truncate">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-[#0f6b57] dark:group-hover:text-[#4ccba5] truncate">
                            {note.title}
                          </p>
                          <p className="text-xs text-slate-400">
                            {note.course ? `Course ${note.course.code}` : 'Personal study note'}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              )}

              {/* Exams */}
              {results.exams?.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-1">
                    Exams ({results.exams.length})
                  </div>
                  {results.exams.map((exam: any) => (
                    <div
                      key={exam.id}
                      onClick={() => handleSelect(`/exams`)}
                      className="group flex items-center justify-between p-2 rounded-[8px] hover:bg-[#0f6b57]/10 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Award className="h-4 w-4 text-rose-500 shrink-0" />
                        <div className="truncate">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-[#0f6b57] dark:group-hover:text-[#4ccba5] truncate">
                            {exam.title} ({exam.examType})
                          </p>
                          <p className="text-xs text-slate-400">
                            {exam.course?.code}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              )}

              {/* Semesters */}
              {results.semesters?.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-1">
                    Semesters ({results.semesters.length})
                  </div>
                  {results.semesters.map((sem: any) => (
                    <div
                      key={sem.id}
                      onClick={() => handleSelect(`/semesters/${sem.id}`)}
                      className="group flex items-center justify-between p-2 rounded-[8px] hover:bg-[#0f6b57]/10 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <CalendarDays className="h-4 w-4 text-[#0f6b57] shrink-0" />
                        <div className="truncate">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                            {sem.name}
                          </p>
                          <p className="text-xs text-slate-400 capitalize">{sem.status.toLowerCase()}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-[#e5e3df] bg-[#f7f6f3]/50 px-4 py-2.5 text-[11px] text-slate-400 dark:border-[#1e293b] dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <span>Navigate</span>
            <kbd className="px-1.5 py-0.5 rounded-[4px] bg-white dark:bg-slate-900 border border-[#e5e3df] dark:border-[#1e293b] font-mono">↑↓</kbd>
            <span>Select</span>
            <kbd className="px-1.5 py-0.5 rounded-[4px] bg-white dark:bg-slate-900 border border-[#e5e3df] dark:border-[#1e293b] font-mono">↵</kbd>
          </div>
          <span>ScholarFlow Global Search</span>
        </div>
      </div>
    </div>
  );
};
