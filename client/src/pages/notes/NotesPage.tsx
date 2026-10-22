import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Plus,
  Pin,
  Search,
  Check,
  RefreshCw,
  AlertCircle,
  Trash2,
  Tag,
  Link as LinkIcon,
  Share2,
  Folder,
  FolderPlus,
  History,
  Download,
  Sparkles,
  Archive,
  ArchiveRestore,
  Filter,
  GraduationCap,
  BookOpen,
  ArrowUpDown,
  X,
  RotateCcw,
  ChevronLeft,
} from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { resolveNoteRoute } from '../../lib/noteRoute';
import { Note, Course, Semester, NoteFolder, NoteRevision } from '../../types';
import { ShareModal } from '../../components/sharing/ShareModal';
import { useActiveSemester } from '../../hooks/useActiveSemester';
import { AcademicMetadataBar } from '../../components/editor/AcademicMetadataBar';
import { htmlToPlainText } from '../../lib/noteContent';
import { WordEditor } from '../../components/editor/WordEditor';

type NoteLoadStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'not_found' }
  | { kind: 'denied' }
  | { kind: 'network'; message: string }
  | { kind: 'invalid_relationship'; note: Note };

interface LocalDraft {
  html: string;
  json: string | null;
}

const draftKey = (noteId: string) => `scholarflow_unsaved_note_${noteId}`;

function readLocalDraft(noteId: string): LocalDraft | null {
  const raw = localStorage.getItem(draftKey(noteId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.html === 'string') {
      return { html: parsed.html, json: typeof parsed.json === 'string' ? parsed.json : null };
    }
  } catch {
    // Legacy drafts stored raw HTML strings.
  }
  return { html: raw, json: null };
}

function writeLocalDraft(noteId: string, draft: LocalDraft): void {
  try {
    localStorage.setItem(draftKey(noteId), JSON.stringify(draft));
  } catch {
    localStorage.setItem(draftKey(noteId), draft.html);
  }
}

