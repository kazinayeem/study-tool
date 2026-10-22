import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { readConsent, writeConsent } from '../../i18n/consent';

/** Event the footer "Cookie settings" link fires to reopen the banner. */
export const OPEN_COOKIE_SETTINGS_EVENT = 'scholarflow:open-cookie-settings';

export const openCookieSettings = () => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));

export const CookieConsent: React.FC = () => {
  const { t } = useI18n();
  const [open, setOpen] = useState(() => readConsent() === null);
  const [customizing, setCustomizing] = useState(false);
  const [preferences, setPreferences] = useState(() => readConsent()?.preferences ?? true);

  useEffect(() => {
    const reopen = () => {
      setPreferences(readConsent()?.preferences ?? true);
      setCustomizing(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
  }, []);

  const decide = useCallback((allowPreferences: boolean) => {
    writeConsent(allowPreferences);
    setOpen(false);
    setCustomizing(false);
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-2xl rounded-2xl border border-[#e5e3df] bg-white p-4 shadow-[0_20px_60px_-20px_rgba(13,42,34,0.45)] dark:border-[#2a2a2e] dark:bg-[#141416] sm:bottom-5 sm:p-5 max-md:bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#dcf0e8] text-[#0f6b57] dark:bg-[#0d3b30] dark:text-[#4ccba5]">
          <Cookie className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="cookie-title" className="text-[15px] font-bold text-[#14201c] dark:text-white">
            {t('cookie.title')}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[#5d5b54] dark:text-[#a4a097]">
            {t('cookie.body')}{' '}
            <Link to="/cookies" className="font-medium text-[#0f6b57] underline underline-offset-2 dark:text-[#4ccba5]">
              {t('cookie.learnMore')}
            </Link>
          </p>

          {customizing && (
            <div className="mt-3 space-y-2">
              <div className="flex items-start justify-between gap-3 rounded-xl border border-[#e5e3df] p-3 dark:border-[#2a2a2e]">
                <div>
                  <p className="text-[13px] font-semibold text-[#14201c] dark:text-white">{t('cookie.essential')}</p>
                  <p className="text-xs text-[#787671] dark:text-[#a4a097]">{t('cookie.essentialDesc')}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[#f0eeec] px-2.5 py-1 text-[11px] font-medium text-[#5d5b54] dark:bg-[#252528] dark:text-[#a4a097]">
                  {t('cookie.alwaysOn')}
                </span>
              </div>
              <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-[#e5e3df] p-3 dark:border-[#2a2a2e]">
                <div>
                  <p className="text-[13px] font-semibold text-[#14201c] dark:text-white">{t('cookie.preferences')}</p>
                  <p className="text-xs text-[#787671] dark:text-[#a4a097]">{t('cookie.preferencesDesc')}</p>
                </div>
                <input
                  type="checkbox"
                  role="switch"
                  checked={preferences}
                  onChange={(e) => setPreferences(e.target.checked)}
                  className="mt-1 h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-[#c8c4be] transition-colors checked:bg-[#0f6b57] relative before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
                />
              </label>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {customizing ? (
              <button
                type="button"
                onClick={() => decide(preferences)}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0f6b57] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0b5645]"
              >
                {t('cookie.savePrefs')}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => decide(true)}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0f6b57] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0b5645]"
                >
                  {t('cookie.acceptAll')}
                </button>
                <button
                  type="button"
                  onClick={() => decide(false)}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[#c8c4be] px-4 text-sm font-semibold text-[#1a1a1a] transition-colors hover:bg-[#f6f5f4] dark:border-[#3a3a40] dark:text-white dark:hover:bg-[#202024]"
                >
                  {t('cookie.essentialOnly')}
                </button>
                <button
                  type="button"
                  onClick={() => setCustomizing(true)}
                  className="inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-medium text-[#5d5b54] underline underline-offset-2 hover:text-[#0f6b57] dark:text-[#a4a097]"
                >
                  {t('cookie.customize')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
