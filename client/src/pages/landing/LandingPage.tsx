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
import { cn } from '../../lib/utils';

const BRAND = '#5B45E8';
const BRAND_TINT = '#F3F0FF';
const INK = '#111827';
const CURRENT_YEAR = new Date().getFullYear();

const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B45E8] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.08)] transition-colors hover:bg-[#4F3AD9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B45E8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white';
const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-5 py-2.5 text-sm font-semibold text-[#111827] transition-colors hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B45E8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

/* ───────────────────────── Data ───────────────────────── */

interface NavLink {
  label: string;
  id: string;
}

const NAV_LINKS: NavLink[] = [
  { label: 'Features', id: 'features' },
  { label: 'How It Works', id: 'how-it-works' },
  { label: 'Benefits', id: 'benefits' },
  { label: 'FAQ', id: 'faq' },
];

interface FeatureItem {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description: string;
}

interface FeatureGroup {
  eyebrow: string;
  title: string;
  description: string;
  items: FeatureItem[];
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    eyebrow: 'Academic Organization',
    title: 'Structure every term',
    description:
      'Keep each semester, its courses, and the requirements ahead grouped into one clear academic structure.',
    items: [
      {
        icon: CalendarDays,
        title: 'Semester management',
        description: 'Create and archive academic terms with their own courses and dates.',
      },
      {
        icon: BookOpen,
        title: 'Course management',
        description: 'Organize courses, instructors, credits, and materials per course.',
      },
      {
        icon: GraduationCap,
        title: 'Degree progress',
        description: 'Track completed credits and the requirements still remaining.',
      },
      {
        icon: Calendar,
        title: 'Academic calendar',
        description: 'See class sessions, exams, and deadlines across month, week, and agenda views.',
      },
    ],
  },
  {
    eyebrow: 'Coursework & Planning',
    title: 'Stay ahead of every deadline',
    description:
      'Plan the work that matters — assignments, exams, study time, and the grades that follow.',
    items: [
      {
        icon: ListChecks,
        title: 'Assignments & exams',
        description: 'Track due dates, checklists, exam schedules, and linked study materials.',
      },
      {
        icon: Clock,
        title: 'Study planner',
        description: 'Plan sessions, run a focus timer, and set a weekly study goal.',
      },
      {
        icon: Sparkles,
        title: 'Reminders & deadlines',
        description: 'Keep upcoming work and due dates visible before they become urgent.',
      },
      {
        icon: Calculator,
        title: 'Grades & CGPA',
        description: 'Record assessment marks and compute credit-weighted GPA and CGPA.',
      },
    ],
  },
  {
    eyebrow: 'Knowledge & Documents',
    title: 'Bring your materials together',
    description:
      'Lecture notes, uploaded PDFs, and classroom captures stay connected to the course they belong to.',
    items: [
      {
        icon: FileText,
        title: 'Rich-text academic notes',
        description: 'Write structured notes with formatting, images, tables, and Word export.',
      },
      {
        icon: FolderOpen,
        title: 'Document library',
        description: 'Store academic PDFs and files, with version history when you replace them.',
      },
      {
        icon: Library,
        title: 'PDF study workspace',
        description: 'Read, highlight, bookmark, and annotate documents in a focused viewer.',
      },
      {
        icon: Camera,
        title: 'Class Photo Journal',
        description: 'Capture and file board photos by course and lecture session.',
      },
      {
        icon: Search,
        title: 'Knowledge Base',
        description: 'Organize notes into folders, pin what matters, and search across your work.',
      },
    ],
  },
];

const STEPS = [
  {
    icon: ShieldCheck,
    title: 'Create your workspace',
    description:
      'Sign in with Google or open the demo student account, then set up your academic profile.',
  },
  {
    icon: CalendarDays,
    title: 'Organize your semester',
    description:
      'Add your courses, academic dates, study materials, assignments, and goals for the term.',
  },
  {
    icon: Target,
    title: 'Stay on track',
    description:
      'Manage deadlines, review your grades and progress, and keep your resources organized.',
  },
];

const BENEFITS = [
  {
    title: 'One place for everything',
    description: 'Stop juggling folders, calendars, and documents across disconnected tools.',
  },
  {
    title: 'Materials find you faster',
    description: 'Notes and files stay attached to the course and semester they belong to.',
  },
  {
    title: 'Deadlines stay visible',
    description: 'Assignments, exams, and reminders surface together before they are due.',
  },
  {
    title: 'Progress you can measure',
    description: 'Grades, CGPA, and degree requirements update as your term moves forward.',
  },
];

const FAQS = [
  {
    q: 'What is ScholarFlow?',
    a: 'ScholarFlow is a personal academic workspace for students. It brings semesters, courses, assignments, exams, lecture notes, documents, and degree planning together in one organized space.',
  },
  {
    q: 'How do I create an account?',
    a: 'Sign in with Google, which creates your ScholarFlow account on first sign-in. You can also explore the workspace instantly using the pre-seeded demo student account. There is no separate email sign-up form.',
  },
  {
    q: 'Can I organize multiple semesters?',
    a: 'Yes. You can create multiple semesters, switch between them, and archive past terms. Courses, assignments, exams, notes, and documents are all organized under the semester they belong to.',
  },
  {
    q: 'Can I upload PDFs and lecture photos?',
    a: 'Yes. The document library stores academic PDFs and files in a focused viewer with highlights, bookmarks, and annotations. The Class Photo Journal lets you capture and file classroom board photos by course and lecture session.',
  },
  {
    q: 'Can I organize notes by course?',
    a: 'Yes. Notes live in a rich-text Knowledge Base and can be grouped into folders, pinned, archived, and filtered by semester and course, so course materials stay together.',
  },
  {
    q: 'How does degree progress work?',
    a: 'You define your degree program and curriculum, then ScholarFlow compares it against the credits you have completed. It shows completed and remaining credits and highlights requirements still ahead.',
  },
  {
    q: 'How is my academic data protected?',
    a: 'Your data is tied to your authenticated account and stored on the ScholarFlow server with ownership checks enforced on the server. Administrators cannot read your private note bodies, document contents, or study logs.',
  },
  {
    q: 'Can I use ScholarFlow on mobile?',
    a: 'Yes. The interface is responsive and adapts to phones, tablets, laptops, and desktop screens, so you can manage your workspace on the go.',
  },
];

/* ───────────────────────── Primitives ───────────────────────── */

const BrandMark: React.FC<{ className?: string; markClassName?: string }> = ({
  className,
  markClassName,
}) => (
  <Link to="/" className={cn('flex items-center gap-2.5', className)} aria-label="ScholarFlow home">
    <span
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-[10px] text-white shadow-[0_6px_16px_-8px_rgba(91,69,232,0.9)]',
        markClassName
      )}
      style={{ backgroundColor: BRAND }}
    >
      <GraduationCap className="h-5 w-5" strokeWidth={2.2} />
    </span>
    <span className="text-[15px] font-semibold tracking-tight text-[#111827]">ScholarFlow</span>
  </Link>
);

