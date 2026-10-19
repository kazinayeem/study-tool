import React from 'react';
import { cn } from '../../lib/utils';

const BORNOSOFT_URL = 'https://bornosoft.bd/';

interface SiteFooterProps {
  /** Render a subtle top hairline above the branding line (used on the landing page). */
  withTopBorder?: boolean;
  className?: string;
}

/**
 * Shared, minimal product-branding footer used on public surfaces
 * (landing and login). Centered, small, muted typography on white.
 */
export const SiteFooter: React.FC<SiteFooterProps> = ({ withTopBorder = false, className }) => (
  <footer
    className={cn(
      'w-full bg-white',
      withTopBorder && 'border-t border-[#e5e3df]',
      className
    )}
  >
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <p className="text-center text-xs leading-relaxed text-[#787671] sm:text-[13px]">
        ScholarFlow is a product of{' '}
        <a
          href={BORNOSOFT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded font-medium text-[#5d5b54] underline-offset-2 transition-colors hover:text-[#5645d4] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5645d4]/30"
        >
          Bornosoft
        </a>
        .
      </p>
    </div>
  </footer>
);

export default SiteFooter;
