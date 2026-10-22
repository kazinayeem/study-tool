import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Crown, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/money';
import { cn, formatDate } from '../../lib/utils';
import { useI18n } from '../../i18n/I18nContext';
import type { TranslationKey } from '../../i18n/translations';
import type { PaymentMethodCode, Plan, Subscription } from '../../types';
import { StatusChip } from '../billing/BillingPage';
import { StudentsTab } from './StudentsTab';

const inputClass =
  'h-10 w-full rounded-lg border border-[#c8c4be] bg-white px-3 text-sm text-[#1a1a1a] outline-none transition-colors focus:border-[#0f6b57] focus:ring-2 focus:ring-[#0f6b57]/20 dark:border-[#3a3a40] dark:bg-[#1c1c1f] dark:text-white';
const card = 'rounded-xl border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416]';
const ALL_METHODS: PaymentMethodCode[] = ['BKASH', 'NAGAD', 'ROCKET', 'BANK', 'CARD', 'OTHER'];

type Tab = 'students' | 'requests' | 'plans' | 'payment';
const TABS: Tab[] = ['students', 'requests', 'plans', 'payment'];

/* ------------------------------------------------------------------ */
/* Payment requests                                                    */
/* ------------------------------------------------------------------ */

const RequestsTab: React.FC = () => {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'PENDING' | 'ACTIVE' | 'REJECTED' | 'ALL'>('PENDING');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['owner-subscriptions', filter],
    queryFn: () => api.getOwnerSubscriptions(filter),
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['owner-subscriptions'] });
    queryClient.invalidateQueries({ queryKey: ['owner-stats'] });
  };
  const approve = useMutation({ mutationFn: (id: string) => api.approveSubscription(id), onSuccess: refresh });
  const reject = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => api.rejectSubscription(id, note),
    onSuccess: () => {
      setRejecting(null);
      setReason('');
      refresh();
    },
  });

  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-1.5">
        {(['PENDING', 'ACTIVE', 'REJECTED', 'ALL'] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              'h-9 rounded-full px-4 text-sm font-medium transition-colors',
              filter === f ? 'bg-[#0f6b57] text-white' : 'border border-[#e5e3df] text-[#5d5b54] hover:bg-[#f6f5f4] dark:border-[#2a2a2e] dark:text-[#a4a097] dark:hover:bg-[#202024]'
            )}
          >
            {t(`owner.filter.${f}` as TranslationKey)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-4 h-32 animate-pulse rounded-xl bg-[#f0eeec] dark:bg-[#1c1c1f]" />
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-[#787671] dark:text-[#a4a097]">{t('owner.empty')}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((s: Subscription) => (
            <li key={s.id} className={cn(card, 'p-4')}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[#14201c] dark:text-white">
                    {s.planName} · {formatMoney(s.amount, s.currency, lang)}
                  </p>
                  <p className="mt-0.5 text-sm text-[#5d5b54] dark:text-[#a4a097]">
                    {t('owner.from')}: {s.user?.name || '—'} <span className="text-[#787671]">({s.user?.email})</span>
                  </p>
                </div>
                <StatusChip status={s.status} />
              </div>

              <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="text-xs text-[#787671]">{t('owner.txn')}</dt><dd className="break-all font-mono text-[13px] font-semibold text-[#14201c] dark:text-white">{s.transactionId}</dd></div>
                <div><dt className="text-xs text-[#787671]">{t('owner.paidVia')}</dt><dd>{t(`billing.m.${s.paymentMethod}` as TranslationKey)}</dd></div>
                <div><dt className="text-xs text-[#787671]">{t('owner.number')}</dt><dd>{s.payerNumber || '—'}</dd></div>
                <div><dt className="text-xs text-[#787671]">{t('owner.submitted')}</dt><dd>{formatDate(s.createdAt)}</dd></div>
              </dl>
              {s.studentNote && <p className="mt-2 rounded-lg bg-[#f6f5f4] px-3 py-2 text-sm text-[#37352f] dark:bg-[#1c1c1f] dark:text-[#d9d6d0]">“{s.studentNote}”</p>}
              {s.status === 'ACTIVE' && s.endsAt && (
                <p className="mt-2 text-xs text-[#0f6b57] dark:text-[#4ccba5]">{t('owner.period')}: {formatDate(s.startsAt)} → {formatDate(s.endsAt)}</p>
              )}
              {s.reviewNote && <p className="mt-2 text-xs text-[#5d5b54] dark:text-[#a4a097]">{t('billing.ownerNote')}: {s.reviewNote}</p>}

              {s.status === 'PENDING' && (
                <div className="mt-3">
                  {rejecting === s.id ? (
                    <form
                      className="flex flex-col gap-2 sm:flex-row"
                      onSubmit={(e) => {
                        e.preventDefault();
                        reject.mutate({ id: s.id, note: reason });
                      }}
                    >
                      <input autoFocus className={inputClass} placeholder={t('owner.rejectReason')} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
                      <button type="submit" disabled={reject.isPending} className="h-10 shrink-0 rounded-lg bg-[#b42318] px-4 text-sm font-semibold text-white hover:bg-[#912018] disabled:opacity-60">{t('owner.confirmReject')}</button>
                      <button type="button" onClick={() => setRejecting(null)} className="h-10 shrink-0 rounded-lg px-3 text-sm text-[#5d5b54] hover:bg-[#f6f5f4] dark:hover:bg-[#202024]">{t('common.cancel')}</button>
                    </form>
                  ) : (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => approve.mutate(s.id)} disabled={approve.isPending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0f6b57] px-4 text-sm font-semibold text-white hover:bg-[#0b5645] disabled:opacity-60">
                        <Check className="h-4 w-4" aria-hidden="true" />
                        {t('owner.approve')}
                      </button>
                      <button type="button" onClick={() => { setRejecting(s.id); setReason(''); }} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e5c4c0] px-4 text-sm font-semibold text-[#b42318] hover:bg-[#fde0ec] dark:border-[#5a2a30] dark:hover:bg-[#3a1620]">
                        <X className="h-4 w-4" aria-hidden="true" />
                        {t('owner.reject')}
                      </button>
                    </div>
                  )}
                  {(approve.isError || reject.isError) && <p role="alert" className="mt-2 text-sm text-[#b42318]">{((approve.error || reject.error) as Error).message}</p>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Plans                                                                */
/* ------------------------------------------------------------------ */

interface PlanForm {
  name: string;
  description: string;
  durationMonths: string;
  price: string;
  currency: string;
  features: string;
  isSemester: boolean;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: string;
}

const emptyPlan: PlanForm = { name: '', description: '', durationMonths: '1', price: '', currency: 'BDT', features: '', isSemester: false, isPopular: false, isActive: true, sortOrder: '100' };

const PlanModal: React.FC<{ plan: Plan | null; onClose: () => void }> = ({ plan, onClose }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [f, setF] = useState<PlanForm>(
    plan
      ? {
          name: plan.name,
          description: plan.description ?? '',
          durationMonths: String(plan.durationMonths),
          price: String(plan.price),
          currency: plan.currency,
          features: plan.features.join('\n'),
          isSemester: plan.isSemester,
          isPopular: plan.isPopular,
          isActive: plan.isActive,
          sortOrder: String(plan.sortOrder),
        }
      : emptyPlan
  );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: f.name.trim(),
        description: f.description.trim() || null,
        durationMonths: Math.max(1, Math.round(Number(f.durationMonths) || 1)),
        price: Number(f.price) || 0,
        currency: f.currency.trim().toUpperCase() || 'BDT',
        features: f.features.split('\n').map((x) => x.trim()).filter(Boolean),
        isSemester: f.isSemester,
        isPopular: f.isPopular,
        isActive: f.isActive,
        sortOrder: Math.max(0, Math.round(Number(f.sortOrder) || 0)),
      };
      return plan ? api.updatePlan(plan.id, payload) : api.createPlan(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-plans'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      onClose();
    },
  });

  const check = (key: 'isSemester' | 'isPopular' | 'isActive', label: TranslationKey) => (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#37352f] dark:text-[#d9d6d0]">
      <input type="checkbox" className="h-4 w-4 accent-[#0f6b57]" checked={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.checked })} />
      {t(label)}
    </label>
  );
  const label = (key: TranslationKey) => <span className="mb-1 block text-xs font-medium text-[#5d5b54] dark:text-[#a4a097]">{t(key)}</span>;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs sm:items-center sm:p-4" onMouseDown={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={plan ? t('owner.editPlan') : t('owner.newPlan')}
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (f.name.trim()) save.mutate();
        }}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-[#141416] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#14201c] dark:text-white">{plan ? t('owner.editPlan') : t('owner.newPlan')}</h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="flex h-10 w-10 items-center justify-center rounded-lg text-[#787671] hover:bg-[#f6f5f4] dark:hover:bg-[#202024]"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="col-span-2 block">{label('owner.plan.name')}<input autoFocus className={inputClass} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} /></label>
          <label className="col-span-2 block">{label('owner.plan.description')}<input className={inputClass} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={300} /></label>
          <label className="block">{label('owner.plan.months')}<input type="number" min={1} max={60} className={inputClass} value={f.durationMonths} onChange={(e) => setF({ ...f, durationMonths: e.target.value })} /></label>
          <label className="block">{label('owner.plan.price')}<input type="number" min={0} step="any" className={inputClass} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></label>
          <label className="block">{label('owner.plan.currency')}<input className={inputClass} value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} maxLength={8} /></label>
          <label className="block">{label('owner.plan.order')}<input type="number" min={0} className={inputClass} value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: e.target.value })} /></label>
          <label className="col-span-2 block">{label('owner.plan.features')}<textarea className={cn(inputClass, 'h-28 resize-none py-2')} value={f.features} onChange={(e) => setF({ ...f, features: e.target.value })} /></label>
        </div>
        <div className="mt-3 space-y-2">
          {check('isSemester', 'owner.plan.isSemester')}
          {check('isPopular', 'owner.plan.isPopular')}
          {check('isActive', 'owner.plan.isActive')}
        </div>
        {save.isError && <p role="alert" className="mt-3 text-sm text-[#b42318]">{(save.error as Error).message}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-[#c8c4be] px-4 text-sm font-semibold hover:bg-[#f6f5f4] dark:border-[#3a3a40] dark:text-white dark:hover:bg-[#202024]">{t('common.cancel')}</button>
          <button type="submit" disabled={!f.name.trim() || save.isPending} className="h-10 rounded-lg bg-[#0f6b57] px-5 text-sm font-semibold text-white hover:bg-[#0b5645] disabled:bg-[#c8c4be]">{t('common.save')}</button>
        </div>
      </form>
    </div>
  );
};

