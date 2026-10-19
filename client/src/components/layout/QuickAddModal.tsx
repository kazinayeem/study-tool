import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Upload, FileText, CalendarDays, GraduationCap, CheckSquare, Award, Calendar } from 'lucide-react';
import { api } from '../../lib/api';
import { DOCUMENT_CATEGORIES } from '../../lib/utils';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: string;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose, defaultTab = 'document' }) => {
  const [tab, setTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Load available semesters & courses for dropdowns
  const { data: semesters = [] } = useQuery({
    queryKey: ['semesters'],
    queryFn: () => api.getSemesters(),
    enabled: isOpen,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.getCourses(),
    enabled: isOpen,
  });

  // Form states
  // 1. Document upload
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docSemesterId, setDocSemesterId] = useState('');
  const [docCourseId, setDocCourseId] = useState('');
  const [docCategory, setDocCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [docDescription, setDocDescription] = useState('');

  // 2. Note
  const [noteTitle, setNoteTitle] = useState('');
  const [noteCourseId, setNoteCourseId] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // 3. Assignment
  const [assignTitle, setAssignTitle] = useState('');
  const [assignCourseId, setAssignCourseId] = useState('');
  const [assignDeadline, setAssignDeadline] = useState('');
  const [assignPriority, setAssignPriority] = useState('MEDIUM');

  // 4. Exam
  const [examTitle, setExamTitle] = useState('');
  const [examCourseId, setExamCourseId] = useState('');
  const [examType, setExamType] = useState('Midterm');
  const [examDate, setExamDate] = useState('');
  const [examRoom, setExamRoom] = useState('');

  // 5. Course
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseSemesterId, setCourseSemesterId] = useState('');
  const [courseCredits, setCourseCredits] = useState(3.0);
  const [courseTeacher, setCourseTeacher] = useState('');

  // 6. Semester
  const [semName, setSemName] = useState('');
  const [semStart, setSemStart] = useState('');
  const [semEnd, setSemEnd] = useState('');
  const [semStatus, setSemStatus] = useState('UPCOMING');

  if (!isOpen) return null;

  const handleSubmitDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) {
      setError('Please select a file to upload');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', docFile);
      formData.append('title', docTitle || docFile.name);
      if (docSemesterId) formData.append('semesterId', docSemesterId);
      if (docCourseId) formData.append('courseId', docCourseId);
      formData.append('category', docCategory);
      if (docDescription) formData.append('description', docDescription);

      await api.uploadDocument(formData);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) {
      setError('Note title is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const selectedCourse = courses.find((c: any) => c.id === noteCourseId);
      await api.createNote({
        title: noteTitle.trim(),
        courseId: noteCourseId || null,
        semesterId: selectedCourse?.semesterId || null,
        content: noteContent ? `<p>${noteContent.replace(/\n/g, '<br/>')}</p>` : '',
      });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Creation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTitle.trim() || !assignCourseId || !assignDeadline) {
      setError('Title, Course, and Deadline are required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const selectedCourse = courses.find((c: any) => c.id === assignCourseId);
      await api.createAssignment({
        title: assignTitle.trim(),
        courseId: assignCourseId,
        semesterId: selectedCourse?.semesterId || semesters[0]?.id,
        deadline: new Date(assignDeadline).toISOString(),
        priority: assignPriority,
      });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Creation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim() || !examCourseId || !examDate) {
      setError('Title, Course, and Exam Date are required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const selectedCourse = courses.find((c: any) => c.id === examCourseId);
      await api.createExam({
        title: examTitle.trim(),
        courseId: examCourseId,
        semesterId: selectedCourse?.semesterId || semesters[0]?.id,
        examType,
        examDate: new Date(examDate).toISOString(),
        room: examRoom || null,
      });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Creation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode.trim() || !courseTitle.trim() || !courseSemesterId) {
      setError('Course code, title, and semester are required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.createCourse({
        code: courseCode.trim().toUpperCase(),
        title: courseTitle.trim(),
        semesterId: courseSemesterId,
        credits: Number(courseCredits),
        teacherName: courseTeacher.trim() || null,
        color: '#5645d4',
      });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Creation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semName.trim() || !semStart || !semEnd) {
      setError('Semester name, start date, and end date are required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.createSemester({
        name: semName.trim(),
        startDate: new Date(semStart).toISOString(),
        endDate: new Date(semEnd).toISOString(),
        status: semStatus,
      });
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl overflow-hidden card-notion shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e3df] px-6 py-4 dark:border-[#1e293b]">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Quick Create</h3>
          <button
            onClick={onClose}
            className="rounded-[8px] p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-[#e5e3df] px-6 overflow-x-auto gap-2 bg-[#f7f6f3]/50 dark:border-[#1e293b] dark:bg-slate-800/30">
          {[
            { id: 'document', label: 'PDF / File', icon: Upload },
            { id: 'note', label: 'Note', icon: FileText },
            { id: 'assignment', label: 'Assignment', icon: CheckSquare },
            { id: 'exam', label: 'Exam', icon: Award },
            { id: 'course', label: 'Course', icon: GraduationCap },
            { id: 'semester', label: 'Semester', icon: CalendarDays },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setTab(item.id);
                  setError(null);
                }}
                className={`flex items-center gap-2 border-b-2 py-3 px-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                  tab === item.id
                    ? 'border-[#5645d4] text-[#5645d4] dark:border-[#8070f6] dark:text-[#8070f6]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="mb-4 rounded-[8px] bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
              {error}
            </div>
          )}

          {/* DOCUMENT FORM */}
          {tab === 'document' && (
            <form onSubmit={handleSubmitDoc} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Select File (PDF, DOCX, TXT, etc.) *</label>
                <input
                  type="file"
                  required
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setDocFile(file);
                    if (file && !docTitle) setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
                  }}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-[8px] file:border-0 file:text-xs file:font-semibold file:bg-[#5645d4]/10 file:text-[#5645d4] hover:file:bg-[#5645d4]/20 dark:file:bg-[#5645d4]/20 dark:file:text-[#8070f6]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Document Title</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Midterm 2026 Sample Questions"
                  className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Course</label>
                  <select
                    value={docCourseId}
                    onChange={(e) => {
                      setDocCourseId(e.target.value);
                      const course = courses.find((c: any) => c.id === e.target.value);
                      if (course?.semesterId) setDocSemesterId(course.semesterId);
                    }}
                    className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">None (Personal)</option>
                    {courses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                  >
                    {DOCUMENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="Summary or study tips for this file..."
                  className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="btn-notion-secondary text-xs">Cancel</button>
                <button type="submit" disabled={loading} className="btn-notion-primary text-xs disabled:opacity-50">
                  {loading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          )}

          {/* NOTE FORM */}
          {tab === 'note' && (
            <form onSubmit={handleSubmitNote} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Note Title *</label>
                <input
                  type="text"
                  required
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="e.g. Distributed Consensus & Raft Notes"
                  className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Linked Course</label>
                <select
                  value={noteCourseId}
                  onChange={(e) => setNoteCourseId(e.target.value)}
                  className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Independent Personal Note</option>
                  {courses.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Initial Content</label>
                <textarea
                  rows={4}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Start drafting thoughts, definitions, or study items..."
                  className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="btn-notion-secondary text-xs">Cancel</button>
                <button type="submit" disabled={loading} className="btn-notion-primary text-xs disabled:opacity-50">
                  {loading ? 'Creating...' : 'Create Note'}
                </button>
              </div>
            </form>
          )}

          {/* ASSIGNMENT FORM */}
          {tab === 'assignment' && (
            <form onSubmit={handleSubmitAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Assignment Title *</label>
                <input
                  type="text"
                  required
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  placeholder="e.g. Lab 3: Buffer Overflow Exploit"
                  className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Course *</label>
                  <select
                    required
                    value={assignCourseId}
                    onChange={(e) => setAssignCourseId(e.target.value)}
                    className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Select course...</option>
                    {courses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={assignPriority}
                    onChange={(e) => setAssignPriority(e.target.value)}
                    className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Submission Deadline *</label>
                <input
                  type="datetime-local"
                  required
                  value={assignDeadline}
                  onChange={(e) => setAssignDeadline(e.target.value)}
                  className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="btn-notion-secondary text-xs">Cancel</button>
                <button type="submit" disabled={loading} className="btn-notion-primary text-xs disabled:opacity-50">
                  {loading ? 'Adding...' : 'Add Assignment'}
                </button>
              </div>
            </form>
          )}

          {/* EXAM FORM */}
          {tab === 'exam' && (
            <form onSubmit={handleSubmitExam} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Exam Title *</label>
                <input
                  type="text"
                  required
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="e.g. Information Security Midterm Exam"
                  className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Course *</label>
                  <select
                    required
                    value={examCourseId}
                    onChange={(e) => setExamCourseId(e.target.value)}
                    className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Select course...</option>
                    {courses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Quiz">Quiz</option>
                    <option value="Midterm">Midterm</option>
                    <option value="Final">Final</option>
                    <option value="Practical">Practical</option>
                    <option value="Viva">Viva</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Exam Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Exam Hall / Room</label>
                  <input
                    type="text"
                    value={examRoom}
                    onChange={(e) => setExamRoom(e.target.value)}
                    placeholder="e.g. Hall B, Seat 42"
                    className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="btn-notion-secondary text-xs">Cancel</button>
                <button type="submit" disabled={loading} className="btn-notion-primary text-xs disabled:opacity-50">
                  {loading ? 'Adding...' : 'Add Exam'}
                </button>
              </div>
            </form>
          )}

          {/* COURSE FORM */}
          {tab === 'course' && (
            <form onSubmit={handleSubmitCourse} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="e.g. CSE443"
                    className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Semester *</label>
                  <select
                    required
                    value={courseSemesterId}
                    onChange={(e) => setCourseSemesterId(e.target.value)}
                    className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Select semester...</option>
                    {semesters.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="e.g. Information System Security"
                  className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Credits</label>
                  <input
                    type="number"
                    step="0.5"
                    value={courseCredits}
                    onChange={(e) => setCourseCredits(parseFloat(e.target.value) || 3.0)}
                    className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Instructor / Teacher</label>
                  <input
                    type="text"
                    value={courseTeacher}
                    onChange={(e) => setCourseTeacher(e.target.value)}
                    placeholder="e.g. Dr. Alan Vance"
                    className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="btn-notion-secondary text-xs">Cancel</button>
                <button type="submit" disabled={loading} className="btn-notion-primary text-xs disabled:opacity-50">
                  {loading ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          )}

          {/* SEMESTER FORM */}
          {tab === 'semester' && (
            <form onSubmit={handleSubmitSemester} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Semester Name *</label>
                <input
                  type="text"
                  required
                  value={semName}
                  onChange={(e) => setSemName(e.target.value)}
                  placeholder="e.g. Fall 2026 or Spring 2027"
                  className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={semStart}
                    onChange={(e) => setSemStart(e.target.value)}
                    className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={semEnd}
                    onChange={(e) => setSemEnd(e.target.value)}
                    className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                <select
                  value={semStatus}
                  onChange={(e) => setSemStatus(e.target.value)}
                  className="w-full rounded-[8px] border border-[#e5e3df] p-2.5 text-xs text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                >
                  <option value="UPCOMING">Upcoming</option>
                  <option value="ACTIVE">Active (Current)</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="btn-notion-secondary text-xs">Cancel</button>
                <button type="submit" disabled={loading} className="btn-notion-primary text-xs disabled:opacity-50">
                  {loading ? 'Creating...' : 'Create Semester'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