export const NotesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const routeParams = useParams<{ id?: string; noteId?: string; semesterId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // /semesters/:id/notes/:noteId puts the SEMESTER in `id` and the NOTE in `noteId`.
  // /notes/:id puts the NOTE in `id`. Resolve both without confusing the two.
  const { isSemesterScoped: isSemesterScopedRoute, routeSemesterId, requestedNoteId } =
    React.useMemo(
      () => resolveNoteRoute(location.pathname, routeParams, searchParams),
      [location.pathname, routeParams, searchParams]
    );
  const { activeSemesterId } = useActiveSemester();

  // Full-screen (distraction-free) editor mode
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Sidebar Filter & Sort states
  const [search, setSearch] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<string>(routeSemesterId || activeSemesterId || '');
  const [courseFilter, setCourseFilter] = useState<string>('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [orphanOnly, setOrphanOnly] = useState(false);
  const [viewArchived, setViewArchived] = useState(false);
  const [sortBy, setSortBy] = useState<'modified' | 'created' | 'title'>('modified');

  // Active Note Editor states
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [noteStatus, setNoteStatus] = useState<NoteLoadStatus>({ kind: 'idle' });
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentJson, setContentJson] = useState<string>('');
  const [noteSemesterId, setNoteSemesterId] = useState<string>('');
  const [noteCourseId, setNoteCourseId] = useState<string>('');
  const [noteFolderId, setNoteFolderId] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync route semester ID when navigating
  useEffect(() => {
    if (routeSemesterId) {
      setSemesterFilter(routeSemesterId);
    }
  }, [routeSemesterId]);

  // Local draft recovery state
  const [localDraft, setLocalDraft] = useState<{ html: string; json: string | null } | null>(null);

  // Modals & Panels
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#6366f1');

  const queryClient = useQueryClient();
  const debounceTimerRef = useRef<any>(null);
  const activeNoteIdRef = useRef<string | null>(null);

  // Keep a ref of the currently selected note id so in-flight autosaves never
  // overwrite a note the user has since switched away from.
  useEffect(() => {
    activeNoteIdRef.current = activeNote?.id ?? null;
  }, [activeNote?.id]);

  // 1. Load Semesters
  const { data: semesters = [] } = useQuery<Semester[]>({
    queryKey: ['semesters'],
    queryFn: () => api.getSemesters(),
  });

  // 2. Load Courses (scoped to filter or all)
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => api.getCourses(),
  });

  // Filter courses for sidebar based on selected semester filter
  const sidebarCourses = useMemo(() => {
    if (!semesterFilter) return courses;
    return courses.filter((c) => c.semesterId === semesterFilter);
  }, [courses, semesterFilter]);

  // 3. Load Folders
  const { data: folders = [] } = useQuery<NoteFolder[]>({
    queryKey: ['noteFolders'],
    queryFn: () => api.getNoteFolders(),
  });

  // 4. Query notes with search, course, folder, semester, and archive filters
  const params: Record<string, string> = {};
  if (search.trim()) params.search = search.trim();
  if (courseFilter) params.courseId = courseFilter;
  if (selectedFolderId) params.folderId = selectedFolderId;
  if (semesterFilter && !courseFilter) params.semesterId = semesterFilter;
  if (viewArchived) params.isArchived = 'true';

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ['notes', params, orphanOnly, viewArchived],
    queryFn: async () => {
      if (orphanOnly) {
        return api.getOrphanNotes();
      }
      return api.getNotes(params);
    },
  });

  // 5. Sorted notes
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      // Pinned notes always first (unless in archive view)
      if (!viewArchived) {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
      }

      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'created') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes, sortBy, viewArchived]);

  const notesById = useMemo(() => {
    const map = new Map<string, Note>();
    notes.forEach((n) => map.set(n.id, n));
    return map;
  }, [notes]);

  // Revisions query for active note
  const { data: revisions = [], isLoading: revisionsLoading } = useQuery<NoteRevision[]>({
    queryKey: ['noteRevisions', activeNote?.id],
    queryFn: () => (activeNote ? api.getNoteRevisions(activeNote.id) : Promise.resolve([])),
    enabled: isRevisionModalOpen && !!activeNote,
  });

  // Dedicated detail query, used only when the requested note is not present in
  // the (filtered) list — e.g. an archived note or a direct deep-link. Keeping a
  // distinct cache key lets us tell "not found" apart from a network failure and
  // prevents an older response from overwriting the currently selected note.
  const detailQuery = useQuery<Note, ApiError>({
    queryKey: ['note', requestedNoteId],
    queryFn: () => api.getNote(requestedNoteId as string),
    enabled: !!requestedNoteId && !notesById.has(requestedNoteId) && !isLoading,
    retry: false,
    staleTime: 30_000,
  });

  const listNote = requestedNoteId ? notesById.get(requestedNoteId) : undefined;
  const detailNote =
    detailQuery.data && detailQuery.data.id === requestedNoteId ? detailQuery.data : undefined;
  const resolvedNote = listNote || detailNote;

  const applyNoteToEditor = useCallback((note: Note) => {
    versionRef.current = { id: note.id, version: note.version };
    setActiveNote(note);
    setTitle(note.title || '');
    setContent(note.content || '');
    setContentJson(note.contentJson || '');
    setNoteSemesterId(note.semesterId || '');
    setNoteCourseId(note.courseId || '');
    setNoteFolderId(note.folderId || '');
    try {
      setTags(note.tags ? JSON.parse(note.tags) : []);
    } catch {
      setTags([]);
    }
    setSaveStatus('saved');
    setErrorMessage(null);

    // Check for unsaved local draft recovery
    const savedDraft = readLocalDraft(note.id);
    const draftIsNewer =
      !!savedDraft &&
      (savedDraft.html !== (note.content || '') || (savedDraft.json ?? '') !== (note.contentJson || ''));
    setLocalDraft(draftIsNewer ? savedDraft : null);
  }, []);

  // Resolve the note referenced by the URL (or fall back to the first note).
  useEffect(() => {
    if (!requestedNoteId) {
      setNoteStatus({ kind: 'idle' });
      if (sortedNotes.length > 0) {
        const first = sortedNotes[0];
        if (first.id !== activeNote?.id) applyNoteToEditor(first);
      } else {
        setActiveNote(null);
      }
      return;
    }

    if (resolvedNote) {
      // Semester-scoped routing must never silently load a note from a different semester.
      if (routeSemesterId && resolvedNote.semesterId && resolvedNote.semesterId !== routeSemesterId) {
        setNoteStatus({ kind: 'invalid_relationship', note: resolvedNote });
        return;
      }
      if (resolvedNote.id !== activeNote?.id) applyNoteToEditor(resolvedNote);
      setNoteStatus({ kind: 'ready' });
      return;
    }

    if (isLoading || detailQuery.isLoading) {
      setNoteStatus({ kind: 'loading' });
      return;
    }

    if (detailQuery.isError) {
      const status = detailQuery.error?.statusCode;
      if (status === 403) {
        setNoteStatus({ kind: 'denied' });
      } else if (status === 404) {
        setNoteStatus({ kind: 'not_found' });
      } else {
        setNoteStatus({
          kind: 'network',
          message: detailQuery.error?.message || 'Unable to reach the server.',
        });
      }
      setActiveNote(null);
      return;
    }

    setNoteStatus({ kind: 'loading' });
  }, [
    requestedNoteId,
    resolvedNote,
    isLoading,
    detailQuery.isLoading,
    detailQuery.isError,
    detailQuery.error,
    sortedNotes,
    activeNote?.id,
    routeSemesterId,
    applyNoteToEditor,
  ]);

  // Retry a transient detail fetch failure
  const retryLoadNote = useCallback(() => {
    setNoteStatus({ kind: 'loading' });
    if (requestedNoteId) {
      queryClient.removeQueries({ queryKey: ['note', requestedNoteId] });
    }
  }, [queryClient, requestedNoteId]);

  // Select note handler for clicks with URL synchronization
  const selectNote = useCallback(
    (n: Note) => {
      applyNoteToEditor(n);

      // Sync URL with the note's real, persisted identifiers. A semester-scoped
      // URL is only used when the note actually belongs to a semester, so the
      // route can never disagree with the note's relationship.
      if (isSemesterScopedRoute && n.semesterId) {
        navigate(`/semesters/${n.semesterId}/notes/${n.id}`, { replace: false });
      } else {
        navigate(`/notes/${n.id}`, { replace: false });
      }
    },
    [applyNoteToEditor, isSemesterScopedRoute, navigate]
  );

  // Warn before navigating away if changes are unsaved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved' || saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  // Full-screen mode: lock background scroll and support Escape to exit.
  useEffect(() => {
    if (!isFullScreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Let Escape dismiss an open modal first, then exit full screen.
      if (isRevisionModalOpen) {
        setIsRevisionModalOpen(false);
        return;
      }
      if (shareModalOpen) {
        setShareModalOpen(false);
        return;
      }
      if (isNewFolderModalOpen) {
        setIsNewFolderModalOpen(false);
        return;
      }
      setIsFullScreen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullScreen, isRevisionModalOpen, shareModalOpen, isNewFolderModalOpen]);

  // Create Note mutation
  const createNoteMutation = useMutation({
    mutationFn: (initialData?: { title?: string; content?: string; courseId?: string; semesterId?: string }) => {
      const targetSemester = initialData?.semesterId || semesterFilter || activeSemesterId || null;
      let targetCourse = initialData?.courseId || courseFilter || null;

      // Verify course belongs to semester if both specified
      if (targetCourse && targetSemester) {
        const match = courses.some((c) => c.id === targetCourse && c.semesterId === targetSemester);
        if (!match) targetCourse = null;
      }

      return api.createNote({
        title: initialData?.title || 'Untitled Academic Note',
        content: initialData?.content || '<h1>Untitled Note</h1><p>Start writing your lecture summary or exam notes...</p>',
        semesterId: targetSemester,
        courseId: targetCourse,
        folderId: selectedFolderId || null,
      });
    },
    onSuccess: (newNote: Note) => {
      // Navigate to the note's actual persisted ID and prime both caches.
      queryClient.setQueryData(['note', newNote.id], newNote);
      applyNoteToEditor(newNote);
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (isSemesterScopedRoute && newNote.semesterId) {
        navigate(`/semesters/${newNote.semesterId}/notes/${newNote.id}`);
      } else {
        navigate(`/notes/${newNote.id}`);
      }
    },
  });

  // Create Folder mutation
  const createFolderMutation = useMutation({
    mutationFn: () => api.createNoteFolder({ name: newFolderName, color: newFolderColor }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['noteFolders'] });
      setIsNewFolderModalOpen(false);
      setNewFolderName('');
    },
  });

  // Restore Revision mutation
  const restoreRevisionMutation = useMutation({
    mutationFn: (revId: string) => {
      if (!activeNote) throw new Error('No active note');
      return api.restoreNoteRevision(activeNote.id, revId);
    },
    onSuccess: (updated: Note) => {
      applyNoteToEditor(updated);
      queryClient.setQueryData(['note', updated.id], updated);
      setIsRevisionModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  // Toggle Pin
  const togglePinMutation = useMutation({
    mutationFn: (id: string) => api.toggleNotePin(id),
    onSuccess: (updated: Note) => {
      queryClient.setQueryData(['note', updated.id], updated);
      if (activeNote?.id === updated.id) {
        setActiveNote((prev) => (prev ? { ...prev, isPinned: updated.isPinned } : prev));
      }
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  // Toggle Archive
  const toggleArchiveMutation = useMutation({
    mutationFn: (id: string) => api.toggleNoteArchive(id),
    onSuccess: (updated: Note) => {
      queryClient.setQueryData(['note', updated.id], updated);
      if (activeNote?.id === updated.id) {
        setActiveNote((prev) => (prev ? { ...prev, isArchived: updated.isArchived } : prev));
      }
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  // Delete Note
  const deleteNoteMutation = useMutation({
    mutationFn: (id: string) => api.deleteNote(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ['note', id] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setActiveNote(null);
      if (isSemesterScopedRoute) {
        const semId = routeSemesterId || activeSemesterId;
        if (semId) navigate(`/semesters/${semId}/notes`);
        else navigate('/notes');
      } else {
        navigate('/notes');
      }
    },
  });

  // Autosave logic. Saves are serialised and always based on the newest server version we know,
  // otherwise fast typing sends a stale `expectedVersion` and the server answers 409.
  const versionRef = useRef<{ id: string; version: number } | null>(null);
  const savingRef = useRef(false);
  const pendingSaveRef = useRef<Parameters<typeof doSave> | null>(null);

  const doSave = useCallback(
    async (
      noteToSave: Note,
      newTitle: string,
      newContent: string,
      newContentJson: string,
      sId: string,
      cId: string,
      fId: string,
      tagList: string[]
    ) => {
      setSaveStatus('saving');
      setErrorMessage(null);
      // Capture the note version we are basing this write on, so a slow response
      // from an older edit can never overwrite a newer one.
      const known = versionRef.current;
      const baseVersion =
        known && known.id === noteToSave.id ? Math.max(known.version, noteToSave.version) : noteToSave.version;
      try {
        const updated = await api.updateNote(noteToSave.id, {
          title: newTitle.trim() || 'Untitled Academic Note',
          content: newContent,
          contentJson: newContentJson || null,
          semesterId: sId || null,
          courseId: cId || null,
          folderId: fId || null,
          tags: tagList,
          expectedVersion: baseVersion,
        });

        versionRef.current = { id: updated.id, version: updated.version };
        queryClient.setQueryData(['note', updated.id], updated);
        // Only push the server snapshot into the editor if the user has not
        // switched to a different note while this request was in flight.
        if (activeNoteIdRef.current === updated.id) {
          setActiveNote(updated);
          setSaveStatus('saved');
          setLocalDraft(null);
        }
        // Clear local unsaved draft upon successful cloud persistence
        localStorage.removeItem(draftKey(noteToSave.id));
        queryClient.invalidateQueries({ queryKey: ['notes'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      } catch (err: any) {
        console.error('Autosave failed:', err);
        setSaveStatus('error');
        setErrorMessage(err.message || 'Autosave failed. Check your network connection.');
        // Keep the latest content safe locally so nothing is lost on failure.
        writeLocalDraft(noteToSave.id, { html: newContent, json: newContentJson || null });
      }
    },
    [queryClient]
  );

  const performSave = useCallback(
    async (...args: Parameters<typeof doSave>) => {
      if (savingRef.current) {
        pendingSaveRef.current = args;
        return;
      }
      savingRef.current = true;
      try {
        await doSave(...args);
      } finally {
        savingRef.current = false;
      }
      const next = pendingSaveRef.current;
      pendingSaveRef.current = null;
      if (next) void performSave(...next);
    },
    [doSave]
  );

  // Trigger debounced autosave (1.2s delay)
  const triggerDebouncedSave = (
    newTitle: string,
    newContent: string,
    newContentJson: string,
    sId: string,
    cId: string,
    fId: string,
    tagList: string[]
  ) => {
    if (!activeNote) return;
    setSaveStatus('unsaved');
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      performSave(activeNote, newTitle, newContent, newContentJson, sId, cId, fId, tagList);
    }, 1200);
  };

  // Handlers
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    triggerDebouncedSave(newTitle, content, contentJson, noteSemesterId, noteCourseId, noteFolderId, tags);
  };

  const handleContentChange = (newHtml: string, newContentJson?: string) => {
    setContent(newHtml);
    const nextJson = newContentJson ?? contentJson;
    if (newContentJson !== undefined) setContentJson(newContentJson);
    triggerDebouncedSave(title, newHtml, nextJson, noteSemesterId, noteCourseId, noteFolderId, tags);
  };

  const handleSemesterChange = (newSemesterId: string) => {
    setNoteSemesterId(newSemesterId);
    let updatedCourseId = noteCourseId;
    if (noteCourseId) {
      const match = courses.some((c) => c.id === noteCourseId && c.semesterId === newSemesterId);
      if (!match) {
        updatedCourseId = '';
        setNoteCourseId('');
      }
    }
    triggerDebouncedSave(title, content, contentJson, newSemesterId, updatedCourseId, noteFolderId, tags);
  };

  const handleCourseChange = (newCourseId: string) => {
    setNoteCourseId(newCourseId);
    // If course belongs to a semester and no semester or mismatch, auto-derive semester
    if (newCourseId) {
      const targetCourse = courses.find((c) => c.id === newCourseId);
      if (targetCourse?.semesterId && targetCourse.semesterId !== noteSemesterId) {
        setNoteSemesterId(targetCourse.semesterId);
        triggerDebouncedSave(title, content, contentJson, targetCourse.semesterId, newCourseId, noteFolderId, tags);
        return;
      }
    }
    triggerDebouncedSave(title, content, contentJson, noteSemesterId, newCourseId, noteFolderId, tags);
  };

  const handleFolderChange = (newFolderId: string) => {
    setNoteFolderId(newFolderId);
    triggerDebouncedSave(title, content, contentJson, noteSemesterId, noteCourseId, newFolderId, tags);
  };

  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags);
    triggerDebouncedSave(title, content, contentJson, noteSemesterId, noteCourseId, noteFolderId, newTags);
  };

  const handleManualSave = () => {
    if (!activeNote) return;
    performSave(activeNote, title, content, contentJson, noteSemesterId, noteCourseId, noteFolderId, tags);
  };

  // Recover local draft
  const handleRecoverDraft = () => {
    if (localDraft && activeNote) {
      setContent(localDraft.html);
      if (localDraft.json) setContentJson(localDraft.json);
      triggerDebouncedSave(
        title,
        localDraft.html,
        localDraft.json || '',
        noteSemesterId,
        noteCourseId,
        noteFolderId,
        tags
      );
      setLocalDraft(null);
    }
  };

  const handleDiscardDraft = () => {
    if (activeNote) {
      localStorage.removeItem(`scholarflow_unsaved_note_${activeNote.id}`);
      setLocalDraft(null);
    }
  };

  // Active note semester & course names
  const activeSemester = semesters.find((s) => s.id === noteSemesterId);
  const activeCourse = courses.find((c) => c.id === noteCourseId);
  const academicSubtitle = activeSemester || activeCourse
    ? `${activeSemester?.name || 'Personal'} • ${activeCourse ? `${activeCourse.code} - ${activeCourse.title}` : 'No Course'}`
    : undefined;

  // Show a loading panel only while we genuinely have nothing to edit yet.
  const showLoading =
    !!requestedNoteId &&
    (!activeNote || activeNote.id !== requestedNoteId) &&
    (noteStatus.kind === 'loading' || noteStatus.kind === 'idle');

  return (
    <div
      className={`notes-root flex w-full overflow-hidden bg-[#f4f3f0] dark:bg-[#121212] ${
        isFullScreen
          ? 'fixed inset-0 z-50 h-dvh'
          : 'absolute inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0'
      }`}
    >
      {/* =========================================================================
          LEFT SIDEBAR: KNOWLEDGE BASE NOTES LIST & FILTERS
      ========================================================================= */}
      <aside
        className={`${
          isFullScreen ? 'hidden' : requestedNoteId ? 'hidden md:flex' : 'flex'
        } w-full md:w-72 xl:w-80 flex-col border-r border-[#e5e3df] dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0`}
      >
        {/* Header & Create Note button */}
        <div className="p-3.5 border-b border-[#e5e3df] dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#37352f] dark:text-white flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#0f6b57]" />
              <span>Knowledge Base</span>
            </h2>
            <p className="text-[11px] text-[#787774] dark:text-neutral-400">
              {sortedNotes.length} {viewArchived ? 'archived' : 'active'} {sortedNotes.length === 1 ? 'note' : 'notes'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => createNoteMutation.mutate()}
            className="btn-notion-primary text-xs flex items-center gap-1.5 py-1 px-2.5 shadow-xs"
            title="Create New Academic Document"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Note</span>
          </button>
        </div>

        {/* View Mode: Active vs Archived Toggle */}
        <div className="px-3 pt-2 pb-1 border-b border-[#e5e3df] dark:border-neutral-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-md w-full">
            <button
              type="button"
              onClick={() => setViewArchived(false)}
              className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                !viewArchived
                  ? 'bg-white dark:bg-neutral-700 text-[#0f6b57] dark:text-teal-300 shadow-2xs'
                  : 'text-[#787774] dark:text-neutral-400 hover:text-[#37352f]'
              }`}
            >
              Active Notes
            </button>
            <button
              type="button"
              onClick={() => setViewArchived(true)}
              className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                viewArchived
                  ? 'bg-white dark:bg-neutral-700 text-[#0f6b57] dark:text-teal-300 shadow-2xs'
                  : 'text-[#787774] dark:text-neutral-400 hover:text-[#37352f]'
              }`}
            >
              Archived
            </button>
          </div>
        </div>

        {/* Collection Folders Pill Bar */}
        <div className="px-3 py-1.5 border-b border-[#e5e3df] dark:border-neutral-800 flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => {
              setSelectedFolderId('');
              setOrphanOnly(false);
            }}
            className={`rounded px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors ${
              !selectedFolderId && !orphanOnly
                ? 'bg-teal-100 text-[#0f6b57] dark:bg-teal-950/60 dark:text-teal-300'
                : 'text-[#787774] hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
            }`}
          >
            All Folders
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setSelectedFolderId(f.id);
                setOrphanOnly(false);
              }}
              className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors ${
                selectedFolderId === f.id
                  ? 'bg-teal-100 text-[#0f6b57] dark:bg-teal-950/60 dark:text-teal-300'
                  : 'text-[#787774] hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
              }`}
            >
              <Folder className="h-3 w-3" style={{ color: f.color || '#6366f1' }} />
              <span>{f.name}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsNewFolderModalOpen(true)}
            className="p-1 text-neutral-400 hover:text-[#0f6b57]"
            title="Create New Folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Search & Academic Filter Controls */}
        <div className="p-3 border-b border-[#e5e3df] dark:border-neutral-800 space-y-2">
          {/* Search box */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title & document text..."
              className="w-full rounded-md border border-[#e5e3df] dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 pl-8 pr-7 py-1.5 text-xs text-[#37352f] dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#0f6b57]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Semester & Course Filters */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {/* Semester filter */}
            <select
              value={semesterFilter}
              onChange={(e) => {
                setSemesterFilter(e.target.value);
                setCourseFilter('');
              }}
              className="rounded-md border border-[#e5e3df] dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-2 py-1 text-[#37352f] dark:text-neutral-200 focus:outline-none truncate"
            >
              <option value="">All Semesters</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Course filter (strictly filtered to semester) */}
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="rounded-md border border-[#e5e3df] dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-2 py-1 text-[#37352f] dark:text-neutral-200 focus:outline-none truncate"
            >
              <option value="">All Courses</option>
              {sidebarCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>

          {/* Sort order */}
          <div className="flex items-center justify-between text-[11px] text-[#787774] dark:text-neutral-400 pt-0.5">
            <span className="flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" />
              <span>Sort by:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-[#37352f] dark:text-neutral-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="modified">Last Modified</option>
              <option value="created">Created Date</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Note Cards List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#e5e3df] dark:divide-neutral-800">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-md bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
              ))}
            </div>
          ) : sortedNotes.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#787774] dark:text-neutral-400">
              <FileText className="h-8 w-8 mx-auto text-neutral-300 dark:text-neutral-700 mb-2" />
              <p className="font-semibold text-[#37352f] dark:text-neutral-200">No notes found</p>
              <p className="mt-1 text-[11px]">
                {search || courseFilter || semesterFilter
                  ? 'Try clearing your filters or search query.'
                  : 'Get started by creating your first academic document.'}
              </p>
              <button
                type="button"
                onClick={() => createNoteMutation.mutate()}
                className="mt-3 text-[#0f6b57] dark:text-teal-400 font-semibold hover:underline"
              >
                + Create Blank Note
              </button>
            </div>
          ) : (
            sortedNotes.map((n) => {
              const isSelected = activeNote?.id === n.id;
              const cleanPreview = n.content
                ? htmlToPlainText(n.content).replace(/\s+/g, ' ')
                : 'Empty document';

              return (
                <div
                  key={n.id}
                  onClick={() => selectNote(n)}
                  className={`p-3 cursor-pointer transition-colors border-l-3 ${
                    isSelected
                      ? 'bg-teal-50/60 dark:bg-neutral-800/80 border-[#0f6b57]'
                      : 'border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <h3
                      className={`text-xs font-semibold truncate ${
                        isSelected
                          ? 'text-[#0f6b57] dark:text-teal-300'
                          : 'text-[#37352f] dark:text-neutral-200'
                      }`}
                    >
                      {n.title || 'Untitled Note'}
                    </h3>
                    {n.isPinned && (
                      <Pin className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
                    )}
                  </div>

                  <p className="text-[11px] text-[#787774] dark:text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                    {cleanPreview}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-[#787774] dark:text-neutral-500">
                    <span>{formatDate(n.updatedAt, 'MMM d, h:mm a')}</span>

                    <div className="flex items-center gap-1.5">
                      {n.course && (
                        <span
                          className="font-semibold px-1.5 py-0.5 rounded text-[10px]"
                          style={{
                            backgroundColor: (n.course.color || '#6366f1') + '15',
                            color: n.course.color || '#6366f1',
                          }}
                        >
                          {n.course.code}
                        </span>
                      )}
                      {n.semester && !n.course && (
                        <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                          {n.semester.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* =========================================================================
          RIGHT WORKSPACE: WORD-STYLE DOCUMENT EDITOR
      ========================================================================= */}
      <main
        className={`${
          !requestedNoteId && !isFullScreen ? 'hidden md:flex' : 'flex'
        } min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-neutral-900`}
      >
        {noteStatus.kind === 'not_found' ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-rose-500" />
            </div>
            <h3 className="font-bold text-base text-[#1a1a1a] dark:text-white">
              Note Not Found
            </h3>
            <p className="text-xs text-[#787671] dark:text-neutral-400 mt-1.5 max-w-md leading-relaxed">
              This note does not exist in your knowledge base, or it may have been permanently deleted.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => {
                  if (isSemesterScopedRoute) {
                    const semId = routeSemesterId || activeSemesterId;
                    if (semId) navigate(`/semesters/${semId}/notes`);
                    else navigate('/notes');
                  } else {
                    navigate('/notes');
                  }
                }}
                className="btn-notion-secondary text-xs"
              >
                Return to Notes
              </button>
              <button
                type="button"
                onClick={() => createNoteMutation.mutate()}
                className="btn-notion-primary text-xs flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Note</span>
              </button>
            </div>
          </div>
        ) : noteStatus.kind === 'denied' ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="font-bold text-base text-[#1a1a1a] dark:text-white">
              Access Denied
            </h3>
            <p className="text-xs text-[#787671] dark:text-neutral-400 mt-1.5 max-w-md leading-relaxed">
              You do not have permission to view this note. It belongs to another user.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => {
                  if (isSemesterScopedRoute) {
                    const semId = routeSemesterId || activeSemesterId;
                    if (semId) navigate(`/semesters/${semId}/notes`);
                    else navigate('/notes');
                  } else {
                    navigate('/notes');
                  }
                }}
                className="btn-notion-secondary text-xs"
              >
                Return to Notes
              </button>
            </div>
          </div>
        ) : noteStatus.kind === 'network' ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="font-bold text-base text-[#1a1a1a] dark:text-white">
              Couldn&apos;t Load Note
            </h3>
            <p className="text-xs text-[#787671] dark:text-neutral-400 mt-1.5 max-w-md leading-relaxed">
              {noteStatus.message}
            </p>
            <div className="flex items-center gap-3 mt-5">
              <button
                type="button"
                onClick={retryLoadNote}
                className="btn-notion-primary text-xs flex items-center gap-1.5 shadow-2xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        ) : noteStatus.kind === 'invalid_relationship' ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="font-bold text-base text-[#1a1a1a] dark:text-white">
              Note Not In This Semester
            </h3>
            <p className="text-xs text-[#787671] dark:text-neutral-400 mt-1.5 max-w-md leading-relaxed">
              &ldquo;{noteStatus.note.title}&rdquo; belongs to a different semester than the one in
              the current address. It has not been loaded here to avoid mixing academic data.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => {
                  const semId = noteStatus.note.semesterId;
                  navigate(
                    semId
                      ? `/semesters/${semId}/notes/${noteStatus.note.id}`
                      : `/notes/${noteStatus.note.id}`
                  );
                }}
                className="btn-notion-primary text-xs"
              >
                Open In Correct Semester
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isSemesterScopedRoute) {
                    const semId = routeSemesterId || activeSemesterId;
                    if (semId) navigate(`/semesters/${semId}/notes`);
                    else navigate('/notes');
                  } else {
                    navigate('/notes');
                  }
                }}
                className="btn-notion-secondary text-xs"
              >
                Back to This Semester
              </button>
            </div>
          </div>
        ) : showLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-[#787774] dark:text-neutral-400">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-[#0f6b57] border-t-transparent" />
            <span className="text-xs font-medium">Loading note...</span>
          </div>
        ) : !activeNote ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-400 text-sm p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-[#0f6b57]" />
            </div>
            <h3 className="font-bold text-base text-[#37352f] dark:text-white">
              BornoFlow Word-Style Document Workspace
            </h3>
            <p className="text-xs text-[#787774] dark:text-neutral-400 mt-1.5 max-w-md">
              Select an existing document from the left directory or create a new note with A4 page view,
              rich formatting ribbon, tables, images, and Word (.docx) interoperability.
            </p>
            <button
              type="button"
              onClick={() => createNoteMutation.mutate()}
              className="mt-4 btn-notion-primary text-xs flex items-center gap-2 py-1.5 px-4"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Note</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Academic Context Bar */}
            <AcademicMetadataBar
              semesters={semesters}
              courses={courses}
              folders={folders}
              selectedSemesterId={noteSemesterId}
              selectedCourseId={noteCourseId}
              selectedFolderId={noteFolderId}
              tags={tags}
              saveStatus={saveStatus}
              errorMessage={errorMessage}
              lastModified={activeNote.updatedAt}
              onSemesterChange={handleSemesterChange}
              onCourseChange={handleCourseChange}
              onFolderChange={handleFolderChange}
              onTagsChange={handleTagsChange}
              onManualSave={handleManualSave}
            />

            {/* Archived note banner */}
            {activeNote.isArchived && (
              <div className="bg-neutral-100 dark:bg-neutral-800 border-b border-[#e5e3df] dark:border-neutral-700 px-4 py-1.5 flex items-center justify-between text-xs text-[#5d5b54] dark:text-neutral-300 shrink-0">
                <div className="flex items-center gap-2">
                  <Archive className="w-3.5 h-3.5 shrink-0" />
                  <span>This note is archived. It is hidden from your active notes list.</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleArchiveMutation.mutate(activeNote.id)}
                  disabled={toggleArchiveMutation.isPending}
                  className="flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-neutral-900 border border-[#e5e3df] dark:border-neutral-700 rounded font-medium text-[#37352f] dark:text-neutral-200 hover:bg-neutral-50 text-[11px] shadow-2xs"
                >
                  <ArchiveRestore className="w-3 h-3 text-[#0f6b57]" />
                  <span>Restore</span>
                </button>
              </div>
            )}

            {/* Local Draft Recovery Banner (if browser closed unexpectedly) */}
            {localDraft && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200 shrink-0">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Unsaved offline draft found for this document from an earlier session.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRecoverDraft}
                    className="px-2.5 py-1 bg-amber-600 text-white rounded font-medium hover:bg-amber-700 text-xs shadow-2xs"
                  >
                    Recover Draft
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    className="px-2 py-1 text-amber-700 dark:text-amber-300 hover:underline text-xs"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            {/* Document Quick Action Toolbar Strip */}
            <div className="no-print flex items-center justify-between px-4 py-1.5 bg-[#fbfbfa] dark:bg-neutral-850 border-b border-[#e5e3df] dark:border-neutral-800 text-xs text-[#787774] dark:text-neutral-400 shrink-0 select-none">
              <div className="flex items-center space-x-2">
                {/* Mobile: back to the notes list */}
                {!isFullScreen && (
                  <Link
                    to={isSemesterScopedRoute && routeSemesterId ? `/semesters/${routeSemesterId}/notes` : '/notes'}
                    className="-ml-2 flex h-10 items-center gap-1 rounded-md px-2 text-sm font-medium text-[#0f6b57] hover:bg-[#eef8f4] dark:text-[#4ccba5] md:hidden"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    All notes
                  </Link>
                )}
                {/* Linked Document reference */}
                {activeNote.document && (
                  <Link
                    to={`/documents/${activeNote.document.id}/view`}
                    className="inline-flex items-center gap-1 text-xs text-[#0f6b57] hover:underline"
                  >
                    <LinkIcon className="w-3 h-3" />
                    <span>Linked PDF: {activeNote.document.title}</span>
                  </Link>
                )}
              </div>

              {/* Management buttons: Revisions, Share, Pin, Archive, Delete */}
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setIsRevisionModalOpen(true)}
                  className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[#787774] dark:text-neutral-300 flex items-center gap-1"
                  title="Revision History"
                >
                  <History className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Revisions</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShareModalOpen(true)}
                  className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[#787774] dark:text-neutral-300 flex items-center gap-1"
                  title="Share Document"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Share</span>
                </button>

                <button
                  type="button"
                  onClick={() => togglePinMutation.mutate(activeNote.id)}
                  className={`p-1 rounded transition-colors flex items-center gap-1 ${
                    activeNote.isPinned
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                      : 'hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[#787774] dark:text-neutral-300'
                  }`}
                  title={activeNote.isPinned ? 'Unpin Note' : 'Pin Note to Top'}
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">
                    {activeNote.isPinned ? 'Pinned' : 'Pin'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleArchiveMutation.mutate(activeNote.id)}
                  className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[#787774] dark:text-neutral-300 flex items-center gap-1"
                  title={activeNote.isArchived ? 'Restore to Active Notes' : 'Archive Note'}
                >
                  {activeNote.isArchived ? (
                    <>
                      <ArchiveRestore className="w-3.5 h-3.5 text-[#0f6b57]" />
                      <span className="hidden sm:inline text-[11px]">Restore</span>
                    </>
                  ) : (
                    <>
                      <Archive className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline text-[11px]">Archive</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Permanently delete "${activeNote.title}"? This cannot be undone.`)) {
                      deleteNoteMutation.mutate(activeNote.id);
                    }
                  }}
                  className="p-1 rounded hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 text-[#787774]"
                  title="Delete Document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Word Document Editor Core */}
            <div className="flex-1 overflow-hidden">
              <WordEditor
                key={activeNote.id}
                noteId={activeNote.id}
                initialTitle={title}
                initialContent={content}
                initialContentState={contentJson || null}
                academicSubtitle={academicSubtitle}
                onTitleChange={handleTitleChange}
                onContentChange={handleContentChange}
                onSerializedStateChange={setContentJson}
                onSave={handleManualSave}
                saveStatus={saveStatus}
                isFullScreen={isFullScreen}
                onToggleFullScreen={() => setIsFullScreen((prev) => !prev)}
              />
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          REVISION HISTORY MODAL
      ========================================================================= */}
      {isRevisionModalOpen && activeNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-lg p-6 shadow-xl border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2 mb-2">
              <History className="h-5 w-5 text-[#0f6b57]" />
              <h3 className="text-base font-bold text-[#37352f] dark:text-white">
                Document Revision History
              </h3>
            </div>
            <p className="text-xs text-[#787774] dark:text-neutral-400 mb-4">
              View milestone versions saved during your editing sessions or restore earlier drafts.
            </p>

            {revisionsLoading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 w-full animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                ))}
              </div>
            ) : revisions.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#787774] dark:text-neutral-400">
                No earlier revisions recorded yet. Revisions are created automatically periodically.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                {revisions.map((rev) => (
                  <div key={rev.id} className="pt-2 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#37352f] dark:text-neutral-200">
                        {rev.title || 'Untitled'} (v{rev.version})
                      </div>
                      <div className="text-[10px] text-[#787774] dark:text-neutral-400">
                        {formatDate(rev.createdAt, 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => restoreRevisionMutation.mutate(rev.id)}
                      disabled={restoreRevisionMutation.isPending}
                      className="px-2.5 py-1 text-xs font-medium text-[#0f6b57] bg-teal-50 dark:bg-teal-950/40 rounded hover:bg-teal-100 dark:hover:bg-teal-900/60"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setIsRevisionModalOpen(false)}
                className="px-4 py-1.5 text-xs font-medium text-[#787774] hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          NEW FOLDER MODAL
      ========================================================================= */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-lg p-5 shadow-xl border border-neutral-200 dark:border-neutral-800">
            <h3 className="text-sm font-bold text-[#37352f] dark:text-white mb-3">
              New Collection Folder
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#787774] dark:text-neutral-300 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Exam Cram Sheets, Research Papers"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full rounded border border-[#e5e3df] dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-1.5 text-xs text-[#37352f] dark:text-white focus:outline-none focus:border-[#0f6b57]"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="px-3 py-1 text-xs text-[#787774] hover:bg-neutral-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (newFolderName.trim()) createFolderMutation.mutate();
                  }}
                  disabled={!newFolderName.trim() || createFolderMutation.isPending}
                  className="btn-notion-primary text-xs py-1 px-3"
                >
                  Create Folder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SHARE MODAL
      ========================================================================= */}
      {activeNote && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          resourceType="NOTE"
          resourceId={activeNote.id}
          resourceTitle={activeNote.title || 'Untitled Note'}
        />
      )}
    </div>
  );
};