const PlansTab: React.FC = () => {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const { data: plans = [], isLoading } = useQuery({ queryKey: ['owner-plans'], queryFn: () => api.getOwnerPlans() });
  const [modal, setModal] = useState<{ plan: Plan | null } | null>(null);
  const remove = useMutation({
    mutationFn: (id: string) => api.deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-plans'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });

  return (
    <div>
      <button type="button" onClick={() => setModal({ plan: null })} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0f6b57] px-4 text-sm font-semibold text-white hover:bg-[#0b5645]">
        <Plus className="h-4 w-4" aria-hidden="true" />
        {t('owner.newPlan')}
      </button>
      {isLoading ? (
        <div className="mt-4 h-32 animate-pulse rounded-xl bg-[#f0eeec] dark:bg-[#1c1c1f]" />
      ) : (
        <ul className="mt-4 space-y-3">
          {plans.map((p) => (
            <li key={p.id} className={cn(card, 'flex flex-wrap items-center justify-between gap-3 p-4', !p.isActive && 'opacity-60')}>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-[#14201c] dark:text-white">
                  {p.name}
                  {p.isPopular && <span className="rounded-full bg-[#ffd84d] px-2 py-0.5 text-[10px] font-semibold text-[#3d2f00]">{t('pricing.popular')}</span>}
                  {!p.isActive && <span className="rounded-full bg-[#f0eeec] px-2 py-0.5 text-[10px] font-semibold text-[#5d5b54] dark:bg-[#252528] dark:text-[#a4a097]">{t('owner.plan.hidden')}</span>}
                </p>
                <p className="text-sm text-[#5d5b54] dark:text-[#a4a097]">
                  {formatMoney(p.price, p.currency, lang)} · {p.isSemester ? t('pricing.semester') : t(p.durationMonths === 1 ? 'pricing.month' : 'pricing.months', { n: p.durationMonths })} · {t('owner.plan.sales', { n: p._count?.subscriptions ?? 0 })}
                </p>
              </div>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setModal({ plan: p })} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-[#5d5b54] hover:bg-[#f6f5f4] dark:text-[#a4a097] dark:hover:bg-[#202024]">
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />{t('common.edit')}
                </button>
                <button type="button" onClick={() => window.confirm(t('owner.plan.deleteConfirm')) && remove.mutate(p.id)} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-[#b42318] hover:bg-[#fde0ec] dark:hover:bg-[#3a1620]">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />{t('common.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {modal && <PlanModal plan={modal.plan} onClose={() => setModal(null)} />}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Payment settings                                                     */
/* ------------------------------------------------------------------ */

const PaymentTab: React.FC = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['owner-settings'], queryFn: () => api.getOwnerSettings() });
  const [instructions, setInstructions] = useState('');
  const [methods, setMethods] = useState<PaymentMethodCode[]>([]);
  const [support, setSupport] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    setInstructions(data.paymentInstructions);
    setMethods(data.paymentMethods);
    setSupport(data.supportContact);
  }, [data]);

  const save = useMutation({
    mutationFn: () => api.saveOwnerSettings({ paymentInstructions: instructions, paymentMethods: methods, supportContact: support }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-settings'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    },
  });
  const toggle = (m: PaymentMethodCode) => setMethods((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

  return (
    <form
      className={cn(card, 'max-w-2xl space-y-4 p-5')}
      onSubmit={(e) => {
        e.preventDefault();
        if (methods.length) save.mutate();
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-[#14201c] dark:text-white">{t('owner.payment.instructions')}</span>
        <textarea className={cn(inputClass, 'h-40 py-2')} value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={2000} />
        <span className="mt-1 block text-xs text-[#787671] dark:text-[#a4a097]">{t('owner.payment.instructionsHint')}</span>
      </label>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-[#14201c] dark:text-white">{t('owner.payment.methods')}</legend>
        <div className="flex flex-wrap gap-2">
          {ALL_METHODS.map((m) => (
            <label key={m} className={cn('flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm transition-colors', methods.includes(m) ? 'border-[#0f6b57] bg-[#f1f8f5] text-[#0d3b30] dark:bg-[#0d1f19] dark:text-[#a8dcc9]' : 'border-[#e5e3df] text-[#5d5b54] dark:border-[#2a2a2e] dark:text-[#a4a097]')}>
              <input type="checkbox" className="sr-only" checked={methods.includes(m)} onChange={() => toggle(m)} />
              {t(`billing.m.${m}` as TranslationKey)}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-[#14201c] dark:text-white">{t('owner.payment.support')}</span>
        <input className={inputClass} value={support} onChange={(e) => setSupport(e.target.value)} maxLength={200} />
      </label>
      {save.isError && <p role="alert" className="text-sm text-[#b42318]">{(save.error as Error).message}</p>}
      <button type="submit" disabled={save.isPending || !methods.length} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0f6b57] px-5 text-sm font-semibold text-white hover:bg-[#0b5645] disabled:bg-[#c8c4be]">
        {saved ? (<><Check className="h-4 w-4" aria-hidden="true" />{t('owner.saved')}</>) : t('common.save')}
      </button>
    </form>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export const OwnerConsolePage: React.FC = () => {
  const { t, lang } = useI18n();
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab') as Tab | null;
  const tab: Tab = requested && TABS.includes(requested) ? requested : 'students';
  const setTab = (next: Tab) => setParams(next === 'students' ? {} : { tab: next }, { replace: true });
  const { data: stats } = useQuery({ queryKey: ['owner-stats'], queryFn: () => api.getOwnerStats(), refetchInterval: 20_000 });

  const tabs: { id: Tab; label: TranslationKey; badge?: number }[] = [
    { id: 'students', label: 'owner.tab.students' },
    { id: 'requests', label: 'owner.tab.requests', badge: stats?.pending },
    { id: 'plans', label: 'owner.tab.plans' },
    { id: 'payment', label: 'owner.tab.payment' },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-[#14201c] dark:text-white sm:text-3xl">
          <Crown className="h-7 w-7 text-[#0f6b57]" aria-hidden="true" />
          {t('owner.title')}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-[#5d5b54] dark:text-[#a4a097]">{t('owner.subtitle')}</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: t('owner.pending'), value: String(stats?.pending ?? '–'), accent: (stats?.pending ?? 0) > 0 },
          { label: t('owner.active'), value: String(stats?.active ?? '–') },
          { label: t('owner.students'), value: String(stats?.students ?? '–') },
          { label: t('owner.revenue'), value: stats ? formatMoney(stats.revenue, stats.currency, lang) : '–', hint: stats ? t('owner.revenueMonth', { amount: formatMoney(stats.revenueThisMonth, stats.currency, lang) }) : undefined },
        ].map((s) => (
          <div key={s.label} className={cn(card, 'p-4')}>
            <dt className="text-xs text-[#5d5b54] dark:text-[#a4a097]">{s.label}</dt>
            <dd className={cn('mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums', s.accent ? 'text-[#b7791f] dark:text-[#ffd84d]' : 'text-[#14201c] dark:text-white')}>{s.value}</dd>
            {s.hint && <p className="mt-0.5 text-xs text-[#787671] dark:text-[#a4a097]">{s.hint}</p>}
          </div>
        ))}
      </dl>

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-[#e5e3df] dark:border-[#2a2a2e]">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
              tab === x.id ? 'border-[#0f6b57] text-[#0f6b57] dark:text-[#4ccba5]' : 'border-transparent text-[#5d5b54] hover:text-[#14201c] dark:text-[#a4a097] dark:hover:text-white'
            )}
          >
            {t(x.label)}
            {!!x.badge && <span className="rounded-full bg-[#ffd84d] px-1.5 text-[11px] font-bold text-[#3d2f00]">{x.badge}</span>}
          </button>
        ))}
      </div>

      {tab === 'students' && <StudentsTab />}
      {tab === 'requests' && <RequestsTab />}
      {tab === 'plans' && <PlansTab />}
      {tab === 'payment' && <PaymentTab />}
    </div>
  );
};

export default OwnerConsolePage;
