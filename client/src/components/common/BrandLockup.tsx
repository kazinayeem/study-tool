import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { cn } from '../../lib/utils';

const BORNOSOFT_URL = 'https://bornosoft.bd/';

/**
 * Navbar brand: the BornoFlow mark and name (links home) with a "a product of Bornosoft" line under
 * the name that links to bornosoft.bd.
 */
export const BrandLockup: React.FC<{ to?: string; className?: string }> = ({ to = '/', className }) => {
  const { t } = useI18n();
  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      <Link to={to} className="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/40" aria-label="BornoFlow">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#0f6b57] text-white shadow-[0_6px_16px_-8px_rgba(15,107,87,0.9)]">
          <GraduationCap className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
        </span>
        <span className="font-[family-name:var(--font-display)] text-[17px] font-bold leading-none tracking-tight text-[#0d2a22] dark:text-white">
          BornoFlow
        </span>
      </Link>
      <a
        href={BORNOSOFT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="ms-[46px] -mt-3 w-fit rounded text-[10.5px] font-medium leading-tight text-[#5d6f68] transition-colors hover:text-[#0f6b57] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b57]/40 dark:text-[#a4a097] dark:hover:text-[#4ccba5]"
      >
        {t('brand.byline')}
      </a>
    </div>
  );
};

export default BrandLockup;
