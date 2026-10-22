import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { SiteFooter } from '../../components/layout/SiteFooter';

const getInitialError = (): string | null => {
  const errParam = new URLSearchParams(window.location.search).get('error');
  if (!errParam) return null;
  const knownErrors: Record<string, string> = {
    account_disabled:
      'Your account has been disabled by an administrator. Please contact your school support team.',
    oauth_not_configured:
      'Google sign-in is not available right now. Please sign in with your email instead.',
    email_not_verified: 'Your Google email could not be verified, so we could not sign you in.',
  };
  return knownErrors[errParam] || 'We could not complete sign-in. Please try again.';
};

const CARD_CLASS =
  'rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_18px_40px_-24px_rgba(17,24,39,0.35)]';

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

const AcademicVisualPanel: React.FC = () => (
  <aside
    aria-hidden="true"
    className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-[#f1f8f5] p-10 lg:flex xl:p-16"
  >
    <div className="w-full max-w-[560px]">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-[11px] font-medium text-[#0f6b57]">
        <Sparkles className="h-3 w-3" />
        Stay ahead this semester
      </span>
      <h2 className="mt-4 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-[#111827] xl:text-[32px]">
        Everything you need to stay ahead.
      </h2>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#64748B]">
        Manage your courses, organize your notes, and make every semester count.
      </p>

      <div className="mt-10 flex gap-5">
        <div className="flex w-1/2 flex-col gap-5 pt-7">
          <div className={CARD_CLASS}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EEF0FE] text-[#0f6b57]">
                  <Calendar className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold text-[#111827]">This week</span>
              </div>
              <span className="rounded-full bg-[#f1f8f5] px-2 py-0.5 text-[11px] font-medium text-[#0f6b57]">
                Week 8
              </span>
            </div>
            <div className="space-y-2.5">
              {schedule.map((item) => (
                <div key={item.day} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 text-[11px] font-semibold text-[#94A3B8]">
                      {item.day}
                    </span>
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: item.dot }}
                    />
                    <span className="text-[12px] font-medium text-[#111827]">
                      {item.course}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#64748B]">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={CARD_CLASS}>
            <span className="text-sm font-semibold text-[#111827]">Course progress</span>
            <div className="mt-3.5 space-y-3">
              {courseProgress.map((course) => (
                <div key={course.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-medium text-[#111827]">{course.name}</span>
                    <span className="text-[#64748B]">{course.value}%</span>
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
                <span className="text-base font-semibold text-[#111827]">3.82</span>
              </div>
            </div>
            <span className="mt-2 text-[12px] font-medium text-[#111827]">Current GPA</span>
            <span className="mt-1 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[10px] font-medium text-[#059669]">
              On track
            </span>
          </div>

          <div className={CARD_CLASS}>
            <span className="text-sm font-semibold text-[#111827]">Tasks</span>
            <div className="mt-3 space-y-2.5">
              {checklist.map((task) => (
                <div key={task.label} className="flex items-center gap-2.5">
                  {task.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0f6b57]" />
                  ) : (
                    <span className="h-4 w-4 shrink-0 rounded-full border border-[#CBD5E1]" />
                  )}
                  <span
                    className={cn(
                      'text-[12px]',
                      task.done ? 'text-[#94A3B8] line-through' : 'font-medium text-[#111827]'
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
          <span className="text-sm font-semibold text-[#111827]">Semester timeline</span>
          <span className="text-[11px] text-[#64748B]">Fall 2026</span>
        </div>
        <div className="relative">
          <div className="absolute inset-x-0 top-[5px] h-0.5 rounded-full bg-[#E5E7EB]" />
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
                <span className="text-[10px] font-medium text-[#64748B]">{step.label}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-[11px] text-[#64748B]">
          Week 8 of 16 · <span className="font-medium text-[#111827]">50% complete</span>
        </p>
      </div>
    </div>
  </aside>
);

export const LoginPage: React.FC = () => {
  const { user, loginDemo, loginPassword, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(getInitialError);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<'password' | 'demo' | null>(null);
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(false);

  useEffect(() => {
    if (user) {
      const from =
        (location.state as any)?.from?.pathname || (location.state as any)?.from || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

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
        'Google sign-in is not available for this workspace right now. Please sign in with your email or explore the demo account.'
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
      const from =
        (location.state as any)?.from?.pathname || (location.state as any)?.from || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'We could not open the demo account. Please try again.');
    } finally {
      setPending(null);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim() || !password) {
      setError('Please enter both your email and password.');
      return;
    }

    setPending('password');
    try {
      await loginPassword(password, email.trim());
      const from =
        (location.state as any)?.from?.pathname || (location.state as any)?.from || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password. Please try again.');
    } finally {
      setPending(null);
    }
  };

  const handleForgotPassword = () => {
    setError(null);
    setNotice(
      'Password recovery is managed by your workspace administrator. Please contact them to reset your credentials, or continue with Google.'
    );
  };

  const isBusy = pending !== null || isLoading;

  return (
    <div className="flex min-h-screen w-full bg-white font-sans text-[#111827] selection:bg-[#0f6b57] selection:text-white">
      <main className="flex w-full flex-col lg:h-screen lg:w-1/2 lg:overflow-y-auto">
        <div className="flex flex-1 flex-col px-6 py-8 sm:px-10 lg:px-14">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f6b57] text-white shadow-[0_8px_20px_-8px_rgba(15,107,87,0.9)]">
                <GraduationCap className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <span className="text-lg font-semibold tracking-tight text-[#111827]">
                ScholarFlow
              </span>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-[#64748B] transition-colors hover:text-[#111827] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/30"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Home
            </Link>
          </div>

          <div className="flex flex-1 flex-col justify-center py-10 sm:py-12">
            <div className="mx-auto w-full max-w-[400px]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0f6b57]">
                Your academic space
              </span>
              <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.02em] text-[#111827]">
                Welcome back.
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                Your semester, organized. Your goals, within reach.
              </p>

              {error && (
                <div
                  role="alert"
                  className="mt-6 flex items-start gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-[#7F1D1D]">
                      We couldn&apos;t sign you in
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-[#991B1B]">{error}</p>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="mt-1.5 text-[12px] font-medium text-[#B91C1C] underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626]/30"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {notice && (
                <div
                  role="status"
                  className="mt-6 flex items-start gap-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-3.5"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#64748B]" />
                  <div className="flex-1">
                    <p className="text-[12px] leading-relaxed text-[#475569]">{notice}</p>
                    <button
                      type="button"
                      onClick={() => setNotice(null)}
                      className="mt-1.5 text-[12px] font-medium text-[#0f6b57] underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/30"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                id="google-login-btn"
                onClick={handleGoogleLogin}
                disabled={isBusy}
                className="mt-6 flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-[#E5E7EB] bg-white text-sm font-medium text-[#111827] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleMark className="h-4 w-4 shrink-0" />
                Continue with Google
              </button>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-[#E5E7EB]" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#94A3B8]">
                  or continue with email
                </span>
                <span className="h-px flex-1 bg-[#E5E7EB]" />
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-[13px] font-medium text-[#374151]"
                  >
                    Email address
                  </label>
                  <div className="relative mt-1.5">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@university.edu"
                      className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white pl-10 pr-3 text-sm text-[#111827] transition-colors placeholder:text-[#9CA3AF] focus:border-[#0f6b57] focus:outline-none focus:ring-2 focus:ring-[#0f6b57]/20"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-[13px] font-medium text-[#374151]"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="rounded text-[12px] font-medium text-[#0f6b57] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/30"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative mt-1.5">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white pl-10 pr-11 text-sm text-[#111827] transition-colors placeholder:text-[#9CA3AF] focus:border-[#0f6b57] focus:outline-none focus:ring-2 focus:ring-[#0f6b57]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#94A3B8] transition-colors hover:bg-[#F1F5F9] hover:text-[#0f6b57] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/30"
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
                      Signing in…
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>

              <div className="mt-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-[#E5E7EB]" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#94A3B8]">
                  or
                </span>
                <span className="h-px flex-1 bg-[#E5E7EB]" />
              </div>

              <button
                type="button"
                id="demo-student-login-btn"
                onClick={handleDemoLogin}
                disabled={isBusy}
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white text-sm font-medium text-[#111827] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending === 'demo' ? (
                  <>
                    <span
                      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#0f6b57]/30 border-t-[#0f6b57]"
                      aria-hidden="true"
                    />
                    Opening demo…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-[#0f6b57]" />
                    Explore demo student account
                  </>
                )}
              </button>

              <p className="mt-8 text-center text-sm text-[#64748B]">
                New to ScholarFlow?{' '}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="rounded font-medium text-[#0f6b57] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/30"
                >
                  Create an account
                </button>
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
