import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { useI18n } from '../../i18n/I18nContext';
import type { TranslationKey } from '../../i18n/translations';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { BrandLockup } from '../../components/common/BrandLockup';

/** Maps the `?error=` query value from the OAuth redirect to a translation key. */
const getInitialErrorKey = (): TranslationKey | null => {
  const errParam = new URLSearchParams(window.location.search).get('error');
  if (!errParam) return null;
  const known: Record<string, TranslationKey> = {
    account_disabled: 'login.err.disabled',
    oauth_not_configured: 'login.err.oauth',
    email_not_verified: 'login.err.unverified',
  };
  return known[errParam] ?? 'login.err.generic';
};

const CARD_CLASS =
  'rounded-2xl border border-[#E5E7EB] dark:border-[#2a2a2e] bg-white dark:bg-[#0f0f11] p-4 shadow-[0_18px_40px_-24px_rgba(17,24,39,0.35)]';

const GoogleMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const Spinner: React.FC = () => (
  <span
    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
    aria-hidden="true"
  />
);

const schedule = [
  { day: 'Mon', course: 'CSE 401', time: '9:00 AM', dot: '#0f6b57' },
  { day: 'Wed', course: 'MATH 214', time: '11:30 AM', dot: '#10B981' },
  { day: 'Fri', course: 'PHYS 102', time: '2:00 PM', dot: '#F59E0B' },
];

const courseProgress = [
  { name: 'Distributed Systems', value: 78 },
  { name: 'Linear Algebra', value: 64 },
  { name: 'Physics II', value: 52 },
];

const checklist = [
  { label: 'Raft consensus notes', done: true },
  { label: 'Midterm revision set', done: true },
  { label: 'RPC benchmark lab', done: false },
  { label: 'Chapter 4 reading', done: false },
];

const timeline = [
  { label: 'Aug', done: true },
  { label: 'Sep', done: true },
  { label: 'Oct', done: true },
  { label: 'Nov', done: false },
  { label: 'Dec', done: false },
];

