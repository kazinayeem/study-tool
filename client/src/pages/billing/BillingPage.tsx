import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, CreditCard, Info, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/money';
import { formatDate, cn } from '../../lib/utils';
import { useI18n } from '../../i18n/I18nContext';
import type { TranslationKey } from '../../i18n/translations';
import { useAuth } from '../../context/AuthContext';
import type { Plan, PaymentMethodCode, Subscription, SubscriptionStatus } from '../../types';

const inputClass =
  'h-10 w-full rounded-lg border border-[#c8c4be] bg-white px-3 text-sm text-[#1a1a1a] outline-none transition-colors focus:border-[#0f6b57] focus:ring-2 focus:ring-[#0f6b57]/20 dark:border-[#3a3a40] dark:bg-[#1c1c1f] dark:text-white';
const card = 'rounded-xl border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416]';

export const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  PENDING: 'bg-[#fff0c2] text-[#7a5200] dark:bg-[#3a2c08] dark:text-[#ffd84d]',
  ACTIVE: 'bg-[#d9f3e1] text-[#14532d] dark:bg-[#0d3b30] dark:text-[#7ee2b8]',
  REJECTED: 'bg-[#fde0ec] text-[#b42318] dark:bg-[#3a1620] dark:text-[#ff8787]',
  CANCELLED: 'bg-[#f0eeec] text-[#5d5b54] dark:bg-[#252528] dark:text-[#a4a097]',
  EXPIRED: 'bg-[#f0eeec] text-[#5d5b54] dark:bg-[#252528] dark:text-[#a4a097]',
};

export const StatusChip: React.FC<{ status: SubscriptionStatus }> = ({ status }) => {
  const { t } = useI18n();
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', STATUS_STYLES[status])}>
      {t(`billing.status.${status}` as TranslationKey)}
    </span>
  );
};

