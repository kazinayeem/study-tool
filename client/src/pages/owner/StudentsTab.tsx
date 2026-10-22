import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HardDrive, Search, X } from 'lucide-react';
import { api } from '../../lib/api';
import { formatBytes, formatDate, cn } from '../../lib/utils';
import { formatMoney } from '../../lib/money';
import { useI18n } from '../../i18n/I18nContext';
import type { TranslationKey } from '../../i18n/translations';
import type { OwnerStudent } from '../../types';
import { StatusChip } from '../billing/BillingPage';

const card = 'rounded-xl border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416]';
type Sort = 'storage' | 'recent' | 'tasks' | 'name';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

const Avatar: React.FC<{ s: Pick<OwnerStudent, 'name' | 'avatarUrl'> }> = ({ s }) =>
  s.avatarUrl ? (
    <img src={s.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
  ) : (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dcf0e8] text-xs font-bold text-[#0d3b30] dark:bg-[#0d3b30] dark:text-[#a8dcc9]">
      {initials(s.name)}
    </span>
  );

/** Slide-over with everything about one student; closes with Esc or a tap outside. */
const StudentDrawer: React.FC<{ id: string; onClose: () => void }> = ({ id, onClose }) => {
  const { t, lang } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ['owner-student', id], queryFn: () => api.getOwnerStudent(id) });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const parts = data
    ? [
        { key: 'owner.detail.documents' as TranslationKey, bytes: data.storage.documents, color: '#0f6b57' },
        { key: 'owner.detail.photos' as TranslationKey, bytes: data.storage.photos, color: '#b7791f' },
        { key: 'owner.detail.versions' as TranslationKey, bytes: data.storage.versions, color: '#3b6fb6' },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={data?.user.name ?? t('owner.col.student')}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-xl dark:bg-[#0f0f11]"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#e5e3df] bg-white/95 p-4 backdrop-blur dark:border-[#2a2a2e] dark:bg-[#0f0f11]/95">
          {data ? (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar s={data.user} />
              <div className="min-w-0">
                <p className="truncate font-bold text-[#14201c] dark:text-white">{data.user.name}</p>
                <p className="truncate text-sm text-[#5d5b54] dark:text-[#a4a097]">{data.user.email}</p>
                <p className="text-xs text-[#787671] dark:text-[#a4a097]">{t('owner.detail.joined', { date: formatDate(data.user.createdAt) })}</p>
              </div>
            </div>
          ) : (
            <div className="h-10 w-48 animate-pulse rounded bg-[#f0eeec] dark:bg-[#1c1c1f]" />
          )}
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#787671] hover:bg-[#f6f5f4] dark:hover:bg-[#202024]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading || !data ? (
          <div className="space-y-3 p-4">{[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-[#f0eeec] dark:bg-[#1c1c1f]" />)}</div>
        ) : (
          <div className="space-y-6 p-4">
            <p className="rounded-lg bg-[#f4faf7] px-3 py-2 text-xs leading-relaxed text-[#5d5b54] dark:bg-[#0f1d19] dark:text-[#a4a097]">{t('owner.detail.privacy')}</p>

            <section aria-labelledby="d-storage">
              <h3 id="d-storage" className="flex items-center justify-between text-sm font-bold text-[#14201c] dark:text-white">
                {t('owner.detail.storage')}
                <span className="font-[family-name:var(--font-display)] text-lg tabular-nums">{formatBytes(data.storage.total)}</span>
              </h3>
              <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-[#ede9e4] dark:bg-[#252528]">
                {parts.map((p) => (
                  <div key={p.key} style={{ width: `${data.storage.total ? (p.bytes / data.storage.total) * 100 : 0}%`, backgroundColor: p.color }} />
                ))}
              </div>
              <ul className="mt-2 grid gap-1 text-sm">
                {parts.map((p) => (
                  <li key={p.key} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[#5d5b54] dark:text-[#a4a097]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />{t(p.key)}</span>
                    <span className="tabular-nums">{formatBytes(p.bytes)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="d-tasks">
              <h3 id="d-tasks" className="text-sm font-bold text-[#14201c] dark:text-white">{t('owner.detail.tasks')} ({data.assignments.length})</h3>
              {data.assignments.length === 0 ? (
                <p className="mt-2 text-sm text-[#787671]">{t('owner.detail.noTasks')}</p>
              ) : (
                <ul className="mt-2 divide-y divide-[#ede9e4] rounded-xl border border-[#e5e3df] dark:divide-[#252528] dark:border-[#2a2a2e]">
                  {data.assignments.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#14201c] dark:text-white">{a.title}</p>
                        <p className="text-xs text-[#787671] dark:text-[#a4a097]">
                          {a.course?.code ?? '—'} · {a.semester?.name} · {t('owner.detail.due', { date: formatDate(a.deadline) })}
                        </p>
                      </div>
                      <div className="shrink-0 text-end">
                        <span className="rounded-full bg-[#f0eeec] px-2 py-0.5 text-[11px] font-semibold text-[#5d5b54] dark:bg-[#252528] dark:text-[#a4a097]">{a.status.replace(/_/g, ' ')}</span>
                        <p className="mt-0.5 text-[11px] tabular-nums text-[#787671]">{a.progress}%</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {data.exams.length > 0 && (
              <section aria-labelledby="d-exams">
                <h3 id="d-exams" className="text-sm font-bold text-[#14201c] dark:text-white">{t('owner.detail.exams')} ({data.exams.length})</h3>
                <ul className="mt-2 divide-y divide-[#ede9e4] rounded-xl border border-[#e5e3df] dark:divide-[#252528] dark:border-[#2a2a2e]">
                  {data.exams.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <span className="min-w-0 truncate text-[#14201c] dark:text-white">{e.title} <span className="text-[#787671]">· {e.course?.code ?? '—'}</span></span>
                      <span className="shrink-0 text-xs text-[#787671]">{e.examType} · {formatDate(e.examDate)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.documents.length > 0 && (
              <section aria-labelledby="d-files">
                <h3 id="d-files" className="text-sm font-bold text-[#14201c] dark:text-white">{t('owner.detail.files')}</h3>
                <ul className="mt-2 divide-y divide-[#ede9e4] rounded-xl border border-[#e5e3df] dark:divide-[#252528] dark:border-[#2a2a2e]">
                  {data.documents.slice(0, 10).map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <span className="min-w-0 truncate text-[#14201c] dark:text-white">{d.title} <span className="text-[#787671]">· {d.category}</span></span>
                      <span className="shrink-0 text-xs tabular-nums text-[#787671]">{formatBytes(d.fileSize)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.semesters.length > 0 && (
              <section aria-labelledby="d-sems">
                <h3 id="d-sems" className="text-sm font-bold text-[#14201c] dark:text-white">{t('owner.detail.semesters')}</h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {data.semesters.map((s) => (
                    <li key={s.id} className="rounded-xl border border-[#e5e3df] p-3 text-sm dark:border-[#2a2a2e]">
                      <p className="font-semibold text-[#14201c] dark:text-white">{s.name}</p>
                      <p className="text-xs text-[#787671]">{s.status} · {s._count.courses} courses · {s._count.assignments} tasks</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.subscriptions.length > 0 && (
              <section aria-labelledby="d-subs">
                <h3 id="d-subs" className="text-sm font-bold text-[#14201c] dark:text-white">{t('owner.detail.subscriptions')}</h3>
                <ul className="mt-2 divide-y divide-[#ede9e4] rounded-xl border border-[#e5e3df] dark:divide-[#252528] dark:border-[#2a2a2e]">
                  {data.subscriptions.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <span className="min-w-0 truncate">{s.planName} · {formatMoney(s.amount, s.currency, lang)}</span>
                      <StatusChip status={s.status} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </aside>
    </div>
  );
};

export const StudentsTab: React.FC = () => {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ['owner-students'], queryFn: () => api.getOwnerStudents(), refetchInterval: 60_000 });
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('storage');
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = (data?.students ?? []).filter((s) => {
      const needle = q.trim().toLowerCase();
      return !needle || s.name.toLowerCase().includes(needle) || s.email.toLowerCase().includes(needle);
    });
    const by: Record<Sort, (a: OwnerStudent, b: OwnerStudent) => number> = {
      storage: (a, b) => b.storage.total - a.storage.total,
      recent: (a, b) => (b.lastLoginAt ? Date.parse(b.lastLoginAt) : 0) - (a.lastLoginAt ? Date.parse(a.lastLoginAt) : 0),
      tasks: (a, b) => b.counts.tasks - a.counts.tasks,
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return [...list].sort(by[sort]);
  }, [data, q, sort]);

  const maxStorage = Math.max(1, ...(data?.students ?? []).map((s) => s.storage.total));
  const totals = data?.totals;

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: t('owner.students.storageTotal'), value: totals ? formatBytes(totals.storageBytes) : '–', hint: totals ? t('owner.students.disk', { size: formatBytes(totals.diskBytes) }) : undefined },
          { label: t('owner.students.tasks'), value: String(totals?.tasks ?? '–') },
          { label: t('owner.students.notes'), value: String(totals?.notes ?? '–') },
        ].map((s) => (
          <div key={s.label} className={cn(card, 'p-4')}>
            <dt className="text-xs text-[#5d5b54] dark:text-[#a4a097]">{s.label}</dt>
            <dd className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums text-[#14201c] dark:text-white">{s.value}</dd>
            {s.hint && <p className="mt-0.5 text-xs text-[#787671] dark:text-[#a4a097]">{s.hint}</p>}
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#787671]" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('owner.students.search')}
            aria-label={t('owner.students.search')}
            className="h-10 w-full rounded-lg border border-[#c8c4be] bg-white ps-9 pe-3 text-sm outline-none focus:border-[#0f6b57] focus:ring-2 focus:ring-[#0f6b57]/20 dark:border-[#3a3a40] dark:bg-[#1c1c1f] dark:text-white"
          />
        </label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label={t('owner.students.sort')}
          className="h-10 rounded-lg border border-[#c8c4be] bg-white px-3 text-sm outline-none focus:border-[#0f6b57] dark:border-[#3a3a40] dark:bg-[#1c1c1f] dark:text-white"
        >
          {(['storage', 'recent', 'tasks', 'name'] as const).map((k) => (
            <option key={k} value={k}>{t(`owner.sort.${k}` as TranslationKey)}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-xl bg-[#f0eeec] dark:bg-[#1c1c1f]" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-[#787671]">{t('owner.students.none')}</p>
      ) : (
        <ul className={cn(card, 'divide-y divide-[#ede9e4] overflow-hidden dark:divide-[#252528]')}>
          {rows.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setOpenId(s.id)}
                className="grid w-full gap-x-4 gap-y-2 px-4 py-3 text-start transition-colors hover:bg-[#f9faf9] focus:outline-none focus-visible:bg-[#f4faf7] dark:hover:bg-[#19191c] md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1.3fr)] md:items-center"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar s={s} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold text-[#14201c] dark:text-white">{s.name}</span>
                      {s.status === 'DISABLED' && <span className="rounded-full bg-[#fde0ec] px-2 py-0.5 text-[10px] font-semibold text-[#b42318] dark:bg-[#3a1620] dark:text-[#ff8787]">{t('owner.status.DISABLED')}</span>}
                      {s.role === 'DEMO' && <span className="rounded-full bg-[#f0eeec] px-2 py-0.5 text-[10px] font-semibold text-[#5d5b54] dark:bg-[#252528] dark:text-[#a4a097]">DEMO</span>}
                    </span>
                    <span className="block truncate text-xs text-[#787671] dark:text-[#a4a097]">{s.email}</span>
                  </span>
                </span>

                <span className="text-sm">
                  {s.subscription ? (
                    <>
                      <span className="font-semibold text-[#0f6b57] dark:text-[#4ccba5]">{s.subscription.planName}</span>
                      <span className="block text-xs text-[#787671] dark:text-[#a4a097]">→ {formatDate(s.subscription.endsAt)}</span>
                    </>
                  ) : (
                    <span className="text-[#787671] dark:text-[#a4a097]">{t('owner.noPlan')}</span>
                  )}
                </span>

                <span className="block">
                  <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-[#14201c] dark:text-white">
                    <HardDrive className="h-3.5 w-3.5 text-[#787671]" aria-hidden="true" />
                    {formatBytes(s.storage.total)}
                  </span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[#ede9e4] dark:bg-[#252528]">
                    <span className="block h-full rounded-full bg-[#0f6b57]" style={{ width: `${(s.storage.total / maxStorage) * 100}%` }} />
                  </span>
                </span>

                <span className="text-xs text-[#5d5b54] dark:text-[#a4a097]">
                  <span className="block font-semibold text-[#14201c] dark:text-white">{t('owner.tasksCount', { done: s.counts.tasksDone, total: s.counts.tasks })}</span>
                  <span className="block">{t('owner.counts', s.counts)}</span>
                  <span className="block">{t('owner.col.lastLogin')}: {s.lastLoginAt ? formatDate(s.lastLoginAt) : t('owner.never')}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {openId && <StudentDrawer id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
};

export default StudentsTab;
