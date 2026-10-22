import { setPreference } from '../i18n/consent';

export type PaperSize = 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | 'custom';
export type Orientation = 'portrait' | 'landscape';
export type MarginPreset = 'none' | 'narrow' | 'normal' | 'wide' | 'custom';

export interface PrintSettings {
  paper: PaperSize;
  orientation: Orientation;
  /** Custom page size in millimetres (used when `paper` is `custom`). */
  customWidthMm: number;
  customHeightMm: number;
  margin: MarginPreset;
  customMarginMm: number;
  /** Content scale in percent. */
  scale: number;
  pageNumbers: boolean;
  headerFooter: boolean;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paper: 'A4',
  orientation: 'portrait',
  customWidthMm: 210,
  customHeightMm: 297,
  margin: 'normal',
  customMarginMm: 15,
  scale: 100,
  pageNumbers: true,
  headerFooter: true,
};

export const PAPER_SIZES_MM: Record<Exclude<PaperSize, 'custom'>, [number, number]> = {
  A4: [210, 297],
  A3: [297, 420],
  A5: [148, 210],
  Letter: [215.9, 279.4],
  Legal: [215.9, 355.6],
};

export const MARGIN_MM: Record<Exclude<MarginPreset, 'custom'>, number> = {
  none: 0,
  narrow: 8,
  normal: 15,
  wide: 25,
};

const KEY = 'scholarflow_print';
const STYLE_ID = 'sf-print-page-style';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));

export function loadPrintSettings(): PrintSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return sanitize({ ...DEFAULT_PRINT_SETTINGS, ...JSON.parse(raw) });
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_PRINT_SETTINGS };
}

export function savePrintSettings(s: PrintSettings) {
  setPreference(KEY, JSON.stringify(s));
}

export function sanitize(s: PrintSettings): PrintSettings {
  return {
    ...s,
    customWidthMm: clamp(s.customWidthMm, 50, 1000),
    customHeightMm: clamp(s.customHeightMm, 50, 1500),
    customMarginMm: clamp(s.customMarginMm, 0, 60),
    scale: clamp(s.scale, 40, 200),
  };
}

/** Page size in mm after applying orientation (portrait = short side first). */
export function pageSizeMm(s: PrintSettings): [number, number] {
  const [w, h] = s.paper === 'custom' ? [s.customWidthMm, s.customHeightMm] : PAPER_SIZES_MM[s.paper];
  const short = Math.min(w, h);
  const long = Math.max(w, h);
  return s.orientation === 'landscape' ? [long, short] : [short, long];
}

export function marginMm(s: PrintSettings): number {
  return s.margin === 'custom' ? s.customMarginMm : MARGIN_MM[s.margin];
}

const cssString = (v: string) => `"${v.replace(/["\\\n]/g, ' ')}"`;

/**
 * Keeps one <style> element in sync with the chosen page setup so both the Print button and the
 * browser's own Ctrl/Cmd+P use it. Margin boxes (header/footer text, page numbers) are honoured by
 * Chromium-based browsers and ignored elsewhere.
 */
export function applyPageStyle(settings: PrintSettings, title = document.title) {
  const s = sanitize(settings);
  const [w, h] = pageSizeMm(s);
  const m = marginMm(s);
  const date = new Intl.DateTimeFormat(document.documentElement.lang || undefined, { dateStyle: 'medium' }).format(new Date());

  const boxes: string[] = [];
  if (s.headerFooter && m >= 8) {
    boxes.push(`@top-left { content: ${cssString(title)}; font: 9pt sans-serif; color: #666; }`);
    boxes.push(`@top-right { content: ${cssString(date)}; font: 9pt sans-serif; color: #666; }`);
  }
  if (s.pageNumbers && m >= 8) {
    boxes.push(`@bottom-center { content: counter(page) " / " counter(pages); font: 9pt sans-serif; color: #666; }`);
  }

  const css = `
@page { size: ${w}mm ${h}mm; margin: ${m}mm; ${boxes.join(' ')} }
@media print { html { zoom: ${s.scale / 100}; } }`;

  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}
