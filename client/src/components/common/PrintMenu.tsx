import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Printer, RotateCcw } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import type { TranslationKey } from '../../i18n/translations';
import {
  DEFAULT_PRINT_SETTINGS,
  PAPER_SIZES_MM,
  applyPageStyle,
  loadPrintSettings,
  savePrintSettings,
  type MarginPreset,
  type PaperSize,
  type PrintSettings,
} from '../../lib/printSettings';
import { exportElementToPdf } from '../../lib/exportPdf';
import { cn } from '../../lib/utils';

const field =
  'h-10 w-full rounded-lg border border-[#c8c4be] bg-white px-2.5 text-sm text-[#1a1a1a] outline-none focus:border-[#0f6b57] focus:ring-2 focus:ring-[#0f6b57]/20 dark:border-[#3a3a40] dark:bg-[#1c1c1f] dark:text-white';

/** The node to export: the app's main content area, or the whole page on public pages. */
function findPrintArea(): HTMLElement {
  return (document.querySelector('main.app-main') as HTMLElement) ?? (document.getElementById('root') as HTMLElement) ?? document.body;
}

const slug = (v: string) =>
  v
    .replace(/\s*\|\s*ScholarFlow\s*$/i, '')
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'scholarflow';

interface PrintMenuProps {
  className?: string;
  /** Visual style of the trigger. */
  variant?: 'icon' | 'button';
}

