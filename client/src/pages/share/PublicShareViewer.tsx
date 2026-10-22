import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  GraduationCap,
  Download,
  Lock,
  Clock,
  Calendar,
  BookOpen,
  FileText,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';

export const PublicShareViewer: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['publicShare', token],
    queryFn: () => (token ? api.getPublicShare(token) : null),
    enabled: !!token,
    retry: false,
  });

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setPasswordError(null);
    try {
      const res = await api.getPublicShare(token, password);
      if (res && !res.requiresPassword) {
        refetch();
      } else {
        setPasswordError('Invalid access password. Please try again.');
      }
    } catch (err: any) {
      setPasswordError(err?.message || 'Invalid access password.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-[#ffffff] dark:bg-[#0f0f11] flex flex-col items-center justify-center p-4">
        <div className="card-notion w-full max-w-md rounded-[12px] bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] p-8 shadow-2xs text-center space-y-4">
          <div className="h-12 w-12 rounded-[8px] bg-[#f0eeec] dark:bg-[#202024] animate-pulse mx-auto" />
          <div className="h-4 w-48 bg-[#f0eeec] dark:bg-[#202024] rounded-[6px] animate-pulse mx-auto" />
          <div className="h-3 w-64 bg-[#f0eeec] dark:bg-[#202024] rounded-[6px] animate-pulse mx-auto" />
        </div>
      </div>
    );
  }

  // Handle expired, revoked or missing link
  if (isError || !data) {
    const errorMsg = (error as any)?.message || 'This share link is unavailable or has expired.';
    return (
      <div className="min-h-dvh bg-[#ffffff] dark:bg-[#0f0f11] flex flex-col items-center justify-center p-4 text-[#37352f] dark:text-[#f0eeec]">
        <div className="card-notion w-full max-w-md rounded-[12px] bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] p-8 shadow-2xs text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#fde0ec] text-[#e03131] border border-[#d9480f]/30">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold text-[#1a1a1a] dark:text-white">Resource Unavailable</h2>
          <p className="text-xs text-[#787671] dark:text-[#a4a097]">{errorMsg}</p>
          <div className="pt-2">
            <Link to="/" className="btn-notion-primary text-xs shadow-2xs">
              Open ScholarFlow
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If password is required and not verified yet
  if (data.requiresPassword) {
    return (
      <div className="min-h-dvh bg-[#ffffff] dark:bg-[#0f0f11] flex flex-col items-center justify-center p-4 text-[#37352f] dark:text-[#f0eeec]">
        <div className="card-notion w-full max-w-md rounded-[12px] bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] p-8 shadow-2xs space-y-5">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#dcf0e8] text-[#0f6b57] border border-[#a8dcc9]">
              <Lock className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-[#1a1a1a] dark:text-white">Password Protected Resource</h2>
            <p className="text-xs text-[#787671] dark:text-[#a4a097]">
              The owner has restricted access to <strong>{data.data.title || 'this academic resource'}</strong>.
            </p>
          </div>

          {passwordError && (
            <div className="p-3 rounded-[8px] bg-[#fde0ec] border border-[#d9480f]/30 text-[#e03131] text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#1a1a1a] dark:text-white mb-1">
                Access Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to unlock..."
                className="w-full h-[44px] rounded-[8px] border border-[#c8c4be] bg-white dark:bg-[#1c1c1f] dark:border-[#37352f] px-3 text-xs text-[#1a1a1a] dark:text-white focus:outline-none focus:border-2 focus:border-[#0f6b57]"
              />
            </div>
            <button
              type="submit"
              className="w-full btn-notion-primary text-xs h-[44px]"
            >
              Unlock Shared Resource
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { resource, resourceType, allowDownload } = data.data;

  return (
    <div className="min-h-dvh bg-[#ffffff] dark:bg-[#0f0f11] text-[#37352f] dark:text-[#f0eeec] flex flex-col">
      {/* Header Bar */}
      <header className="h-14 border-b border-[#e5e3df] dark:border-[#2a2a2e] bg-white dark:bg-[#141416] px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#0a1530] text-white shadow-2xs font-bold text-sm">
            N
          </div>
          <div>
            <h1 className="font-semibold text-xs sm:text-sm text-[#1a1a1a] dark:text-white flex items-center gap-2">
              ScholarFlow
              <span className="badge-notion-tag-purple">
                Shared {resourceType}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {resourceType === 'DOCUMENT' && allowDownload && (
            <a
              href={`/api/share/${token}/file?download=true`}
              className="btn-notion-primary text-xs h-[36px] py-1.5 px-3"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download PDF</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* Resource Header Card */}
        <div className="card-notion bg-white dark:bg-[#141416] rounded-[12px] border border-[#e5e3df] dark:border-[#2a2a2e] p-6 md:p-8 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {resource.course && (
              <span className="badge-notion-tag-purple">
                {resource.course.code} {resource.course.name ? `— ${resource.course.name}` : ''}
              </span>
            )}
            {resource.semester && (
              <span className="px-2 py-0.5 rounded-[4px] bg-[#f0eeec] dark:bg-[#252528] text-[#5d5b54] dark:text-[#a4a097] text-[11px] font-medium">
                {resource.semester.name}
              </span>
            )}
            {resource.category && (
              <span className="px-2 py-0.5 rounded-[4px] bg-[#f0eeec] dark:bg-[#252528] text-[#5d5b54] dark:text-[#a4a097] text-[11px]">
                {resource.category}
              </span>
            )}
          </div>

          <h2 className="text-2xl md:text-3xl font-semibold tracking-[-0.5px] text-[#1a1a1a] dark:text-white">
            {resource.title}
          </h2>

          {resource.description && (
            <p className="text-sm text-[#5d5b54] dark:text-[#a4a097] leading-[1.55]">
              {resource.description}
            </p>
          )}

          {/* Quick stats / metadata */}
          <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-[#ede9e4] dark:border-[#252528] text-xs text-[#787671] dark:text-[#a4a097]">
            {resource.deadline && (
              <span className="flex items-center gap-1.5 font-medium text-[#e03131]">
                <Clock className="h-4 w-4" /> Due: {formatDate(resource.deadline, 'PPP p')}
              </span>
            )}
            {resource.examDate && (
              <span className="flex items-center gap-1.5 font-medium text-[#0f6b57] dark:text-[#a8dcc9]">
                <Calendar className="h-4 w-4" /> Exam: {formatDate(resource.examDate, 'PPP p')}
              </span>
            )}
            {resource.pageCount && (
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" /> {resource.pageCount} Pages
              </span>
            )}
            {resource.createdAt && <span>Shared via ScholarFlow Academic Workspace</span>}
          </div>
        </div>

        {/* Resource Body by Type */}
        {resourceType === 'DOCUMENT' && (
          <div className="card-notion bg-white dark:bg-[#141416] rounded-[12px] border border-[#e5e3df] dark:border-[#2a2a2e] overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-[#ede9e4] dark:border-[#252528] bg-[#fbfbfa] dark:bg-[#19191c] flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1a1a1a] dark:text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#0f6b57]" />
                {resource.originalFilename || 'Document Preview'}
              </span>
              <span className="text-[#787671]">
                {allowDownload ? 'Download permitted' : 'View-only mode (downloads disabled)'}
              </span>
            </div>
            <div className="w-full h-[750px] bg-[#f6f5f4] dark:bg-[#000000] flex items-center justify-center">
              <iframe
                src={`/api/share/${token}/file#toolbar=0`}
                className="w-full h-full border-none"
                title="Shared PDF Viewer"
              />
            </div>
          </div>
        )}

        {resourceType === 'NOTE' && (
          <div className="card-notion bg-white dark:bg-[#141416] rounded-[12px] border border-[#e5e3df] dark:border-[#2a2a2e] p-8 shadow-2xs">
            <div
              className="prose dark:prose-invert max-w-none text-[#37352f] dark:text-[#f0eeec] text-sm leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: resource.content || '<p class="text-[#787671] italic">No note content available.</p>',
              }}
            />
          </div>
        )}

        {(resourceType === 'ASSIGNMENT' || resourceType === 'EXAM') && (
          <div className="card-notion bg-white dark:bg-[#141416] rounded-[12px] border border-[#e5e3df] dark:border-[#2a2a2e] p-6 shadow-2xs space-y-6 text-xs">
            {resource.syllabus && (
              <div>
                <h4 className="font-semibold text-[#1a1a1a] dark:text-white mb-2">Scope & Syllabus</h4>
                <div className="p-4 rounded-[8px] bg-[#fbfbfa] dark:bg-[#19191c] border border-[#ede9e4] dark:border-[#252528] text-[#37352f] dark:text-[#f0eeec] leading-[1.5]">
                  {resource.syllabus}
                </div>
              </div>
            )}

            {resource.checklist && resource.checklist.length > 0 && (
              <div>
                <h4 className="font-semibold text-[#1a1a1a] dark:text-white mb-2">Milestone Checklist</h4>
                <div className="space-y-2">
                  {resource.checklist.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-[8px] border border-[#ede9e4] dark:border-[#252528] bg-[#fbfbfa] dark:bg-[#19191c]"
                    >
                      <CheckCircle
                        className={`h-4 w-4 ${
                          item.isCompleted ? 'text-[#1aae39]' : 'text-[#c8c4be] dark:text-[#37352f]'
                        }`}
                      />
                      <span
                        className={
                          item.isCompleted
                            ? 'line-through text-[#787671]'
                            : 'text-[#1a1a1a] dark:text-white font-medium'
                        }
                      >
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6 text-xs text-[#787671]">
          <p>
            Shared securely via <strong>ScholarFlow Academic Workspace</strong>.
          </p>
        </div>
      </main>
    </div>
  );
};
