import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  FolderOpen,
  Search,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  Eye,
  Share2,
  History,
  Copy,
  LayoutGrid,
  List as ListIcon,
  ArrowUpDown,
  FileText,
  FileCode,
  FileSpreadsheet,
  X,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate, formatBytes, DOCUMENT_CATEGORIES } from '../../lib/utils';
import { DocumentItem, Semester, Course } from '../../types';
import { ShareModal } from '../../components/sharing/ShareModal';
import { FileUploadModal } from '../../components/ui/FileUploadModal';
import { useActiveSemester } from '../../hooks/useActiveSemester';
import { AcademicBreadcrumb } from '../../components/common/AcademicBreadcrumb';

export const DocumentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { id: paramSemesterId, semesterId: routeSemesterId } = useParams<{ id?: string; semesterId?: string }>();
  const [searchParams] = useSearchParams();
  const { activeSemesterId } = useActiveSemester();

  const effectiveSemesterId = paramSemesterId || routeSemesterId || searchParams.get('semesterId') || activeSemesterId || '';

  // Search & Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState(effectiveSemesterId);

  // Sync when route or active semester changes
  useEffect(() => {
    const semId = paramSemesterId || routeSemesterId || searchParams.get('semesterId');
    if (semId) {
      setSemesterFilter(semId);
    } else if (activeSemesterId && !semesterFilter) {
      setSemesterFilter(activeSemesterId);
    }
  }, [paramSemesterId, routeSemesterId, searchParams, activeSemesterId]);

  // Sorting & View
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'size' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<DocumentItem | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceProgress, setReplaceProgress] = useState(0);
  const [replaceStatus, setReplaceStatus] = useState<'idle' | 'uploading' | 'processing' | 'failed'>('idle');
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const [replaceAbortController, setReplaceAbortController] = useState<AbortController | null>(null);

  const [shareTarget, setShareTarget] = useState<DocumentItem | null>(null);
  const [versionHistoryDoc, setVersionHistoryDoc] = useState<DocumentItem | null>(null);

  // Debounce search query input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load Semesters
  const { data: semesters = [] } = useQuery<Semester[]>({
    queryKey: ['semesters'],
    queryFn: () => api.getSemesters(),
  });

  // Load Courses (filtered by selected semester)
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses', semesterFilter],
    queryFn: () => api.getCourses(semesterFilter || undefined),
  });

  // Query documents with filter parameters
  const params: Record<string, string> = {};
  if (debouncedSearch) params.search = debouncedSearch;
  if (categoryFilter) params.category = categoryFilter;
  if (courseFilter) params.courseId = courseFilter;
  if (semesterFilter) params.semesterId = semesterFilter;

  const { data: documents = [], isLoading, refetch } = useQuery<DocumentItem[]>({
    queryKey: ['documents', params],
    queryFn: () => api.getDocuments(params),
  });

  // Version history query
  const { data: versionHistoryData } = useQuery({
    queryKey: ['docVersions', versionHistoryDoc?.id],
    queryFn: () => (versionHistoryDoc ? api.getDocumentVersions(versionHistoryDoc.id) : null),
    enabled: !!versionHistoryDoc,
  });

  // Restore version mutation
  const restoreVersionMutation = useMutation({
    mutationFn: ({ versionId, changeDescription }: { versionId: string; changeDescription?: string }) =>
      api.restoreDocumentVersion(versionHistoryDoc!.id, versionId, changeDescription),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['docVersions', versionHistoryDoc?.id] });
      setVersionHistoryDoc(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Replace file handler with honest progress & cancellation
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

      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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

  // Sorted documents
  const sortedDocuments = useMemo(() => {
    const list = [...documents];
    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === 'size') {
        comparison = (a.fileSize || 0) - (b.fileSize || 0);
      } else if (sortBy === 'category') {
        comparison = (a.category || '').localeCompare(b.category || '');
      } else {
        // Date
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        comparison = dateA - dateB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [documents, sortBy, sortOrder]);

  const getFileIcon = (filename = '') => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="h-4 w-4 text-[#e03131]" />;
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv')
      return <FileSpreadsheet className="h-4 w-4 text-[#1aae39]" />;
    if (ext === 'js' || ext === 'ts' || ext === 'py' || ext === 'html')
      return <FileCode className="h-4 w-4 text-[#0075de]" />;
    return <FileText className="h-4 w-4 text-[#5645d4]" />;
  };

  const currentSemesterObj = semesters.find((s) => s.id === semesterFilter);
  const currentCourseObj = courses.find((c) => c.id === courseFilter);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto text-[#37352f] dark:text-[#f0eeec]">
      {/* Academic Context Breadcrumb */}
      <AcademicBreadcrumb
        semesterName={currentSemesterObj?.name}
        courseCode={currentCourseObj?.code}
        courseName={currentCourseObj?.title}
        moduleName="Documents & PDFs"
      />

      {/* Header following DESIGN.md */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e3df] dark:border-[#2a2a2e] pb-6">

        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#e6e0f5] text-[#391c57] text-xs font-semibold mb-2 border border-[#d6b6f6]">
            <FolderOpen className="h-3.5 w-3.5 text-[#5645d4]" />
            <span>Document Repository</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.5px] text-[#1a1a1a] dark:text-white">
            Academic Document Workspace
          </h1>
          <p className="text-sm text-[#787671] dark:text-[#a4a097] mt-1">
            Local secure filesystem archive with PDF annotations, cryptographic SHA-256 versioning, and sharing.
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="btn-notion-primary text-xs shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <Upload className="h-4 w-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Search & Filter Bar: Notion Inputs (44px height, 8px rounded) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="h-4 w-4 text-[#787671] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title or filename..."
            className="w-full h-[44px] rounded-[8px] border border-[#c8c4be] bg-[#f6f5f4] dark:bg-[#1c1c1f] dark:border-[#37352f] pl-10 pr-3 text-xs text-[#1a1a1a] dark:text-white focus:outline-none focus:border-2 focus:border-[#5645d4] transition-all"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-[44px] px-3 rounded-[8px] border border-[#c8c4be] dark:border-[#37352f] bg-white dark:bg-[#1c1c1f] text-xs font-medium text-[#1a1a1a] dark:text-white focus:outline-none focus:border-2 focus:border-[#5645d4] cursor-pointer"
        >
          <option value="">All Categories</option>
          {DOCUMENT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Course Filter */}
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="h-[44px] px-3 rounded-[8px] border border-[#c8c4be] dark:border-[#37352f] bg-white dark:bg-[#1c1c1f] text-xs font-medium text-[#1a1a1a] dark:text-white focus:outline-none focus:border-2 focus:border-[#5645d4] cursor-pointer"
        >
          <option value="">All Courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} - {c.title}
            </option>
          ))}
        </select>

        {/* Semester Filter */}
        <select
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(e.target.value)}
          className="h-[44px] px-3 rounded-[8px] border border-[#c8c4be] dark:border-[#37352f] bg-white dark:bg-[#1c1c1f] text-xs font-medium text-[#1a1a1a] dark:text-white focus:outline-none focus:border-2 focus:border-[#5645d4] cursor-pointer"
        >
          <option value="">All Semesters</option>
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Sorting, View Toggle & Category Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Category Quick Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setCategoryFilter('')}
            className={`px-3 py-1 rounded-full whitespace-nowrap transition-all font-medium text-xs cursor-pointer ${
              categoryFilter === ''
                ? 'bg-[#1a1a1a] text-white font-semibold dark:bg-white dark:text-[#1a1a1a]'
                : 'bg-transparent text-[#787671] border border-[#e5e3df] hover:border-[#c8c4be] dark:border-[#2a2a2e]'
            }`}
          >
            All ({documents.length})
          </button>
          {DOCUMENT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat === categoryFilter ? '' : cat)}
              className={`px-3 py-1 rounded-full whitespace-nowrap transition-all font-medium text-xs cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#1a1a1a] text-white font-semibold dark:bg-white dark:text-[#1a1a1a]'
                  : 'bg-transparent text-[#787671] border border-[#e5e3df] hover:border-[#c8c4be] dark:border-[#2a2a2e]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Controls: Sort and Grid/List view */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 border border-[#e5e3df] dark:border-[#2a2a2e] rounded-[8px] px-2 py-1 bg-white dark:bg-[#141416] text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-[#787671]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-medium text-[#1a1a1a] dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="date">Date</option>
              <option value="title">Name</option>
              <option value="size">Size</option>
              <option value="category">Category</option>
            </select>
            <button
              onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
              className="text-[#787671] hover:text-[#1a1a1a] font-semibold text-[11px] px-1"
              title="Toggle sort order"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          <div className="flex items-center border border-[#e5e3df] dark:border-[#2a2a2e] rounded-[8px] p-0.5 bg-white dark:bg-[#141416]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-[6px] transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#ede9e4] text-[#1a1a1a] dark:bg-[#252528] dark:text-white'
                  : 'text-[#787671] hover:text-[#1a1a1a]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-[6px] transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#ede9e4] text-[#1a1a1a] dark:bg-[#252528] dark:text-white'
                  : 'text-[#787671] hover:text-[#1a1a1a]'
              }`}
              title="List View"
            >
              <ListIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Listing */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-44 rounded-[12px] bg-[#f0eeec] dark:bg-[#202024] border border-[#e5e3df] dark:border-[#2a2a2e] animate-pulse"
            />
          ))}
        </div>
      ) : sortedDocuments.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-[#c8c4be] dark:border-[#37352f] p-12 text-center bg-[#fbfbfa] dark:bg-[#19191c]">
          <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#e6e0f5] text-[#5645d4] mx-auto mb-3">
            <FolderOpen className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-[#1a1a1a] dark:text-white text-base">No documents found</h3>
          <p className="text-xs text-[#787671] dark:text-[#a4a097] mt-1 max-w-sm mx-auto">
            {debouncedSearch || categoryFilter || courseFilter || semesterFilter
              ? 'No documents match your active filters. Try clearing filters or search terms.'
              : 'Upload lecture slides, question papers, or research notes to organize your academic materials.'}
          </p>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="btn-notion-primary text-xs mt-4 inline-flex"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Document</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW: 12px Notion Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedDocuments.map((doc) => (
            <div
              key={doc.id}
              className="card-notion bg-white dark:bg-[#141416] p-5 rounded-[12px] border border-[#e5e3df] dark:border-[#2a2a2e] shadow-2xs hover:border-[#c8c4be] dark:hover:border-[#37352f] flex flex-col justify-between transition-all group"
            >
              <div>
                {/* Header Tag Row */}
                <div className="flex items-center justify-between mb-3">
                  <span className="badge-notion-tag-purple">
                    {doc.category || 'General'}
                  </span>
                  {doc.course && (
                    <span className="text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097]">
                      {doc.course.code}
                    </span>
                  )}
                </div>

                {/* Title */}
                <Link to={`/documents/${doc.id}/view`} className="block">
                  <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white group-hover:text-[#5645d4] dark:group-hover:text-[#d6b6f6] transition-colors line-clamp-2">
                    {doc.title}
                  </h3>
                </Link>

                <p className="text-[11px] text-[#787671] dark:text-[#a4a097] mt-1 truncate">
                  {doc.originalFilename}
                </p>

                {doc.description && (
                  <p className="text-xs text-[#5d5b54] dark:text-[#a4a097] mt-2 line-clamp-2 leading-[1.45]">
                    {doc.description}
                  </p>
                )}

                {/* Tags */}
                {doc.tags && doc.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {doc.tags.map((t) => (
                      <span
                        key={t.tag.id}
                        className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#f0eeec] dark:bg-[#252528] text-[#5d5b54] dark:text-[#a4a097]"
                      >
                        #{t.tag.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Metadata */}
                <div className="mt-4 flex items-center gap-2 text-xs text-[#787671] dark:text-[#a4a097]">
                  <span>{doc.pageCount || 1} pages</span>
                  <span>•</span>
                  <span>{formatBytes(doc.fileSize)}</span>
                  {doc._count && (doc._count.bookmarks > 0 || doc._count.annotations > 0) && (
                    <>
                      <span>•</span>
                      <span className="text-[#5645d4] dark:text-[#d6b6f6] font-medium">
                        {doc._count.annotations} highlights
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="mt-5 pt-3 border-t border-[#ede9e4] dark:border-[#252528] flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShareTarget(doc)}
                    className="p-1.5 rounded-[6px] text-[#787671] hover:bg-[#f6f5f4] hover:text-[#5645d4] dark:hover:bg-[#202024] transition-colors cursor-pointer"
                    title="Share Document"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <a
                    href={api.getDocumentDownloadUrl(doc.id)}
                    download
                    className="p-1.5 rounded-[6px] text-[#787671] hover:bg-[#f6f5f4] hover:text-[#1a1a1a] dark:hover:bg-[#202024] dark:hover:text-white transition-colors cursor-pointer"
                    title="Download File"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => setVersionHistoryDoc(doc)}
                    className="p-1.5 rounded-[6px] text-[#787671] hover:bg-[#f6f5f4] hover:text-[#5645d4] dark:hover:bg-[#202024] transition-colors cursor-pointer"
                    title="Version History & Checksum"
                  >
                    <History className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setReplaceTarget(doc)}
                    className="p-1.5 rounded-[6px] text-[#787671] hover:bg-[#f6f5f4] hover:text-[#1a1a1a] dark:hover:bg-[#202024] transition-colors cursor-pointer"
                    title="Replace with updated version"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `Delete document "${doc.title}"? The file will be cleanly removed from filesystem storage.`
                        )
                      ) {
                        deleteMutation.mutate(doc.id);
                      }
                    }}
                    className="p-1.5 rounded-[6px] text-[#787671] hover:bg-[#fde0ec] hover:text-[#e03131] dark:hover:bg-[#391c57]/30 transition-colors cursor-pointer"
                    title="Delete document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <Link
                  to={`/documents/${doc.id}/view`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#e6e0f5] text-[#391c57] text-xs font-semibold hover:bg-[#d6b6f6]/60 transition-colors cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5 text-[#5645d4]" />
                  <span>Open</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW: Notion Comparison-Table style */
        <div className="rounded-[12px] bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#37352f] dark:text-[#f0eeec]">
              <thead className="bg-[#fbfbfa] dark:bg-[#19191c] border-b border-[#e5e3df] dark:border-[#2a2a2e] text-[#787671] font-semibold text-[11px]">
                <tr>
                  <th className="px-5 py-3">Document</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Date Added</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ede9e4] dark:divide-[#252528]">
                {sortedDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-[#f6f5f4] dark:hover:bg-[#1c1c1f] transition-colors group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#f6f5f4] dark:bg-[#252528] border border-[#e5e3df] dark:border-[#37352f] shrink-0">
                          {getFileIcon(doc.originalFilename)}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/documents/${doc.id}/view`}
                            className="font-semibold text-xs text-[#1a1a1a] dark:text-white group-hover:text-[#5645d4] transition-colors block truncate max-w-sm"
                          >
                            {doc.title}
                          </Link>
                          <span className="text-[11px] text-[#787671] dark:text-[#a4a097] truncate block">
                            {doc.originalFilename}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="badge-notion-tag-purple">
                        {doc.category || 'General'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[#5d5b54] dark:text-[#a4a097]">
                      {doc.course ? doc.course.code : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-[#5d5b54] dark:text-[#a4a097]">
                      {formatBytes(doc.fileSize)}
                    </td>
                    <td className="px-4 py-3.5 text-[#787671] dark:text-[#a4a097]">
                      {formatDate(doc.createdAt, 'MMM d, yyyy')}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/documents/${doc.id}/view`}
                          className="p-1.5 rounded-[6px] text-[#787671] hover:text-[#5645d4] hover:bg-[#ede9e4] dark:hover:bg-[#252528]"
                          title="Open PDF Workspace"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <a
                          href={api.getDocumentDownloadUrl(doc.id)}
                          download
                          className="p-1.5 rounded-[6px] text-[#787671] hover:text-[#1a1a1a] hover:bg-[#ede9e4] dark:hover:bg-[#252528]"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => setShareTarget(doc)}
                          className="p-1.5 rounded-[6px] text-[#787671] hover:text-[#5645d4] hover:bg-[#ede9e4] dark:hover:bg-[#252528]"
                          title="Share Link"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setVersionHistoryDoc(doc)}
                          className="p-1.5 rounded-[6px] text-[#787671] hover:text-[#5645d4] hover:bg-[#ede9e4] dark:hover:bg-[#252528]"
                          title="Versions"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${doc.title}"?`)) {
                              deleteMutation.mutate(doc.id);
                            }
                          }}
                          className="p-1.5 rounded-[6px] text-[#787671] hover:text-[#e03131] hover:bg-[#fde0ec] dark:hover:bg-[#391c57]/30"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FULL-FEATURED FILE UPLOAD MODAL */}
      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['documents'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }}
        existingDocuments={documents}
        semesters={semesters}
        courses={courses}
        defaultSemesterId={semesterFilter}
        defaultCourseId={courseFilter}
        defaultCategory={categoryFilter || DOCUMENT_CATEGORIES[0]}
      />

      {/* REPLACE FILE MODAL WITH HONEST PROGRESS & NOTION TOKENS */}
      {replaceTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1530]/60 backdrop-blur-xs animate-in fade-in">
          <div className="card-notion bg-white dark:bg-[#141416] w-full max-w-md rounded-[12px] border border-[#e5e3df] dark:border-[#2a2a2e] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#1a1a1a] dark:text-white">
                  Replace Document File
                </h3>
                <p className="text-xs text-[#787671] dark:text-[#a4a097] mt-1">
                  Replace <strong>{replaceTarget.title}</strong> with a newer revision. Prior versions and checksums are archived.
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
                disabled={replaceStatus === 'uploading' || replaceStatus === 'processing'}
                onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-[#787671] file:mr-3 file:py-2 file:px-3 file:rounded-[8px] file:border file:border-[#c8c4be] file:text-xs file:font-semibold file:bg-[#f6f5f4] file:text-[#1a1a1a] hover:file:bg-[#ede9e4] cursor-pointer"
              />
            </div>

            {/* Progress bar */}
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

      {/* SHARE MODAL */}
      {shareTarget && (
        <ShareModal
          isOpen={!!shareTarget}
          onClose={() => setShareTarget(null)}
          resourceType="DOCUMENT"
          resourceId={shareTarget.id}
          resourceTitle={shareTarget.title}
        />
      )}

      {/* VERSION HISTORY MODAL (WITH CRYPTOGRAPHIC SHA-256 INTEGRITY) */}
      {versionHistoryDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1530]/60 backdrop-blur-xs animate-in fade-in">
          <div className="card-notion bg-white dark:bg-[#141416] w-full max-w-xl rounded-[12px] border border-[#e5e3df] dark:border-[#2a2a2e] p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#ede9e4] dark:border-[#252528] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#e6e0f5] text-[#5645d4]">
                  <History className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1a1a1a] dark:text-white">
                    Document Version History
                  </h3>
                  <p className="text-xs text-[#787671] dark:text-[#a4a097] truncate max-w-md">
                    {versionHistoryDoc.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVersionHistoryDoc(null)}
                className="p-1.5 rounded-[6px] text-[#787671] hover:bg-[#f6f5f4]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="card-notion-mint border border-[#1aae39]/30 p-3 rounded-[8px] text-[11px] text-[#37352f] leading-[1.45]">
              🛡️ <strong>Integrity & Non-Destructive History:</strong> Files are stored with cryptographic SHA-256 checksums. Restoring a version creates a new current copy, preserving the complete timeline.
            </div>

            {/* Current Active Version Info */}
            <div className="rounded-[8px] border border-[#d6b6f6] bg-[#e6e0f5]/50 dark:bg-[#391c57]/20 p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#391c57] dark:text-[#d6b6f6]">Current Active Copy</span>
                <span className="text-[11px] font-bold text-[#5645d4]">
                  {formatBytes(versionHistoryDoc.fileSize)}
                </span>
              </div>
              <p className="text-[#5d5b54] dark:text-[#a4a097] text-[11px]">
                {versionHistoryDoc.originalFilename} • Updated{' '}
                {formatDate(versionHistoryDoc.updatedAt || versionHistoryDoc.createdAt, 'MMM d, yyyy h:mm a')}
              </p>
            </div>

            {/* Prior Archived Versions List */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#787671] dark:text-[#a4a097]">
                Archived Prior Versions ({versionHistoryData?.versions?.length || 0})
              </h4>

              {!versionHistoryData?.versions || versionHistoryData.versions.length === 0 ? (
                <p className="text-xs text-[#787671] italic py-6 text-center">
                  No prior versions archived yet. When you replace this document with an updated file, previous revisions are automatically saved here.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {versionHistoryData.versions.map((ver: any) => (
                    <div
                      key={ver.id}
                      className="p-3.5 rounded-[8px] border border-[#e5e3df] dark:border-[#2a2a2e] bg-white dark:bg-[#19191c] space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold px-1.5 py-0.5 rounded-[4px] bg-[#f0eeec] dark:bg-[#252528] text-[#5d5b54] dark:text-[#a4a097] text-[10px]">
                            v{ver.versionNumber}
                          </span>
                          <span className="font-semibold text-[#1a1a1a] dark:text-white">
                            {ver.originalFilename}
                          </span>
                        </div>
                        <span className="text-[#787671] text-[11px]">
                          {formatBytes(ver.fileSize)}
                        </span>
                      </div>

                      {ver.changeDescription && (
                        <p className="text-[11px] text-[#5d5b54] dark:text-[#a4a097] italic">
                          "{ver.changeDescription}"
                        </p>
                      )}

                      {/* SHA-256 Checksum */}
                      {ver.checksum && (
                        <div className="flex items-center justify-between text-[10px] text-[#787671] bg-[#f6f5f4] dark:bg-[#202024] p-1.5 rounded-[4px] font-mono">
                          <span className="truncate max-w-[340px]">SHA-256: {ver.checksum}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(ver.checksum);
                            }}
                            className="text-[#5645d4] hover:underline ml-2 shrink-0 cursor-pointer"
                            title="Copy Checksum"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-[#ede9e4] dark:border-[#252528] text-[11px]">
                        <span className="text-[#787671]">
                          Archived on {formatDate(ver.createdAt, 'MMM d, yyyy h:mm a')}
                        </span>

                        <div className="flex items-center gap-3">
                          <a
                            href={`/api/documents/${versionHistoryDoc.id}/versions/${ver.id}/download${localStorage.getItem('scholarflow_token') ? `?token=${encodeURIComponent(localStorage.getItem('scholarflow_token')!)}` : ''}`}
                            download
                            className="flex items-center gap-1 font-semibold text-[#5d5b54] hover:text-[#5645d4]"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Download</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              if (
                                confirm(
                                  `Restore Version ${ver.versionNumber}? Your current file will be preserved as an archive, and Version ${ver.versionNumber} will become the new current copy.`
                                )
                              ) {
                                restoreVersionMutation.mutate({
                                  versionId: ver.id,
                                  changeDescription: `Rollback to Version ${ver.versionNumber}`,
                                });
                              }
                            }}
                            disabled={restoreVersionMutation.isPending}
                            className="font-bold text-[#5645d4] hover:underline cursor-pointer"
                          >
                            Restore Version
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-[#ede9e4] dark:border-[#252528]">
              <button
                type="button"
                onClick={() => setVersionHistoryDoc(null)}
                className="btn-notion-primary text-xs h-[36px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
