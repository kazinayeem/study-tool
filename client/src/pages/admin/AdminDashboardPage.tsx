import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Shield,
  Activity,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Lock,
  EyeOff,
  AlertTriangle,
  RefreshCw,
  FileText,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow, format } from 'date-fns';

export const AdminDashboardPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Active tab: 'users' | 'activity' | 'breakdown' | 'features' | 'audit'
  const [activeTab, setActiveTab] = useState<'users' | 'activity' | 'breakdown' | 'features' | 'audit'>('users');

  // User management state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [statusActionUser, setStatusActionUser] = useState<any | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Activity filter state
  const [activityEventType, setActivityEventType] = useState('');
  const [activityIsDemo, setActivityIsDemo] = useState<boolean | undefined>(undefined);
  const [activityPage, setActivityPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);

  // 1. Fetch Overview Stats
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['adminOverview'],
    queryFn: () => api.getAdminOverview(),
  });

  // Feature Analytics & Engagement Queries
  const { data: featureData, isLoading: featureLoading } = useQuery({
    queryKey: ['adminFeatureAnalytics'],
    queryFn: () => api.getAdminFeatureAnalytics(),
  });

  const { data: engagementData, isLoading: engagementLoading } = useQuery({
    queryKey: ['adminEngagement'],
    queryFn: () => api.getAdminEngagement(),
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['adminAuditLogs', auditPage],
    queryFn: () => api.getAdminAuditLogs({ page: auditPage, limit: 15 }),
  });

  // 2. Fetch Users List
  const {
    data: usersData,
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['adminUsers', searchQuery, roleFilter, statusFilter, accountTypeFilter, page],
    queryFn: () =>
      api.getAdminUsers({
        q: searchQuery,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 10,
      }),
  });

  // 3. Fetch Activity Timeline
  const {
    data: activityData,
    isLoading: activityLoading,
    refetch: refetchActivity,
  } = useQuery({
    queryKey: ['adminActivity', activityEventType, activityIsDemo, activityPage],
    queryFn: () =>
      api.getAdminActivity({
        eventType: activityEventType || undefined,
        isDemo: activityIsDemo,
        page: activityPage,
        limit: 15,
      }),
  });

  // Status toggle mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'DISABLED' }) =>
      api.updateUserStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminOverview'] });
      queryClient.invalidateQueries({ queryKey: ['adminActivity'] });
      setStatusActionUser(null);
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err?.message || 'Failed to update user status.');
    },
  });

  const metrics = overviewData?.metrics || {};
  const users = usersData?.users || [];
  const pagination = usersData?.pagination || { total: 0, totalPages: 1 };
  const events = activityData?.events || [];
  const activityPagination = activityData?.pagination || { total: 0, totalPages: 1 };
  const categories = overviewData?.activityByCategory || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#e6e0f5] text-[#391c57] text-xs font-semibold mb-2 border border-[#d6b6f6]">
            <Shield className="h-3.5 w-3.5 text-[#5645d4]" />
            <span>Workspace Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.5px] text-[#1a1a1a] dark:text-white">
            Admin Management & Activity Monitor
          </h1>
          <p className="text-sm text-[#787671] dark:text-[#a4a097] mt-1 leading-[1.50]">
            Manage user accounts, inspect activity telemetry, and verify student privacy protections.
          </p>
        </div>

        {/* Refresh button: Notion Secondary 8px */}
        <button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['adminOverview'] });
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
            queryClient.invalidateQueries({ queryKey: ['adminActivity'] });
          }}
          className="btn-notion-secondary text-xs h-[38px] shadow-2xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Metrics
        </button>
      </div>

      {/* STRICT PRIVACY BANNER: Notion Mint Pastel Tint */}
      <div className="card-notion-mint border border-[#1aae39]/30 p-4 sm:p-5 rounded-[12px] flex items-start gap-3.5 shadow-2xs">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#1aae39]/15 text-[#1aae39] border border-[#1aae39]/30">
          <EyeOff className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2">
            <span>Strict Privacy-Preserving Architecture Enforced</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-[4px] bg-[#1aae39]/20 text-[#1aae39]">
              Zero Content Access
            </span>
          </h4>
          <p className="text-xs text-[#37352f] leading-[1.50] max-w-4xl">
            As an administrator, you can view operational metadata (event types, counts, and timestamps) to monitor system health.
            <strong> Under no circumstances can administrators view, download, preview, or read students&apos; private documents, notes, or assignment submissions.</strong> Ownership barriers are cryptographically and server-side enforced.
          </p>
        </div>
      </div>

      {/* Metrics Grid: Notion Pastel Tint Feature Cards (12px rounded) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Users: Sky Tint */}
        <div className="card-notion-sky p-4 sm:p-5 rounded-[12px] border border-[#2a9d99]/25 shadow-2xs">
          <div className="flex items-center justify-between text-[#5d5b54] text-xs font-semibold">
            <span>Total Registered</span>
            <Users className="h-4 w-4 text-[#2a9d99]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold text-[#1a1a1a]">
              {metrics.totalUsers ?? 0}
            </span>
            <span className="text-xs text-[#1aae39] font-medium">
              {metrics.activeUsers ?? 0} active
            </span>
          </div>
          <div className="mt-3 text-[11px] text-[#5d5b54]">
            {metrics.disabledUsers ?? 0} disabled accounts
          </div>
        </div>

        {/* Active in Past 7 Days: Peach Tint */}
        <div className="card-notion-peach p-4 sm:p-5 rounded-[12px] border border-[#dd5b00]/25 shadow-2xs">
          <div className="flex items-center justify-between text-[#5d5b54] text-xs font-semibold">
            <span>Active Past 7 Days</span>
            <Clock className="h-4 w-4 text-[#dd5b00]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold text-[#1a1a1a]">
              {metrics.recentlyActiveUsers ?? 0}
            </span>
          </div>
          <div className="mt-3 text-[11px] text-[#5d5b54]">Recent active visitors</div>
        </div>

        {/* Authentication Providers: Lavender Tint */}
        <div className="card-notion-lavender p-4 sm:p-5 rounded-[12px] border border-[#7b3ff2]/25 shadow-2xs">
          <div className="flex items-center justify-between text-[#5d5b54] text-xs font-semibold">
            <span>Google Accounts</span>
            <span className="text-[10px] font-bold text-[#5645d4]">OAuth 2.0</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold text-[#1a1a1a]">
              {metrics.googleUsers ?? 0}
            </span>
            <span className="text-xs text-[#5d5b54]">/ {metrics.totalUsers ?? 0}</span>
          </div>
          <div className="mt-3 text-[11px] text-[#5d5b54]">
            {metrics.demoUsers ?? 0} demo student account
          </div>
        </div>

        {/* Activity Events: Bold Yellow Tint */}
        <div className="card-notion-yellow-bold p-4 sm:p-5 rounded-[12px] border border-[#ebd06b] shadow-2xs">
          <div className="flex items-center justify-between text-[#5d5b54] text-xs font-semibold">
            <span>Activity Events</span>
            <Activity className="h-4 w-4 text-[#793400]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold text-[#1a1a1a]">
              {metrics.totalActivityEvents ?? 0}
            </span>
          </div>
          <div className="mt-3 text-[11px] text-[#5d5b54]">
            {metrics.regularActivityCount ?? 0} regular • {metrics.demoActivityCount ?? 0} demo
          </div>
        </div>
      </div>

      {/* Tabs Navigation: Notion Segmented Underline Tabs */}
      <div className="flex items-center gap-1 border-b border-[#e5e3df] dark:border-[#2a2a2e]">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'border-[#1a1a1a] text-[#1a1a1a] dark:border-white dark:text-white font-semibold'
              : 'border-transparent text-[#787671] hover:text-[#1a1a1a] dark:hover:text-white'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>User Management</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#f0eeec] dark:bg-[#252528] text-[#5d5b54] dark:text-[#a4a097]">
            {metrics.totalUsers ?? 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === 'activity'
              ? 'border-[#1a1a1a] text-[#1a1a1a] dark:border-white dark:text-white font-semibold'
              : 'border-transparent text-[#787671] hover:text-[#1a1a1a] dark:hover:text-white'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Privacy-Safe Activity Stream</span>
        </button>

        <button
          onClick={() => setActiveTab('breakdown')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === 'breakdown'
              ? 'border-[#1a1a1a] text-[#1a1a1a] dark:border-white dark:text-white font-semibold'
              : 'border-transparent text-[#787671] hover:text-[#1a1a1a] dark:hover:text-white'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Event Telemetry</span>
        </button>

        <button
          onClick={() => setActiveTab('features')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === 'features'
              ? 'border-[#1a1a1a] text-[#1a1a1a] dark:border-white dark:text-white font-semibold'
              : 'border-transparent text-[#787671] hover:text-[#1a1a1a] dark:hover:text-white'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Feature Usage & Engagement</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'border-[#1a1a1a] text-[#1a1a1a] dark:border-white dark:text-white font-semibold'
              : 'border-transparent text-[#787671] hover:text-[#1a1a1a] dark:hover:text-white'
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          <span>Admin Audit Trail</span>
        </button>
      </div>

      {/* Action Error Message */}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* ================= TAB 1: USER MANAGEMENT ================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="p-3.5 rounded-[12px] bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] shadow-2xs flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#787671]" />
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 h-[38px] rounded-[8px] border border-[#c8c4be] dark:border-[#37352f] bg-[#ffffff] dark:bg-[#1c1c1f] text-xs text-[#1a1a1a] dark:text-white focus:outline-none focus:border-2 focus:border-[#5645d4]"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="h-[38px] px-3 rounded-[8px] border border-[#c8c4be] dark:border-[#37352f] bg-white dark:bg-[#1c1c1f] text-xs text-[#1a1a1a] dark:text-white focus:outline-none focus:border-2 focus:border-[#5645d4] cursor-pointer"
              >
                <option value="">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="STUDENT">Student</option>
                <option value="DEMO">Demo Account</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-[38px] px-3 rounded-[8px] border border-[#c8c4be] dark:border-[#37352f] bg-white dark:bg-[#1c1c1f] text-xs text-[#1a1a1a] dark:text-white focus:outline-none focus:border-2 focus:border-[#5645d4] cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="DISABLED">Disabled</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-[12px] bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#37352f] dark:text-[#f0eeec]">
                <thead className="bg-[#fbfbfa] dark:bg-[#19191c] border-b border-[#e5e3df] dark:border-[#2a2a2e] text-[#787671] font-semibold text-[11px]">
                  <tr>
                    <th className="px-5 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last Login</th>
                    <th className="px-4 py-3">Activity</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ede9e4] dark:divide-[#252528]">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-[#787671]">
                        Loading registered accounts...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-[#787671]">
                        No user accounts found matching your query.
                      </td>
                    </tr>
                  ) : (
                    users.map((u: any) => {
                      const isCurrentUser = u.id === currentUser?.id;
                      const isGoogle = u.isGoogleLinked || u.accountType === 'GOOGLE';
                      const isDemo = u.role === 'DEMO' || u.accountType === 'DEMO';

                      return (
                        <tr key={u.id} className="hover:bg-[#f6f5f4] dark:hover:bg-[#1a1a1d] transition-colors">
                          {/* User info */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              {u.avatarUrl ? (
                                <img
                                  src={u.avatarUrl}
                                  alt={u.name}
                                  className="h-8 w-8 rounded-full object-cover border border-[#e5e3df] dark:border-[#2a2a2e]"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-[#f0eeec] dark:bg-[#252528] text-[#5645d4] dark:text-[#d6b6f6] font-bold flex items-center justify-center text-xs">
                                  {u.name?.slice(0, 2).toUpperCase() || 'ST'}
                                </div>
                              )}
                              <div className="truncate max-w-[200px]">
                                <div className="font-semibold text-[#1a1a1a] dark:text-white flex items-center gap-1.5">
                                  <span className="truncate">{u.name}</span>
                                  {isCurrentUser && (
                                    <span className="badge-notion-tag-purple text-[9px] py-0 px-1.5">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[#787671] truncate">{u.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Role Chip */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-semibold ${
                                u.role === 'ADMIN'
                                  ? 'badge-notion-tag-purple'
                                  : u.role === 'DEMO'
                                  ? 'badge-notion-tag-orange'
                                  : 'bg-[#f0eeec] text-[#37352f] dark:bg-[#252528] dark:text-[#a4a097]'
                              }`}
                            >
                              {u.role === 'ADMIN' && <Shield className="h-2.5 w-2.5" />}
                              {u.role === 'DEMO' && <Sparkles className="h-2.5 w-2.5" />}
                              {u.role}
                            </span>
                          </td>

                          {/* Provider */}
                          <td className="px-4 py-3.5">
                            {isGoogle ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0075de]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#0075de]" />
                                Google OAuth
                              </span>
                            ) : isDemo ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#dd5b00]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#dd5b00]" />
                                Demo Seeded
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#787671]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#a4a097]" />
                                Password
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-semibold ${
                                u.status === 'ACTIVE'
                                  ? 'badge-notion-tag-green'
                                  : 'bg-[#fde0ec] text-[#e03131] border border-[#ff64c8]/30'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  u.status === 'ACTIVE' ? 'bg-[#1aae39]' : 'bg-[#e03131]'
                                }`}
                              />
                              {u.status}
                            </span>
                          </td>

                          {/* Last Login */}
                          <td className="px-4 py-3.5 text-[11px] text-[#787671]">
                            {u.lastLoginAt
                              ? formatDistanceToNow(new Date(u.lastLoginAt), { addSuffix: true })
                              : 'Never'}
                          </td>

                          {/* Activity events count */}
                          <td className="px-4 py-3.5 text-[11px] text-[#787671]">
                            <strong className="text-[#1a1a1a] dark:text-white font-medium">
                              {u.activityCount ?? 0}
                            </strong>{' '}
                            events
                          </td>

                          {/* Actions: Notion 8px Buttons */}
                          <td className="px-5 py-3.5 text-right">
                            {u.status === 'ACTIVE' ? (
                              <button
                                onClick={() => setStatusActionUser({ ...u, targetStatus: 'DISABLED' })}
                                disabled={isCurrentUser}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] border border-[#e03131]/40 text-[#e03131] hover:bg-[#fde0ec] text-[11px] font-medium transition-colors disabled:opacity-40 cursor-pointer"
                                title={isCurrentUser ? 'You cannot disable your own admin session' : 'Disable user access'}
                              >
                                <UserX className="h-3 w-3" />
                                Disable
                              </button>
                            ) : (
                              <button
                                onClick={() => setStatusActionUser({ ...u, targetStatus: 'ACTIVE' })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] border border-[#1aae39]/40 text-[#1aae39] hover:bg-[#d9f3e1] text-[11px] font-medium transition-colors cursor-pointer"
                              >
                                <UserCheck className="h-3 w-3" />
                                Reactivate
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 bg-[#fbfbfa] dark:bg-[#19191c] border-t border-[#e5e3df] dark:border-[#2a2a2e] text-xs text-[#787671]">
                <span>
                  Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} users)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded-[6px] border border-[#c8c4be] dark:border-[#37352f] hover:bg-white dark:hover:bg-[#252528] disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-1 rounded-[6px] border border-[#c8c4be] dark:border-[#37352f] hover:bg-white dark:hover:bg-[#252528] disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: PRIVACY-SAFE ACTIVITY TIMELINE ================= */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          {/* Timeline Filter Bar */}
          <div className="p-3.5 rounded-[12px] bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-medium text-[#787671] flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                Filter Activity:
              </span>
              <select
                value={activityEventType}
                onChange={(e) => {
                  setActivityEventType(e.target.value);
                  setActivityPage(1);
                }}
                className="h-[36px] px-3 rounded-[8px] border border-[#c8c4be] dark:border-[#37352f] bg-white dark:bg-[#1c1c1f] text-xs text-[#1a1a1a] dark:text-white focus:outline-none focus:border-2 focus:border-[#5645d4] cursor-pointer"
              >
                <option value="">All Event Types</option>
                <option value="SIGN_IN">Sign In</option>
                <option value="SIGN_OUT">Sign Out</option>
                <option value="DOCUMENT_UPLOAD">Document Upload</option>
                <option value="DOCUMENT_DELETE">Document Delete</option>
                <option value="NOTE_CREATE">Note Create</option>
                <option value="NOTE_UPDATE">Note Edit</option>
                <option value="NOTE_DELETE">Note Delete</option>
                <option value="PDF_WORKSPACE_USE">PDF Workspace</option>
                <option value="COURSE_CREATE">Course Create</option>
                <option value="ASSIGNMENT_CREATE">Assignment Create</option>
                <option value="EXAM_CREATE">Exam Create</option>
                <option value="STUDY_SESSION_CREATE">Study Session</option>
                <option value="BACKUP_GENERATE">Backup Generate</option>
                <option value="ACCOUNT_STATUS_CHANGE">Admin Status Change</option>
              </select>

              <select
                value={activityIsDemo === undefined ? '' : String(activityIsDemo)}
                onChange={(e) => {
                  const val = e.target.value;
                  setActivityIsDemo(val === '' ? undefined : val === 'true');
                  setActivityPage(1);
                }}
                className="h-[36px] px-3 rounded-[8px] border border-[#c8c4be] dark:border-[#37352f] bg-white dark:bg-[#1c1c1f] text-xs text-[#1a1a1a] dark:text-white focus:outline-none focus:border-2 focus:border-[#5645d4] cursor-pointer"
              >
                <option value="">All Accounts (Demo & Regular)</option>
                <option value="false">Regular User Events Only</option>
                <option value="true">Demo Account Events Only</option>
              </select>
            </div>

            <div className="text-xs text-[#787671]">
              Showing {events.length} telemetry records
            </div>
          </div>

          {/* Activity Cards List */}
          <div className="space-y-2.5">
            {activityLoading ? (
              <div className="p-12 text-center text-[#787671] bg-white dark:bg-[#141416] rounded-[12px] border border-[#e5e3df] dark:border-[#2a2a2e]">
                Loading telemetry activity stream...
              </div>
            ) : events.length === 0 ? (
              <div className="p-12 text-center text-[#787671] bg-white dark:bg-[#141416] rounded-[12px] border border-[#e5e3df] dark:border-[#2a2a2e]">
                No activity events found matching selected criteria.
              </div>
            ) : (
              events.map((evt: any) => (
                <div
                  key={evt.id}
                  className="p-3.5 rounded-[12px] bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] shadow-2xs flex items-start justify-between gap-4 transition-all hover:border-[#c8c4be]"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-[8px] bg-[#f0eeec] text-[#5645d4] dark:bg-[#252528] dark:text-[#d6b6f6] flex items-center justify-center shrink-0 mt-0.5">
                      {evt.resourceType === 'DOCUMENT' ? (
                        <FileText className="h-4 w-4" />
                      ) : evt.resourceType === 'NOTE' ? (
                        <Lock className="h-4 w-4" />
                      ) : evt.resourceType === 'AUTH' ? (
                        <Shield className="h-4 w-4" />
                      ) : (
                        <Activity className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#1a1a1a] dark:text-white flex items-center gap-2">
                        <span>{evt.description}</span>
                        {evt.isDemo && (
                          <span className="badge-notion-tag-orange text-[9px] py-0 px-1.5">
                            Demo Mode
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#787671] mt-0.5 flex items-center gap-2">
                        <span>User: <strong className="text-[#37352f] dark:text-[#f0eeec]">{evt.userName}</strong> ({evt.userEmail})</span>
                        <span>•</span>
                        <span className="font-mono text-[10px] text-[#787671]">{evt.eventType}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs text-[#787671] font-medium block">
                      {formatDistanceToNow(new Date(evt.createdAt), { addSuffix: true })}
                    </span>
                    <span className="text-[10px] text-[#a4a097] font-mono">
                      {format(new Date(evt.createdAt), 'hh:mm a')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Activity Pagination */}
          {activityPagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-3.5 bg-white dark:bg-[#141416] rounded-[12px] border border-[#e5e3df] dark:border-[#2a2a2e] text-xs text-[#787671]">
              <span>
                Page {activityPagination.page} of {activityPagination.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={activityPage <= 1}
                  onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded-[6px] border border-[#c8c4be] dark:border-[#37352f] hover:bg-[#f6f5f4] dark:hover:bg-[#252528] disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  disabled={activityPage >= activityPagination.totalPages}
                  onClick={() => setActivityPage((p) => p + 1)}
                  className="p-1 rounded-[6px] border border-[#c8c4be] dark:border-[#37352f] hover:bg-[#f6f5f4] dark:hover:bg-[#252528] disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: BREAKDOWN TELEMETRY ================= */}
      {activeTab === 'breakdown' && (
        <div className="p-6 rounded-[12px] bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] shadow-2xs space-y-6">
          <div>
            <h3 className="text-base font-semibold text-[#1a1a1a] dark:text-white">
              Event Volume by Allowlisted Category
            </h3>
            <p className="text-xs text-[#787671] mt-0.5">
              Strictly non-sensitive operational telemetry breakdown across the application workspace.
            </p>
          </div>

          <div className="space-y-4">
            {categories.map((cat: any) => {
              const maxCount = Math.max(...categories.map((c: any) => c.count), 1);
              const percentage = Math.round((cat.count / maxCount) * 100);

              return (
                <div key={cat.eventType} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="font-mono text-[#37352f] dark:text-[#f0eeec]">{cat.eventType}</span>
                    <span className="text-[#5645d4] dark:text-[#d6b6f6] font-bold">{cat.count} occurrences</span>
                  </div>
                  <div className="h-2 w-full bg-[#f0eeec] dark:bg-[#252528] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#5645d4] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 4: FEATURE USAGE & ENGAGEMENT ================= */}
      {activeTab === 'features' && (
        <div className="space-y-6">
          {/* 8 Features Telemetry Grid */}
          <div className="p-6 rounded-[12px] bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] shadow-2xs space-y-4">
            <div>
              <h3 className="text-base font-semibold text-[#1a1a1a] dark:text-white">
                Application Feature Adoption & Volume
              </h3>
              <p className="text-xs text-[#787671] mt-0.5">
                Aggregate, privacy-safe counts across all seven major modules.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-[8px] bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Smart Calendar</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {featureData?.features?.calendarEvents ?? 0}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">academic events</p>
              </div>

              <div className="p-4 rounded-[8px] bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assignments & Tasks</p>
                <p className="text-2xl font-black text-[#5645d4] mt-1">
                  {featureData?.features?.assignments ?? 0}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">tasks across 7 statuses</p>
              </div>

              <div className="p-4 rounded-[8px] bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Study Sessions</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {featureData?.features?.studySessions ?? 0}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">persisted study logs</p>
              </div>

              <div className="p-4 rounded-[8px] bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Grade Assessments</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {featureData?.features?.assessments ?? 0}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">records & scenarios</p>
              </div>

              <div className="p-4 rounded-[8px] bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Version History</p>
                <p className="text-2xl font-black text-[#5645d4] dark:text-[#8070f6] mt-1">
                  {featureData?.features?.documentVersions ?? 0}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">document versions saved</p>
              </div>

              <div className="p-4 rounded-[8px] bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">In-App Notifications</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {featureData?.features?.inAppNotifications ?? 0}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">persistent reminders</p>
              </div>

              <div className="p-4 rounded-[8px] bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Secure Sharing</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {featureData?.features?.shareLinks ?? 0}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">active share links</p>
              </div>

              <div className="p-4 rounded-[8px] bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Database Backups</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {featureData?.features?.backups ?? 0}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">snapshots created</p>
              </div>
            </div>
          </div>

          {/* User Engagement Metrics */}
          <div className="p-6 rounded-[12px] bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] shadow-2xs space-y-4">
            <div>
              <h3 className="text-base font-semibold text-[#1a1a1a] dark:text-white">
                User Engagement & Retention Telemetry
              </h3>
              <p className="text-xs text-[#787671] mt-0.5">
                Authentication events, sign-in frequencies, and 7d/30d activity rates.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-[8px] bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Sign-Ins</p>
                <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {engagementData?.totalSignIns ?? 0}
                </p>
              </div>

              <div className="p-3.5 rounded-[8px] bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Users (7d)</p>
                <p className="text-xl font-black text-[#5645d4] mt-0.5">
                  {engagementData?.activeUsers7d ?? 0}
                </p>
              </div>

              <div className="p-3.5 rounded-[8px] bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Users (30d)</p>
                <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {engagementData?.activeUsers30d ?? 0}
                </p>
              </div>

              <div className="p-3.5 rounded-[8px] bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">New Users (7d)</p>
                <p className="text-xl font-black text-emerald-600 mt-0.5">
                  {engagementData?.newRegistrations7d ?? 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: ADMIN AUDIT TRAIL ================= */}
      {activeTab === 'audit' && (
        <div className="p-6 rounded-[12px] bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-[#1a1a1a] dark:text-white">
                Administrative Operation Audit Logs
              </h3>
              <p className="text-xs text-[#787671] mt-0.5">
                Immutable, server-verified records of account status changes, privilege adjustments, and setting modifications.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[8px] border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor (Admin ID)</th>
                  <th className="py-2.5 px-3">Action Type</th>
                  <th className="py-2.5 px-3">Target Resource</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(!auditData?.auditLogs || auditData.auditLogs.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      No administrative audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditData.auditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                        {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                        {log.actor?.email || log.actorId}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#5645d4] dark:text-[#8070f6]">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {log.targetType} {log.targetId ? `(${log.targetId.slice(0, 8)}...)` : ''}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {auditData && auditData.total > 15 && (
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-slate-400">
                Page {auditData.page} of {Math.ceil(auditData.total / auditData.limit)} ({auditData.total} total logs)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  disabled={auditPage <= 1}
                  className="px-3 py-1 rounded-[6px] border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setAuditPage((p) => p + 1)}
                  disabled={auditPage >= Math.ceil(auditData.total / auditData.limit)}
                  className="px-3 py-1 rounded-[6px] border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Account Status Toggle */}
      {statusActionUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1530]/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-[12px] bg-white dark:bg-[#141416] p-6 shadow-2xl border border-[#e5e3df] dark:border-[#2a2a2e] space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-[#1a1a1a] dark:text-white">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-[8px] ${
                  statusActionUser.targetStatus === 'DISABLED'
                    ? 'bg-[#fde0ec] text-[#e03131]'
                    : 'bg-[#d9f3e1] text-[#1aae39]'
                }`}
              >
                {statusActionUser.targetStatus === 'DISABLED' ? (
                  <UserX className="h-5 w-5" />
                ) : (
                  <UserCheck className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-base">
                  {statusActionUser.targetStatus === 'DISABLED'
                    ? 'Disable User Account?'
                    : 'Reactivate User Account?'}
                </h3>
                <p className="text-xs text-[#787671] truncate max-w-xs">{statusActionUser.email}</p>
              </div>
            </div>

            <p className="text-xs text-[#5d5b54] dark:text-[#a4a097] leading-relaxed">
              {statusActionUser.targetStatus === 'DISABLED'
                ? 'Disabling this account will instantly invalidate active sessions and prevent future logins. The student’s academic data remains securely preserved in the database.'
                : 'Reactivating this account will permit the student to log back into their existing workspace.'}
            </p>

            {statusActionUser.role === 'ADMIN' && statusActionUser.targetStatus === 'DISABLED' && (
              <div className="rounded-[8px] bg-[#fef7d6] border border-[#f5d75e] p-3 text-xs text-[#523410] flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-[#dd5b00] shrink-0 mt-0.5" />
                <span>
                  <strong>Safety Protection:</strong> The backend prevents disabling the last active administrator account.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStatusActionUser(null)}
                className="btn-notion-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  statusMutation.mutate({
                    id: statusActionUser.id,
                    status: statusActionUser.targetStatus,
                  })
                }
                disabled={statusMutation.isPending}
                className={`px-4 py-2 rounded-[8px] text-xs font-semibold text-white transition-colors cursor-pointer ${
                  statusActionUser.targetStatus === 'DISABLED'
                    ? 'bg-[#e03131] hover:bg-[#c92a2a]'
                    : 'bg-[#1aae39] hover:bg-[#158c2e]'
                }`}
              >
                {statusMutation.isPending ? 'Updating...' : `Confirm ${statusActionUser.targetStatus === 'DISABLED' ? 'Disable' : 'Reactivate'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
