import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CalendarDays,
  Calculator,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  Library,
  ListChecks,
  Menu,
  NotebookPen,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { useI18n } from '../../i18n/I18nContext';
import type { TranslationKey } from '../../i18n/translations';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { BrandLockup } from '../../components/common/BrandLockup';
import { PricingSection } from './PricingSection';
import { cn } from '../../lib/utils';

const BRAND = '#0f6b57';

const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f6b57] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.08)] transition-colors hover:bg-[#0f6b57] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0f0f11]';
const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] dark:border-[#2a2a2e] bg-white dark:bg-[#0f0f11] px-5 py-2.5 text-sm font-semibold text-[#111827] dark:text-[#f0eeec] transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#202024] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0f0f11]';

/* ───────────────────────── Data ───────────────────────── */

interface NavLink {
  labelKey: TranslationKey;
  id: string;
}

const NAV_LINKS: NavLink[] = [
  { labelKey: 'landing.nav.features', id: 'features' },
  { labelKey: 'landing.nav.how', id: 'how-it-works' },
  { labelKey: 'landing.nav.benefits', id: 'benefits' },
  { labelKey: 'landing.nav.pricing', id: 'pricing' },
  { labelKey: 'landing.nav.faq', id: 'faq' },
];

type IconType = React.ComponentType<{ className?: string; strokeWidth?: number }>;

/** Icons per feature group; the text for each lives in the translation files. */
const FEATURE_GROUP_ICONS: { id: 'g1' | 'g2' | 'g3'; icons: IconType[] }[] = [
  { id: 'g1', icons: [CalendarDays, BookOpen, GraduationCap, Calendar] },
  { id: 'g2', icons: [ListChecks, Clock, Sparkles, Calculator] },
  { id: 'g3', icons: [FileText, FolderOpen, Library, Camera, Search] },
];

const STEP_ICONS: IconType[] = [ShieldCheck, CalendarDays, Target];
const BENEFIT_COUNT = 4;
const FAQ_COUNT = 8;

/* ───────────────────────── Primitives ───────────────────────── */

const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
      className
    )}
    style={{ backgroundColor: 'var(--landing-tint)', color: 'var(--landing-brand-text)' }}
  >
    {children}
  </span>
);

