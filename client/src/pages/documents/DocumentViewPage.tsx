import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Bookmark,
  Highlighter,
  MessageSquare,
  Search,
  Download,
  Info,
  ArrowLeft,
  FileText,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  FolderOpen,
  Layers,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate, formatBytes, DOCUMENT_CATEGORIES } from '../../lib/utils';
import { DocumentItem, DocumentBookmark, DocumentAnnotation } from '../../types';

// Set PDF.js worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('PDF worker setup:', e);
}

export const DocumentViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Document state
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // UI state
  const [activeSidebarTab, setActiveSidebarTab] = useState<'annotations' | 'bookmarks' | 'notes' | 'info'>('annotations');
  const [leftNavOpen, setLeftNavOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  // Highlight tool state
  const [highlightColor, setHighlightColor] = useState('#fde047'); // yellow
  const [annotationComment, setAnnotationComment] = useState('');
  const [selectedTextSnippet, setSelectedTextSnippet] = useState('');
  const [isAnnotating, setIsAnnotating] = useState(false);

  // Search in PDF
  const [pdfSearchQuery, setPdfSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

  // Bookmark form
  const [newBookmarkTitle, setNewBookmarkTitle] = useState('');

  // Page Note
  const [pageNoteText, setPageNoteText] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch document metadata & sibling documents in same course
  const { data: document, isLoading: docLoading } = useQuery<DocumentItem>({
    queryKey: ['document', id],
    queryFn: () => api.getDocument(id!),
    enabled: !!id,
  });

  const { data: siblingDocuments = [] } = useQuery<DocumentItem[]>({
    queryKey: ['documents', { courseId: document?.courseId }],
    queryFn: () => api.getDocuments(document?.courseId ? { courseId: document.courseId } : {}),
    enabled: !!document?.courseId,
  });

  // Bookmarks & Annotations
  const { data: bookmarks = [], refetch: refetchBookmarks } = useQuery<DocumentBookmark[]>({
    queryKey: ['bookmarks', id],
    queryFn: () => api.getBookmarks(id!),
    enabled: !!id,
  });

  const { data: annotations = [], refetch: refetchAnnotations } = useQuery<DocumentAnnotation[]>({
    queryKey: ['annotations', id],
    queryFn: () => api.getAnnotations(id!),
    enabled: !!id,
  });

  // Load PDF Document via array buffer
  useEffect(() => {
    if (!id) return;
    setLoadingPdf(true);
    setPdfError(null);

    const pdfUrl = `/api/documents/${id}/file`;
    const loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
      cMapPacked: true,
    });

    loadingTask.promise
      .then((loadedPdf) => {
        setPdfDoc(loadedPdf);
        setNumPages(loadedPdf.numPages);
        // Resume from lastOpenedPage if available
        const initialPage = document?.lastOpenedPage && document.lastOpenedPage <= loadedPdf.numPages
          ? document.lastOpenedPage
          : 1;
        setCurrentPage(initialPage);
        setLoadingPdf(false);
      })
      .catch((err) => {
        console.error('Error loading PDF document:', err);
        setPdfError('Failed to load PDF file. It might be corrupt or an unsupported file type.');
        setLoadingPdf(false);
      });

    return () => {
      try {
        loadingTask.destroy();
      } catch {
        // ignore
      }
    };
  }, [id, document?.lastOpenedPage]);

  // Render current PDF page on canvas
  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        // Save last opened page in database
        if (id) {
          api.updateDocument(id, { lastOpenedPage: pageNum }).catch(() => {});
        }
      } catch (err) {
        console.error('Error rendering page:', err);
      }
    },
    [pdfDoc, scale, id]
  );

  useEffect(() => {
    if (pdfDoc && !loadingPdf) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale, loadingPdf, renderPage]);

  // Page navigation helpers
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (currentPage < numPages) setCurrentPage((p) => p + 1);
  };

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 3.0));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.6));
  const handleFitWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 64;
      setScale(Math.max(containerWidth / 612, 0.8));
    }
  };

  // Text selection in document for annotation
  const handleMouseUp = () => {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';
    if (text) {
      setSelectedTextSnippet(text);
      setIsAnnotating(true);
    }
  };

  // Create Highlight / Annotation
  const handleSaveAnnotation = async () => {
    if (!id) return;
    try {
      await api.createAnnotation(id, {
        pageNumber: currentPage,
        type: 'highlight',
        color: highlightColor,
        selectedText: selectedTextSnippet || 'Page Highlight',
        comment: annotationComment.trim() || null,
      });
      refetchAnnotations();
      setIsAnnotating(false);
      setAnnotationComment('');
      setSelectedTextSnippet('');
    } catch (err) {
      console.error('Failed to create annotation:', err);
    }
  };

  // Add Bookmark
  const handleAddBookmark = async () => {
    if (!id || !newBookmarkTitle.trim()) return;
    try {
      await api.createBookmark(id, {
        pageNumber: currentPage,
        title: newBookmarkTitle.trim(),
        color: '#f59e0b',
      });
      refetchBookmarks();
      setNewBookmarkTitle('');
    } catch (err) {
      console.error('Failed to add bookmark:', err);
    }
  };

  // Delete Bookmark
  const handleDeleteBookmark = async (bId: string) => {
    if (!id) return;
    try {
      await api.deleteBookmark(id, bId);
      refetchBookmarks();
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
    }
  };

  // Delete Annotation
  const handleDeleteAnnotation = async (aId: string) => {
    if (!id) return;
    try {
      await api.deleteAnnotation(id, aId);
      refetchAnnotations();
    } catch (err) {
      console.error('Failed to delete annotation:', err);
    }
  };

  // Text search inside PDF
  const handlePdfSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfDoc || !pdfSearchQuery.trim()) return;

    const query = pdfSearchQuery.toLowerCase();
    const matches: number[] = [];

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .toLowerCase();

      if (pageText.includes(query)) {
        matches.push(i);
      }
    }

    setSearchMatches(matches);
    setCurrentMatchIdx(0);
    if (matches.length > 0) {
      setCurrentPage(matches[0]);
    }
  };

  const currentPageAnnotations = annotations.filter((a) => a.pageNumber === currentPage);
  const isCurrentPageBookmarked = bookmarks.some((b) => b.pageNumber === currentPage);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-900 select-none">
      {/* LEFT SIDEBAR: Course Documents Switcher & Page Navigation */}
      <div
        className={`flex flex-col border-r border-slate-800 bg-slate-950 transition-all duration-300 z-10 ${
          leftNavOpen ? 'w-64' : 'w-0 overflow-hidden'
        }`}
      >
        <div className="p-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <Link
            to="/documents"
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Documents Library</span>
          </Link>
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
            {document?.category}
          </span>
        </div>

        {/* Current Document Header */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-xs font-bold text-white truncate" title={document?.title}>
            {document?.title}
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            {document?.course ? `${document.course.code} • ` : ''}
            {document?.originalFilename}
          </p>
        </div>

        {/* Course Documents List (Switcher) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Course Materials ({siblingDocuments.length})
          </div>
          {siblingDocuments.map((sDoc) => (
            <button
              key={sDoc.id}
              onClick={() => {
                if (sDoc.id !== id) navigate(`/documents/${sDoc.id}/view`);
              }}
              className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-colors ${
                sDoc.id === id
                  ? 'bg-indigo-600/20 text-indigo-400 font-semibold border border-indigo-500/30'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate flex-1">{sDoc.title}</span>
            </button>
          ))}
        </div>

        {/* Page Jumper */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 text-xs text-slate-400">
          <div className="flex items-center justify-between mb-2">
            <span>Pages Quick Jump</span>
            <span>{currentPage} / {numPages}</span>
          </div>
          <div className="grid grid-cols-5 gap-1 max-h-32 overflow-y-auto">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => {
              const hasAnnotation = annotations.some((a) => a.pageNumber === p);
              const hasBookmark = bookmarks.some((b) => b.pageNumber === p);
              return (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`h-7 rounded text-[11px] font-medium transition-colors relative ${
                    currentPage === p
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {p}
                  {hasBookmark && (
                    <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
                  )}
                  {hasAnnotation && (
                    <span className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-yellow-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CENTER WORKSPACE: PDF Viewer & Control Toolbar */}
      <div className="flex flex-1 flex-col overflow-hidden bg-slate-900">
        {/* Top Floating Control Bar */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 text-xs text-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLeftNavOpen((o) => !o)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Toggle Document Navigator"
            >
              <FolderOpen className="h-4 w-4" />
            </button>

            {/* Page Navigation */}
            <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg p-0.5">
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-1 rounded text-slate-300 hover:bg-slate-700 disabled:opacity-30"
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center px-2 text-xs font-semibold">
                <span>{currentPage}</span>
                <span className="text-slate-500 mx-1">/</span>
                <span>{numPages}</span>
              </div>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= numPages}
                className="p-1 rounded text-slate-300 hover:bg-slate-700 disabled:opacity-30"
                title="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg p-0.5">
              <button
                onClick={handleZoomOut}
                className="p-1 rounded text-slate-300 hover:bg-slate-700"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="px-2 text-[11px] font-mono text-slate-300">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 rounded text-slate-300 hover:bg-slate-700"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={handleFitWidth}
                className="px-2 py-0.5 text-[10px] rounded hover:bg-slate-700 text-slate-300 font-medium"
              >
                Fit Width
              </button>
            </div>

            {/* Scanned vs Searchable Notice */}
            {document?.isScanned ? (
              <span className="hidden lg:flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/60 border border-amber-900/60 px-2 py-0.5 rounded">
                <AlertCircle className="h-3 w-3" />
                Scanned PDF (OCR Ready)
              </span>
            ) : (
              <span className="hidden lg:flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-900/60 px-2 py-0.5 rounded">
                <Check className="h-3 w-3" />
                Searchable Vector Text
              </span>
            )}
          </div>

          {/* Search inside PDF input */}
          <form onSubmit={handlePdfSearch} className="hidden sm:flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={pdfSearchQuery}
              onChange={(e) => setPdfSearchQuery(e.target.value)}
              placeholder="Find in PDF..."
              className="bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none w-28 sm:w-36"
            />
            {searchMatches.length > 0 && (
              <span className="text-[10px] text-indigo-400 font-semibold px-1">
                {searchMatches.length} pages
              </span>
            )}
          </form>

          {/* Right Action Tools */}
          <div className="flex items-center gap-1.5">
            {/* Quick Bookmark toggle */}
            <button
              onClick={() => {
                if (isCurrentPageBookmarked) {
                  const b = bookmarks.find((item) => item.pageNumber === currentPage);
                  if (b) handleDeleteBookmark(b.id);
                } else {
                  setNewBookmarkTitle(`Page ${currentPage} Key Section`);
                  setActiveSidebarTab('bookmarks');
                }
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                isCurrentPageBookmarked
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
              title="Bookmark Page"
            >
              <Bookmark className="h-4 w-4" />
            </button>

            {/* Quick Highlight Tool */}
            <button
              onClick={() => {
                setIsAnnotating(true);
                setActiveSidebarTab('annotations');
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                isAnnotating
                  ? 'bg-yellow-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
              title="Highlight Tool"
            >
              <Highlighter className="h-4 w-4" />
            </button>

            {/* Download */}
            <a
              href={`/api/documents/${id}/download`}
              download
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Download File"
            >
              <Download className="h-4 w-4" />
            </a>

            {/* Toggle Right Drawer */}
            <button
              onClick={() => setRightSidebarOpen((o) => !o)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Toggle Notes & Annotations"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* PDF Canvas Viewport Container */}
        <div
          ref={containerRef}
          onMouseUp={handleMouseUp}
          className="relative flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center bg-slate-900/90"
        >
          {loadingPdf && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs space-y-2">
              <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span>Rendering PDF document...</span>
            </div>
          )}

          {pdfError && (
            <div className="flex flex-col items-center justify-center h-full text-rose-400 text-xs p-6 text-center max-w-md">
              <AlertCircle className="h-8 w-8 text-rose-500 mb-2" />
              <p className="font-semibold">{pdfError}</p>
              <a
                href={`/api/documents/${id}/download`}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Download Original File Instead
              </a>
            </div>
          )}

          {/* Active Canvas */}
          <div className="relative shadow-2xl rounded-sm overflow-hidden bg-white">
            <canvas ref={canvasRef} className="block" />

            {/* Persistent Visual Highlights Overlay */}
            {currentPageAnnotations.map((anno) => (
              <div
                key={anno.id}
                className="absolute pointer-events-auto rounded cursor-pointer group"
                style={{
                  top: '12%',
                  left: '8%',
                  width: '84%',
                  backgroundColor: `${anno.color}33`,
                  borderBottom: `2px solid ${anno.color}`,
                }}
                title={anno.comment || anno.selectedText || 'Highlight'}
              >
                {anno.comment && (
                  <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 z-30 p-2 rounded bg-slate-950 text-white text-[11px] max-w-xs shadow-lg">
                    {anno.comment}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Highlight Floating Action Prompt (if text was selected) */}
        {selectedTextSnippet && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-slate-950 border border-slate-700 shadow-2xl p-3 rounded-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center gap-1.5">
              {['#fde047', '#86efac', '#93c5fd', '#f472b6', '#fb923c'].map((color) => (
                <button
                  key={color}
                  onClick={() => setHighlightColor(color)}
                  className={`h-5 w-5 rounded-full transition-transform ${
                    highlightColor === color ? 'scale-125 ring-2 ring-white' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <input
              type="text"
              value={annotationComment}
              onChange={(e) => setAnnotationComment(e.target.value)}
              placeholder="Add optional note/comment..."
              className="bg-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none w-48 sm:w-64"
            />
            <button
              onClick={handleSaveAnnotation}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
            >
              Save Highlight
            </button>
            <button
              onClick={() => setSelectedTextSnippet('')}
              className="p-1 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR: Notes, Bookmarks, Annotations & Metadata */}
      <div
        className={`flex flex-col border-l border-slate-800 bg-slate-950 transition-all duration-300 z-10 ${
          rightSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
        }`}
      >
        {/* Right Tab Headers */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 p-1 text-xs">
          {[
            { id: 'annotations', label: `Highlights (${annotations.length})`, icon: Highlighter },
            { id: 'bookmarks', label: `Bookmarks (${bookmarks.length})`, icon: Bookmark },
            { id: 'info', label: 'Info', icon: Info },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSidebarTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium transition-colors ${
                  activeSidebarTab === tab.id
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: ANNOTATIONS & HIGHLIGHTS */}
        {activeSidebarTab === 'annotations' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Quick Add Annotation Box */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 text-xs">
              <span className="font-semibold text-white block">Add Highlight to Page {currentPage}</span>
              <div className="flex items-center gap-2">
                {['#fde047', '#86efac', '#93c5fd', '#f472b6', '#fb923c'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setHighlightColor(c)}
                    className={`h-4 w-4 rounded-full transition-transform ${
                      highlightColor === c ? 'scale-125 ring-2 ring-white' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <textarea
                rows={2}
                value={annotationComment}
                onChange={(e) => setAnnotationComment(e.target.value)}
                placeholder="Write a comment or key formula..."
                className="w-full rounded-lg bg-slate-800 border border-slate-700 p-2 text-white placeholder:text-slate-500 focus:outline-none"
              />
              <button
                onClick={handleSaveAnnotation}
                className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
              >
                Save Annotation
              </button>
            </div>

            {/* Annotations List */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                Saved Highlights
              </span>
              {annotations.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No highlights created yet.</p>
              ) : (
                annotations.map((anno) => (
                  <div
                    key={anno.id}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setCurrentPage(anno.pageNumber)}
                        className="flex items-center gap-1.5 font-bold text-indigo-400 hover:underline"
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: anno.color }}
                        />
                        Page {anno.pageNumber}
                      </button>
                      <button
                        onClick={() => handleDeleteAnnotation(anno.id)}
                        className="text-slate-500 hover:text-rose-400"
                        title="Remove highlight"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {anno.selectedText && (
                      <p className="text-slate-300 italic bg-slate-800/40 p-1.5 rounded text-[11px] border-l-2 border-indigo-500">
                        "{anno.selectedText}"
                      </p>
                    )}

                    {anno.comment && (
                      <p className="text-slate-200 font-medium">{anno.comment}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BOOKMARKS */}
        {activeSidebarTab === 'bookmarks' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Create Bookmark on current page */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <span className="font-semibold text-white block">Bookmark Page {currentPage}</span>
              <input
                type="text"
                value={newBookmarkTitle}
                onChange={(e) => setNewBookmarkTitle(e.target.value)}
                placeholder="e.g. Raft Leader Election Algorithm"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 p-2 text-white placeholder:text-slate-500 focus:outline-none"
              />
              <button
                onClick={handleAddBookmark}
                disabled={!newBookmarkTitle.trim()}
                className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs disabled:opacity-50"
              >
                + Add Bookmark
              </button>
            </div>

            {/* Bookmarks List */}
            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                Saved Bookmarks ({bookmarks.length})
              </span>
              {bookmarks.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No bookmarks saved for this PDF.</p>
              ) : (
                bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <button
                      onClick={() => setCurrentPage(bm.pageNumber)}
                      className="flex items-center gap-2 text-left truncate flex-1 hover:text-amber-400"
                    >
                      <Bookmark className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-white block truncate">{bm.title}</span>
                        <span className="text-[10px] text-slate-400">Page {bm.pageNumber}</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleDeleteBookmark(bm.id)}
                      className="text-slate-500 hover:text-rose-400 ml-2"
                      title="Delete bookmark"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DOCUMENT METADATA INFO */}
        {activeSidebarTab === 'info' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-300">
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Document Title
                </span>
                <p className="font-semibold text-white mt-0.5">{document?.title}</p>
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Category
                </span>
                <p className="font-medium text-indigo-400 mt-0.5">{document?.category}</p>
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Course & Term
                </span>
                <p className="font-medium text-white mt-0.5">
                  {document?.course ? `${document.course.code} - ${document.course.title}` : 'Independent'}
                </p>
                {document?.semester && (
                  <p className="text-slate-400 text-[11px] mt-0.5">{document.semester.name}</p>
                )}
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                  File Details
                </span>
                <p className="text-slate-400 mt-0.5">Size: {formatBytes(document?.fileSize || 0)}</p>
                <p className="text-slate-400">Pages: {numPages}</p>
                <p className="text-slate-400">Uploaded: {formatDate(document?.createdAt, 'MMM d, yyyy')}</p>
                <p className="text-slate-400 truncate">Stored: {document?.storedFilename}</p>
              </div>

              {document?.comments && (
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                    Personal Comments
                  </span>
                  <p className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 mt-1">
                    {document.comments}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
