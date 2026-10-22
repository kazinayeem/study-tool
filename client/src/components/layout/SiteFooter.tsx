import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useI18n } from '../../i18n/I18nContext';
import { LEGAL_PAGES } from '../../i18n/legalContent';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { openCookieSettings } from '../common/CookieConsent';

const BORNOSOFT_URL = 'https://bornosoft.bd/';
const BORNOSOFT_HOST = 'bornosoft.bd';

const linkClass =
  'rounded text-sm text-[#5d5b54] transition-colors hover:text-[#0f6b57] dark:text-[#a4a097] dark:hover:text-[#4ccba5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/30';

interface SiteFooterProps {
  /** Render a subtle top hairline above the footer (used on the landing page). */
  withTopBorder?: boolean;
  /** `compact` is the branding line plus legal links; `full` adds the link columns. */
  variant?: 'compact' | 'full';
  className?: string;
}

/**
 * Public-surface footer: legal links, language, cookie settings and product branding.
 * The `full` variant adds Product / Account columns for the landing page.
 */
export const SiteFooter: React.FC<SiteFooterProps> = ({
  withTopBorder = false,
  variant = 'compact',
  className,
}) => {
  const { t } = useI18n();

  const productLinks = [
    { id: 'features', label: t('landing.nav.features') },
    { id: 'how-it-works', label: t('landing.nav.how') },
    { id: 'benefits', label: t('landing.nav.benefits') },
    { id: 'faq', label: t('landing.nav.faq') },
  ];

  return (
    <footer
      className={cn('w-full bg-white dark:bg-[#0f0f11]', withTopBorder && 'border-t border-[#e5e3df] dark:border-[#2a2a2e]', className)}
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {variant === 'full' && (
          <div className="grid grid-cols-2 gap-8 pb-8 md:grid-cols-4">
            <div className="col-span-2">
              <Link to="/" className="inline-flex items-center gap-2.5" aria-label="BornoFlow">
                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#0f6b57] text-white">
                  <GraduationCap className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <span className="font-[family-name:var(--font-display)] text-base font-bold text-[#0d2a22] dark:text-white">
                  BornoFlow
                </span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#5d5b54] dark:text-[#a4a097]">{t('footer.tagline')}</p>
            </div>

            <nav aria-label={t('footer.product')}>
              <h3 className="text-sm font-semibold text-[#14201c] dark:text-white">{t('footer.product')}</h3>
              <ul className="mt-3 space-y-2.5">
                {productLinks.map((l) => (
                  <li key={l.id}>
                    <a href={`/#${l.id}`} className={linkClass}>
                      {l.label}
                    </a>
                  </li>
                ))}
                <li>
                  <Link to="/login" className={linkClass}>
                    {t('footer.signIn')}
                  </Link>
                </li>
              </ul>
            </nav>

            <nav aria-label={t('footer.legal')}>
              <h3 className="text-sm font-semibold text-[#14201c] dark:text-white">{t('footer.legal')}</h3>
              <ul className="mt-3 space-y-2.5">
                {LEGAL_PAGES.map((p) => (
                  <li key={p.slug}>
                    <Link to={p.path} className={linkClass}>
                      {t(p.titleKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        )}

        {variant === 'compact' && (
          <nav aria-label={t('footer.legal')} className="pb-5">
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2">
              {LEGAL_PAGES.slice(0, 4).map((p) => (
                <li key={p.slug}>
                  <Link to={p.path} className={linkClass}>
                    {t(p.titleKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div
          className={cn(
            'flex flex-col items-center gap-4 sm:flex-row sm:justify-between',
            variant === 'full' && 'border-t border-[#e5e3df] pt-6'
          )}
        >
          <div className="space-y-1 text-center sm:text-start">
            <p className="text-xs text-[#787671] dark:text-[#a4a097]">{t('footer.rights', { year: new Date().getFullYear() })}</p>
            <p className="text-xs text-[#787671] dark:text-[#a4a097]">
              {t('footer.productOf')}{' '}
              <a
                href={BORNOSOFT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded font-semibold text-[#14201c] underline-offset-2 transition-colors hover:text-[#0f6b57] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/30 dark:text-[#f0eeec] dark:hover:text-[#4ccba5]"
              >
                Bornosoft
              </a>
              {' · '}
              <a
                href={BORNOSOFT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded underline underline-offset-2 transition-colors hover:text-[#0f6b57] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/30 dark:hover:text-[#4ccba5]"
              >
                {BORNOSOFT_HOST}
              </a>
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={openCookieSettings} className={cn(linkClass, 'underline underline-offset-2')}>
              {t('footer.cookieSettings')}
            </button>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