export const BillingPage: React.FC = () => {
  const { t, lang } = useI18n();
  const { user, isDemo } = useAuth();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();

  const { data: plansData } = useQuery({ queryKey: ['plans'], queryFn: () => api.getPlans() });
  const { data: billing } = useQuery({ queryKey: ['billing'], queryFn: () => api.getMyBilling(), enabled: !!user });

  const plans = plansData?.plans ?? [];
  const payment = billing?.payment ?? plansData?.payment;
  const [planId, setPlanId] = useState<string>(params.get('plan') ?? '');
  const selected: Plan | undefined = plans.find((p) => p.id === planId);

  // Default to the first popular plan once plans load and none was chosen in the URL.
  useEffect(() => {
    if (!planId && plans.length) setPlanId((plans.find((p) => p.isPopular) ?? plans[0]).id);
  }, [plans, planId]);

  const [form, setForm] = useState({
    paymentMethod: '' as PaymentMethodCode | '',
    transactionId: '',
    payerNumber: '',
    paidAt: new Date().toISOString().slice(0, 10),
    note: '',
  });
  useEffect(() => {
    if (!form.paymentMethod && payment?.paymentMethods?.length) setForm((f) => ({ ...f, paymentMethod: payment.paymentMethods[0] }));
  }, [payment, form.paymentMethod]);

  const [success, setSuccess] = useState(false);
  const submit = useMutation({
    mutationFn: () =>
      api.subscribe({
        planId,
        paymentMethod: form.paymentMethod || 'OTHER',
        transactionId: form.transactionId.trim(),
        payerNumber: form.payerNumber.trim() || null,
        paidAt: form.paidAt || null,
        note: form.note.trim() || null,
      }),
    onSuccess: () => {
      setSuccess(true);
      setForm((f) => ({ ...f, transactionId: '', payerNumber: '', note: '' }));
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
  const cancel = useMutation({
    mutationFn: (id: string) => api.cancelSubscription(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['billing'] }),
  });

  const current = billing?.current ?? null;
  const daysLeft = useMemo(() => (current?.endsAt ? Math.max(0, Math.ceil((new Date(current.endsAt).getTime() - Date.now()) / 86_400_000)) : 0), [current]);
  const canSubmit = !!selected && form.transactionId.trim().length >= 4 && !!form.paymentMethod && !isDemo && !submit.isPending;

  const choose = (id: string) => {
    setPlanId(id);
    setSuccess(false);
    const next = new URLSearchParams(params);
    next.set('plan', id);
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-[#14201c] dark:text-white sm:text-3xl">
          <CreditCard className="h-7 w-7 text-[#0f6b57]" aria-hidden="true" />
          {t('billing.title')}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-[#5d5b54] dark:text-[#a4a097]">{t('billing.subtitle')}</p>
      </div>

      {/* Current plan */}
      <section className={cn(card, 'flex flex-wrap items-center justify-between gap-4 p-5')} aria-label={t('billing.current')}>
        <div>
          <p className="text-sm text-[#5d5b54] dark:text-[#a4a097]">{t('billing.current')}</p>
          {current ? (
            <>
              <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-[#0f6b57] dark:text-[#4ccba5]">{current.planName}</p>
              <p className="mt-0.5 text-sm text-[#5d5b54] dark:text-[#a4a097]">
                {t('billing.validUntil', { date: formatDate(current.endsAt) })} · {t('billing.daysLeft', { n: daysLeft })}
              </p>
            </>
          ) : (
            <p className="mt-1 text-xl font-bold text-[#14201c] dark:text-white">{t('billing.none')}</p>
          )}
        </div>
        {current && <StatusChip status="ACTIVE" />}
      </section>

      {isDemo && (
        <p role="note" className="flex items-start gap-2 rounded-xl border border-[#f5d75e] bg-[#fef7d6] px-4 py-3 text-sm text-[#523410]">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t('billing.demoBlocked')}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-6">
          {/* 1. Choose */}
          <section className={cn(card, 'p-5')} aria-labelledby="choose-h">
            <h2 id="choose-h" className="text-base font-bold text-[#14201c] dark:text-white">{t('billing.choose')}</h2>
            <div role="radiogroup" aria-labelledby="choose-h" className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {plans.map((p) => {
                const active = p.id === planId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => choose(p.id)}
                    className={cn(
                      'flex flex-col items-start rounded-xl border p-3.5 text-start transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/40',
                      active
                        ? 'border-[#0f6b57] bg-[#f1f8f5] dark:bg-[#0d1f19]'
                        : 'border-[#e5e3df] hover:border-[#c8c4be] dark:border-[#2a2a2e] dark:hover:border-[#3a3a40]'
                    )}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="font-semibold text-[#14201c] dark:text-white">{p.name}</span>
                      {p.isPopular && <span className="rounded-full bg-[#ffd84d] px-2 py-0.5 text-[10px] font-semibold text-[#3d2f00]">{t('pricing.popular')}</span>}
                    </span>
                    <span className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold tabular-nums text-[#0f6b57] dark:text-[#4ccba5]">
                      {formatMoney(p.price, p.currency, lang)}
                    </span>
                    <span className="text-xs text-[#787671] dark:text-[#a4a097]">
                      {p.isSemester ? t('pricing.onePayment') : t(p.durationMonths === 1 ? 'pricing.month' : 'pricing.months', { n: p.durationMonths })}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. Pay */}
          <section className={cn(card, 'p-5')} aria-labelledby="pay-h">
            <h2 id="pay-h" className="text-base font-bold text-[#14201c] dark:text-white">{t('billing.pay')}</h2>
            {selected && (
              <p className="mt-2 text-sm font-semibold text-[#14201c] dark:text-white">
                {t('billing.sendAmount', { amount: formatMoney(selected.price, selected.currency, lang), plan: selected.name })}
              </p>
            )}
            <div className="mt-3 whitespace-pre-wrap rounded-lg bg-[#f4faf7] p-3.5 text-sm leading-relaxed text-[#37352f] dark:bg-[#0f1d19] dark:text-[#d9d6d0]" aria-label={t('billing.paymentDetails')}>
              {payment?.paymentInstructions}
            </div>
            {payment && payment.paymentMethods.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {payment.paymentMethods.map((m) => (
                  <li key={m} className="rounded-full border border-[#e5e3df] px-3 py-1 text-xs font-medium text-[#37352f] dark:border-[#2a2a2e] dark:text-[#d9d6d0]">
                    {t(`billing.m.${m}` as TranslationKey)}
                  </li>
                ))}
              </ul>
            )}
            {payment?.supportContact && <p className="mt-3 text-xs text-[#787671] dark:text-[#a4a097]">{t('billing.supportContact', { contact: payment.supportContact })}</p>}
          </section>

          {/* 3. Submit */}
          <form
            className={cn(card, 'p-5')}
            aria-labelledby="submit-h"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) submit.mutate();
            }}
          >
            <h2 id="submit-h" className="text-base font-bold text-[#14201c] dark:text-white">{t('billing.submitStep')}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#5d5b54] dark:text-[#a4a097]">{t('billing.method')}</span>
                <select className={inputClass} value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethodCode })}>
                  {(payment?.paymentMethods ?? []).map((m) => (
                    <option key={m} value={m}>{t(`billing.m.${m}` as TranslationKey)}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#5d5b54] dark:text-[#a4a097]">{t('billing.txnId')}</span>
                <input className={inputClass} value={form.transactionId} onChange={(e) => setForm({ ...form, transactionId: e.target.value })} placeholder={t('billing.txnPlaceholder')} maxLength={64} autoComplete="off" spellCheck={false} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#5d5b54] dark:text-[#a4a097]">{t('billing.payerNumber')}</span>
                <input className={inputClass} value={form.payerNumber} onChange={(e) => setForm({ ...form, payerNumber: e.target.value })} inputMode="tel" maxLength={40} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#5d5b54] dark:text-[#a4a097]">{t('billing.paidAt')}</span>
                <input type="date" className={inputClass} value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} max={new Date().toISOString().slice(0, 10)} />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-[#5d5b54] dark:text-[#a4a097]">{t('billing.note')}</span>
                <textarea className={cn(inputClass, 'h-20 resize-none py-2')} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={500} />
              </label>
            </div>

            {submit.isError && <p role="alert" className="mt-3 text-sm text-[#b42318]">{(submit.error as Error).message}</p>}
            {success && (
              <p role="status" className="mt-3 flex items-start gap-2 rounded-lg bg-[#d9f3e1] px-3 py-2 text-sm text-[#14532d] dark:bg-[#0d3b30] dark:text-[#7ee2b8]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {t('billing.submitted')}
              </p>
            )}
            <button type="submit" disabled={!canSubmit} className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#0f6b57] text-sm font-semibold text-white transition-colors hover:bg-[#0b5645] disabled:cursor-not-allowed disabled:bg-[#c8c4be] dark:disabled:bg-[#3a3a40] sm:w-auto sm:px-8">
              {submit.isPending ? t('billing.submitting') : t('billing.submit')}
            </button>
          </form>
        </div>

        {/* History */}
        <section className={cn(card, 'min-w-0 self-start p-5')} aria-labelledby="history-h">
          <h2 id="history-h" className="text-base font-bold text-[#14201c] dark:text-white">{t('billing.history')}</h2>
          {!billing || billing.subscriptions.length === 0 ? (
            <p className="mt-3 text-sm text-[#787671] dark:text-[#a4a097]">{t('billing.noHistory')}</p>
          ) : (
            <ul className="mt-3 divide-y divide-[#ede9e4] dark:divide-[#252528]">
              {billing.subscriptions.map((s: Subscription) => (
                <li key={s.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#14201c] dark:text-white">{s.planName}</p>
                      <p className="text-xs text-[#787671] dark:text-[#a4a097]">
                        {formatMoney(s.amount, s.currency, lang)} · {t(`billing.m.${s.paymentMethod}` as TranslationKey)} · {s.transactionId}
                      </p>
                      <p className="text-xs text-[#787671] dark:text-[#a4a097]">{formatDate(s.createdAt)}</p>
                    </div>
                    <StatusChip status={s.status} />
                  </div>
                  {s.status === 'ACTIVE' && s.endsAt && (
                    <p className="mt-1.5 text-xs text-[#0f6b57] dark:text-[#4ccba5]">{formatDate(s.startsAt)} → {formatDate(s.endsAt)}</p>
                  )}
                  {s.status === 'PENDING' && (
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-xs text-[#7a5200] dark:text-[#ffd84d]">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('billing.pendingNote')}
                      </p>
                      <button type="button" onClick={() => cancel.mutate(s.id)} className="text-xs font-medium text-[#b42318] hover:underline">
                        {t('billing.cancel')}
                      </button>
                    </div>
                  )}
                  {s.reviewNote && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-xs text-[#5d5b54] dark:text-[#a4a097]">
                      {s.status === 'REJECTED' && <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b42318]" aria-hidden="true" />}
                      <span>{t('billing.ownerNote')}: {s.reviewNote}</span>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default BillingPage;
