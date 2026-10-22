import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';
import { cn } from '../../lib/utils';

/** Sun/moon button; the icons swap with a small rotate so the switch reads as a deliberate action. */
export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === 'dark';
  const label = isDark ? t('header.toLight') : t('header.toDark');

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
      className={cn(
        'relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-[#e5e3df] bg-white text-[#37352f] transition-colors hover:border-[#c8c4be] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/40 dark:border-[#2a2a2e] dark:bg-[#141416] dark:text-[#f0eeec] dark:hover:border-[#3a3a40]',
        className
      )}
    >
      <Sun
        className={cn(
          'absolute h-[18px] w-[18px] transition-all duration-300 motion-reduce:transition-none',
          isDark ? 'rotate-0 scale-100 opacity-100 text-[#f5d75e]' : 'rotate-90 scale-50 opacity-0'
        )}
        aria-hidden="true"
      />
      <Moon
        className={cn(
          'absolute h-[18px] w-[18px] transition-all duration-300 motion-reduce:transition-none',
          isDark ? '-rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'
        )}
        aria-hidden="true"
      />
    </button>
  );
};

export default ThemeToggle;
