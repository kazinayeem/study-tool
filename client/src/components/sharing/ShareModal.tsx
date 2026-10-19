import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Share2,
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Lock,
  Globe,
  Link2,
  Trash2,
  Calendar,
  Download,
  Search,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { ShareLink } from '../../types';
import { formatDate } from '../../lib/utils';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: 'DOCUMENT' | 'NOTE' | 'COURSE' | 'ASSIGNMENT' | 'EXAM';
  resourceId: string;
  resourceTitle: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  resourceType,
  resourceId,
  resourceTitle,
}) => {
  const queryClient = useQueryClient();

  const [visibility, setVisibility] = useState<'UNLISTED' | 'PUBLIC' | 'PRIVATE'>('UNLISTED');
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowIndexing, setAllowIndexing] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Query existing active share links for this resource
  const { data: shareLinks = [], refetch } = useQuery<ShareLink[]>({
    queryKey: ['shareLinks', resourceType, resourceId],
    queryFn: () => api.getShareLinksForResource(resourceType, resourceId),
    enabled: isOpen,
  });

  // Create new share link mutation
  const createLinkMutation = useMutation({
    mutationFn: () =>
      api.createShareLink({
        resourceType,
        resourceId,
        visibility,
        title: resourceTitle,
        password: isPasswordProtected && password.trim() ? password.trim() : null,
        allowDownload,
        allowIndexing,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      }),
    onSuccess: (newLink) => {
      refetch();
      setPassword('');
      setIsPasswordProtected(false);
      setExpiresAt('');
      setErrorMsg(null);
      // Auto-copy link
      handleCopyLink(newLink.token);
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || 'Failed to generate share link');
    },
  });

  // Revoke link mutation
  const revokeMutation = useMutation({
    mutationFn: (linkId: string) => api.revokeShareLink(linkId),
    onSuccess: () => {
      refetch();
    },
  });

  // Invalidate all links and make resource PRIVATE
  const setPrivateMutation = useMutation({
    mutationFn: () => api.setResourcePrivate(resourceType, resourceId),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: [resourceType.toLowerCase() + 's'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const handleCopyLink = (token: string) => {
    const fullUrl = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl card-notion overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e3df] dark:border-[#1e293b]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[8px] bg-[#5645d4]/10 dark:bg-[#5645d4]/20 text-[#5645d4] dark:text-[#8070f6]">
              <Share2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Share Resource</h3>
              <p className="text-xs text-slate-400 truncate max-w-sm">{resourceTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-[8px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Visibility Switching */}
          <div className="space-y-2">
            <label className="font-bold text-slate-900 dark:text-white block">Resource Visibility</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('UNLISTED')}
                className={`p-3 rounded-[8px] border flex flex-col items-center text-center gap-1.5 transition-all ${
                  visibility === 'UNLISTED'
                    ? 'border-[#5645d4] bg-[#5645d4]/10 dark:bg-[#5645d4]/20 text-[#5645d4] dark:text-[#8070f6] font-bold'
                    : 'border-[#e5e3df] dark:border-[#1e293b] hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Link2 className="h-4 w-4" />
                <span>Unlisted Link</span>
                <span className="text-[10px] opacity-75 font-normal">Only people with token</span>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('PUBLIC')}
                className={`p-3 rounded-[8px] border flex flex-col items-center text-center gap-1.5 transition-all ${
                  visibility === 'PUBLIC'
                    ? 'border-[#5645d4] bg-[#5645d4]/10 dark:bg-[#5645d4]/20 text-[#5645d4] dark:text-[#8070f6] font-bold'
                    : 'border-[#e5e3df] dark:border-[#1e293b] hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Globe className="h-4 w-4" />
                <span>Public Web</span>
                <span className="text-[10px] opacity-75 font-normal">Indexed or accessible</span>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('PRIVATE')}
                className={`p-3 rounded-[8px] border flex flex-col items-center text-center gap-1.5 transition-all ${
                  visibility === 'PRIVATE'
                    ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-bold'
                    : 'border-[#e5e3df] dark:border-[#1e293b] hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <ShieldAlert className="h-4 w-4" />
                <span>Private Only</span>
                <span className="text-[10px] opacity-75 font-normal">Owner access only</span>
              </button>
            </div>
          </div>

          {visibility === 'PRIVATE' ? (
            <div className="p-4 rounded-[8px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                Revoke all sharing access immediately?
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                Setting this resource to Private will invalidate any previously generated public and unlisted links. No external visitor will be able to access the files.
              </p>
              <button
                onClick={() => setPrivateMutation.mutate()}
                disabled={setPrivateMutation.isPending}
                className="mt-2 px-3.5 py-1.5 rounded-[8px] bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors"
              >
                {setPrivateMutation.isPending ? 'Invalidating...' : 'Confirm Set to Private'}
              </button>
            </div>
          ) : (
            <>
              {/* Optional Link Controls */}
              <div className="p-4 rounded-[8px] bg-slate-50 dark:bg-slate-800/40 border border-[#e5e3df] dark:border-[#1e293b] space-y-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">New Link Configuration</h4>

                {/* Password Protection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                      <Lock className="h-3.5 w-3.5 text-[#5645d4]" />
                      Require Password
                    </label>
                    <input
                      type="checkbox"
                      checked={isPasswordProtected}
                      onChange={(e) => setIsPasswordProtected(e.target.checked)}
                      className="rounded-[4px] border-[#e5e3df] text-[#5645d4] focus:ring-[#5645d4] accent-[#5645d4]"
                    />
                  </div>
                  {isPasswordProtected && (
                    <input
                      type="text"
                      placeholder="Enter strong access password..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-[8px] border border-[#e5e3df] p-2 text-slate-900 focus:border-[#5645d4] focus:outline-none dark:border-[#1e293b] dark:bg-slate-800 dark:text-white"
                    />
                  )}
                </div>

                {/* Document Download Permission (for documents) */}
                {resourceType === 'DOCUMENT' && (
                  <div className="flex items-center justify-between pt-2 border-t border-[#e5e3df] dark:border-[#1e293b]">
                    <div>
                      <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Download className="h-3.5 w-3.5 text-[#5645d4]" />
                        Allow Document Download
                      </span>
                      <p className="text-[10px] text-slate-400">
                        If disabled, visitors can only view the PDF preview without saving the original.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowDownload}
                      onChange={(e) => setAllowDownload(e.target.checked)}
                      className="rounded-[4px] border-[#e5e3df] text-[#5645d4] focus:ring-[#5645d4] accent-[#5645d4]"
                    />
                  </div>
                )}

                {/* Search Engine Indexing (for public pages) */}
                {visibility === 'PUBLIC' && (
                  <div className="flex items-center justify-between pt-2 border-t border-[#e5e3df] dark:border-[#1e293b]">
                    <div>
                      <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Search className="h-3.5 w-3.5 text-[#5645d4]" />
                        Allow Search Engine Indexing
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Enables robots and search crawlers for this public resource page.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowIndexing}
                      onChange={(e) => setAllowIndexing(e.target.checked)}
                      className="rounded-[4px] border-[#e5e3df] text-[#5645d4] focus:ring-[#5645d4] accent-[#5645d4]"
                    />
                  </div>
                )}

                {/* Expiration date */}
                <div className="flex items-center justify-between pt-2 border-t border-[#e5e3df] dark:border-[#1e293b]">
                  <div>
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-[#5645d4]" />
                      Optional Link Expiration
                    </span>
                    <p className="text-[10px] text-slate-400">Auto-revoke link after a specific date.</p>
                  </div>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="rounded-[8px] border border-[#e5e3df] p-1.5 text-slate-800 dark:border-[#1e293b] dark:bg-slate-800 dark:text-white focus:border-[#5645d4] focus:outline-none"
                  />
                </div>

                {/* Create Link Button */}
                <div className="pt-2">
                  <button
                    onClick={() => createLinkMutation.mutate()}
                    disabled={createLinkMutation.isPending}
                    className="btn-notion-primary w-full text-xs flex items-center justify-center gap-1.5"
                  >
                    <Link2 className="h-4 w-4" />
                    {createLinkMutation.isPending ? 'Generating Link...' : 'Create Secure Share Link'}
                  </button>
                </div>
              </div>

              {/* Active Share Links List */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white">Active Share Links ({shareLinks.length})</h4>
                {shareLinks.length === 0 ? (
                  <p className="text-slate-400 italic text-[11px]">No active share links yet. Generate one above.</p>
                ) : (
                  <div className="space-y-2">
                    {shareLinks.map((link) => {
                      const shareUrl = `${window.location.origin}/share/${link.token}`;
                      const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();

                      return (
                        <div
                          key={link.id}
                          className={`p-3 rounded-[8px] border transition-all ${
                            link.isRevoked || isExpired
                              ? 'border-[#e5e3df] dark:border-[#1e293b] bg-slate-50/50 dark:bg-slate-850 opacity-60'
                              : 'border-[#e5e3df] dark:border-[#1e293b] bg-white dark:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase ${
                                  link.isRevoked
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                    : isExpired
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                }`}
                              >
                                {link.isRevoked ? 'Revoked' : isExpired ? 'Expired' : link.visibility}
                              </span>
                              {link.isPasswordProtected && (
                                <span className="flex items-center gap-0.5 text-[10px] text-[#5645d4] dark:text-[#8070f6] font-semibold">
                                  <Lock className="h-3 w-3" /> Password
                                </span>
                              )}
                              <span className="text-slate-400 text-[10px]">
                                Views: {link.accessCount}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {!link.isRevoked && !isExpired && (
                                <>
                                  <button
                                    onClick={() => handleCopyLink(link.token)}
                                    className="p-1.5 rounded-[8px] border border-[#e5e3df] dark:border-[#1e293b] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                                    title="Copy Link"
                                  >
                                    {copiedToken === link.token ? (
                                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                  <a
                                    href={`/share/${link.token}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded-[8px] border border-[#e5e3df] dark:border-[#1e293b] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                    title="Preview in new tab"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                  <button
                                    onClick={() => revokeMutation.mutate(link.id)}
                                    className="p-1.5 rounded-[8px] border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                                    title="Revoke Link"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                            <span className="truncate max-w-[280px] font-mono text-[10px]">
                              /share/{link.token}
                            </span>
                            <span>Created {formatDate(link.createdAt, 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#e5e3df] dark:border-[#1e293b] bg-slate-50/50 dark:bg-slate-800/30 flex justify-end">
          <button
            onClick={onClose}
            className="btn-notion-secondary text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
