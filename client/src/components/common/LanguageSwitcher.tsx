import React from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { LANGUAGES, type Lang } from '../../i18n/translations';
import { cn } from '../../lib/utils';

interface LanguageSwitcherProps {
  /** `compact` shows the globe plus the short code; `full` shows the full language name. */
  variant?: 'compact' | 'full';
  className?: string;
}

/** Native <select> keeps the control accessible and gives a proper picker on phones. */
export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant = 'full', className }) => {
  const { lang, setLang, t } = useI18n();
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <label
      className={cn(
        'relative inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#e5e3df] bg-white px-2.5 text-sm text-[#37352f] transition-colors hover:border-[#c8c4be] focus-within:ring-2 focus-within:ring-[#0f6b57]/30 dark:border-[#2a2a2e] dark:bg-[#141416] dark:text-[#f0eeec] dark:hover:border-[#3a3a40]',
        className
      )}
    >
      <Globe className="h-4 w-4 shrink-0 text-[#787671]" aria-hidden="true" />
      <span className="pointer-events-none whitespace-nowrap font-medium">
        {variant === 'compact' ? current.short : current.label}
      </span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        aria-label={t('common.language')}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
};

export default LanguageSwitcher;
