import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CreditCard, Pencil, Plus, Printer, Trash2, Wallet, X } from 'lucide-react';
import { api } from '../../lib/api';
import { cn, formatDate } from '../../lib/utils';
import { useI18n } from '../../i18n/I18nContext';
import type { TranslationKey } from '../../i18n/translations';
import { useActiveSemester } from '../../hooks/useActiveSemester';
import type { FeeCategory, FeeItem, FeeStatus, FeeSummary } from '../../types';

const CATEGORIES: FeeCategory[] = [
  'REGISTRATION',
  'MID_EXAM',
  'FINAL_EXAM',
  'LAB',
  'LIBRARY',
  'ACTIVITY',
  'TRANSPORT',
  'HOSTEL',
  'OTHER',
];

const CATEGORY_COLORS: Record<FeeCategory | 'TUITION', string> = {
  TUITION: '#0f6b57',
  REGISTRATION: '#2f9e75',
  MID_EXAM: '#b7791f',
  FINAL_EXAM: '#d9480f',
  LAB: '#3b6fb6',
  LIBRARY: '#7a6bb0',
  ACTIVITY: '#c2410c',
  TRANSPORT: '#5d7a8c',
  HOSTEL: '#8a6d3b',
  OTHER: '#787671',
};

const CURRENCIES = ['BDT', 'USD', 'EUR', 'GBP', 'INR', 'PKR', 'SAR', 'AED', 'CAD', 'AUD', 'JPY', 'CNY', 'TRY', 'MYR', 'SGD'];

const QUICK_ADD: { category: FeeCategory; label: string }[] = [
  { category: 'REGISTRATION', label: 'Registration fee' },
  { category: 'MID_EXAM', label: 'Mid-term exam fee' },
  { category: 'FINAL_EXAM', label: 'Final exam fee' },
  { category: 'LAB', label: 'Lab fee' },
  { category: 'LIBRARY', label: 'Library fee' },
];

const STATUS_STYLES: Record<FeeStatus, string> = {
  PAID: 'bg-[#d9f3e1] text-[#14532d] dark:bg-[#0d3b30] dark:text-[#7ee2b8]',
  PARTIAL: 'bg-[#fff0c2] text-[#7a5200] dark:bg-[#3a2c08] dark:text-[#ffd84d]',
  UNPAID: 'bg-[#f0eeec] text-[#5d5b54] dark:bg-[#252528] dark:text-[#a4a097]',
  OVERDUE: 'bg-[#fde0ec] text-[#b42318] dark:bg-[#3a1620] dark:text-[#ff8787]',
};

const inputClass =
  'h-10 w-full rounded-lg border border-[#c8c4be] bg-white px-3 text-sm text-[#1a1a1a] outline-none transition-colors focus:border-[#0f6b57] focus:ring-2 focus:ring-[#0f6b57]/20 dark:border-[#3a3a40] dark:bg-[#1c1c1f] dark:text-white';

const cardClass = 'rounded-xl border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416]';

function useMoney(currency: string) {
  const { lang } = useI18n();
  return useMemo(() => {
    const locale = lang === 'bn' ? 'bn-BD' : lang === 'ar' ? 'ar' : lang;
    try {
      const nf = new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 });
      return (n: number) => nf.format(n);
    } catch {
      return (n: number) => `${currency} ${n.toLocaleString()}`;
    }
  }, [lang, currency]);
}

const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/* ------------------------------------------------------------------ */
/* Add / edit modal                                                   */
/* ------------------------------------------------------------------ */

interface FormState {
  label: string;
  category: FeeCategory;
  amount: string;
  paidAmount: string;
  courseId: string;
  dueDate: string;
  notes: string;
}

const emptyForm: FormState = { label: '', category: 'OTHER', amount: '', paidAmount: '', courseId: '', dueDate: '', notes: '' };

