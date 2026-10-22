import type { Lang } from '../i18n/translations';

const LOCALES: Partial<Record<Lang, string>> = { bn: 'bn-BD', ar: 'ar' };

/** Currency formatter that drops trailing .00 and falls back to "CODE 1,234" for unknown codes. */
export function formatMoney(amount: number, currency: string, lang: Lang): string {
  try {
    return new Intl.NumberFormat(LOCALES[lang] ?? lang, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}