const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({
  children,
  className,
  delay = 0,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={visible ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        'transition-all duration-500 ease-out motion-reduce:transition-none',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
};

/* ───────────────────────── App preview chrome ───────────────────────── */

const TinyBar: React.FC<{ value: number; color?: string }> = ({ value, color = BRAND }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F1F5F9] dark:bg-[#252528]">
    <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
  </div>
);

/* ───────────────────────── Hero preview (large dashboard) ───────────────────────── */

const AppWindow: React.FC<{
  children: React.ReactNode;
  className?: string;
  url?: string;
  label?: string;
}> = ({ children, className, url = 'bornoflow.app/dashboard', label = 'Product preview' }) => (
  <div
    className={cn(
      'overflow-hidden rounded-2xl border border-[#E5E7EB] dark:border-[#2a2a2e] bg-white dark:bg-[#0f0f11] shadow-[0_24px_60px_-28px_rgba(16,24,40,0.32)]',
      className
    )}
  >
    <div className="flex items-center gap-2 border-b border-[#E5E7EB] dark:border-[#2a2a2e] bg-[#FAFBFC] dark:bg-[#19191c] px-3.5 py-2.5">
      <span className="h-2.5 w-2.5 rounded-full bg-[#FCA5A5]" aria-hidden="true" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#FCD34D]" aria-hidden="true" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#86EFAC]" aria-hidden="true" />
      <span className="ml-2 hidden min-w-0 flex-1 items-center gap-1.5 rounded-md border border-[#E5E7EB] dark:border-[#2a2a2e] bg-white dark:bg-[#0f0f11] px-2.5 py-1 text-[11px] text-[#94A3B8] dark:text-[#787671] sm:flex">
        <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{url}</span>
      </span>
      <span
        className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{ backgroundColor: 'var(--landing-tint)', color: 'var(--landing-brand-text)' }}
      >
        {label}
      </span>
    </div>
    {children}
  </div>
);

const HeroPreview: React.FC = () => {
  const { t } = useI18n();
  const deadlines = [
    { name: 'Problem Set 4', detail: 'Graph Algorithms', course: 'CSE 311', due: t('landing.preview.tomorrow'), urgent: true },
    { name: 'Lab Report', detail: 'Page Tables', course: 'CSE 332', due: t('landing.preview.friday'), urgent: false },
    { name: 'Quiz 3', detail: 'Linear Algebra', course: 'MATH 308', due: t('landing.preview.tuesday'), urgent: false },
  ];
  const courses = [
    { code: 'CSE 311', name: 'Algorithms', progress: 72, color: BRAND },
    { code: 'CSE 332', name: 'Operating Systems', progress: 58, color: '#2f9e75' },
    { code: 'MATH 308', name: 'Linear Algebra', progress: 64, color: '#b7791f' },
  ];

  return (
    <Reveal className="relative w-full min-w-0">
      <div className="overflow-hidden rounded-2xl border border-[#cfe5db] dark:border-[#1f3a31] bg-white dark:bg-[#0f0f11] shadow-[0_24px_60px_-28px_rgba(13,42,34,0.35)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#e3efe9] dark:border-[#1f3a31] bg-[#f4faf7] dark:bg-[#0f1d19] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0f6b57] text-white">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-display)] text-[15px] font-bold leading-tight text-[#0d2a22] dark:text-white">
                {t('landing.preview.semester')}
              </p>
              <p className="text-xs text-[#5d6f68] dark:text-[#a4a097]">{t('landing.preview.week')}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-[#ffd84d] px-2.5 py-1 text-xs font-semibold text-[#3d2f00]">
            {t('landing.preview.active')}
          </span>
        </div>

        <div className="space-y-5 p-4 sm:p-5">
          {/* Key numbers */}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: t('landing.preview.gpa'), value: '3.82', accent: true },
              { label: t('landing.preview.credits'), value: '84/130' },
              { label: t('landing.preview.dueSoon'), value: '3' },
              { label: t('landing.preview.study'), value: '6.5h' },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-[#f4faf7] dark:bg-[#0f1d19] px-3.5 py-3">
                <dt className="text-xs text-[#5d6f68] dark:text-[#a4a097]">{m.label}</dt>
                <dd
                  className={cn(
                    'mt-0.5 font-[family-name:var(--font-display)] text-xl font-bold tabular-nums',
                    m.accent ? 'text-[#0f6b57]' : 'text-[#0d2a22] dark:text-white'
                  )}
                >
                  {m.value}
                </dd>
              </div>
            ))}
          </dl>

          {/* Deadlines */}
          <section aria-label="Upcoming deadlines">
            <h3 className="mb-2 text-sm font-semibold text-[#0d2a22] dark:text-white">{t('landing.preview.thisWeek')}</h3>
            <ul className="divide-y divide-[#e3efe9] dark:divide-[#1f3a31] rounded-xl border border-[#e3efe9] dark:border-[#1f3a31]">
              {deadlines.map((item) => (
                <li key={item.name} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span
                    className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      item.urgent ? 'bg-[#d9480f]' : 'bg-[#0f6b57]'
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#0d2a22] dark:text-white">{item.name}</p>
                    <p className="text-xs text-[#5d6f68] dark:text-[#a4a097]">
                      {item.course} · {item.detail}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 text-xs font-semibold',
                      item.urgent ? 'text-[#d9480f]' : 'text-[#5d6f68] dark:text-[#a4a097]'
                    )}
                  >
                    {item.due}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Course progress */}
          <section aria-label="Course progress">
            <h3 className="mb-2 text-sm font-semibold text-[#0d2a22] dark:text-white">{t('landing.preview.progress')}</h3>
            <ul className="space-y-3">
              {courses.map((course) => (
                <li key={course.code}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                    <span className="min-w-0 text-[#0d2a22] dark:text-white">
                      <span className="font-semibold">{course.code}</span>
                      <span className="text-[#5d6f68] dark:text-[#a4a097]"> · {course.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[#5d6f68] dark:text-[#a4a097]">{course.progress}%</span>
                  </div>
                  <TinyBar value={course.progress} color={course.color} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </Reveal>
  );
};

/* ───────────────────────── Section A preview ───────────────────────── */

const SemesterPreview: React.FC = () => {
  const tabs = ['Overview', 'Courses', 'Assignments', 'Exams', 'Notes'];
  const courses = [
    { code: 'CSE 311', name: 'Algorithms', instructor: 'Dr. Rehman', credits: 4, progress: 72, color: BRAND, tone: '#eef8f4' },
    { code: 'CSE 332', name: 'Operating Systems', instructor: 'Dr. Ahmed', credits: 4, progress: 58, color: '#16A34A', tone: '#ECFDF5' },
    { code: 'MATH 308', name: 'Linear Algebra', instructor: 'Prof. Karim', credits: 3, progress: 64, color: '#B45309', tone: '#FEF3C7' },
  ];
  return (
    <AppWindow url="bornoflow.app/semesters/fall-2026" label="Preview">
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {tabs.map((tab) => (
            <span
              key={tab}
              className={cn(
                'shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium',
                tab === 'Overview' ? 'text-white' : 'text-[#64748B] dark:text-[#a4a097]'
              )}
              style={tab === 'Overview' ? { backgroundColor: BRAND } : undefined}
            >
              {tab}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#a4a097]">
                Courses
              </span>
              <span className="text-[10px] text-[#94A3B8] dark:text-[#787671]">3 courses · 11 credits</span>
            </div>
            <div className="space-y-2">
              {courses.map((course) => (
                <div
                  key={course.code}
                  className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] dark:border-[#2a2a2e] p-3"
                >
                  <span
                    className="rounded-md px-2 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: course.tone, color: course.color }}
                  >
                    {course.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-[#111827] dark:text-[#f0eeec]">
                      {course.name}
                    </p>
                    <p className="text-[10.5px] text-[#64748B] dark:text-[#a4a097]">
                      {course.instructor} · {course.credits} credits
                    </p>
                  </div>
                  <div className="hidden w-24 sm:block">
                    <TinyBar value={course.progress} color={course.color} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-[#E5E7EB] dark:border-[#2a2a2e] p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#a4a097]">
                Next exams
              </span>
              <ul className="mt-2.5 space-y-2">
                {[
                  { name: 'OS Midterm', when: 'Nov 4 · 2:00 PM' },
                  { name: 'Algorithms Midterm', when: 'Nov 9 · 9:00 AM' },
                ].map((exam) => (
                  <li key={exam.name} className="flex items-center gap-2 text-[11.5px]">
                    <Award className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--landing-brand-text)' }} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate font-medium text-[#111827] dark:text-[#f0eeec]">
                      {exam.name}
                    </span>
                    <span className="shrink-0 text-[10.5px] text-[#64748B] dark:text-[#a4a097]">{exam.when}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] dark:border-[#2a2a2e] p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#a4a097]">
                Semester progress
              </span>
              <p className="mt-1 text-[20px] font-bold text-[#111827] dark:text-[#f0eeec]">62%</p>
              <TinyBar value={62} />
              <p className="mt-1.5 text-[10.5px] text-[#64748B] dark:text-[#a4a097]">Week 8 of 16 · 5 courses</p>
            </div>
          </div>
        </div>
      </div>
    </AppWindow>
  );
};

/* ───────────────────────── Section B preview ───────────────────────── */

const MaterialsPreview: React.FC = () => {
  const docs = [
    { name: 'OS — Lecture 14.pdf', pages: '24 pp', tone: '#eef8f4', color: BRAND },
    { name: 'Algorithms — Slides 09.pdf', pages: '31 pp', tone: '#ECFDF5', color: '#16A34A' },
    { name: 'MATH 308 — Handout.pdf', pages: '6 pp', tone: '#FEF3C7', color: '#B45309' },
  ];
  return (
    <AppWindow url="bornoflow.app/notes/virtual-memory" label="Preview">
      <div className="flex">
        <div className="hidden w-[170px] shrink-0 border-r border-[#E5E7EB] dark:border-[#2a2a2e] bg-[#FBFBFA] dark:bg-[#19191c] p-3 sm:block">
          <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] dark:text-[#787671]">
            Documents
          </span>
          <div className="mt-2 space-y-1.5">
            {docs.map((doc) => (
              <div key={doc.name} className="flex items-center gap-2 rounded-lg px-1.5 py-1.5">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: doc.tone, color: doc.color }}
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-[#111827] dark:text-[#f0eeec]">{doc.name}</p>
                  <p className="text-[9.5px] text-[#94A3B8] dark:text-[#787671]">{doc.pages}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-[10px] text-[#64748B] dark:text-[#a4a097]">
            <span className="rounded-md border border-[#E5E7EB] dark:border-[#2a2a2e] px-1.5 py-0.5 font-medium">B</span>
            <span className="rounded-md border border-[#E5E7EB] dark:border-[#2a2a2e] px-1.5 py-0.5 italic">I</span>
            <span className="rounded-md border border-[#E5E7EB] dark:border-[#2a2a2e] px-1.5 py-0.5 underline">U</span>
            <span className="rounded-md border border-[#E5E7EB] dark:border-[#2a2a2e] px-1.5 py-0.5">H1</span>
            <span className="rounded-md border border-[#E5E7EB] dark:border-[#2a2a2e] px-1.5 py-0.5">•</span>
            <span className="rounded-md border border-[#E5E7EB] dark:border-[#2a2a2e] px-1.5 py-0.5">Table</span>
            <span className="ml-auto rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold" style={{ backgroundColor: 'var(--landing-tint)', color: 'var(--landing-brand-text)' }}>
              CSE 332
            </span>
          </div>

          <h3 className="text-[15px] font-bold text-[#111827] dark:text-[#f0eeec]">Virtual Memory &amp; Page Tables</h3>
          <p className="mt-2 text-[12px] leading-relaxed text-[#64748B] dark:text-[#a4a097]">
            Multi-level page tables decouple virtual address spaces from physical RAM limits. A page
            table entry maps a virtual page to a physical frame, and a TLB caches recent translations.
          </p>
          <div
            className="mt-3 rounded-xl border-l-2 bg-[#F8FAFC] dark:bg-[#141416] p-2.5 text-[11.5px] leading-relaxed text-[#475569] dark:text-[#a4a097]"
            style={{ borderColor: BRAND }}
          >
            Highlighted from Lecture 14: page faults trigger a trap, and the OS selects a victim frame
            to evict.
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10.5px] text-[#94A3B8] dark:text-[#787671]">
            <NotebookPen className="h-3.5 w-3.5" aria-hidden="true" />
            Last edited today · Saved
          </div>
        </div>
      </div>
    </AppWindow>
  );
};

/* ───────────────────────── Section C preview ───────────────────────── */

const ProgressPreview: React.FC = () => {
  const requirements = [
    { label: 'Core Computer Science', done: 38, total: 52, color: BRAND },
    { label: 'Mathematics', done: 20, total: 24, color: '#16A34A' },
    { label: 'General Education', done: 18, total: 30, color: '#B45309' },
    { label: 'Electives', done: 8, total: 24, color: '#64748B' },
  ];
  const gpaTrend = [42, 55, 48, 66, 60, 78, 84];
  return (
    <AppWindow url="bornoflow.app/degree-progress" label="Preview">
      <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-4">
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90" aria-hidden="true">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F1F5F9" strokeWidth="3.5" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke={BRAND}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray="65 100"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[18px] font-bold text-[#111827] dark:text-[#f0eeec]">65%</span>
                <span className="text-[9px] text-[#94A3B8] dark:text-[#787671]">complete</span>
              </div>
            </div>
            <div className="space-y-1.5 text-[11.5px] text-[#64748B] dark:text-[#a4a097]">
              <p>
                <span className="font-semibold text-[#111827] dark:text-[#f0eeec]">84</span> credits completed
              </p>
              <p>
                <span className="font-semibold text-[#111827] dark:text-[#f0eeec]">46</span> credits remaining
              </p>
              <p>
                Est. <span className="font-semibold text-[#111827] dark:text-[#f0eeec]">4</span> semesters left
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[#E5E7EB] dark:border-[#2a2a2e] p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#a4a097]">
                CGPA trend
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'var(--landing-brand-text)' }}>
                <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                3.82
              </span>
            </div>
            <div className="mt-3 flex h-12 items-end gap-1.5" aria-hidden="true">
              {gpaTrend.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t"
                  style={{ height: `${h}%`, backgroundColor: BRAND, opacity: 0.3 + i * 0.1 }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#a4a097]">
            Degree requirements
          </span>
          <div className="mt-3 space-y-3.5">
            {requirements.map((req) => (
              <div key={req.label}>
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="font-medium text-[#111827] dark:text-[#f0eeec]">{req.label}</span>
                  <span className="text-[#64748B] dark:text-[#a4a097]">
                    {req.done}/{req.total} cr
                  </span>
                </div>
                <div className="mt-1.5">
                  <TinyBar value={Math.round((req.done / req.total) * 100)} color={req.color} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppWindow>
  );
};

/* ───────────────────────── Inside BornoFlow gallery ───────────────────────── */

const InsideShowcase: React.FC = () => {
  const cards = [
    {
      icon: BookOpen,
      title: 'Course workspace',
      body: (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="rounded-md px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: 'var(--landing-tint)', color: 'var(--landing-brand-text)' }}>
              CSE 332
            </span>
            <span className="text-[11.5px] font-medium text-[#111827] dark:text-[#f0eeec]">Operating Systems</span>
          </div>
          {['Lecture notes', 'Assignments', 'Exams', 'Documents', 'Class photos'].map((row) => (
            <div key={row} className="flex items-center justify-between rounded-lg bg-[#F8FAFC] dark:bg-[#141416] px-2.5 py-1.5 text-[11px]">
              <span className="text-[#475569] dark:text-[#a4a097]">{row}</span>
              <span className="text-[#94A3B8] dark:text-[#787671]">View</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: NotebookPen,
      title: 'Academic note editor',
      body: (
        <div className="space-y-2">
          <div className="flex gap-1.5" aria-hidden="true">
            {['B', 'I', 'U', 'H1', '•'].map((t) => (
              <span key={t} className="rounded-md border border-[#E5E7EB] dark:border-[#2a2a2e] px-1.5 py-0.5 text-[9.5px] text-[#64748B] dark:text-[#a4a097]">
                {t}
              </span>
            ))}
          </div>
          <p className="text-[12px] font-semibold text-[#111827] dark:text-[#f0eeec]">Process Synchronization</p>
          <p className="text-[11px] leading-relaxed text-[#64748B] dark:text-[#a4a097]">
            Mutex vs. semaphore, race conditions, and the critical-section problem&#8230;
          </p>
          <div className="rounded-lg border-l-2 bg-[#F8FAFC] dark:bg-[#141416] px-2.5 py-1.5 text-[10.5px] text-[#64748B] dark:text-[#a4a097]" style={{ borderColor: BRAND }}>
            Pinned note · CSE 332
          </div>
        </div>
      ),
    },
    {
      icon: CalendarDays,
      title: 'Deadline timeline',
      body: (
        <div className="space-y-2.5">
          {[
            { label: 'PS4 — Algorithms', meta: 'Nov 2', color: '#DC2626' },
            { label: 'OS Midterm', meta: 'Nov 4', color: BRAND },
            { label: 'LA Quiz 3', meta: 'Nov 12', color: '#16A34A' },
            { label: 'Project demo', meta: 'Nov 20', color: '#B45309' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-[11.5px] text-[#111827] dark:text-[#f0eeec]">{item.label}</span>
              <span className="text-[10.5px] text-[#64748B] dark:text-[#a4a097]">{item.meta}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {cards.map((card, i) => (
        <Reveal key={card.title} delay={i * 80}>
          <div className="h-full rounded-2xl border border-[#E5E7EB] dark:border-[#2a2a2e] bg-white dark:bg-[#0f0f11] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_16px_40px_-28px_rgba(16,24,40,0.22)]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--landing-tint)', color: 'var(--landing-brand-text)' }}>
                <card.icon className="h-4.5 w-4.5" strokeWidth={2} aria-hidden="true" />
              </span>
              <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#f0eeec]">{card.title}</h3>
            </div>
            <div className="mt-4">{card.body}</div>
          </div>
        </Reveal>
      ))}
    </div>
  );
};

/* ───────────────────────── FAQ accordion item ───────────────────────── */

const FaqItem: React.FC<{
  faq: { q: string; a: string };
  index: number;
  isOpen: boolean;
  onToggle: (index: number) => void;
}> = ({ faq, index, isOpen, onToggle }) => {
  const panelId = `faq-panel-${index}`;
  const buttonId = `faq-button-${index}`;
  return (
    <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] dark:border-[#2a2a2e] bg-white dark:bg-[#0f0f11]">
      <h3>
        <button
          type="button"
          id={buttonId}
          onClick={() => onToggle(index)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-semibold text-[#111827] dark:text-[#f0eeec] transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#202024] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f6b57]/40"
        >
          {faq.q}
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-[#64748B] dark:text-[#a4a097] transition-transform duration-200 motion-reduce:transition-none',
              isOpen && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={cn(
          'grid transition-all duration-300 ease-out motion-reduce:transition-none',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-4 text-sm leading-relaxed text-[#64748B] dark:text-[#a4a097]">{faq.a}</p>
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────── Landing page ───────────────────────── */

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  const k = (key: string) => key as TranslationKey;
  const featureGroups = FEATURE_GROUP_ICONS.map((g) => ({
    eyebrow: t(k(`landing.${g.id}.eyebrow`)),
    title: t(k(`landing.${g.id}.title`)),
    description: t(k(`landing.${g.id}.body`)),
    items: g.icons.map((icon, i) => ({
      icon,
      title: t(k(`landing.${g.id}.i${i + 1}.t`)),
      description: t(k(`landing.${g.id}.i${i + 1}.d`)),
    })),
  }));
  const steps = STEP_ICONS.map((icon, i) => ({
    icon,
    title: t(k(`landing.s${i + 1}.t`)),
    description: t(k(`landing.s${i + 1}.d`)),
  }));
  const benefits = Array.from({ length: BENEFIT_COUNT }, (_, i) => ({
    title: t(k(`landing.b${i + 1}.t`)),
    description: t(k(`landing.b${i + 1}.d`)),
  }));
  const faqs = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    q: t(k(`landing.q${i + 1}`)),
    a: t(k(`landing.a${i + 1}`)),
  }));
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const primaryTo = user ? (user.role === 'ADMIN' ? '/owner' : '/dashboard') : '/login';
  const primaryLabel = user ? t('nav.dashboard') : t('landing.getStarted');

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  const handleAnchor = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    setMobileOpen(false);
    scrollToId(id);
  };

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <div className="min-h-dvh w-full bg-white dark:bg-[#0f0f11] text-[#111827] dark:text-[#f0eeec] antialiased selection:bg-[#0f6b57] selection:text-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white dark:focus:bg-[#141416] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#111827] dark:focus:text-white focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/40"
      >
        {t('common.skipToContent')}
      </a>

      {/* ───────────────────────── NAVBAR ───────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-[#E5E7EB] dark:border-[#2a2a2e] bg-white/85 dark:bg-[#0f0f11]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <BrandLockup />

          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(e) => handleAnchor(e, link.id)}
                className="rounded text-[13.5px] font-medium text-[#64748B] dark:text-[#a4a097] transition-colors hover:text-[#111827] dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/40"
              >
                {t(link.labelKey)}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <LanguageSwitcher variant="compact" />
            <ThemeToggle />
            {user ? (
              <Link to={primaryTo} className={BTN_PRIMARY}>
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                {t('nav.dashboard')}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-[#111827] dark:text-[#f0eeec] transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#202024] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/40"
                >
                  {t('header.signIn')}
                </Link>
                <Link to={primaryTo} className={BTN_PRIMARY}>
                  {primaryLabel}
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#111827] dark:text-[#f0eeec] transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#202024] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/40 md:hidden"
            aria-label={mobileOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div id="mobile-nav" className="border-t border-[#E5E7EB] dark:border-[#2a2a2e] bg-white dark:bg-[#0f0f11] md:hidden">
            <nav className="mx-auto max-w-6xl space-y-1 px-4 py-3" aria-label="Mobile">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={(e) => handleAnchor(e, link.id)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-[#111827] dark:text-[#f0eeec] transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#202024]"
                >
                  {t(link.labelKey)}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-[#E5E7EB] dark:border-[#2a2a2e] pt-3">
                <div className="flex gap-2">
                  <LanguageSwitcher className="flex-1 justify-center" />
                  <ThemeToggle />
                </div>
                {user ? (
                  <Link to={primaryTo} className={cn(BTN_PRIMARY, 'w-full')}>
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                    {t('landing.goDashboard')}
                  </Link>
                ) : (
                  <>
                    <Link to="/login" className={cn(BTN_SECONDARY, 'w-full')}>
                      {t('header.signIn')}
                    </Link>
                    <Link to={primaryTo} className={cn(BTN_PRIMARY, 'w-full')}>
                      {primaryLabel}
                      <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main id="main">
        {/* ───────────────────────── HERO ───────────────────────── */}
        <section className="graph-paper relative overflow-hidden border-b border-[#dcf0e8] dark:border-[#1f3a31]">
          <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:pb-24 lg:pt-20">
            <div>
              <Eyebrow>{t('landing.eyebrow')}</Eyebrow>
              <h1 className="mt-5 text-[34px] font-bold leading-[1.08] tracking-[-0.03em] text-[#0d2a22] dark:text-white font-[family-name:var(--font-display)] sm:text-5xl lg:text-[56px]">
                {t('landing.heroTitle')}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-[#64748B] dark:text-[#a4a097] sm:text-[17px]">
                {t('landing.heroBody')}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link to={primaryTo} className={cn(BTN_PRIMARY, 'px-6 py-3 text-[15px]')}>
                  {user ? t('landing.openDashboard') : t('landing.getStartedFree')}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                </Link>
                <Link to="/login" className={cn(BTN_SECONDARY, 'px-6 py-3 text-[15px]')}>
                  {t('landing.exploreWorkspace')}
                </Link>
              </div>

              <p className="mt-6 flex items-start gap-2 text-sm text-[#64748B] dark:text-[#a4a097]">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--landing-brand-text)' }} aria-hidden="true" />
                {t('landing.heroNote')}
              </p>
            </div>

            <HeroPreview />
          </div>
        </section>

        {/* ───────────────────────── FEATURES ───────────────────────── */}
        <section id="features" className="scroll-mt-20 border-t border-[#E5E7EB] dark:border-[#2a2a2e] bg-[#F8FAFC] dark:bg-[#141416] py-20 lg:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-[#111827] dark:text-[#f0eeec] sm:text-4xl">
                {t('landing.features.title')}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#64748B] dark:text-[#a4a097]">
                {t('landing.features.body')}
              </p>
            </div>

            <div className="mt-14 space-y-6">
              {featureGroups.map((group, groupIndex) => (
                <Reveal key={group.eyebrow} delay={groupIndex * 60}>
                  <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] dark:border-[#2a2a2e] bg-white dark:bg-[#0f0f11] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                    <div className="grid grid-cols-1 lg:grid-cols-3">
                      <div className="border-b border-[#E5E7EB] dark:border-[#2a2a2e] p-6 lg:border-b-0 lg:border-r lg:p-8">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--landing-brand-text)' }}>
                          {group.eyebrow}
                        </span>
                        <h3 className="mt-3 text-xl font-bold tracking-tight text-[#111827] dark:text-[#f0eeec]">
                          {group.title}
                        </h3>
                        <p className="mt-3 text-sm leading-relaxed text-[#64748B] dark:text-[#a4a097]">
                          {group.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-px bg-[#E5E7EB] dark:bg-[#2a2a2e] sm:grid-cols-2 lg:col-span-2">
                        {group.items.map((item) => (
                          <div
                            key={item.title}
                            className="group bg-white dark:bg-[#0f0f11] p-5 transition-colors hover:bg-[#FBFBFA] dark:hover:bg-[#19191c] sm:p-6"
                          >
                            <span
                              className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transition-none"
                              style={{ backgroundColor: 'var(--landing-tint)', color: 'var(--landing-brand-text)' }}
                            >
                              <item.icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                            </span>
                            <h4 className="mt-3.5 text-[14px] font-semibold text-[#111827] dark:text-[#f0eeec]">
                              {item.title}
                            </h4>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-[#64748B] dark:text-[#a4a097]">
                              {item.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────────── SHOWCASE A — SEMESTER ─────────────────── */}
        <section className="scroll-mt-20 bg-white dark:bg-[#0f0f11] py-20 lg:py-24">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
            <Reveal>
              <div>
                <Eyebrow>{t('landing.sa.eyebrow')}</Eyebrow>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#111827] dark:text-[#f0eeec] sm:text-[34px]">
                  {t('landing.sa.title')}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#64748B] dark:text-[#a4a097]">
                  {t('landing.sa.body')}
                </p>
                <ul className="mt-6 space-y-3">
                  {[t('landing.sa.b1'), t('landing.sa.b2'), t('landing.sa.b3')].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-[#111827] dark:text-[#f0eeec]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--landing-brand-text)' }} aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <SemesterPreview />
            </Reveal>
          </div>
        </section>

        {/* ─────────────────── SHOWCASE B — MATERIALS ─────────────────── */}
        <section className="scroll-mt-20 border-y border-[#E5E7EB] dark:border-[#2a2a2e] bg-[#F8FAFC] dark:bg-[#141416] py-20 lg:py-24">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
            <Reveal className="lg:order-2">
              <div>
                <Eyebrow>{t('landing.sb.eyebrow')}</Eyebrow>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#111827] dark:text-[#f0eeec] sm:text-[34px]">
                  {t('landing.sb.title')}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#64748B] dark:text-[#a4a097]">
                  {t('landing.sb.body')}
                </p>
                <ul className="mt-6 space-y-3">
                  {[t('landing.sb.b1'), t('landing.sb.b2'), t('landing.sb.b3')].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-[#111827] dark:text-[#f0eeec]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--landing-brand-text)' }} aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={80} className="lg:order-1">
              <MaterialsPreview />
            </Reveal>
          </div>
        </section>

        {/* ─────────────────── SHOWCASE C — PROGRESS ─────────────────── */}
        <section className="scroll-mt-20 bg-white dark:bg-[#0f0f11] py-20 lg:py-24">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
            <Reveal>
              <div>
                <Eyebrow>{t('landing.sc.eyebrow')}</Eyebrow>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#111827] dark:text-[#f0eeec] sm:text-[34px]">
                  {t('landing.sc.title')}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#64748B] dark:text-[#a4a097]">
                  {t('landing.sc.body')}
                </p>
                <p className="mt-4 text-[13px] text-[#94A3B8] dark:text-[#787671]">
                  {t('landing.sc.note')}
                </p>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <ProgressPreview />
            </Reveal>
          </div>
        </section>

        {/* ─────────────────── INSIDE SCHOLARFLOW ─────────────────── */}
        <section className="scroll-mt-20 border-y border-[#E5E7EB] dark:border-[#2a2a2e] bg-[#F8FAFC] dark:bg-[#141416] py-20 lg:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <Eyebrow>{t('landing.inside.eyebrow')}</Eyebrow>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#111827] dark:text-[#f0eeec] sm:text-4xl">
                {t('landing.inside.title')}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#64748B] dark:text-[#a4a097]">
                {t('landing.inside.body')}
              </p>
            </div>
            <div className="mt-12">
              <InsideShowcase />
            </div>
          </div>
        </section>

        {/* ───────────────────── HOW IT WORKS ───────────────────── */}
        <section id="how-it-works" className="scroll-mt-20 bg-white dark:bg-[#0f0f11] py-20 lg:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-[#111827] dark:text-[#f0eeec] sm:text-4xl">
                {t('landing.steps.title')}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#64748B] dark:text-[#a4a097]">
                {t('landing.steps.body')}
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
              {steps.map((step, index) => (
                <Reveal key={step.title} delay={index * 80}>
                  <div className="relative">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
                        style={{ backgroundColor: BRAND }}
                      >
                        {index + 1}
                      </span>
                      <step.icon className="h-5 w-5 text-[#64748B] dark:text-[#a4a097]" strokeWidth={2} aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-[#111827] dark:text-[#f0eeec]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#64748B] dark:text-[#a4a097]">{step.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────────── BENEFITS ───────────────────── */}
        <section id="benefits" className="scroll-mt-20 border-y border-[#E5E7EB] dark:border-[#2a2a2e] bg-[#F8FAFC] dark:bg-[#141416] py-20 lg:py-24">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
            <Reveal>
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-[#111827] dark:text-[#f0eeec] sm:text-4xl">
                  {t('landing.benefits.title')}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#64748B] dark:text-[#a4a097]">
                  {t('landing.benefits.body')}
                </p>
                <Link to={primaryTo} className={cn(BTN_PRIMARY, 'mt-8 px-6 py-3 text-[15px]')}>
                  {user ? t('landing.openDashboard') : t('landing.getStartedFree')}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                </Link>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {benefits.map((benefit, index) => (
                <Reveal key={benefit.title} delay={index * 60}>
                  <div className="h-full rounded-2xl border border-[#E5E7EB] dark:border-[#2a2a2e] bg-white dark:bg-[#0f0f11] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                    <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--landing-brand-text)' }} aria-hidden="true" />
                    <h3 className="mt-3 text-[14px] font-semibold text-[#111827] dark:text-[#f0eeec]">{benefit.title}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#64748B] dark:text-[#a4a097]">
                      {benefit.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <PricingSection />

        {/* ───────────────────── FAQ ───────────────────── */}
        <section id="faq" className="scroll-mt-20 bg-white dark:bg-[#0f0f11] py-20 lg:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#111827] dark:text-[#f0eeec] sm:text-4xl">
                {t('landing.faq.title')}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#64748B] dark:text-[#a4a097]">
                {t('landing.faq.body')}
              </p>
            </div>

            <div className="mt-12 space-y-3">
              {faqs.map((faq, index) => (
                <FaqItem
                  key={faq.q}
                  faq={faq}
                  index={index}
                  isOpen={openFaq === index}
                  onToggle={(i) => setOpenFaq((current) => (current === i ? null : i))}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────── FINAL CTA ───────────────── */}
        <section className="bg-white dark:bg-[#0f0f11] pb-20 lg:pb-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl border border-[#E5E7EB] dark:border-[#2a2a2e] bg-[#eef8f4] dark:bg-[#0d1f19] px-6 py-14 text-center sm:px-12">
                <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-[#111827] dark:text-[#f0eeec] sm:text-4xl">
                  {t('landing.cta.title')}
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#64748B] dark:text-[#a4a097]">
                  {t('landing.cta.body')}
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link to={primaryTo} className={cn(BTN_PRIMARY, 'px-6 py-3 text-[15px]')}>
                    {user ? t('landing.openDashboard') : t('landing.getStartedFree')}
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                  </Link>
                  <a
                    href="#features"
                    onClick={(e) => handleAnchor(e, 'features')}
                    className={cn(BTN_SECONDARY, 'px-6 py-3 text-[15px]')}
                  >
                    {t('landing.exploreFeatures')}
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ───────────────────── FOOTER ───────────────────── */}
      <SiteFooter withTopBorder variant="full" />
    </div>
  );
};

export default LandingPage;