const FeeFormModal: React.FC<{
  summary: FeeSummary;
  editing: FeeItem | null;
  preset: Partial<FormState> | null;
  onClose: () => void;
}> = ({ summary, editing, preset, onClose }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() =>
    editing
      ? {
          label: editing.label,
          category: editing.category,
          amount: String(editing.amount),
          paidAmount: String(editing.paidAmount),
          courseId: editing.courseId ?? '',
          dueDate: editing.dueDate ? editing.dueDate.slice(0, 10) : '',
          notes: editing.notes ?? '',
        }
      : { ...emptyForm, ...preset }
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        semesterId: summary.semester.id,
        label: form.label.trim(),
        category: form.category,
        amount: num(form.amount),
        paidAmount: num(form.paidAmount),
        courseId: form.courseId || null,
        dueDate: form.dueDate || null,
        notes: form.notes.trim() || null,
      };
      return editing ? api.updateFeeItem(editing.id, payload) : api.createFeeItem(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      queryClient.invalidateQueries({ queryKey: ['fees-overview'] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const canSave = form.label.trim().length > 0 && num(form.amount) >= 0 && form.amount !== '';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-xs sm:items-center sm:p-4" onMouseDown={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={editing ? t('fees.editFee') : t('fees.addFee')}
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave) save.mutate();
        }}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-[#141416] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#14201c] dark:text-white">
            {editing ? t('fees.editFee') : t('fees.addFee')}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="flex h-10 w-10 items-center justify-center rounded-lg text-[#787671] hover:bg-[#f6f5f4] dark:hover:bg-[#202024]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!editing && (
          <div className="mt-3 flex flex-wrap gap-2" aria-label={t('fees.quickAdd')}>
            {QUICK_ADD.map((q) => (
              <button
                key={q.category}
                type="button"
                onClick={() => set({ category: q.category, label: t(`fees.cat.${q.category}` as TranslationKey) })}
                className={cn(
                  'h-8 rounded-full border px-3 text-xs font-medium transition-colors',
                  form.category === q.category
                    ? 'border-[#0f6b57] bg-[#dcf0e8] text-[#0d3b30] dark:bg-[#0d3b30] dark:text-[#a8dcc9]'
                    : 'border-[#e5e3df] text-[#5d5b54] hover:bg-[#f6f5f4] dark:border-[#2a2a2e] dark:text-[#a4a097] dark:hover:bg-[#202024]'
                )}
              >
                {t(`fees.cat.${q.category}` as TranslationKey)}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-3.5">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[#5d5b54] dark:text-[#a4a097]">{t('fees.label')}</span>
            <input autoFocus className={inputClass} value={form.label} onChange={(e) => set({ label: e.target.value })} placeholder={t('fees.labelPlaceholder')} maxLength={160} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#5d5b54] dark:text-[#a4a097]">{t('fees.category')}</span>
              <select className={inputClass} value={form.category} onChange={(e) => set({ category: e.target.value as FeeCategory })}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`fees.cat.${c}` as TranslationKey)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#5d5b54] dark:text-[#a4a097]">{t('fees.dueDate')}</span>
              <input type="date" className={inputClass} value={form.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#5d5b54] dark:text-[#a4a097]">{t('fees.amount')} ({summary.plan.currency})</span>
              <input type="number" inputMode="decimal" min="0" step="any" className={inputClass} value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#5d5b54] dark:text-[#a4a097]">{t('fees.paidAmount')}</span>
              <input type="number" inputMode="decimal" min="0" step="any" className={inputClass} value={form.paidAmount} onChange={(e) => set({ paidAmount: e.target.value })} />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[#5d5b54] dark:text-[#a4a097]">{t('fees.course')}</span>
            <select className={inputClass} value={form.courseId} onChange={(e) => set({ courseId: e.target.value })}>
              <option value="">{t('fees.noCourse')}</option>
              {summary.perCourse.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[#5d5b54] dark:text-[#a4a097]">{t('fees.notes')}</span>
            <textarea className={cn(inputClass, 'h-20 resize-none py-2')} value={form.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={2000} />
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-[#b42318]">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-[#c8c4be] px-4 text-sm font-semibold text-[#1a1a1a] hover:bg-[#f6f5f4] dark:border-[#3a3a40] dark:text-white dark:hover:bg-[#202024]">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={!canSave || save.isPending} className="h-10 rounded-lg bg-[#0f6b57] px-5 text-sm font-semibold text-white hover:bg-[#0b5645] disabled:cursor-not-allowed disabled:bg-[#c8c4be]">
            {t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export const FeesPage: React.FC = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { activeSemesterId, semesters, selectSemester } = useActiveSemester();

  const { data: summary, isLoading, error } = useQuery<FeeSummary>({
    queryKey: ['fees', activeSemesterId],
    queryFn: () => api.getFeeSummary(activeSemesterId as string),
    enabled: !!activeSemesterId,
  });
  const { data: overview } = useQuery({ queryKey: ['fees-overview'], queryFn: () => api.getFeeOverview() });

  const currency = summary?.plan.currency ?? 'BDT';
  const money = useMoney(currency);

  // Tuition settings draft
  const [draft, setDraft] = useState({ currency: 'BDT', perCreditFee: '', waiverPercent: '' });
  const [savedFlash, setSavedFlash] = useState(false);
  useEffect(() => {
    if (!summary) return;
    setDraft({
      currency: summary.plan.currency,
      perCreditFee: summary.plan.perCreditFee ? String(summary.plan.perCreditFee) : '',
      waiverPercent: summary.plan.waiverPercent ? String(summary.plan.waiverPercent) : '',
    });
  }, [summary?.semester.id, summary?.plan.currency, summary?.plan.perCreditFee, summary?.plan.waiverPercent]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['fees'] });
    queryClient.invalidateQueries({ queryKey: ['fees-overview'] });
  };

  const savePlan = useMutation({
    mutationFn: () =>
      api.saveFeePlan({
        semesterId: activeSemesterId as string,
        currency: draft.currency,
        perCreditFee: num(draft.perCreditFee),
        waiverPercent: Math.min(100, num(draft.waiverPercent)),
      }),
    onSuccess: () => {
      refresh();
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1800);
    },
  });

  const payTuition = useMutation({
    mutationFn: (amount: number) => api.addTuitionPayment(activeSemesterId as string, amount),
    onSuccess: refresh,
  });
  const payItem = useMutation({ mutationFn: ({ id, amount }: { id: string; amount: number }) => api.payFeeItem(id, amount), onSuccess: refresh });
  const deleteItem = useMutation({ mutationFn: (id: string) => api.deleteFeeItem(id), onSuccess: refresh });

  const [modal, setModal] = useState<{ editing: FeeItem | null; preset: Partial<FormState> | null } | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [tuitionPay, setTuitionPay] = useState('');

  // Live tuition preview from the draft inputs, before saving.
  const credits = summary?.credits.total ?? 0;
  const previewGross = credits * num(draft.perCreditFee);
  const previewWaiver = (previewGross * Math.min(100, num(draft.waiverPercent))) / 100;
  const previewNet = previewGross - previewWaiver;

  const segments = useMemo(() => {
    if (!summary) return [];
    const rows: { key: string; label: string; amount: number; color: string }[] = [];
    if (summary.tuition.net > 0) rows.push({ key: 'TUITION', label: t('fees.tuition'), amount: summary.tuition.net, color: CATEGORY_COLORS.TUITION });
    for (const c of CATEGORIES) {
      const b = summary.byCategory[c];
      if (b && b.amount > 0) rows.push({ key: c, label: t(`fees.cat.${c}` as TranslationKey), amount: b.amount, color: CATEGORY_COLORS[c] });
    }
    return rows;
  }, [summary, t]);

  if (!activeSemesterId && !isLoading) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center text-sm text-[#787671]">
        <Wallet className="mx-auto mb-3 h-8 w-8 text-[#0f6b57]" aria-hidden="true" />
        {t('dash.createFirst')}
      </div>
    );
  }

  const totals = summary?.totals;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-[#14201c] dark:text-white sm:text-3xl">
            <Wallet className="h-7 w-7 text-[#0f6b57]" aria-hidden="true" />
            {t('fees.title')}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[#5d5b54] dark:text-[#a4a097]">{t('fees.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <select
            aria-label={t('fees.semester')}
            value={activeSemesterId ?? ''}
            onChange={(e) => selectSemester(e.target.value)}
            className={cn(inputClass, 'w-auto min-w-[10rem]')}
          >
            {semesters.map((s: { id: string; name: string }) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#c8c4be] px-3 text-sm font-semibold text-[#1a1a1a] hover:bg-[#f6f5f4] dark:border-[#3a3a40] dark:text-white dark:hover:bg-[#202024]">
            <Printer className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('fees.print')}</span>
          </button>
          <button type="button" onClick={() => setModal({ editing: null, preset: null })} disabled={!summary} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0f6b57] px-4 text-sm font-semibold text-white hover:bg-[#0b5645] disabled:opacity-50">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('fees.addFee')}
          </button>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-[#b42318]">{(error as Error).message}</p>}

      {isLoading || !summary || !totals ? (
        <div className="h-48 animate-pulse rounded-xl bg-[#f0eeec] dark:bg-[#1c1c1f]" />
      ) : (
        <>
          {/* Totals */}
          <section aria-label={t('fees.totalCost')} className={cn(cardClass, 'overflow-hidden')}>
            <div className="grid divide-y divide-[#e5e3df] dark:divide-[#2a2a2e] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="p-5">
                <p className="text-sm text-[#5d5b54] dark:text-[#a4a097]">{t('fees.totalCost')}</p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums text-[#14201c] dark:text-white">{money(totals.total)}</p>
                <p className="mt-1 text-xs text-[#787671]">
                  {summary.credits.total} {t('fees.credit')} · {summary.semester.name}
                </p>
              </div>
              <div className="p-5">
                <p className="text-sm text-[#5d5b54] dark:text-[#a4a097]">{t('fees.paid')}</p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums text-[#0f6b57] dark:text-[#4ccba5]">{money(totals.paid)}</p>
                <p className="mt-1 text-xs text-[#787671]">{t('fees.percentPaid', { n: totals.percentPaid })}</p>
              </div>
              <div className="p-5">
                <p className="text-sm text-[#5d5b54] dark:text-[#a4a097]">{t('fees.due')}</p>
                <p className={cn('mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums', totals.due > 0 ? 'text-[#14201c] dark:text-white' : 'text-[#0f6b57]')}>{money(totals.due)}</p>
                {totals.overdueCount > 0 && <p className="mt-1 text-xs font-medium text-[#b42318]">{t('fees.overdue', { n: totals.overdueCount })}</p>}
              </div>
            </div>
            <div className="h-2 bg-[#ede9e4] dark:bg-[#252528]" role="progressbar" aria-valuenow={totals.percentPaid} aria-valuemin={0} aria-valuemax={100} aria-label={t('fees.percentPaid', { n: totals.percentPaid })}>
              <div className="h-full bg-[#0f6b57] transition-all duration-500" style={{ width: `${totals.percentPaid}%` }} />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            {/* Tuition settings */}
            <section className={cn(cardClass, 'self-start p-5 print:hidden')} aria-labelledby="tuition-h">
              <h2 id="tuition-h" className="text-base font-bold text-[#14201c] dark:text-white">{t('fees.settings')}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[#5d5b54] dark:text-[#a4a097]">{t('fees.currency')}</span>
                  <select className={inputClass} value={draft.currency} onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))}>
                    {(CURRENCIES.includes(draft.currency) ? CURRENCIES : [draft.currency, ...CURRENCIES]).map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[#5d5b54] dark:text-[#a4a097]">{t('fees.waiver')}</span>
                  <input type="number" inputMode="decimal" min="0" max="100" step="any" className={inputClass} value={draft.waiverPercent} onChange={(e) => setDraft((d) => ({ ...d, waiverPercent: e.target.value }))} />
                </label>
                <label className="col-span-2 block">
                  <span className="mb-1 block text-xs font-medium text-[#5d5b54] dark:text-[#a4a097]">{t('fees.perCredit')}</span>
                  <input type="number" inputMode="decimal" min="0" step="any" className={inputClass} value={draft.perCreditFee} onChange={(e) => setDraft((d) => ({ ...d, perCreditFee: e.target.value }))} />
                </label>
              </div>

              <dl className="mt-4 space-y-2 rounded-lg bg-[#f4faf7] p-3.5 text-sm dark:bg-[#0f1d19]">
                <div className="flex justify-between gap-3"><dt className="text-[#5d5b54] dark:text-[#a4a097]">{t('fees.credits')}</dt><dd className="font-semibold tabular-nums">{credits}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[#5d5b54] dark:text-[#a4a097]">{t('fees.tuitionGross')}</dt><dd className="font-semibold tabular-nums">{money(previewGross)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[#5d5b54] dark:text-[#a4a097]">{t('fees.waiverAmount')}</dt><dd className="font-semibold tabular-nums text-[#0f6b57] dark:text-[#4ccba5]">−{money(previewWaiver)}</dd></div>
                <div className="flex justify-between gap-3 border-t border-[#cfe5db] pt-2 dark:border-[#1f3a31]"><dt className="font-semibold">{t('fees.tuitionNet')}</dt><dd className="font-bold tabular-nums">{money(previewNet)}</dd></div>
              </dl>
              {credits === 0 && <p className="mt-3 text-xs text-[#787671]">{t('fees.noCourses')}</p>}
              {credits > 0 && !summary.plan.configured && !draft.perCreditFee && <p className="mt-3 text-xs text-[#787671]">{t('fees.configureHint')}</p>}

              <button type="button" onClick={() => savePlan.mutate()} disabled={savePlan.isPending} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0f6b57] text-sm font-semibold text-white hover:bg-[#0b5645] disabled:opacity-60">
                {savedFlash ? <><Check className="h-4 w-4" aria-hidden="true" />{t('fees.saved')}</> : t('fees.saveSettings')}
              </button>

              {summary.tuition.net > 0 && (
                <form
                  className="mt-5 border-t border-[#e5e3df] pt-4 dark:border-[#2a2a2e]"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const amount = num(tuitionPay);
                    if (amount > 0) {
                      payTuition.mutate(amount);
                      setTuitionPay('');
                    }
                  }}
                >
                  <p className="text-sm font-semibold text-[#14201c] dark:text-white">{t('fees.payTuition')}</p>
                  <p className="mt-0.5 text-xs text-[#787671]">
                    {t('fees.paid')}: {money(summary.tuition.paid)} · {t('fees.due')}: {money(summary.tuition.due)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <input type="number" inputMode="decimal" min="0" step="any" aria-label={t('fees.payAmount')} placeholder={t('fees.payAmount')} className={inputClass} value={tuitionPay} onChange={(e) => setTuitionPay(e.target.value)} />
                    <button type="submit" disabled={payTuition.isPending || num(tuitionPay) <= 0} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[#0f6b57] px-3 text-sm font-semibold text-[#0f6b57] hover:bg-[#eef8f4] disabled:opacity-50 dark:text-[#4ccba5] dark:hover:bg-[#0d3b30]">
                      <CreditCard className="h-4 w-4" aria-hidden="true" />
                      {t('fees.pay')}
                    </button>
                  </div>
                </form>
              )}
            </section>

            {/* Breakdown + per course */}
            <div className="space-y-6">
              <section className={cn(cardClass, 'p-5')} aria-labelledby="breakdown-h">
                <h2 id="breakdown-h" className="text-base font-bold text-[#14201c] dark:text-white">{t('fees.breakdown')}</h2>
                {segments.length === 0 ? (
                  <p className="mt-3 text-sm text-[#787671]">{t('fees.noItems')}</p>
                ) : (
                  <>
                    <div className="mt-4 flex h-3.5 w-full overflow-hidden rounded-full bg-[#ede9e4] dark:bg-[#252528]" role="img" aria-label={segments.map((s) => `${s.label} ${money(s.amount)}`).join(', ')}>
                      {segments.map((s) => (
                        <div key={s.key} style={{ width: `${(s.amount / totals.total) * 100}%`, backgroundColor: s.color }} title={`${s.label}: ${money(s.amount)}`} />
                      ))}
                    </div>
                    <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                      {segments.map((s) => (
                        <li key={s.key} className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
                            <span className="truncate text-[#37352f] dark:text-[#d9d6d0]">{s.label}</span>
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums">{money(s.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>

              {summary.perCourse.length > 0 && (
                <section className={cn(cardClass, 'overflow-hidden')} aria-labelledby="percourse-h">
                  <h2 id="percourse-h" className="p-5 pb-3 text-base font-bold text-[#14201c] dark:text-white">{t('fees.perCourse')}</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[30rem] text-sm">
                      <thead>
                        <tr className="border-y border-[#e5e3df] bg-[#fafaf9] text-start text-xs text-[#787671] dark:border-[#2a2a2e] dark:bg-[#19191c]">
                          <th className="px-5 py-2 text-start font-medium">{t('nav.courses')}</th>
                          <th className="px-3 py-2 text-end font-medium">{t('fees.credits')}</th>
                          <th className="px-3 py-2 text-end font-medium">{t('fees.tuition')}</th>
                          <th className="px-3 py-2 text-end font-medium">{t('fees.courseFees')}</th>
                          <th className="px-5 py-2 text-end font-medium">{t('fees.totalCost')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.perCourse.map((c) => (
                          <tr key={c.id} className="border-b border-[#ede9e4] last:border-0 dark:border-[#252528]">
                            <td className="px-5 py-2.5"><span className="font-semibold">{c.code}</span> <span className="text-[#787671]">{c.title}</span></td>
                            <td className="px-3 py-2.5 text-end tabular-nums">{c.credits}</td>
                            <td className="px-3 py-2.5 text-end tabular-nums">{money(c.tuition)}</td>
                            <td className="px-3 py-2.5 text-end tabular-nums">{money(c.courseFees)}</td>
                            <td className="px-5 py-2.5 text-end font-semibold tabular-nums">{money(c.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Fee items */}
          <section className={cardClass} aria-labelledby="items-h">
            <div className="flex items-center justify-between p-5 pb-3">
              <h2 id="items-h" className="text-base font-bold text-[#14201c] dark:text-white">{t('fees.items')}</h2>
              <span className="text-xs text-[#787671]">{summary.items.length}</span>
            </div>
            {summary.items.length === 0 ? (
              <div className="px-5 pb-6 text-sm text-[#787671]">
                <p>{t('fees.noItems')}</p>
                <div className="mt-3 flex flex-wrap gap-2 print:hidden">
                  {QUICK_ADD.map((q) => (
                    <button key={q.category} type="button" onClick={() => setModal({ editing: null, preset: { category: q.category, label: t(`fees.cat.${q.category}` as TranslationKey) } })} className="h-9 rounded-full border border-[#c8c4be] px-3.5 text-xs font-semibold text-[#1a1a1a] hover:bg-[#f6f5f4] dark:border-[#3a3a40] dark:text-white dark:hover:bg-[#202024]">
                      + {t(`fees.cat.${q.category}` as TranslationKey)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-[#ede9e4] border-t border-[#e5e3df] dark:divide-[#252528] dark:border-[#2a2a2e]">
                {summary.items.map((item) => {
                  const status = item.status ?? 'UNPAID';
                  const course = summary.perCourse.find((c) => c.id === item.courseId);
                  const remaining = Math.max(0, item.amount - item.paidAmount);
                  const pct = item.amount > 0 ? Math.min(100, Math.round((item.paidAmount / item.amount) * 100)) : 0;
                  return (
                    <li key={item.id} className="px-5 py-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[item.category] }} aria-hidden="true" />
                            <p className="font-semibold text-[#14201c] dark:text-white">{item.label}</p>
                            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS_STYLES[status])}>{t(`fees.status.${status}` as TranslationKey)}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-[#787671]">
                            {t(`fees.cat.${item.category}` as TranslationKey)}
                            {course ? ` · ${course.code}` : ''}
                            {item.dueDate ? ` · ${t('fees.dueDate')}: ${formatDate(item.dueDate)}` : ''}
                          </p>
                        </div>
                        <div className="text-end">
                          <p className="font-bold tabular-nums">{money(item.amount)}</p>
                          <p className="text-xs tabular-nums text-[#787671]">{t('fees.paid')} {money(item.paidAmount)}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#ede9e4] dark:bg-[#252528]">
                        <div className="h-full rounded-full bg-[#0f6b57]" style={{ width: `${pct}%` }} />
                      </div>

                      {payingId === item.id ? (
                        <form
                          className="mt-3 flex gap-2 print:hidden"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const amount = num(payAmount);
                            if (amount > 0) payItem.mutate({ id: item.id, amount });
                            setPayingId(null);
                          }}
                        >
                          <input autoFocus type="number" inputMode="decimal" min="0" step="any" aria-label={t('fees.payAmount')} className={inputClass} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                          <button type="submit" className="h-10 shrink-0 rounded-lg bg-[#0f6b57] px-4 text-sm font-semibold text-white hover:bg-[#0b5645]">{t('common.save')}</button>
                          <button type="button" onClick={() => setPayingId(null)} className="h-10 shrink-0 rounded-lg px-3 text-sm text-[#5d5b54] hover:bg-[#f6f5f4] dark:hover:bg-[#202024]">{t('common.cancel')}</button>
                        </form>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-1.5 print:hidden">
                          {remaining > 0 && (
                            <button type="button" onClick={() => { setPayingId(item.id); setPayAmount(String(remaining)); }} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-[#0f6b57] hover:bg-[#eef8f4] dark:text-[#4ccba5] dark:hover:bg-[#0d3b30]">
                              <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                              {t('fees.pay')}
                            </button>
                          )}
                          <button type="button" onClick={() => setModal({ editing: item, preset: null })} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[#5d5b54] hover:bg-[#f6f5f4] dark:text-[#a4a097] dark:hover:bg-[#202024]">
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            {t('fees.editFee')}
                          </button>
                          <button
                            type="button"
                            onClick={() => window.confirm(t('fees.deleteConfirm')) && deleteItem.mutate(item.id)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[#b42318] hover:bg-[#fde0ec] dark:hover:bg-[#3a1620]"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            {t('fees.delete')}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* All semesters */}
          {overview && overview.rows.length > 0 && (
            <section className={cn(cardClass, 'overflow-hidden')} aria-labelledby="history-h">
              <h2 id="history-h" className="p-5 pb-3 text-base font-bold text-[#14201c] dark:text-white">{t('fees.history')}</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead>
                    <tr className="border-y border-[#e5e3df] bg-[#fafaf9] text-xs text-[#787671] dark:border-[#2a2a2e] dark:bg-[#19191c]">
                      <th className="px-5 py-2 text-start font-medium">{t('fees.semester')}</th>
                      <th className="px-3 py-2 text-end font-medium">{t('fees.totalCost')}</th>
                      <th className="px-3 py-2 text-end font-medium">{t('fees.paid')}</th>
                      <th className="px-5 py-2 text-end font-medium">{t('fees.due')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.rows.map((r) => {
                      const fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: r.currency, maximumFractionDigits: 0 });
                      return (
                        <tr key={r.semesterId} className={cn('border-b border-[#ede9e4] dark:border-[#252528]', r.semesterId === activeSemesterId && 'bg-[#f4faf7] dark:bg-[#0f1d19]')}>
                          <td className="px-5 py-2.5 font-medium">{r.name}</td>
                          <td className="px-3 py-2.5 text-end tabular-nums">{fmt.format(r.total)}</td>
                          <td className="px-3 py-2.5 text-end tabular-nums">{fmt.format(r.paid)}</td>
                          <td className="px-5 py-2.5 text-end tabular-nums">{fmt.format(r.due)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold">
                      <td className="px-5 py-3">{t('fees.grandTotal')}</td>
                      <td className="px-3 py-3 text-end tabular-nums" colSpan={3}>{money(overview.grand.total)} · {t('fees.paid')} {money(overview.grand.paid)} · {t('fees.due')} {money(overview.grand.due)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {modal && summary && <FeeFormModal summary={summary} editing={modal.editing} preset={modal.preset} onClose={() => setModal(null)} />}
    </div>
  );
};

export default FeesPage;
