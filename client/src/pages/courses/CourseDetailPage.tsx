import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap,
  FolderOpen,
  FileText,
  Award,
  CheckSquare,
  BookOpen,
  Upload,
  Plus,
  ArrowRight,
  Share2,
  Search,
  Download,
  Trash2,
  RefreshCw,
  Eye,
  Pencil,
  X,
  AlertTriangle,
  RotateCw,
  ArrowUpDown,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate, formatBytes, DOCUMENT_CATEGORIES } from '../../lib/utils';
import { Course, DocumentItem } from '../../types';
import { ShareModal } from '../../components/sharing/ShareModal';
import { FileUploadModal } from '../../components/ui/FileUploadModal';


export const CourseDetailPage: React.FC = () => {
  const { id: paramId, courseId: paramCourseId, semesterId: routeSemesterId } = useParams<{
    id?: string;
    courseId?: string;
    semesterId?: string;
  }>();
  const id = paramId || paramCourseId;
  const [tab, setTab] = useState<'overview' | 'documents' | 'notes' | 'exams' | 'assignments'>('overview');
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [progressVal, setProgressVal] = useState<number | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Documents tab: search / filter / sort
  const [docSearchInput, setDocSearchInput] = useState('');
  const [docCategoryFilter, setDocCategoryFilter] = useState('');
  const [docSortBy, setDocSortBy] = useState<'date' | 'title' | 'size' | 'category'>('date');
  const [docSortOrder, setDocSortOrder] = useState<'asc' | 'desc'>('desc');
  const [visibleCount, setVisibleCount] = useState(9);

  // Document action modals
  const [previewTarget, setPreviewTarget] = useState<DocumentItem | null>(null);
  const [editTarget, setEditTarget] = useState<DocumentItem | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', category: '' });
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  const [shareTarget, setShareTarget] = useState<DocumentItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Replace flow
  const [replaceTarget, setReplaceTarget] = useState<DocumentItem | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceProgress, setReplaceProgress] = useState(0);
  const [replaceStatus, setReplaceStatus] = useState<'idle' | 'uploading' | 'processing' | 'failed'>('idle');
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const [replaceAbortController, setReplaceAbortController] = useState<AbortController | null>(null);

  const queryClient = useQueryClient();

  const { data: course, isLoading } = useQuery<Course>({
    queryKey: ['course', id],
    queryFn: () => api.getCourse(id!),
    enabled: !!id,
  });

  // Course-scoped documents query (kept separate so filtering stays in-page)
  const { data: documents = [], isLoading: documentsLoading } = useQuery<DocumentItem[]>({
    queryKey: ['documents', { courseId: id }],
    queryFn: () => api.getDocuments({ courseId: id!, limit: '200' }),
    enabled: !!id,
  });

  const updateProgressMutation = useMutation({
    mutationFn: (newProgress: number) => api.updateCourse(id!, { progress: newProgress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', id] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const invalidateDocuments = () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['course', id] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const updateDocumentMutation = useMutation({
    mutationFn: ({ docId, data }: { docId: string; data: any }) => api.updateDocument(docId, data),
    onSuccess: () => {
      invalidateDocuments();
      setEditTarget(null);
      setActionError(null);
    },
    onError: (err: any) => setActionError(err?.message || 'Failed to update document.'),
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (docId: string) => api.deleteDocument(docId),
    onSuccess: () => {
      invalidateDocuments();
      setDeleteTarget(null);
      setActionError(null);
    },
    onError: (err: any) => setActionError(err?.message || 'Failed to delete document.'),
  });

  const handleReplaceSubmit = async () => {
    if (!replaceTarget || !replaceFile) return;

    const controller = new AbortController();
    setReplaceAbortController(controller);
    setReplaceStatus('uploading');
    setReplaceProgress(0);
    setReplaceError(null);

    try {
      const formData = new FormData();
      formData.append('file', replaceFile);

      await api.replaceDocumentWithProgress(
        replaceTarget.id,
        formData,
        (progress) => {
          if (progress >= 100) {
            setReplaceStatus('processing');
            setReplaceProgress(100);
          } else {
            setReplaceProgress(progress);
          }
        },
        controller.signal
      );

      invalidateDocuments();
      setReplaceTarget(null);
      setReplaceFile(null);
      setReplaceStatus('idle');
      setReplaceAbortController(null);
    } catch (err: any) {
      if (err.message === 'Upload cancelled') {
        setReplaceStatus('idle');
        setReplaceError('Replacement was cancelled.');
      } else {
        setReplaceStatus('failed');
        setReplaceError(err?.message || 'Replacement failed. Please try again.');
      }
      setReplaceAbortController(null);
    }
  };

  const openEditModal = (doc: DocumentItem) => {
    setActionError(null);
    setEditForm({
      title: doc.title,
      description: doc.description || '',
      category: doc.category || DOCUMENT_CATEGORIES[0],
    });
    setEditTarget(doc);
  };

  // Client-side filtering + sorting keeps the whole flow in-page
  const filteredDocuments = useMemo(() => {
    const query = docSearchInput.trim().toLowerCase();
    const list = documents.filter((doc) => {
      if (docCategoryFilter && doc.category !== docCategoryFilter) return false;
      if (!query) return true;
      return (
        doc.title.toLowerCase().includes(query) ||
        (doc.originalFilename || '').toLowerCase().includes(query) ||
        (doc.description || '').toLowerCase().includes(query)
      );
    });

    list.sort((a, b) => {
      let comparison = 0;
      if (docSortBy === 'title') comparison = a.title.localeCompare(b.title);
      else if (docSortBy === 'size') comparison = (a.fileSize || 0) - (b.fileSize || 0);
      else if (docSortBy === 'category')
        comparison = (a.category || '').localeCompare(b.category || '');
      else
        comparison =
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      return docSortOrder === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [documents, docSearchInput, docCategoryFilter, docSortBy, docSortOrder]);

  const contextLabel = [course?.code, course?.title, course?.semester?.name]
    .filter(Boolean)
    .join(' · ');

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-28 bg-[#f0eeec] dark:bg-slate-800 rounded-[12px] animate-pulse" />
      </div>
    );
  }

  if (!course) {
    const returnUrl = routeSemesterId ? `/semesters/${routeSemesterId}/courses` : '/courses';
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-3">
        <div className="inline-flex p-3 rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-400">
          <GraduationCap className="h-8 w-8" />
        </div>
        <h2 className="text-base font-semibold text-[#1a1a1a] dark:text-white">Course Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The requested course record could not be found or may have been deleted.
        </p>
        <Link to={returnUrl} className="btn-notion-primary text-xs inline-block mt-2">
          Return to Courses
        </Link>
      </div>
    );
  }

  const currentProgress = progressVal !== null ? progressVal : course.progress;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Course Header Banner */}
      <div className="card-notion p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: course.color || '#5645d4' }}
              />
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-[6px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {course.code}
              </span>
              {course.section && (
                <span className="text-xs text-slate-400">Section {course.section}</span>
              )}
              {course.semester && (
                <Link
                  to={`/semesters/${course.semester.id}`}
                  className="text-xs font-medium text-[#5645d4] hover:underline dark:text-[#8070f6]"
                >
                  {course.semester.name}
                </Link>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-2">
              {course.title}
            </h1>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Instructor: <strong>{course.teacherName || 'Faculty'}</strong>
              {course.teacherEmail ? ` (${course.teacherEmail})` : ''}
              {course.roomNumber ? ` • Room: ${course.roomNumber}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Share Course Hub */}
            <button
              onClick={() => setShareModalOpen(true)}
              className="btn-notion-secondary text-xs flex items-center gap-1.5"
              title="Share Course Page & Syllabus"
            >
              <Share2 className="h-3.5 w-3.5 text-[#5645d4]" /> Share Course
            </button>

            {/* Progress Control */}
            <div className="flex flex-col items-start md:items-end gap-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-[8px] border border-[#e5e3df] dark:border-[#1e293b]">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Syllabus Mastery:</span>
                <span className="text-[#5645d4] dark:text-[#8070f6] font-bold">{currentProgress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={currentProgress}
                onChange={(e) => setProgressVal(parseInt(e.target.value, 10))}
                onMouseUp={() => updateProgressMutation.mutate(currentProgress)}
                onTouchEnd={() => updateProgressMutation.mutate(currentProgress)}
                className="h-1.5 w-36 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#5645d4]"
              />
            </div>
          </div>

        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex border-b border-[#e5e3df] gap-6 text-xs font-semibold dark:border-[#1e293b]">
          {[
            { id: 'overview', label: 'Overview & Syllabus', icon: BookOpen },
            { id: 'documents', label: `Documents (${documents.length})`, icon: FolderOpen },
            { id: 'notes', label: `Study Notes (${course.notes?.length || 0})`, icon: FileText },
            { id: 'exams', label: `Exam Prep (${course.exams?.length || 0})`, icon: Award },
            { id: 'assignments', label: `Assignments (${course.assignments?.length || 0})`, icon: CheckSquare },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`flex items-center gap-2 border-b-2 pb-3 transition-colors ${
                  tab === t.id
                    ? 'border-[#5645d4] text-[#5645d4] dark:border-[#8070f6] dark:text-[#8070f6]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB: OVERVIEW */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Description & Syllabus */}
            <div className="card-notion p-6 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Course Syllabus & Description</h3>
              {course.description && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {course.description}
                </p>
              )}
              {course.syllabus ? (
                <div className="p-4 rounded-[8px] bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300 border border-[#e5e3df] dark:border-[#1e293b]">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1.5">Syllabus Breakdown:</h4>
                  <p className="whitespace-pre-line leading-relaxed">{course.syllabus}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">No detailed syllabus added yet.</p>
              )}
            </div>

            {/* Preparation Notes for Midterm & Final */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card-notion p-5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-500" />
                  Midterm Exam Strategy
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {course.midtermPrepNotes || 'No specific midterm prep notes recorded.'}
                </p>
              </div>

              <div className="card-notion p-5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-rose-500" />
                  Final Exam Strategy
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {course.finalPrepNotes || 'No specific final prep notes recorded.'}
                </p>
              </div>
            </div>
          </div>

          {/* Right sidebar schedule & info */}
          <div className="space-y-6">
            <div className="card-notion p-5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">Schedule Information</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Class Hours:</span>
                  <p className="font-mono font-medium text-slate-800 dark:text-slate-200">
                    {course.classSchedule || 'Schedule not set'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Exam Timetable:</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {course.examSchedule || 'Exams not announced'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Classroom / Lab:</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {course.roomNumber || 'TBA'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: DOCUMENTS */}
      {tab === 'documents' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Lecture slides, question papers, syllabus, and lab reports for {course.code}.
            </p>
            <button
              onClick={() => setIsUploadDocOpen(true)}
              className="btn-notion-primary text-xs flex items-center gap-1.5 self-start"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload PDF
            </button>
          </div>

          {documents.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="h-4 w-4 text-[#787671] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={docSearchInput}
                  onChange={(e) => {
                    setDocSearchInput(e.target.value);
                    setVisibleCount(9);
                  }}
                  placeholder="Search this course's documents..."
                  className="w-full h-[40px] rounded-[8px] border border-[#c8c4be] bg-[#f6f5f4] dark:bg-[#1c1c1f] dark:border-[#37352f] pl-10 pr-3 text-xs text-[#1a1a1a] dark:text-white focus:outline-none focus:border-2 focus:border-[#5645d4] transition-all"
                />
              </div>

              <select
                value={docCategoryFilter}
                onChange={(e) => {
                  setDocCategoryFilter(e.target.value);
                  setVisibleCount(9);
                }}
                className="h-[40px] px-3 rounded-[8px] border border-[#c8c4be] dark:border-[#37352f] bg-white dark:bg-[#1c1c1f] text-xs font-medium text-[#1a1a1a] dark:text-white focus:outline-none focus:border-2 focus:border-[#5645d4] cursor-pointer"
              >
                <option value="">All Categories</option>
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5 border border-[#c8c4be] dark:border-[#37352f] rounded-[8px] px-2 h-[40px] bg-white dark:bg-[#1c1c1f] text-xs">
                <ArrowUpDown className="h-3.5 w-3.5 text-[#787671]" />
                <select
                  value={docSortBy}
                  onChange={(e) => {
                    setDocSortBy(e.target.value as any);
                    setVisibleCount(9);
                  }}
                  className="bg-transparent text-xs font-medium text-[#1a1a1a] dark:text-white focus:outline-none cursor-pointer"
                >
                  <option value="date">Date</option>
                  <option value="title">Name</option>
                  <option value="size">Size</option>
                  <option value="category">Category</option>
                </select>
                <button
                  onClick={() => {
                    setDocSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                    setVisibleCount(9);
                  }}
                  className="text-[#787671] hover:text-[#1a1a1a] font-semibold text-[11px] px-1"
                  title="Toggle sort order"
                >
                  {docSortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          )}

          {documentsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-40 rounded-[12px] bg-[#f0eeec] dark:bg-[#202024] border border-[#e5e3df] dark:border-[#1e293b] animate-pulse"
                />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-[#e5e3df] p-8 text-center dark:border-[#1e293b]">
              <FolderOpen className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No documents uploaded for {course.code}
              </p>
              <button
                onClick={() => setIsUploadDocOpen(true)}
                className="mt-2 text-xs font-semibold text-[#5645d4] underline inline-block"
              >
                Upload your first lecture slide or previous question paper
              </button>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-[#e5e3df] p-8 text-center dark:border-[#1e293b]">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No documents match your filters</p>
              <button
                onClick={() => {
                  setDocSearchInput('');
                  setDocCategoryFilter('');
                  setVisibleCount(9);
                }}
                className="mt-2 text-xs font-semibold text-[#5645d4] underline inline-block"
              >
                Clear search and filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocuments.slice(0, visibleCount).map((doc) => (
                  <div key={doc.id} className="card-notion p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-[#5645d4]/10 text-[#5645d4] dark:bg-[#5645d4]/20 dark:text-[#8070f6]">
                          {doc.category}
                        </span>
                        <span className="text-[10px] text-slate-400">{formatBytes(doc.fileSize)}</span>
                      </div>

                      <button
                        onClick={() => setPreviewTarget(doc)}
                        className="block text-left w-full"
                        title="Preview document"
                      >
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white hover:text-[#5645d4] truncate">
                          {doc.title}
                        </h4>
                      </button>

                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{doc.originalFilename}</p>

                      {doc.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#e5e3df] dark:border-[#1e293b] flex items-center justify-between">
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => setPreviewTarget(doc)}
                          className="p-1.5 rounded-[6px] text-slate-500 hover:bg-[#f6f5f4] hover:text-[#5645d4] dark:hover:bg-[#202024] transition-colors"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <a
                          href={api.getDocumentDownloadUrl(doc.id)}
                          download
                          className="p-1.5 rounded-[6px] text-slate-500 hover:bg-[#f6f5f4] hover:text-slate-900 dark:hover:bg-[#202024] dark:hover:text-white transition-colors"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => setShareTarget(doc)}
                          className="p-1.5 rounded-[6px] text-slate-500 hover:bg-[#f6f5f4] hover:text-[#5645d4] dark:hover:bg-[#202024] transition-colors"
                          title="Share"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(doc)}
                          className="p-1.5 rounded-[6px] text-slate-500 hover:bg-[#f6f5f4] hover:text-[#5645d4] dark:hover:bg-[#202024] transition-colors"
                          title="Edit details"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setReplaceTarget(doc);
                            setReplaceFile(null);
                            setReplaceStatus('idle');
                            setReplaceError(null);
                            setReplaceProgress(0);
                          }}
                          className="p-1.5 rounded-[6px] text-slate-500 hover:bg-[#f6f5f4] hover:text-slate-900 dark:hover:bg-[#202024] dark:hover:text-white transition-colors"
                          title="Replace file"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setActionError(null);
                            setDeleteTarget(doc);
                          }}
                          className="p-1.5 rounded-[6px] text-slate-500 hover:bg-[#fde0ec] hover:text-[#e03131] dark:hover:bg-[#391c57]/30 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <Link
                        to={`/documents/${doc.id}/view`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#5645d4] dark:text-[#8070f6] hover:underline"
                      >
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {visibleCount < filteredDocuments.length && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => setVisibleCount((c) => c + 9)}
                    className="btn-notion-secondary text-xs"
                  >
                    Load more ({filteredDocuments.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: NOTES */}
      {tab === 'notes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Notion-style notes for {course.code}.</p>
            <Link
              to="/notes"
              className="btn-notion-primary text-xs flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              New Study Note
            </Link>
          </div>

          {(!course.notes || course.notes.length === 0) ? (
            <p className="text-xs text-slate-400 py-8 text-center">No notes created for this course yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {course.notes.map((note: any) => (
                <Link
                  key={note.id}
                  to={`/notes?id=${note.id}`}
                  className="card-notion p-4 hover:border-slate-300 transition-colors block"
                >
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{note.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Updated {formatDate(note.updatedAt, 'MMM d, yyyy h:mm a')}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: EXAMS */}
      {tab === 'exams' && (
        <div className="space-y-4">
          {(!course.exams || course.exams.length === 0) ? (
            <p className="text-xs text-slate-400 py-8 text-center">No exams scheduled for this course.</p>
          ) : (
            <div className="space-y-3">
              {course.exams.map((exam: any) => (
                <div
                  key={exam.id}
                  className="card-notion p-4 flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-rose-100 text-rose-700 uppercase">
                      {exam.examType}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{exam.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDate(exam.examDate, 'EEE, MMM d, yyyy h:mm a')} {exam.room ? `• ${exam.room}` : ''}
                    </p>
                  </div>
                  <Link to="/exams" className="text-xs font-semibold text-[#5645d4] hover:underline">
                    View Exam Tracker →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: ASSIGNMENTS */}
      {tab === 'assignments' && (
        <div className="space-y-4">
          {(!course.assignments || course.assignments.length === 0) ? (
            <p className="text-xs text-slate-400 py-8 text-center">No assignments found for this course.</p>
          ) : (
            <div className="space-y-3">
              {course.assignments.map((a: any) => (
                <div
                  key={a.id}
                  className="card-notion p-4 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{a.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Deadline: {formatDate(a.deadline, 'MMM d, h:mm a')} • Priority: {a.priority}
                    </p>
                  </div>
                  <Link to="/assignments" className="text-xs font-semibold text-[#5645d4] hover:underline">
                    Manage Task →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {course && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          resourceType="COURSE"
          resourceId={course.id}
          resourceTitle={`${course.code} - ${course.title}`}
        />
      )}

      {/* COURSE-SCOPED UPLOAD MODAL (PDF only, context locked to this course) */}
      <FileUploadModal
        isOpen={isUploadDocOpen}
        onClose={() => setIsUploadDocOpen(false)}
        onSuccess={invalidateDocuments}
        existingDocuments={documents}
        defaultSemesterId={course.semesterId}
        defaultCourseId={course.id}
        dialogTitle={`Upload PDFs to ${course.code}`}
        dialogSubtitle="Files are automatically linked to this course and semester"
        contextLabel={contextLabel}
        allowedExtensions={['.pdf']}
        lockAcademicContext
        showTitleDescription
        autoCloseOnComplete
      />

      {/* DOCUMENT PREVIEW MODAL */}
      {previewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1530]/60 backdrop-blur-xs">
          <div className="card-notion bg-white dark:bg-[#141416] w-full max-w-4xl max-h-[90vh] rounded-[12px] border border-[#e5e3df] dark:border-[#2a2a2e] shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e5e3df] dark:border-[#2a2a2e] bg-[#fbfbfa] dark:bg-[#19191c]">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white truncate">
                  {previewTarget.title}
                </h3>
                <p className="text-[11px] text-[#787671] truncate">{previewTarget.originalFilename}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={api.getDocumentDownloadUrl(previewTarget.id)}
                  download
                  className="btn-notion-secondary text-xs h-[34px]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
                <Link
                  to={`/documents/${previewTarget.id}/view`}
                  className="btn-notion-primary text-xs h-[34px]"
                >
                  Open Workspace
                </Link>
                <button
                  onClick={() => setPreviewTarget(null)}
                  className="p-1.5 rounded-[6px] text-[#787671] hover:bg-[#ede9e4] dark:hover:bg-[#252528]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#f6f5f4] dark:bg-[#19191c] min-h-[50vh]">
              {previewTarget.mimeType?.startsWith('image/') ? (
                <img
                  src={api.getDocumentFileUrl(previewTarget.id)}
                  alt={previewTarget.title}
                  className="mx-auto max-h-[75vh] object-contain"
                />
              ) : previewTarget.isPdf ? (
                <iframe
                  src={api.getDocumentFileUrl(previewTarget.id)}
                  title={previewTarget.title}
                  className="w-full h-[75vh] border-0"
                />
              ) : (
                <div className="h-[50vh] flex flex-col items-center justify-center text-center p-8">
                  <FileText className="h-10 w-10 text-slate-400 mb-3" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Inline preview isn't available for this file type
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Download the file or open it in the full workspace.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT DOCUMENT METADATA MODAL */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1530]/60 backdrop-blur-xs">
          <div className="card-notion bg-white dark:bg-[#141416] w-full max-w-md rounded-[12px] border border-[#e5e3df] dark:border-[#2a2a2e] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#1a1a1a] dark:text-white">Edit Document</h3>
                <p className="text-xs text-[#787671] mt-1">Update the details for this document.</p>
              </div>
              <button
                onClick={() => setEditTarget(null)}
                className="p-1.5 rounded-[6px] text-[#787671] hover:bg-[#f6f5f4]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-[8px] bg-[#fde0ec] border border-[#ff64c8]/30 text-[#e03131] text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#1a1a1a] dark:text-white mb-1">Title *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full h-[40px] px-3 rounded-[8px] border border-[#c8c4be] dark:border-[#37352f] bg-white dark:bg-[#1c1c1f] text-xs text-[#1a1a1a] dark:text-white focus:outline-none focus:border-2 focus:border-[#5645d4]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1a1a1a] dark:text-white mb-1">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full h-[40px] px-3 rounded-[8px] border border-[#c8c4be] dark:border-[#37352f] bg-white dark:bg-[#1c1c1f] text-xs text-[#1a1a1a] dark:text-white focus:outline-none focus:border-2 focus:border-[#5645d4] cursor-pointer"
                >
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#1a1a1a] dark:text-white mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-[8px] border border-[#c8c4be] dark:border-[#37352f] bg-white dark:bg-[#1c1c1f] text-xs text-[#1a1a1a] dark:text-white focus:outline-none focus:border-2 focus:border-[#5645d4] resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#ede9e4] dark:border-[#252528]">
              <button
                onClick={() => setEditTarget(null)}
                className="btn-notion-secondary text-xs h-[36px]"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  updateDocumentMutation.mutate({
                    docId: editTarget.id,
                    data: {
                      title: editForm.title.trim() || editTarget.originalFilename,
                      category: editForm.category,
                      description: editForm.description.trim() || null,
                    },
                  })
                }
                disabled={updateDocumentMutation.isPending || !editForm.title.trim()}
                className="btn-notion-primary text-xs h-[36px] disabled:opacity-50"
              >
                {updateDocumentMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1530]/60 backdrop-blur-xs">
          <div className="card-notion bg-white dark:bg-[#141416] w-full max-w-md rounded-[12px] border border-[#e5e3df] dark:border-[#2a2a2e] p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#fde0ec] text-[#e03131]">
                <Trash2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#1a1a1a] dark:text-white">Delete document?</h3>
                <p className="text-xs text-[#787671] mt-1">
                  "<strong>{deleteTarget.title}</strong>" will be permanently removed from this course and
                  filesystem storage. This cannot be undone.
                </p>
              </div>
            </div>

            {actionError && (
              <div className="p-3 rounded-[8px] bg-[#fde0ec] border border-[#ff64c8]/30 text-[#e03131] text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-[#ede9e4] dark:border-[#252528]">
              <button
                onClick={() => setDeleteTarget(null)}
                className="btn-notion-secondary text-xs h-[36px]"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteDocumentMutation.mutate(deleteTarget.id)}
                disabled={deleteDocumentMutation.isPending}
                className="inline-flex items-center justify-center gap-1.5 h-[36px] px-4 rounded-[8px] bg-[#e03131] text-white text-xs font-semibold hover:bg-[#c92a2a] transition-colors disabled:opacity-50"
              >
                {deleteDocumentMutation.isPending ? 'Deleting...' : 'Delete Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPLACE FILE MODAL */}
      {replaceTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1530]/60 backdrop-blur-xs">
          <div className="card-notion bg-white dark:bg-[#141416] w-full max-w-md rounded-[12px] border border-[#e5e3df] dark:border-[#2a2a2e] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#1a1a1a] dark:text-white">Replace Document File</h3>
                <p className="text-xs text-[#787671] mt-1">
                  Replace <strong>{replaceTarget.title}</strong> with a newer revision. Prior versions and
                  checksums are archived.
                </p>
              </div>
              <button
                onClick={() => {
                  if (replaceAbortController) replaceAbortController.abort();
                  setReplaceTarget(null);
                }}
                className="p-1.5 rounded-[6px] text-[#787671] hover:bg-[#f6f5f4]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {replaceError && (
              <div className="p-3 rounded-[8px] bg-[#fde0ec] border border-[#ff64c8]/30 text-[#e03131] text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{replaceError}</span>
              </div>
            )}

            <div className="text-xs space-y-2">
              <label className="block font-semibold text-[#1a1a1a] dark:text-white">
                Select Replacement File *
              </label>
              <input
                type="file"
                accept=".pdf"
                disabled={replaceStatus === 'uploading' || replaceStatus === 'processing'}
                onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-[#787671] file:mr-3 file:py-2 file:px-3 file:rounded-[8px] file:border file:border-[#c8c4be] file:text-xs file:font-semibold file:bg-[#f6f5f4] file:text-[#1a1a1a] hover:file:bg-[#ede9e4] cursor-pointer"
              />
            </div>

            {(replaceStatus === 'uploading' || replaceStatus === 'processing') && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-[#787671]">
                  <span>{replaceStatus === 'processing' ? 'Processing file...' : 'Uploading replacement...'}</span>
                  <span>{replaceProgress}%</span>
                </div>
                <div className="w-full bg-[#ede9e4] dark:bg-[#252528] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#5645d4] h-1.5 rounded-full transition-all"
                    style={{ width: `${replaceProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-[#ede9e4] dark:border-[#252528]">
              <button
                type="button"
                onClick={() => {
                  if (replaceAbortController) replaceAbortController.abort();
                  setReplaceTarget(null);
                }}
                disabled={replaceStatus === 'uploading' || replaceStatus === 'processing'}
                className="btn-notion-secondary text-xs h-[36px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReplaceSubmit}
                disabled={!replaceFile || replaceStatus === 'uploading' || replaceStatus === 'processing'}
                className="btn-notion-primary text-xs h-[36px] disabled:opacity-50"
              >
                {replaceStatus === 'uploading' || replaceStatus === 'processing' ? (
                  <>
                    <RotateCw className="h-3.5 w-3.5 animate-spin" />
                    Replacing...
                  </>
                ) : (
                  'Confirm Replace'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT SHARE MODAL */}
      {shareTarget && (
        <ShareModal
          isOpen={!!shareTarget}
          onClose={() => setShareTarget(null)}
          resourceType="DOCUMENT"
          resourceId={shareTarget.id}
          resourceTitle={shareTarget.title}
        />
      )}
    </div>
  );
};