const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]',
      className
    )}
    style={{ backgroundColor: BRAND_TINT, color: BRAND }}
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

const AppWindow: React.FC<{
  children: React.ReactNode;
  className?: string;
  url?: string;
  label?: string;
}> = ({ children, className, url = 'scholarflow.app/dashboard', label = 'Product preview' }) => (
  <div
    className={cn(
      'overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_24px_60px_-28px_rgba(16,24,40,0.32)]',
      className
    )}
  >
    <div className="flex items-center gap-2 border-b border-[#E5E7EB] bg-[#FAFBFC] px-3.5 py-2.5">
      <span className="h-2.5 w-2.5 rounded-full bg-[#FCA5A5]" aria-hidden="true" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#FCD34D]" aria-hidden="true" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#86EFAC]" aria-hidden="true" />
      <span className="ml-2 hidden min-w-0 flex-1 items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11px] text-[#94A3B8] sm:flex">
        <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{url}</span>
      </span>
      <span
        className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{ backgroundColor: BRAND_TINT, color: BRAND }}
      >
        {label}
      </span>
    </div>
    {children}
  </div>
);

const PreviewSidebar: React.FC = () => {
  const items = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: CalendarDays, label: 'Semesters' },
    { icon: GraduationCap, label: 'Courses' },
    { icon: ListChecks, label: 'Assignments' },
    { icon: Award, label: 'Exams' },
    { icon: Calculator, label: 'Grades' },
    { icon: FileText, label: 'Knowledge Base' },
  ];
  return (
    <div className="hidden w-[168px] shrink-0 flex-col gap-1 border-r border-[#E5E7EB] bg-[#FBFBFA] p-3 sm:flex">
      <div className="mb-2 flex items-center gap-2 px-1.5">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-md text-white"
          style={{ backgroundColor: BRAND }}
        >
          <GraduationCap className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>
        <span className="text-[12px] font-semibold text-[#111827]">ScholarFlow</span>
      </div>
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            'flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px]',
            item.active ? 'bg-[#F3F0FF] font-semibold text-[#111827]' : 'text-[#64748B]'
          )}
        >
          <item.icon
            className="h-3.5 w-3.5"
            strokeWidth={2.2}
            style={item.active ? { color: BRAND } : undefined}
            aria-hidden="true"
          />
          {item.label}
        </div>
      ))}
    </div>
  );
};