export const PrintMenu: React.FC<PrintMenuProps> = ({ className, variant = 'icon' }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<PrintSettings>(loadPrintSettings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const update = useCallback((patch: Partial<PrintSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      savePrintSettings(next);
      applyPageStyle(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const doPrint = () => {
    applyPageStyle(settings);
    setOpen(false);
    // Let the popover close before the print dialog snapshots the page.
    window.setTimeout(() => window.print(), 80);
  };

  const doDownload = async () => {
    setBusy(true);
    setError(null);
    try {
      await exportElementToPdf({
        element: findPrintArea(),
        settings,
        title: document.title.replace(/\s*\|\s*ScholarFlow\s*$/i, ''),
        fileName: `${slug(document.title)}.pdf`,
      });
      setOpen(false);
    } catch (e) {
      console.error('PDF export failed', e);
      setError(t('print.failed'));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    savePrintSettings(DEFAULT_PRINT_SETTINGS);
    applyPageStyle(DEFAULT_PRINT_SETTINGS);
    setSettings({ ...DEFAULT_PRINT_SETTINGS });
  };

  const label = (key: TranslationKey) => <span className="mb-1 block text-xs font-medium text-[#5d5b54] dark:text-[#a4a097]">{t(key)}</span>;

  return (
    <div className={cn('app-chrome relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('print.button')}
        title={t('print.button')}
        className={cn(
          'flex items-center justify-center gap-2 rounded-[8px] text-[#787671] transition-colors hover:bg-[#f6f5f4] hover:text-[#1a1a1a] dark:hover:bg-[#202024] dark:hover:text-white',
          variant === 'icon' ? 'h-11 w-11 sm:h-9 sm:w-9' : 'h-10 border border-[#e5e3df] px-3 text-sm font-medium dark:border-[#2a2a2e]',
          open && 'bg-[#f6f5f4] dark:bg-[#202024]'
        )}
      >
        <Printer className="h-4 w-4" aria-hidden="true" />
        {variant === 'button' && <span>{t('print.button')}</span>}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('print.title')}
          className="fixed inset-x-3 top-16 z-[80] max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-2xl border border-[#e5e3df] bg-white p-4 text-start shadow-[0_20px_60px_-20px_rgba(13,42,34,0.45)] dark:border-[#2a2a2e] dark:bg-[#141416] sm:absolute sm:inset-x-auto sm:end-0 sm:top-full sm:mt-2 sm:w-[22rem]"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#14201c] dark:text-white">{t('print.title')}</h2>
            <button type="button" onClick={reset} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-[#5d5b54] hover:bg-[#f6f5f4] dark:text-[#a4a097] dark:hover:bg-[#202024]">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {t('print.reset')}
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block">
              {label('print.paper')}
              <select className={field} value={settings.paper} onChange={(e) => update({ paper: e.target.value as PaperSize })}>
                {(Object.keys(PAPER_SIZES_MM) as (keyof typeof PAPER_SIZES_MM)[]).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value="custom">{t('print.custom')}</option>
              </select>
            </label>
            <div>
              {label('print.orientation')}
              <div className="grid h-10 grid-cols-2 overflow-hidden rounded-lg border border-[#c8c4be] text-xs font-semibold dark:border-[#3a3a40]" role="group">
                {(['portrait', 'landscape'] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    aria-pressed={settings.orientation === o}
                    onClick={() => update({ orientation: o })}
                    className={cn(
                      'px-1 transition-colors',
                      settings.orientation === o ? 'bg-[#0f6b57] text-white' : 'text-[#5d5b54] hover:bg-[#f6f5f4] dark:text-[#a4a097] dark:hover:bg-[#202024]'
                    )}
                  >
                    {t(o === 'portrait' ? 'print.portrait' : 'print.landscape')}
                  </button>
                ))}
              </div>
            </div>

            {settings.paper === 'custom' && (
              <>
                <label className="block">
                  {label('print.width')}
                  <input type="number" min={50} max={1000} className={field} value={settings.customWidthMm} onChange={(e) => update({ customWidthMm: Number(e.target.value) })} />
                </label>
                <label className="block">
                  {label('print.height')}
                  <input type="number" min={50} max={1500} className={field} value={settings.customHeightMm} onChange={(e) => update({ customHeightMm: Number(e.target.value) })} />
                </label>
              </>
            )}

            <label className="block">
              {label('print.margins')}
              <select className={field} value={settings.margin} onChange={(e) => update({ margin: e.target.value as MarginPreset })}>
                {(['none', 'narrow', 'normal', 'wide', 'custom'] as const).map((m) => (
                  <option key={m} value={m}>
                    {t(`print.m.${m}` as TranslationKey)}
                  </option>
                ))}
              </select>
            </label>
            {settings.margin === 'custom' ? (
              <label className="block">
                {label('print.marginMm')}
                <input type="number" min={0} max={60} className={field} value={settings.customMarginMm} onChange={(e) => update({ customMarginMm: Number(e.target.value) })} />
              </label>
            ) : (
              <label className="block">
                {label('print.scale')}
                <input type="number" min={40} max={200} step={5} className={field} value={settings.scale} onChange={(e) => update({ scale: Number(e.target.value) })} />
              </label>
            )}
            {settings.margin === 'custom' && (
              <label className="col-span-2 block">
                {label('print.scale')}
                <input type="range" min={40} max={200} step={5} className="w-full accent-[#0f6b57]" value={settings.scale} onChange={(e) => update({ scale: Number(e.target.value) })} />
                <span className="text-xs tabular-nums text-[#787671]">{settings.scale}%</span>
              </label>
            )}
          </div>

          <div className="mt-3 space-y-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#37352f] dark:text-[#d9d6d0]">
              <input type="checkbox" className="h-4 w-4 accent-[#0f6b57]" checked={settings.pageNumbers} onChange={(e) => update({ pageNumbers: e.target.checked })} />
              {t('print.pageNumbers')}
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#37352f] dark:text-[#d9d6d0]">
              <input type="checkbox" className="h-4 w-4 accent-[#0f6b57]" checked={settings.headerFooter} onChange={(e) => update({ headerFooter: e.target.checked })} />
              {t('print.headerFooter')}
            </label>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-xs text-[#b42318]">
              {error}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={doPrint} disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0f6b57] text-sm font-semibold text-white hover:bg-[#0b5645] disabled:opacity-60">
              <Printer className="h-4 w-4" aria-hidden="true" />
              {t('print.print')}
            </button>
            <button type="button" onClick={doDownload} disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#0f6b57] text-sm font-semibold text-[#0f6b57] hover:bg-[#eef8f4] disabled:opacity-60 dark:text-[#4ccba5] dark:hover:bg-[#0d3b30]">
              <Download className="h-4 w-4" aria-hidden="true" />
              {busy ? t('print.generating') : t('print.download')}
            </button>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-[#787671] dark:text-[#a4a097]">{t('print.hint')}</p>
        </div>
      )}
    </div>
  );
};

export default PrintMenu;
