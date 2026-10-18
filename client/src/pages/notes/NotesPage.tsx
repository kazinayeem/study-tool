import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Link as LinkIcon,
  Calendar,
  Layers,
  Clock,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { Note, Course, Semester } from '../../types';

export const NotesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedNoteId = searchParams.get('id');

  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  // Editor states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteCourseId, setNoteCourseId] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const editorRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Load courses & semesters for linking
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => api.getCourses(),
  });

  // Query notes with search and course filters
  const params: Record<string, string> = {};
  if (search.trim()) params.search = search.trim();
  if (courseFilter) params.courseId = courseFilter;

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ['notes', params],
    queryFn: () => api.getNotes(params),
  });

  // Select initial or URL-referenced note
  useEffect(() => {
    if (notes.length > 0) {
      const target = selectedNoteId ? notes.find((n) => n.id === selectedNoteId) : notes[0];
      if (target && target.id !== activeNote?.id) {
        setActiveNote(target);
        setTitle(target.title);
        setContent(target.content || '');
        setNoteCourseId(target.courseId || '');
        setTagsInput(target.tags ? JSON.parse(target.tags).join(', ') : '');
        setSaveStatus('saved');
      }
    } else {
      setActiveNote(null);
    }
  }, [notes, selectedNoteId]);

  // Create Note mutation
  const createNoteMutation = useMutation({
    mutationFn: () =>
      api.createNote({
        title: 'Untitled Note',
        content: '<p>Start typing your lecture notes, study outline, or code snippets...</p>',
        courseId: courseFilter || null,
      }),
    onSuccess: (newNote) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setSearchParams({ id: newNote.id });
    },
  });

  // Autosave logic
  const performSave = useCallback(
    async (noteToSave: Note, newTitle: string, newContent: string, cId: string, tagsStr: string) => {
      setSaveStatus('saving');
      try {
        const tagList = tagsStr
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);

        const updated = await api.updateNote(noteToSave.id, {
          title: newTitle.trim() || 'Untitled Note',
          content: newContent,
          courseId: cId || null,
          tags: tagList,
          expectedVersion: noteToSave.version,
        });

        setActiveNote(updated);
        setSaveStatus('saved');
        queryClient.invalidateQueries({ queryKey: ['notes'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      } catch (err: any) {
        console.error('Autosave failed:', err);
        setSaveStatus('error');
        setErrorMessage(err.message || 'Autosave failed');
        // Store in localStorage for emergency recovery
        localStorage.setItem(`scholarflow_unsaved_note_${noteToSave.id}`, newContent);
      }
    },
    [queryClient]
  );

  // Trigger debounced autosave on edit
  const triggerDebouncedSave = (newTitle: string, newContent: string, cId: string, tagsStr: string) => {
    if (!activeNote) return;
    setSaveStatus('unsaved');
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      performSave(activeNote, newTitle, newContent, cId, tagsStr);
    }, 1200);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    triggerDebouncedSave(val, content, noteCourseId, tagsInput);
  };

  const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
    const html = e.currentTarget.innerHTML;
    setContent(html);
    triggerDebouncedSave(title, html, noteCourseId, tagsInput);
  };

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setNoteCourseId(val);
    triggerDebouncedSave(title, content, val, tagsInput);
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTagsInput(val);
    triggerDebouncedSave(title, content, noteCourseId, val);
  };

  // Toggle Pin
  const togglePinMutation = useMutation({
    mutationFn: (id: string) => api.toggleNotePin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  // Delete Note
  const deleteNoteMutation = useMutation({
    mutationFn: (id: string) => api.deleteNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setActiveNote(null);
    },
  });

  // Rich Text Formatting helper
  const execFormat = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setContent(html);
      triggerDebouncedSave(title, html, noteCourseId, tagsInput);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* LEFT SIDEBAR: Notes Directory & Search */}
      <div className="flex w-80 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shrink-0">
        {/* Header & Create */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Study Notes</h2>
            <p className="text-[11px] text-slate-400">{notes.length} total notes</p>
          </div>
          <button
            onClick={() => createNoteMutation.mutate()}
            className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition-all"
            title="Create Note"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search note titles & text..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="">All Courses & Personal</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
            ))}
          </select>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <FileText className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              <p>No notes found.</p>
              <button
                onClick={() => createNoteMutation.mutate()}
                className="mt-2 text-indigo-600 font-semibold hover:underline"
              >
                Create your first note
              </button>
            </div>
          ) : (
            notes.map((n) => {
              const isSelected = activeNote?.id === n.id;
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    setActiveNote(n);
                    setTitle(n.title);
                    setContent(n.content || '');
                    setNoteCourseId(n.courseId || '');
                    setTagsInput(n.tags ? JSON.parse(n.tags).join(', ') : '');
                    setSearchParams({ id: n.id });
                  }}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-slate-800/80 border-l-4 border-indigo-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <h3 className={`text-xs font-semibold truncate ${isSelected ? 'text-indigo-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                      {n.title || 'Untitled'}
                    </h3>
                    {n.isPinned && (
                      <Pin className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {n.content ? n.content.replace(/<[^>]*>?/gm, ' ') : 'Empty note'}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{formatDate(n.updatedAt, 'MMM d')}</span>
                    {n.course && (
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        {n.course.code}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT WORKSPACE: Rich-Text Notion-like Note Editor */}
      <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-slate-950">
        {!activeNote ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
            <FileText className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Select or create a study note</p>
            <p className="text-xs text-slate-400 mt-1">
              Supports headings, bullet lists, checklists, quotes, and persistent autosave.
            </p>
          </div>
        ) : (
          <>
            {/* Top Editor Toolbar */}
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/60 dark:bg-slate-900/60">
              {/* Rich-Text formatting controls */}
              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <button
                  onClick={() => execFormat('bold')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => execFormat('italic')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => execFormat('formatBlock', '<h1>')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 font-bold text-xs"
                  title="Heading 1"
                >
                  <Heading1 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => execFormat('formatBlock', '<h2>')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 font-bold text-xs"
                  title="Heading 2"
                >
                  <Heading2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => execFormat('insertUnorderedList')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                  title="Bullet List"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => execFormat('insertOrderedList')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                  title="Numbered List"
                >
                  <ListOrdered className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => execFormat('formatBlock', '<blockquote>')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                  title="Quote Block"
                >
                  <Quote className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => execFormat('formatBlock', '<pre>')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                  title="Code Block"
                >
                  <Code className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center gap-3">
                {/* Autosave Status Pill */}
                <div className="flex items-center gap-1.5 text-xs">
                  {saveStatus === 'saved' && (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Check className="h-3.5 w-3.5" /> Saved
                    </span>
                  )}
                  {saveStatus === 'saving' && (
                    <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving...
                    </span>
                  )}
                  {saveStatus === 'unsaved' && (
                    <span className="text-slate-400">Editing...</span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="flex items-center gap-1 text-rose-500 font-medium" title={errorMessage || 'Error'}>
                      <AlertCircle className="h-3.5 w-3.5" /> Error
                    </span>
                  )}
                </div>

                <button
                  onClick={() => togglePinMutation.mutate(activeNote.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    activeNote.isPinned
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                      : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={activeNote.isPinned ? 'Unpin note' : 'Pin note to top'}
                >
                  <Pin className="h-4 w-4" />
                </button>

                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete note "${activeNote.title}"?`)) {
                      deleteNoteMutation.mutate(activeNote.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                  title="Delete note"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Note Metadata Properties (Course, Tags) */}
            <div className="border-b border-slate-100 dark:border-slate-800 px-8 py-3 bg-slate-50/30 dark:bg-slate-900/20 flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Course:</span>
                <select
                  value={noteCourseId}
                  onChange={handleCourseChange}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Independent Personal Note</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={tagsInput}
                  onChange={handleTagsChange}
                  placeholder="Tags: Cryptography, Review, Cheatsheet..."
                  className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              {activeNote.document && (
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                  <LinkIcon className="h-3.5 w-3.5" />
                  <Link to={`/documents/${activeNote.document.id}/view`} className="hover:underline truncate max-w-xs">
                    Linked: {activeNote.document.title}
                  </Link>
                </div>
              )}
            </div>

            {/* Note Title & Content Body */}
            <div className="flex-1 overflow-y-auto px-8 py-6 max-w-4xl mx-auto w-full">
              {/* Title input */}
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Untitled Note"
                className="w-full text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white bg-transparent border-0 focus:outline-none mb-6 placeholder:text-slate-300 dark:placeholder:text-slate-700"
              />

              {/* Editable content body */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleContentChange}
                dangerouslySetInnerHTML={{ __html: content }}
                className="note-content-editor min-h-[500px] text-slate-800 dark:text-slate-200 focus:outline-none text-sm leading-relaxed"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