/** A small labelled metric used across previews. */
const MiniStat: React.FC<{ label: string; value: string; tone?: string }> = ({
  label,
  value,
  tone,
}) => (
  <div className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">{label}</p>
    <p className="mt-1 text-[15px] font-bold" style={{ color: tone || INK }}>
      {value}
    </p>
  </div>
);

const TinyBar: React.FC<{ value: number; color?: string }> = ({ value, color = BRAND }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
    <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
  </div>
);

/* ───────────────────────── Hero preview (large dashboard) ───────────────────────── */

const HeroPreview: React.FC = () => {
  const deadlines = [
    { name: 'Problem Set 4 — Graph Algorithms', course: 'CSE 311', due: 'Due tomorrow', urgent: true },
    { name: 'Lab Report — Page Tables', course: 'CSE 332', due: 'Due Friday', urgent: false },
    { name: 'Linear Algebra Quiz 3', course: 'MATH 308', due: 'Next Tuesday', urgent: false },
  ];
  const courses = [
    { code: 'CSE 311', name: 'Algorithms', progress: 72, tone: '#F3F0FF', color: BRAND },
    { code: 'CSE 332', name: 'Operating Systems', progress: 58, tone: '#ECFDF5', color: '#16A34A' },
    { code: 'MATH 308', name: 'Linear Algebra', progress: 64, tone: '#FEF3C7', color: '#B45309' },
  ];

  return (
    <Reveal className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-4 -z-10 rounded-[32px] bg-[#F3F0FF]"
      />
      <AppWindow>
        <div className="flex">
          <PreviewSidebar />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[#111827]">Fall 2026</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: '#ECFDF5', color: '#16A34A' }}
                >
                  Active semester
                </span>
              </div>
              <div className="hidden items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-2.5 py-1 text-[11px] text-[#94A3B8] md:flex">
                <Search className="h-3 w-3" aria-hidden="true" />
                Search
              </div>
            </div>

            <div className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <MiniStat label="GPA" value="3.82" tone={BRAND} />
                <MiniStat label="Credits" value="84/130" />
                <MiniStat label="Deadlines" value="3" />
                <MiniStat label="Study" value="6.5h" />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                <div className="rounded-xl border border-[#E5E7EB] p-3.5 md:col-span-3">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      Upcoming
                    </span>
                    <span className="text-[10px] text-[#94A3B8]">This week</span>
                  </div>
                  <ul className="space-y-2.5">
                    {deadlines.map((item) => (
                      <li key={item.name} className="flex items-start gap-2.5">
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.urgent ? '#DC2626' : BRAND }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-medium text-[#111827]">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-[#64748B]">
                            {item.course} · {item.due}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-[#E5E7EB] p-3.5 md:col-span-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Degree progress
                  </span>
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="relative h-14 w-14 shrink-0">
                      <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90" aria-hidden="true">
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
                      <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-[#111827]">
                        65%
                      </span>
                    </div>
                    <div className="space-y-1 text-[11px] text-[#64748B]">
                      <p>
                        <span className="font-semibold text-[#111827]">84</span> credits completed
                      </p>
                      <p>
                        <span className="font-semibold text-[#111827]">46</span> remaining
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#E5E7EB] p-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Courses
                </span>
                <div className="mt-2.5 space-y-2.5">
                  {courses.map((course) => (
                    <div key={course.code} className="flex items-center gap-3">
                      <span
                        className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold"
                        style={{ backgroundColor: course.tone, color: course.color }}
                      >
                        {course.code}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12px] text-[#111827]">
                        {course.name}
                      </span>
                      <span className="hidden w-24 sm:block">
                        <TinyBar value={course.progress} color={course.color} />
                      </span>
                      <span className="w-8 text-right text-[11px] text-[#64748B]">
                        {course.progress}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppWindow>
    </Reveal>
  );
};

/* ───────────────────────── Section A preview ───────────────────────── */

const SemesterPreview: React.FC = () => {
  const tabs = ['Overview', 'Courses', 'Assignments', 'Exams', 'Notes'];
  const courses = [
    { code: 'CSE 311', name: 'Algorithms', instructor: 'Dr. Rehman', credits: 4, progress: 72, color: BRAND, tone: '#F3F0FF' },
    { code: 'CSE 332', name: 'Operating Systems', instructor: 'Dr. Ahmed', credits: 4, progress: 58, color: '#16A34A', tone: '#ECFDF5' },
    { code: 'MATH 308', name: 'Linear Algebra', instructor: 'Prof. Karim', credits: 3, progress: 64, color: '#B45309', tone: '#FEF3C7' },
  ];
  return (
    <AppWindow url="scholarflow.app/semesters/fall-2026" label="Preview">
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {tabs.map((tab) => (
            <span
              key={tab}
              className={cn(
                'shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium',
                tab === 'Overview' ? 'text-white' : 'text-[#64748B]'
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
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                Courses
              </span>
              <span className="text-[10px] text-[#94A3B8]">3 courses · 11 credits</span>
            </div>
            <div className="space-y-2">
              {courses.map((course) => (
                <div
                  key={course.code}
                  className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] p-3"
                >
                  <span
                    className="rounded-md px-2 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: course.tone, color: course.color }}
                  >
                    {course.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-[#111827]">
                      {course.name}
                    </p>
                    <p className="text-[10.5px] text-[#64748B]">
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
            <div className="rounded-xl border border-[#E5E7EB] p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                Next exams
              </span>
              <ul className="mt-2.5 space-y-2">
                {[
                  { name: 'OS Midterm', when: 'Nov 4 · 2:00 PM' },
                  { name: 'Algorithms Midterm', when: 'Nov 9 · 9:00 AM' },
                ].map((exam) => (
                  <li key={exam.name} className="flex items-center gap-2 text-[11.5px]">
                    <Award className="h-3.5 w-3.5 shrink-0" style={{ color: BRAND }} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate font-medium text-[#111827]">
                      {exam.name}
                    </span>
                    <span className="shrink-0 text-[10.5px] text-[#64748B]">{exam.when}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                Semester progress
              </span>
              <p className="mt-1 text-[20px] font-bold text-[#111827]">62%</p>
              <TinyBar value={62} />
              <p className="mt-1.5 text-[10.5px] text-[#64748B]">Week 8 of 16 · 5 courses</p>
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
    { name: 'OS — Lecture 14.pdf', pages: '24 pp', tone: '#F3F0FF', color: BRAND },
    { name: 'Algorithms — Slides 09.pdf', pages: '31 pp', tone: '#ECFDF5', color: '#16A34A' },
    { name: 'MATH 308 — Handout.pdf', pages: '6 pp', tone: '#FEF3C7', color: '#B45309' },
  ];
  return (
    <AppWindow url="scholarflow.app/notes/virtual-memory" label="Preview">
      <div className="flex">
        <div className="hidden w-[170px] shrink-0 border-r border-[#E5E7EB] bg-[#FBFBFA] p-3 sm:block">
          <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
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
                  <p className="truncate text-[11px] font-medium text-[#111827]">{doc.name}</p>
                  <p className="text-[9.5px] text-[#94A3B8]">{doc.pages}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-[10px] text-[#64748B]">
            <span className="rounded-md border border-[#E5E7EB] px-1.5 py-0.5 font-medium">B</span>
            <span className="rounded-md border border-[#E5E7EB] px-1.5 py-0.5 italic">I</span>
            <span className="rounded-md border border-[#E5E7EB] px-1.5 py-0.5 underline">U</span>
            <span className="rounded-md border border-[#E5E7EB] px-1.5 py-0.5">H1</span>
            <span className="rounded-md border border-[#E5E7EB] px-1.5 py-0.5">•</span>
            <span className="rounded-md border border-[#E5E7EB] px-1.5 py-0.5">Table</span>
            <span className="ml-auto rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold" style={{ backgroundColor: BRAND_TINT, color: BRAND }}>
              CSE 332
            </span>
          </div>

          <h3 className="text-[15px] font-bold text-[#111827]">Virtual Memory &amp; Page Tables</h3>
          <p className="mt-2 text-[12px] leading-relaxed text-[#64748B]">
            Multi-level page tables decouple virtual address spaces from physical RAM limits. A page
            table entry maps a virtual page to a physical frame, and a TLB caches recent translations.
          </p>
          <div
            className="mt-3 rounded-xl border-l-2 bg-[#F8FAFC] p-2.5 text-[11.5px] leading-relaxed text-[#475569]"
            style={{ borderColor: BRAND }}
          >
            Highlighted from Lecture 14: page faults trigger a trap, and the OS selects a victim frame
            to evict.
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10.5px] text-[#94A3B8]">
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
    <AppWindow url="scholarflow.app/degree-progress" label="Preview">
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
                <span className="text-[18px] font-bold text-[#111827]">65%</span>
                <span className="text-[9px] text-[#94A3B8]">complete</span>
              </div>
            </div>
            <div className="space-y-1.5 text-[11.5px] text-[#64748B]">
              <p>
                <span className="font-semibold text-[#111827]">84</span> credits completed
              </p>
              <p>
                <span className="font-semibold text-[#111827]">46</span> credits remaining
              </p>
              <p>
                Est. <span className="font-semibold text-[#111827]">4</span> semesters left
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[#E5E7EB] p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                CGPA trend
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#16A34A' }}>
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
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Degree requirements
          </span>
          <div className="mt-3 space-y-3.5">
            {requirements.map((req) => (
              <div key={req.label}>
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="font-medium text-[#111827]">{req.label}</span>
                  <span className="text-[#64748B]">
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

/* ───────────────────────── Inside ScholarFlow gallery ───────────────────────── */

const InsideShowcase: React.FC = () => {
  const cards = [
    {
      icon: BookOpen,
      title: 'Course workspace',
      body: (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="rounded-md px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: BRAND_TINT, color: BRAND }}>
              CSE 332
            </span>
            <span className="text-[11.5px] font-medium text-[#111827]">Operating Systems</span>
          </div>
          {['Lecture notes', 'Assignments', 'Exams', 'Documents', 'Class photos'].map((row) => (
            <div key={row} className="flex items-center justify-between rounded-lg bg-[#F8FAFC] px-2.5 py-1.5 text-[11px]">
              <span className="text-[#475569]">{row}</span>
              <span className="text-[#94A3B8]">View</span>
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
              <span key={t} className="rounded-md border border-[#E5E7EB] px-1.5 py-0.5 text-[9.5px] text-[#64748B]">
                {t}
              </span>
            ))}
          </div>
          <p className="text-[12px] font-semibold text-[#111827]">Process Synchronization</p>
          <p className="text-[11px] leading-relaxed text-[#64748B]">
            Mutex vs. semaphore, race conditions, and the critical-section problem&#8230;
          </p>
          <div className="rounded-lg border-l-2 bg-[#F8FAFC] px-2.5 py-1.5 text-[10.5px] text-[#64748B]" style={{ borderColor: BRAND }}>
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
              <span className="min-w-0 flex-1 truncate text-[11.5px] text-[#111827]">{item.label}</span>
              <span className="text-[10.5px] text-[#64748B]">{item.meta}</span>
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
          <div className="h-full rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_16px_40px_-28px_rgba(16,24,40,0.22)]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: BRAND_TINT, color: BRAND }}>
                <card.icon className="h-4.5 w-4.5" strokeWidth={2} aria-hidden="true" />
              </span>
              <h3 className="text-[14px] font-semibold text-[#111827]">{card.title}</h3>
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
    <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
      <h3>
        <button
          type="button"
          id={buttonId}
          onClick={() => onToggle(index)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-semibold text-[#111827] transition-colors hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#5B45E8]/40"
        >
          {faq.q}
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-[#64748B] transition-transform duration-200 motion-reduce:transition-none',
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
          <p className="px-5 pb-4 text-sm leading-relaxed text-[#64748B]">{faq.a}</p>
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────── Landing page ───────────────────────── */

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const primaryTo = user ? '/dashboard' : '/login';
  const primaryLabel = user ? 'Dashboard' : 'Get Started';

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
    <div className="min-h-screen w-full bg-white text-[#111827] antialiased selection:bg-[#5B45E8] selection:text-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#111827] focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B45E8]/40"
      >
        Skip to content
      </a>

      {/* ───────────────────────── NAVBAR ───────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-[#E5E7EB] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <BrandMark />

          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(e) => handleAnchor(e, link.id)}
                className="rounded text-[13.5px] font-medium text-[#64748B] transition-colors hover:text-[#111827] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B45E8]/40"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <Link to="/dashboard" className={BTN_PRIMARY}>
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-[#111827] transition-colors hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B45E8]/40"
                >
                  Sign In
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#111827] transition-colors hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B45E8]/40 md:hidden"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div id="mobile-nav" className="border-t border-[#E5E7EB] bg-white md:hidden">
            <nav className="mx-auto max-w-6xl space-y-1 px-4 py-3" aria-label="Mobile">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={(e) => handleAnchor(e, link.id)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-[#111827] transition-colors hover:bg-[#F8FAFC]"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-[#E5E7EB] pt-3">
                {user ? (
                  <Link to="/dashboard" className={cn(BTN_PRIMARY, 'w-full')}>
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link to="/login" className={cn(BTN_SECONDARY, 'w-full')}>
                      Sign In
                    </Link>
                    <Link to={primaryTo} className={cn(BTN_PRIMARY, 'w-full')}>
                      {primaryLabel}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
        <section className="relative overflow-hidden bg-white">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-40 -top-40 h-[420px] w-[420px] rounded-full bg-[#F3F0FF] blur-3xl"
          />
          <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:pb-24 lg:pt-20">
            <div>
              <Eyebrow>Your Academic Workspace</Eyebrow>
              <h1 className="mt-5 text-[34px] font-bold leading-[1.08] tracking-[-0.025em] text-[#111827] sm:text-5xl lg:text-[54px]">
                Your entire academic life. Finally, in one place.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-[#64748B] sm:text-[17px]">
                Organize semesters, courses, assignments, exams, lecture notes, documents, and
                academic progress in one beautifully connected workspace.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link to={primaryTo} className={cn(BTN_PRIMARY, 'px-6 py-3 text-[15px]')}>
                  {user ? 'Open Dashboard' : 'Get Started Free'}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link to="/login" className={cn(BTN_SECONDARY, 'px-6 py-3 text-[15px]')}>
                  Explore the Workspace
                </Link>
              </div>

              <p className="mt-6 flex items-start gap-2 text-sm text-[#64748B]">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND }} aria-hidden="true" />
                Built for students who want to stay organized and ahead.
              </p>
            </div>

            <HeroPreview />
          </div>
        </section>

        {/* ───────────────────────── FEATURES ───────────────────────── */}
        <section id="features" className="scroll-mt-20 border-t border-[#E5E7EB] bg-[#F8FAFC] py-20 lg:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
                Everything you need to stay ahead academically.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#64748B]">
                One connected workspace for your semesters, coursework, study materials, and
                academic progress.
              </p>
            </div>

            <div className="mt-14 space-y-6">
              {FEATURE_GROUPS.map((group, groupIndex) => (
                <Reveal key={group.eyebrow} delay={groupIndex * 60}>
                  <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                    <div className="grid grid-cols-1 lg:grid-cols-3">
                      <div className="border-b border-[#E5E7EB] p-6 lg:border-b-0 lg:border-r lg:p-8">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: BRAND }}>
                          {group.eyebrow}
                        </span>
                        <h3 className="mt-3 text-xl font-bold tracking-tight text-[#111827]">
                          {group.title}
                        </h3>
                        <p className="mt-3 text-sm leading-relaxed text-[#64748B]">
                          {group.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-px bg-[#E5E7EB] sm:grid-cols-2 lg:col-span-2">
                        {group.items.map((item) => (
                          <div
                            key={item.title}
                            className="group bg-white p-5 transition-colors hover:bg-[#FBFBFA] sm:p-6"
                          >
                            <span
                              className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transition-none"
                              style={{ backgroundColor: BRAND_TINT, color: BRAND }}
                            >
                              <item.icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                            </span>
                            <h4 className="mt-3.5 text-[14px] font-semibold text-[#111827]">
                              {item.title}
                            </h4>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-[#64748B]">
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
        <section className="scroll-mt-20 bg-white py-20 lg:py-24">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
            <Reveal>
              <div>
                <Eyebrow>Semesters &amp; Courses</Eyebrow>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#111827] sm:text-[34px]">
                  Your semester, organized.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#64748B]">
                  Each semester keeps its courses, assignments, exams, documents, and notes together.
                  Switch between terms, archive what is finished, and always know what is next.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    'Courses with instructors, credits, and materials',
                    'Assignments and exams grouped by term',
                    'Documents and notes attached to the right course',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-[#111827]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND }} aria-hidden="true" />
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
        <section className="scroll-mt-20 border-y border-[#E5E7EB] bg-[#F8FAFC] py-20 lg:py-24">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
            <Reveal className="lg:order-2">
              <div>
                <Eyebrow>Notes, Documents &amp; Photos</Eyebrow>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#111827] sm:text-[34px]">
                  Your study materials, always connected.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#64748B]">
                  Write rich-text notes, upload lecture PDFs, highlight and annotate documents, and
                  file classroom board photos — all in the same place as the course they belong to.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    'Rich-text notes with folders and search',
                    'PDF viewer with highlights, bookmarks, and annotations',
                    'Class Photo Journal filed by course and lecture session',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-[#111827]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND }} aria-hidden="true" />
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
        <section className="scroll-mt-20 bg-white py-20 lg:py-24">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
            <Reveal>
              <div>
                <Eyebrow>Grades &amp; Degree Progress</Eyebrow>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#111827] sm:text-[34px]">
                  Understand your academic progress.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#64748B]">
                  Record assessment marks to calculate credit-weighted GPA and CGPA, then track
                  completed and remaining credits against your degree requirements as the term moves
                  forward.
                </p>
                <p className="mt-4 text-[13px] text-[#94A3B8]">
                  Values shown in previews are illustrative examples, not data from your account.
                </p>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <ProgressPreview />
            </Reveal>
          </div>
        </section>

        {/* ─────────────────── INSIDE SCHOLARFLOW ─────────────────── */}
        <section className="scroll-mt-20 border-y border-[#E5E7EB] bg-[#F8FAFC] py-20 lg:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <Eyebrow>Inside ScholarFlow</Eyebrow>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
                A connected workspace, not a pile of tools.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#64748B]">
                Course workspaces, a focused note editor, and a clear deadline timeline all share the
                same data — so nothing you save gets lost between them.
              </p>
            </div>
            <div className="mt-12">
              <InsideShowcase />
            </div>
          </div>
        </section>

        {/* ───────────────────── HOW IT WORKS ───────────────────── */}
        <section id="how-it-works" className="scroll-mt-20 bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
                Up and running in three steps.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#64748B]">
                From empty workspace to an organized semester.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <Reveal key={step.title} delay={index * 80}>
                  <div className="relative">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
                        style={{ backgroundColor: BRAND }}
                      >
                        {index + 1}
                      </span>
                      <step.icon className="h-5 w-5 text-[#64748B]" strokeWidth={2} aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-[#111827]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#64748B]">{step.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────────── BENEFITS ───────────────────── */}
        <section id="benefits" className="scroll-mt-20 border-y border-[#E5E7EB] bg-[#F8FAFC] py-20 lg:py-24">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
            <Reveal>
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
                  Spend less time organizing. Focus more on learning.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#64748B]">
                  ScholarFlow removes the friction of keeping academic work in order, so more of your
                  time goes to actually studying.
                </p>
                <Link to={primaryTo} className={cn(BTN_PRIMARY, 'mt-8 px-6 py-3 text-[15px]')}>
                  {user ? 'Open Dashboard' : 'Get Started Free'}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {BENEFITS.map((benefit, index) => (
                <Reveal key={benefit.title} delay={index * 60}>
                  <div className="h-full rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                    <CheckCircle2 className="h-5 w-5" style={{ color: '#16A34A' }} aria-hidden="true" />
                    <h3 className="mt-3 text-[14px] font-semibold text-[#111827]">{benefit.title}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#64748B]">
                      {benefit.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────────── FAQ ───────────────────── */}
        <section id="faq" className="scroll-mt-20 bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
                Frequently asked questions
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#64748B]">
                Quick answers about ScholarFlow and how it works.
              </p>
            </div>

            <div className="mt-12 space-y-3">
              {FAQS.map((faq, index) => (
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
        <section className="bg-white pb-20 lg:pb-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl border border-[#E5E7EB] bg-[#F3F0FF] px-6 py-14 text-center sm:px-12">
                <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
                  Make your next semester your most organized one.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#64748B]">
                  Bring your courses, notes, deadlines, and academic progress together with
                  ScholarFlow.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link to={primaryTo} className={cn(BTN_PRIMARY, 'px-6 py-3 text-[15px]')}>
                    {user ? 'Open Dashboard' : 'Get Started Free'}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <a
                    href="#features"
                    onClick={(e) => handleAnchor(e, 'features')}
                    className={cn(BTN_SECONDARY, 'px-6 py-3 text-[15px]')}
                  >
                    Explore Features
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ───────────────────── FOOTER ───────────────────── */}
      <footer className="border-t border-[#E5E7EB] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
            <div className="col-span-2">
              <BrandMark />
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#64748B]">
                A personal academic workspace that brings semesters, courses, notes, documents,
                deadlines, and degree planning into one organized place.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111827]">
                Product
              </h3>
              <ul className="mt-4 space-y-2.5">
                {NAV_LINKS.map((link) => (
                  <li key={link.id}>
                    <a
                      href={`#${link.id}`}
                      onClick={(e) => handleAnchor(e, link.id)}
                      className="rounded text-sm text-[#64748B] transition-colors hover:text-[#111827] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B45E8]/40"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111827]">
                Account
              </h3>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <Link
                    to="/login"
                    className="rounded text-sm text-[#64748B] transition-colors hover:text-[#111827] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B45E8]/40"
                  >
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    className="rounded text-sm text-[#64748B] transition-colors hover:text-[#111827] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B45E8]/40"
                  >
                    Create Account
                  </Link>
                </li>
                {user && (
                  <li>
                    <Link
                      to="/dashboard"
                      className="rounded text-sm text-[#64748B] transition-colors hover:text-[#111827] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B45E8]/40"
                    >
                      Dashboard
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-[#E5E7EB] pt-6">
            <p className="text-xs text-[#94A3B8]">
              © {CURRENT_YEAR} ScholarFlow. Built for personal student management.
            </p>
          </div>
        </div>

        <SiteFooter withTopBorder />
      </footer>
    </div>
  );
};

export default LandingPage;
