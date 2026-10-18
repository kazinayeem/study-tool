import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FolderOpen,
  Search,
  Upload,
  Filter,
  FileCode,
  Download,
  Trash2,
  RefreshCw,
  ExternalLink,
  Tag as TagIcon,
  BookOpen,
  Eye,
  X,
  FileText,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate, formatBytes, DOCUMENT_CATEGORIES, CATEGORY_COLORS } from '../../lib/utils';
import { DocumentItem, Semester, Course } from '../../types';

export const DocumentsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<DocumentItem | null>(null);

  // Upload Form states
  const [file, setFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [docSemesterId, setDocSemesterId] = useState('');
  const [docCourseId, setDocCourseId] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [docComments, setDocComments] = useState('');
  const [docTags, setDocTags] = useState('');

  // Replace Form states
  const [replaceFile, setReplaceFile] = useState<File | null>(null);

  const queryClient = useQueryClient();

  // Load filter lists
  const { data: semesters = [] } = useQuery<Semester[]>({
    queryKey: ['semesters'],
    queryFn: () => api.getSemesters(),
  });

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => api.getCourses(),
  });

  // Query documents with filter parameters
  const params: Record<string, string> = {};
  if (search.trim()) params.search = search.trim();
  if (categoryFilter) params.category = categoryFilter;
  if (courseFilter) params.courseId = courseFilter;
  if (semesterFilter) params.semesterId = semesterFilter;

  const { data: documents = [], isLoading } = useQuery<DocumentItem[]>({
    queryKey: ['documents', params],
    queryFn: () => api.getDocuments(params),
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Please select a file');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', docTitle.trim() || file.name);
      formData.append('category', docCategory);
      if (docSemesterId) formData.append('semesterId', docSemesterId);
      if (docCourseId) formData.append('courseId', docCourseId);
      if (docDescription) formData.append('description', docDescription.trim());
      if (docComments) formData.append('comments', docComments.trim());
      if (docTags) {
        const tagArray = docTags.split(',').map((t) => t.trim()).filter(Boolean);
        formData.append('tags', JSON.stringify(tagArray));
      }
      return api.uploadDocument(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsUploadOpen(false);
      setFile(null);
      setDocTitle('');
      setDocDescription('');
      setDocTags('');
    },
  });

  const replaceMutation = useMutation({
    mutationFn: async () => {
      if (!replaceTarget || !replaceFile) throw new Error('Please select a replacement file');
      const formData = new FormData();
      formData.append('file', replaceFile);
      return api.replaceDocument(replaceTarget.id, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setReplaceTarget(null);
      setReplaceFile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Academic Document Workspace
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Secure local document archive with PDF annotation engine and Google Drive-style categorization.
          </p>
        </div>

        <button
          onClick={() => {
            setFile(null);
            setDocTitle('');
            setIsUploadOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-[0.98] transition-all self-start sm:self-auto"
        >
          <Upload className="h-4 w-4" />
          Upload Document
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or filename..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="">All Categories</option>
          {DOCUMENT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Course Filter */}
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="">All Courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
          ))}
        </select>

        {/* Semester Filter */}
        <select
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="">All Semesters</option>
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Category Pills Quick Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setCategoryFilter('')}
          className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors font-medium ${
            categoryFilter === ''
              ? 'bg-indigo-600 text-white font-semibold'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          All
        </button>
        {DOCUMENT_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat === categoryFilter ? '' : cat)}
            className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors font-medium ${
              categoryFilter === cat
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Document Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
          <FolderOpen className="h-10 w-10 mx-auto text-slate-400 mb-3" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">No documents found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Upload course slides, past exam questions, or research papers to begin organizing your academic documents.
          </p>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => {
            const catStyle = CATEGORY_COLORS[doc.category] || CATEGORY_COLORS['Other Documents'];
            return (
              <div
                key={doc.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div>
                  {/* Category & Course Tag */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                    >
                      {doc.category}
                    </span>
                    {doc.course && (
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {doc.course.code}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <Link to={`/documents/${doc.id}/view`} className="block">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                      {doc.title}
                    </h3>
                  </Link>

                  {/* Original Filename & Metadata */}
                  <p className="text-[11px] text-slate-400 mt-1 truncate">
                    {doc.originalFilename}
                  </p>

                  {doc.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                      {doc.description}
                    </p>
                  )}

                  {/* Tags */}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {doc.tags.map((t) => (
                        <span
                          key={t.tag.id}
                          className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500"
                        >
                          #{t.tag.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Page Count & Size Info */}
                  <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
                    <span>{doc.pageCount} pages</span>
                    <span>•</span>
                    <span>{formatBytes(doc.fileSize)}</span>
                    {doc._count && (doc._count.bookmarks > 0 || doc._count.annotations > 0) && (
                      <>
                        <span>•</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                          {doc._count.annotations} highlights
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <a
                      href={`/api/documents/${doc.id}/download`}
                      download
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 transition-colors"
                      title="Download File"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => setReplaceTarget(doc)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 transition-colors"
                      title="Replace with updated version"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${doc.title}"? The physical file will also be removed safely.`)) {
                          deleteMutation.mutate(doc.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <Link
                    to={`/documents/${doc.id}/view`}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Study Workspace
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* UPLOAD MODAL */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Upload Academic Document</h3>
              <button onClick={() => setIsUploadOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  File (PDF, Word, Slides, Text) *
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setFile(f);
                    if (f && !docTitle) setDocTitle(f.name.replace(/\.[^/.]+$/, ''));
                  }}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Midterm 2026 Question Paper"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Category *</label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {DOCUMENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Course</label>
                  <select
                    value={docCourseId}
                    onChange={(e) => {
                      setDocCourseId(e.target.value);
                      const course = courses.find((c) => c.id === e.target.value);
                      if (course?.semesterId) setDocSemesterId(course.semesterId);
                    }}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">None (General)</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={docTags}
                  onChange={(e) => setDocTags(e.target.value)}
                  placeholder="e.g. Cryptography, High Yield, 2025 Midterm"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="Summary or context..."
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => uploadMutation.mutate()}
                disabled={uploadMutation.isPending || !file}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPLACE FILE MODAL */}
      {replaceTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Replace Document File</h3>
              <p className="text-xs text-slate-500 mt-1">
                Replace <strong>{replaceTarget.title}</strong> with a newer version. Existing annotations and bookmarks will be preserved.
              </p>
            </div>

            <div className="text-xs">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Select Replacement File *</label>
              <input
                type="file"
                required
                onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReplaceTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => replaceMutation.mutate()}
                disabled={replaceMutation.isPending || !replaceFile}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
              >
                {replaceMutation.isPending ? 'Replacing...' : 'Confirm Replace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
