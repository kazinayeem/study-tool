import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarRange, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/money';
import { cn } from '../../lib/utils';
import { useI18n } from '../../i18n/I18nContext';

/** Rate-card style pricing: one row per plan, ordered by length, with the per-month rate front and centre. */
export const PricingSection: React.FC = () => {
  const { t, lang } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ['plans'], queryFn: () => api.getPlans(), staleTime: 60_000 });

  const plans = data?.plans ?? [];
  // Savings are measured against the 1-month monthly rate.
  const baseMonthly = useMemo(() => {
    const one = plans.find((p) => !p.isSemester && p.durationMonths === 1);
    return one ? one.price : null;
  }, [plans]);

  return (
    <section id="pricing" className="scroll-mt-20 border-t border-[#E5E7EB] dark:border-[#2a2a2e] bg-white dark:bg-[#0f0f11] py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-[#111827] dark:text-[#f0eeec] sm:text-4xl">{t('pricing.title')}</h2>
          <p className="mt-4 text-base leading-relaxed text-[#64748B] dark:text-[#a4a097]">{t('pricing.body')}</p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-[#E5E7EB] dark:border-[#2a2a2e]">
          {isLoading && <div className="h-64 animate-pulse bg-[#F8FAFC] dark:bg-[#141416]" />}
          {!isLoading && plans.length === 0 && (
            <p className="p-8 text-center text-sm text-[#64748B] dark:text-[#a4a097]">{t('pricing.empty')}</p>
          )}
          <ul className="divide-y divide-[#E5E7EB] dark:divide-[#2a2a2e]">
            {plans.map((plan) => {
              const monthly = plan.price / plan.durationMonths;
              const saving = baseMonthly && !plan.isSemester && plan.durationMonths > 1 ? Math.round((1 - monthly / baseMonthly) * 100) : 0;
              return (
                <li
                  key={plan.id}
                  className={cn(
                    'relative grid gap-x-6 gap-y-4 bg-white p-5 dark:bg-[#0f0f11] sm:p-6 md:grid-cols-[7rem_minmax(0,1fr)_auto_auto] md:items-center',
                    plan.isPopular && 'bg-[#f7faf8] dark:bg-[#0d1512]'
                  )}
                >
                  {plan.isPopular && <span aria-hidden="true" className="absolute inset-y-0 start-0 w-1.5 bg-[#ffd84d]" />}

                  <div className="flex items-baseline gap-2 md:block">
                    {plan.isSemester ? (
                      <CalendarRange className="h-9 w-9 text-[#0f6b57] dark:text-[#4ccba5]" strokeWidth={1.6} aria-hidden="true" />
                    ) : (
                      <p className="font-[family-name:var(--font-display)] text-5xl font-bold leading-none tabular-nums text-[#0d2a22] dark:text-white">
                        {plan.durationMonths}
                      </p>
                    )}
                    <p className="text-sm font-medium text-[#64748B] dark:text-[#a4a097] md:mt-1">
                      {plan.isSemester ? t('pricing.semester') : plan.durationMonths === 1 ? t('pricing.unitMonth') : t('pricing.unitMonths')}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-[#111827] dark:text-[#f0eeec]">{plan.name}</h3>
                      {plan.isPopular && (
                        <span className="rounded-full bg-[#ffd84d] px-2.5 py-0.5 text-xs font-semibold text-[#3d2f00]">{t('pricing.popular')}</span>
                      )}
                    </div>
                    {plan.description && <p className="mt-1 text-sm text-[#64748B] dark:text-[#a4a097]">{plan.description}</p>}
                    {plan.features.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                        {plan.features.slice(0, 3).map((f) => (
                          <li key={f} className="flex items-center gap-1.5 text-[13px] text-[#37352f] dark:text-[#d9d6d0]">
                            <Check className="h-3.5 w-3.5 shrink-0 text-[#0f6b57] dark:text-[#4ccba5]" aria-hidden="true" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="md:text-end">
                    <p className="font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums text-[#0d2a22] dark:text-white">
                      {formatMoney(plan.price, plan.currency, lang)}
                    </p>
                    <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#a4a097]">
                      {plan.isSemester ? t('pricing.onePayment') : t('pricing.perMonth', { price: formatMoney(Math.round(monthly), plan.currency, lang) })}
                    </p>
                    {saving > 0 && (
                      <span className="mt-1.5 inline-block rounded-full bg-[#dcf0e8] px-2 py-0.5 text-[11px] font-semibold text-[#0d3b30] dark:bg-[#0d3b30] dark:text-[#a8dcc9]">
                        {t('pricing.save', { pct: saving })}
                      </span>
                    )}
                  </div>

                  <Link
                    to={`/billing?plan=${plan.id}`}
                    className={cn(
                      'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/40 md:w-36',
                      plan.isPopular
                        ? 'bg-[#0f6b57] text-white hover:bg-[#0b5645]'
                        : 'border border-[#c8c4be] text-[#111827] hover:bg-[#F8FAFC] dark:border-[#3a3a40] dark:text-[#f0eeec] dark:hover:bg-[#202024]'
                    )}
                  >
                    {t('pricing.buy')}
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-8 grid gap-6 rounded-2xl bg-[#F8FAFC] p-6 dark:bg-[#141416] md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:p-8">
          <div>
            <h3 className="text-lg font-bold text-[#111827] dark:text-[#f0eeec]">{t('pricing.manualTitle')}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#64748B] dark:text-[#a4a097]">{t('pricing.manualBody')}</p>
          </div>
          <ol className="grid gap-4 sm:grid-cols-3">
            {(['pricing.step1', 'pricing.step2', 'pricing.step3'] as const).map((key, i) => (
              <li key={key} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0f6b57] text-sm font-bold text-white">{i + 1}</span>
                <span className="text-sm leading-snug text-[#111827] dark:text-[#f0eeec]">{t(key)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