const AcademicVisualPanel: React.FC = () => {
  const { t } = useI18n();
  return (
  <aside
    aria-hidden="true"
    className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-[#f1f8f5] dark:bg-[#0d1512] p-10 lg:flex xl:p-16"
  >
    <div className="w-full max-w-[560px]">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] dark:border-[#2a2a2e] bg-white dark:bg-[#0f0f11] px-3 py-1 text-[11px] font-medium text-[#0f6b57] dark:text-[#4ccba5]">
        <Sparkles className="h-3 w-3" />
        {t('login.eyebrow')}
      </span>
      <h2 className="mt-4 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-[#111827] dark:text-[#f0eeec] xl:text-[32px]">
        {t('login.panel.title')}
      </h2>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#64748B] dark:text-[#a4a097]">
        {t('login.panel.body')}
      </p>

      <div className="mt-10 flex gap-5">
        <div className="flex w-1/2 flex-col gap-5 pt-7">
          <div className={CARD_CLASS}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EEF0FE] dark:bg-[#0d3b30] text-[#0f6b57] dark:text-[#4ccba5]">
                  <Calendar className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold text-[#111827] dark:text-[#f0eeec]">{t('login.panel.week')}</span>
              </div>
              <span className="rounded-full bg-[#f1f8f5] dark:bg-[#0d1512] px-2 py-0.5 text-[11px] font-medium text-[#0f6b57] dark:text-[#4ccba5]">
                Week 8
              </span>
            </div>
            <div className="space-y-2.5">
              {schedule.map((item) => (
                <div key={item.day} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 text-[11px] font-semibold text-[#94A3B8] dark:text-[#787671]">
                      {item.day}
                    </span>
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: item.dot }}
                    />
                    <span className="text-[12px] font-medium text-[#111827] dark:text-[#f0eeec]">
                      {item.course}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#64748B] dark:text-[#a4a097]">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={CARD_CLASS}>
            <span className="text-sm font-semibold text-[#111827] dark:text-[#f0eeec]">{t('login.panel.progress')}</span>
            <div className="mt-3.5 space-y-3">
              {courseProgress.map((course) => (
                <div key={course.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-medium text-[#111827] dark:text-[#f0eeec]">{course.name}</span>
                    <span className="text-[#64748B] dark:text-[#a4a097]">{course.value}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#F1F5F9]">
                    <div
                      className="h-full rounded-full bg-[#0f6b57]"
                      style={{ width: `${course.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex w-1/2 flex-col gap-5">
          <div className={cn(CARD_CLASS, 'flex flex-col items-center text-center')}>
            <div className="relative h-20 w-20">
              <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="#EEF0FE"
                  strokeWidth="3.5"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="#0f6b57"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray="90 100"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-semibold text-[#111827] dark:text-[#f0eeec]">3.82</span>
              </div>
            </div>
            <span className="mt-2 text-[12px] font-medium text-[#111827] dark:text-[#f0eeec]">{t('login.panel.gpa')}</span>
            <span className="mt-1 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[10px] font-medium text-[#059669]">
              On track
            </span>
          </div>

          <div className={CARD_CLASS}>
            <span className="text-sm font-semibold text-[#111827] dark:text-[#f0eeec]">{t('login.panel.tasks')}</span>
            <div className="mt-3 space-y-2.5">
              {checklist.map((task) => (
                <div key={task.label} className="flex items-center gap-2.5">
                  {task.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0f6b57] dark:text-[#4ccba5]" />
                  ) : (
                    <span className="h-4 w-4 shrink-0 rounded-full border border-[#CBD5E1]" />
                  )}
                  <span
                    className={cn(
                      'text-[12px]',
                      task.done ? 'text-[#94A3B8] dark:text-[#787671] line-through' : 'font-medium text-[#111827] dark:text-[#f0eeec]'
                    )}
                  >
                    {task.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={cn(CARD_CLASS, 'mt-5')}>
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-[#111827] dark:text-[#f0eeec]">{t('login.panel.timeline')}</span>
          <span className="text-[11px] text-[#64748B] dark:text-[#a4a097]">Fall 2026</span>
        </div>
        <div className="relative">
          <div className="absolute inset-x-0 top-[5px] h-0.5 rounded-full bg-[#E5E7EB] dark:bg-[#2a2a2e]" />
          <div className="absolute left-0 top-[5px] h-0.5 w-1/2 rounded-full bg-[#0f6b57]" />
          <div className="relative flex items-start justify-between">
            {timeline.map((step) => (
              <div key={step.label} className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full ring-4 ring-white',
                    step.done ? 'bg-[#0f6b57]' : 'bg-[#CBD5E1]'
                  )}
                />
                <span className="text-[10px] font-medium text-[#64748B] dark:text-[#a4a097]">{step.label}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-[11px] text-[#64748B] dark:text-[#a4a097]">
          Week 8 of 16 · <span className="font-medium text-[#111827] dark:text-[#f0eeec]">50% complete</span>
        </p>
      </div>
    </div>
  </aside>
  );
};

/**
 * Owner sign-in defaults. The email is always pre-filled; the password only in dev builds so the
 * default password never ships inside a production bundle.
 */
const OWNER_DEFAULT_EMAIL = 'owner@scholarflow.local';
const OWNER_DEFAULT_PASSWORD = import.meta.env.DEV ? 'Password123!' : '';

/** Where to go after signing in: the page that sent the visitor here (with its query), else a role default. */
function redirectTarget(state: unknown, mode: 'student' | 'owner', role?: string): string {
  const from = (state as { from?: { pathname?: string; search?: string } | string } | null)?.from;
  if (typeof from === 'string') return from;
  if (from?.pathname) return `${from.pathname}${from.search ?? ''}`;
  return role === 'ADMIN' ? '/owner' : '/dashboard';
}

export const LoginPage: React.FC = () => {
  const { user, loginDemo, loginPassword, isLoading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const startsAsOwner = new URLSearchParams(window.location.search).get('as') === 'owner';
  const [email, setEmail] = useState(startsAsOwner ? OWNER_DEFAULT_EMAIL : '');
  const [password, setPassword] = useState(startsAsOwner ? OWNER_DEFAULT_PASSWORD : '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    const key = getInitialErrorKey();
    return key ? t(key) : null;
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<'student' | 'owner'>(() =>
    new URLSearchParams(window.location.search).get('as') === 'owner' ? 'owner' : 'student'
  );
  const [pending, setPending] = useState<'password' | 'demo' | null>(null);
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(redirectTarget(location.state, mode, user.role), { replace: true });
    }
  }, [user, navigate, location, mode]);

  useEffect(() => {
    api
      .getAuthStatus()
      .then((status) => {
        setGoogleAuthEnabled(Boolean(status?.googleAuthEnabled));
      })
      .catch(() => {});
  }, []);

  const handleGoogleLogin = () => {
    setError(null);
    setNotice(null);
    if (!googleAuthEnabled) {
      setError(
        t('login.err.googleOff')
      );
      return;
    }
    window.location.href = 'http://localhost:5001/auth/google';
  };

  const handleDemoLogin = async () => {
    setError(null);
    setNotice(null);
    setPending('demo');
    try {
      await loginDemo();
      navigate(redirectTarget(location.state, 'student'), { replace: true });
    } catch (err: any) {
      setError(err?.message || t('login.err.demo'));
    } finally {
      setPending(null);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim() || !password) {
      setError(t('login.err.missing'));
      return;
    }

    setPending('password');
    try {
      await loginPassword(password, email.trim(), mode === 'owner' ? 'ADMIN' : undefined);
      navigate(redirectTarget(location.state, 'student'), { replace: true });
    } catch (err: any) {
      setError(err?.message === 'ROLE_MISMATCH' ? t('login.owner.notOwner') : err?.message || t('login.err.invalid'));
    } finally {
      setPending(null);
    }
  };

  const handleForgotPassword = () => {
    setError(null);
    setNotice(
      t('login.notice.forgot')
    );
  };

  const isBusy = pending !== null || isLoading;

  return (
    <div className="flex min-h-dvh w-full bg-white dark:bg-[#0f0f11] font-sans text-[#111827] dark:text-[#f0eeec] selection:bg-[#0f6b57] selection:text-white">
      <main className="flex w-full flex-col lg:h-dvh lg:w-1/2 lg:overflow-y-auto">
        <div className="flex flex-1 flex-col px-6 py-8 sm:px-10 lg:px-14">
          <div className="flex items-center justify-between gap-2">
            <BrandLockup />
            <div className="flex items-center gap-1">
            <LanguageSwitcher variant="compact" />
            <ThemeToggle />
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-[#64748B] dark:text-[#a4a097] transition-colors hover:text-[#111827] dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/30"
            >
              <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
              {t('login.home')}
            </Link>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center py-10 sm:py-12">
            <div className="mx-auto w-full max-w-[400px]">
              <div role="tablist" aria-label="Account type" className="grid grid-cols-2 rounded-xl bg-[#f1f5f2] p-1 dark:bg-[#19191c]">
                {(['student', 'owner'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => {
                      setMode(m);
                      setError(null);
                      setNotice(null);
                      // Swap the owner defaults in and out without touching anything the user typed.
                      if (m === 'owner') {
                        if (!email) setEmail(OWNER_DEFAULT_EMAIL);
                        if (!password) setPassword(OWNER_DEFAULT_PASSWORD);
                      } else {
                        if (email === OWNER_DEFAULT_EMAIL) setEmail('');
                        if (password === OWNER_DEFAULT_PASSWORD) setPassword('');
                      }
                    }}
                    className={`h-9 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/40 ${
                      mode === m
                        ? 'bg-white text-[#0d2a22] shadow-sm dark:bg-[#0f0f11] dark:text-white'
                        : 'text-[#64748B] hover:text-[#111827] dark:text-[#a4a097] dark:hover:text-white'
                    }`}
                  >
                    {t(m === 'student' ? 'login.tab.student' : 'login.tab.owner')}
                  </button>
                ))}
              </div>
              <h1 className="mt-6 text-[30px] font-semibold leading-tight tracking-[-0.02em] text-[#111827] dark:text-[#f0eeec]">
                {mode === 'owner' ? t('login.owner.title') : t('login.title')}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B] dark:text-[#a4a097]">
                {mode === 'owner' ? t('login.owner.subtitle') : t('login.subtitle')}
              </p>

              {error && (
                <div
                  role="alert"
                  className="mt-6 flex items-start gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] dark:bg-[#3a1620] p-3.5"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-[#7F1D1D] dark:text-[#ffb4b4]">
                      {t('login.errorTitle')}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-[#991B1B] dark:text-[#ff9c9c]">{error}</p>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="mt-1.5 text-[12px] font-medium text-[#B91C1C] underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626]/30"
                    >
                      {t('common.dismiss')}
                    </button>
                  </div>
                </div>
              )}

              {notice && (
                <div
                  role="status"
                  className="mt-6 flex items-start gap-3 rounded-xl border border-[#E5E7EB] dark:border-[#2a2a2e] bg-[#F8FAFC] dark:bg-[#141416] p-3.5"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#64748B] dark:text-[#a4a097]" />
                  <div className="flex-1">
                    <p className="text-[12px] leading-relaxed text-[#475569] dark:text-[#a4a097]">{notice}</p>
                    <button
                      type="button"
                      onClick={() => setNotice(null)}
                      className="mt-1.5 text-[12px] font-medium text-[#0f6b57] dark:text-[#4ccba5] underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/30"
                    >
                      {t('common.dismiss')}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'student' && (
                <>
              <button
                type="button"
                id="google-login-btn"
                onClick={handleGoogleLogin}
                disabled={isBusy}
                className="mt-6 flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-[#E5E7EB] dark:border-[#2a2a2e] bg-white dark:bg-[#0f0f11] text-sm font-medium text-[#111827] dark:text-[#f0eeec] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC] dark:hover:bg-[#202024] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleMark className="h-4 w-4 shrink-0" />
                {t('login.google')}
              </button>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-[#E5E7EB] dark:bg-[#2a2a2e]" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#94A3B8] dark:text-[#787671]">
                  {t('login.orEmail')}
                </span>
                <span className="h-px flex-1 bg-[#E5E7EB] dark:bg-[#2a2a2e]" />
              </div>

                </>
              )}

              <form onSubmit={handlePasswordSubmit} className={`space-y-4 ${mode === 'owner' ? 'mt-6' : ''}`}>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-[13px] font-medium text-[#374151]"
                  >
                    {t('login.email')}
                  </label>
                  <div className="relative mt-1.5">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8] dark:text-[#787671]" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('login.emailPlaceholder')}
                      className="h-11 w-full rounded-xl border border-[#E5E7EB] dark:border-[#2a2a2e] bg-white dark:bg-[#0f0f11] pl-10 pr-3 text-sm text-[#111827] dark:text-[#f0eeec] transition-colors placeholder:text-[#9CA3AF] focus:border-[#0f6b57] focus:outline-none focus:ring-2 focus:ring-[#0f6b57]/20"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-[13px] font-medium text-[#374151]"
                    >
                      {t('login.password')}
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="rounded text-[12px] font-medium text-[#0f6b57] dark:text-[#4ccba5] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/30"
                    >
                      {t('login.forgot')}
                    </button>
                  </div>
                  <div className="relative mt-1.5">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8] dark:text-[#787671]" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('login.passwordPlaceholder')}
                      className="h-11 w-full rounded-xl border border-[#E5E7EB] dark:border-[#2a2a2e] bg-white dark:bg-[#0f0f11] pl-10 pr-11 text-sm text-[#111827] dark:text-[#f0eeec] transition-colors placeholder:text-[#9CA3AF] focus:border-[#0f6b57] focus:outline-none focus:ring-2 focus:ring-[#0f6b57]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                      aria-pressed={showPassword}
                      className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#94A3B8] dark:text-[#787671] transition-colors hover:bg-[#F1F5F9] hover:text-[#0f6b57] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/30"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0f6b57] text-sm font-medium text-white transition-colors hover:bg-[#0f6b57] active:bg-[#0b5645] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {pending === 'password' ? (
                    <>
                      <Spinner />
                      {t('login.signingIn')}
                    </>
                  ) : (
                    mode === 'owner' ? t('login.owner.button') : t('login.signIn')
                  )}
                </button>
              </form>

              {mode === 'student' && (
                <>
              <div className="mt-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-[#E5E7EB] dark:bg-[#2a2a2e]" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#94A3B8] dark:text-[#787671]">
                  {t('login.or')}
                </span>
                <span className="h-px flex-1 bg-[#E5E7EB] dark:bg-[#2a2a2e]" />
              </div>

              <button
                type="button"
                id="demo-student-login-btn"
                onClick={handleDemoLogin}
                disabled={isBusy}
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] dark:border-[#2a2a2e] bg-white dark:bg-[#0f0f11] text-sm font-medium text-[#111827] dark:text-[#f0eeec] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC] dark:hover:bg-[#202024] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending === 'demo' ? (
                  <>
                    <span
                      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#0f6b57]/30 border-t-[#0f6b57]"
                      aria-hidden="true"
                    />
                    {t('login.openingDemo')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-[#0f6b57] dark:text-[#4ccba5]" />
                    {t('login.demo')}
                  </>
                )}
              </button>

                </>
              )}

              <p className="mt-6 text-center text-xs leading-relaxed text-[#787671]">
                {t('login.consent')}{' '}
                <Link to="/terms" className="font-medium underline underline-offset-2 hover:text-[#0f6b57]">
                  {t('legal.terms')}
                </Link>{' '}
                {t('login.and')}{' '}
                <Link to="/privacy" className="font-medium underline underline-offset-2 hover:text-[#0f6b57]">
                  {t('legal.privacy')}
                </Link>
                .
              </p>

              {mode === 'student' && (
              <p className="mt-4 text-center text-sm text-[#64748B] dark:text-[#a4a097]">
                {t('login.newHere')}{' '}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="rounded font-medium text-[#0f6b57] dark:text-[#4ccba5] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/30"
                >
                  {t('login.createAccount')}
                </button>
              </p>
              )}

              <p className="mt-4 text-center text-sm">
                <Link to="/#pricing" className="font-medium text-[#0f6b57] underline-offset-2 hover:underline dark:text-[#4ccba5]">
                  {t('login.pricing')}
                </Link>
              </p>
            </div>
          </div>
        </div>

        <SiteFooter />
      </main>

      <AcademicVisualPanel />
    </div>
  );
};

export default LoginPage;
