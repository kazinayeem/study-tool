import React, { useState, useRef, useEffect } from 'react';
import {
  LogOut,
  User,
  Settings,
  Shield,
  ChevronDown,
  Pencil,
  Check,
  X,
  Camera,
  Mail,
  AlertCircle,
  Home,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/api';

interface ProfileDropdownProps {
  /** Called after a successful name / avatar update so the parent can refresh the user */
  onProfileUpdated?: () => void;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ onProfileUpdated }) => {
  const { user, logout, isDemo, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditingName(false);
        setNameError(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus name input when editing starts
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  // Sync name input when user data changes
  useEffect(() => {
    setNameInput(user?.name ?? '');
  }, [user?.name]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/', { replace: true });
  };

  const handleStartEditName = () => {
    if (isDemo) return;
    setNameInput(user?.name ?? '');
    setNameError(null);
    setNameSuccess(false);
    setEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError('Name cannot be empty.');
      return;
    }
    if (trimmed === user?.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    setNameError(null);
    try {
      await api.updateProfile({ name: trimmed });
      await refreshUser();
      setNameSuccess(true);
      setEditingName(false);
      onProfileUpdated?.();
      setTimeout(() => setNameSuccess(false), 2500);
    } catch (err: any) {
      setNameError(err?.message ?? 'Failed to update name.');
    } finally {
      setSavingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveName();
    if (e.key === 'Escape') {
      setEditingName(false);
      setNameError(null);
    }
  };

  if (!user) return null;

  const initials = user.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'S';

  const roleLabel =
    user.role === 'ADMIN' ? 'Administrator' :
    user.role === 'DEMO' ? 'Demo Student' :
    'Student';

  const accountTypeLabel =
    user.accountType === 'GOOGLE' ? 'Google Account' :
    user.accountType === 'DEMO' ? 'Demo Access' :
    'Password Account';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ─── Trigger Chip ─── */}
      <button
        id="profile-dropdown-trigger"
        onClick={() => { setOpen((v) => !v); setEditingName(false); setNameError(null); }}
        className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 hover:bg-[#f6f5f4] dark:hover:bg-[#1c1c1f] transition-colors cursor-pointer group"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {/* Avatar */}
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="h-7 w-7 rounded-full object-cover border border-[#e5e3df] dark:border-[#2a2a2e] shrink-0"
          />
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0f6b57] text-[11px] font-bold text-white shadow-xs">
            {initials}
          </div>
        )}

        {/* Name + Role */}
        <div className="hidden sm:block text-left leading-none">
          <span className="text-xs font-semibold text-[#1a1a1a] dark:text-[#f0eeec] block truncate max-w-[110px]">
            {nameSuccess ? (
              <span className="text-[#1aae39] flex items-center gap-1">
                <Check className="h-3 w-3" /> Saved!
              </span>
            ) : user.name}
          </span>
          <span className="text-[10px] text-[#787671] dark:text-[#a4a097] block mt-0.5">{roleLabel}</span>
        </div>

        <ChevronDown
          className={`h-3.5 w-3.5 text-[#787671] dark:text-[#a4a097] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ─── Dropdown Panel ─── */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 rounded-[12px] border border-[#e5e3df] dark:border-[#2a2a2e] bg-white dark:bg-[#1a1a1e] shadow-xl shadow-black/10 dark:shadow-black/40 z-50 overflow-hidden"
          role="menu"
          aria-label="Profile menu"
        >
          {/* ── Profile Header ── */}
          <div className="p-4 bg-[#fafaf9] dark:bg-[#141416] border-b border-[#e5e3df] dark:border-[#2a2a2e]">
            <div className="flex items-center gap-3">
              {/* Avatar (large) */}
              <div className="relative shrink-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="h-12 w-12 rounded-full object-cover border-2 border-[#e5e3df] dark:border-[#2a2a2e]"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0f6b57] text-sm font-bold text-white shadow-sm">
                    {initials}
                  </div>
                )}
                {isDemo && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#f9e79f] border-2 border-white dark:border-[#141416] flex items-center justify-center">
                    <Sparkles className="h-2.5 w-2.5 text-[#793400]" />
                  </span>
                )}
              </div>

              {/* Name + email / edit */}
              <div className="flex-1 min-w-0">
                {/* Editable Name Row */}
                {editingName && !isDemo ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={nameInputRef}
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={handleNameKeyDown}
                      maxLength={100}
                      className="flex-1 min-w-0 text-sm font-semibold text-[#1a1a1a] dark:text-white bg-white dark:bg-[#252528] border border-[#0f6b57] rounded-[6px] px-2 py-1 outline-none ring-2 ring-[#0f6b57]/20"
                      placeholder="Your full name"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={savingName}
                      className="p-1 rounded-[6px] text-[#1aae39] hover:bg-[#d9f3e1] dark:hover:bg-[#1aae39]/20 transition-colors cursor-pointer disabled:opacity-50"
                      title="Save"
                    >
                      {savingName ? (
                        <div className="h-3.5 w-3.5 border-2 border-[#1aae39] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => { setEditingName(false); setNameError(null); }}
                      className="p-1 rounded-[6px] text-[#787671] hover:bg-[#f6f5f4] dark:hover:bg-[#2a2a2e] transition-colors cursor-pointer"
                      title="Cancel"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-[#1a1a1a] dark:text-white truncate">
                      {nameSuccess ? (
                        <span className="text-[#1aae39] flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Updated!
                        </span>
                      ) : user.name}
                    </span>
                    {!isDemo && (
                      <button
                        onClick={handleStartEditName}
                        className="p-0.5 rounded-[4px] text-[#a4a097] hover:text-[#0f6b57] hover:bg-[#dcf0e8] dark:hover:bg-[#0d3b30]/40 transition-colors cursor-pointer shrink-0"
                        title="Edit name"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* Error message */}
                {nameError && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-[#e03131]">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {nameError}
                  </p>
                )}

                {/* Email */}
                <div className="flex items-center gap-1 mt-0.5">
                  <Mail className="h-3 w-3 text-[#a4a097] shrink-0" />
                  <span className="text-[11px] text-[#787671] dark:text-[#a4a097] truncate">{user.email}</span>
                </div>

                {/* Role badge + Account type */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                    user.role === 'ADMIN'
                      ? 'bg-[#fde0ec] text-[#9a3412] border-[#d9480f]/30 dark:bg-[#0d3b30]/50 dark:text-[#a8dcc9]'
                      : user.role === 'DEMO'
                      ? 'bg-[#fef7d6] text-[#793400] border-[#f5d75e]/40'
                      : 'bg-[#dcf0e8] text-[#0f6b57] border-[#0f6b57]/20 dark:bg-[#0d3b30]/40 dark:text-[#a8dcc9]'
                  }`}>
                    {user.role === 'ADMIN' && <Shield className="h-2.5 w-2.5" />}
                    {user.role === 'DEMO' && <Sparkles className="h-2.5 w-2.5" />}
                    {user.role === 'STUDENT' && <User className="h-2.5 w-2.5" />}
                    {roleLabel}
                  </span>
                  <span className="text-[10px] text-[#a4a097]">{accountTypeLabel}</span>
                </div>
              </div>
            </div>

            {isDemo && (
              <p className="mt-3 text-[11px] text-[#787671] dark:text-[#a4a097] bg-[#fef7d6] dark:bg-[#26241b] border border-[#f5d75e]/40 rounded-[6px] px-2.5 py-1.5">
                Profile changes are disabled in Demo mode.
              </p>
            )}
          </div>

          {/* ── Menu Items ── */}
          <div className="p-1.5">
            {/* My Profile / Settings */}
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[8px] text-sm text-[#37352f] dark:text-[#f0eeec] hover:bg-[#f6f5f4] dark:hover:bg-[#252528] transition-colors"
              role="menuitem"
            >
              <div className="h-7 w-7 rounded-[6px] bg-[#dcf0e8] dark:bg-[#0d3b30]/50 flex items-center justify-center shrink-0">
                <Settings className="h-3.5 w-3.5 text-[#0f6b57] dark:text-[#a8dcc9]" />
              </div>
              <div className="text-left">
                <span className="font-medium block text-[13px]">Preferences & Settings</span>
                <span className="text-[11px] text-[#787671] dark:text-[#a4a097]">Notifications, appearance, backup</span>
              </div>
            </Link>

            {/* Change Name shortcut (quick access) */}
            {!isDemo && (
              <button
                onClick={() => { setOpen(false); setTimeout(() => { setOpen(true); handleStartEditName(); }, 50); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[8px] text-sm text-[#37352f] dark:text-[#f0eeec] hover:bg-[#f6f5f4] dark:hover:bg-[#252528] transition-colors"
                role="menuitem"
              >
                <div className="h-7 w-7 rounded-[6px] bg-[#d9f3e1] dark:bg-[#1aae39]/20 flex items-center justify-center shrink-0">
                  <Pencil className="h-3.5 w-3.5 text-[#1aae39]" />
                </div>
                <div className="text-left">
                  <span className="font-medium block text-[13px]">Change Display Name</span>
                  <span className="text-[11px] text-[#787671] dark:text-[#a4a097]">Update how your name appears</span>
                </div>
              </button>
            )}

            {/* Landing Page (always accessible) */}
            <Link
              to="/landing"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[8px] text-sm text-[#37352f] dark:text-[#f0eeec] hover:bg-[#f6f5f4] dark:hover:bg-[#252528] transition-colors"
              role="menuitem"
            >
              <div className="h-7 w-7 rounded-[6px] bg-[#dcecfa] dark:bg-[#0075de]/20 flex items-center justify-center shrink-0">
                <Home className="h-3.5 w-3.5 text-[#0075de] dark:text-[#a2d2ff]" />
              </div>
              <div className="text-left">
                <span className="font-medium block text-[13px]">View Landing Page</span>
                <span className="text-[11px] text-[#787671] dark:text-[#a4a097]">BornoFlow product overview</span>
              </div>
            </Link>

            {/* Admin Panel (admins only) */}
            {user.role === 'ADMIN' && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[8px] text-sm text-[#37352f] dark:text-[#f0eeec] hover:bg-[#f6f5f4] dark:hover:bg-[#252528] transition-colors"
                role="menuitem"
              >
                <div className="h-7 w-7 rounded-[6px] bg-[#fde0ec] dark:bg-[#9a3412]/20 flex items-center justify-center shrink-0">
                  <Shield className="h-3.5 w-3.5 text-[#9a3412]" />
                </div>
                <div className="text-left">
                  <span className="font-medium block text-[13px]">Admin Dashboard</span>
                  <span className="text-[11px] text-[#787671] dark:text-[#a4a097]">Users, logs, system health</span>
                </div>
              </Link>
            )}

            <div className="my-1 border-t border-[#f0eeec] dark:border-[#252528]" />

            {/* Sign Out */}
            <button
              id="profile-logout-btn"
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[8px] text-sm text-[#e03131] hover:bg-[#fde0ec] dark:hover:bg-[#0d3b30]/30 transition-colors cursor-pointer"
              role="menuitem"
            >
              <div className="h-7 w-7 rounded-[6px] bg-[#fde0ec] dark:bg-[#e03131]/10 flex items-center justify-center shrink-0">
                <LogOut className="h-3.5 w-3.5 text-[#e03131]" />
              </div>
              <div className="text-left">
                <span className="font-medium block text-[13px]">Sign Out</span>
                <span className="text-[11px] text-[#a4a097]">End this session securely</span>
              </div>
            </button>
          </div>

          {/* ── Footer ── */}
          <div className="px-4 py-2.5 bg-[#fafaf9] dark:bg-[#141416] border-t border-[#e5e3df] dark:border-[#2a2a2e] flex items-center justify-between">
            <span className="text-[10px] text-[#a4a097]">BornoFlow Academic OS</span>
            <span className="text-[10px] text-[#a4a097]">Local · Private · Secure</span>
          </div>
        </div>
      )}
    </div>
  );
};
