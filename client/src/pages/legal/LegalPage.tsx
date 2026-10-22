import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { LEGAL_PAGES, LEGAL_UPDATED, getLegalDoc, type LegalSlug } from '../../i18n/legalContent';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher';
import { PrintMenu } from '../../components/common/PrintMenu';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { BrandLockup } from '../../components/common/BrandLockup';

export const LegalPage: React.FC<{ slug: LegalSlug }> = ({ slug }) => {
  const { t, lang } = useI18n();
  const { hash } = useLocation();
  const meta = LEGAL_PAGES.find((p) => p.slug === slug)!;
  const { doc, translated } = getLegalDoc(slug, lang);
  const title = t(meta.titleKey);
  const date = new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long', day: 'numeric' }).format(
    new Date(LEGAL_UPDATED)
  );

  useEffect(() => {
    document.title = `${title} | BornoFlow`;
  }, [title]);

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  }, [hash, slug]);

  return (
    <div className="min-h-dvh w-full bg-white text-[#14201c] dark:bg-[#0f0f11] dark:text-[#f0eeec]">
      <header className="app-chrome sticky top-0 z-40 border-b border-[#e5e3df] bg-white/90 backdrop-blur-md dark:border-[#2a2a2e] dark:bg-[#0f0f11]/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <BrandLockup />
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="compact" />
            <PrintMenu />
            <ThemeToggle className="!h-9 !w-9 border-transparent" />
            <Link
              to="/"
              className="hidden h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-[#0f6b57] hover:bg-[#eef8f4] dark:text-[#4ccba5] dark:hover:bg-[#0d3b30] sm:inline-flex"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              {t('legal.backHome')}
            </Link>
          </div>
        </div>
      </header>

      <main className="app-main mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14 lg:px-8 lg:py-14">
        <aside className="no-print min-w-0 lg:sticky lg:top-24 lg:self-start">
          <nav aria-label={t('legal.allPolicies')}>
            <h2 className="text-sm font-semibold text-[#14201c] dark:text-white">{t('legal.allPolicies')}</h2>
            <ul className="mt-3 flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
              {LEGAL_PAGES.map((p) => (
                <li key={p.slug} className="shrink-0">
                  <Link
                    to={p.path}
                    aria-current={p.slug === slug ? 'page' : undefined}
                    className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
                      p.slug === slug
                        ? 'bg-[#dcf0e8] font-semibold text-[#0d3b30] dark:bg-[#0d3b30] dark:text-[#a8dcc9]'
                        : 'text-[#5d5b54] hover:bg-[#f6f5f4] dark:text-[#a4a097] dark:hover:bg-[#202024]'
                    }`}
                  >
                    {t(p.titleKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="min-w-0 max-w-3xl" dir={translated ? undefined : 'ltr'} lang={translated ? undefined : 'en'}>
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-[#787671] dark:text-[#a4a097]">{t('legal.lastUpdated', { date })}</p>

          {!translated && (
            <p className="mt-5 rounded-xl border border-[#f5d75e] bg-[#fef7d6] px-4 py-3 text-sm text-[#523410]" role="note">
              {t('legal.englishOnly')}
            </p>
          )}

          <p className="mt-6 text-base leading-[1.75] text-[#37352f] dark:text-[#d9d6d0]">{doc.intro}</p>

          <nav aria-label={t('legal.onThisPage')} className="mt-8 rounded-xl border border-[#e5e3df] bg-[#fafaf9] p-4 dark:border-[#2a2a2e] dark:bg-[#141416]">
            <p className="text-sm font-semibold">{t('legal.onThisPage')}</p>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {doc.sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-sm text-[#0f6b57] hover:underline dark:text-[#4ccba5]"
                  >
                    {s.heading}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-10 space-y-9">
            {doc.sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="text-xl font-bold">{s.heading}</h2>
                {s.paragraphs?.map((para, i) => (
                  <p key={i} className="mt-3 text-[15px] leading-[1.75] text-[#37352f] dark:text-[#d9d6d0]">
                    {para}
                  </p>
                ))}
                {s.list && (
                  <ul className="mt-3 list-disc space-y-2 ps-5 text-[15px] leading-[1.7] text-[#37352f] marker:text-[#0f6b57] dark:text-[#d9d6d0]">
                    {s.list.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <p className="mt-12 rounded-xl bg-[#f6f5f4] px-4 py-3 text-[13px] leading-relaxed text-[#5d5b54] dark:bg-[#19191c] dark:text-[#a4a097]">
            {t('legal.reviewNote')}
          </p>
        </article>
      </main>

      <div className="no-print"><SiteFooter withTopBorder variant="full" /></div>
    </div>
  );
};

export default LegalPage;
