import { marginMm, pageSizeMm, sanitize, type PrintSettings } from './printSettings';

export interface PdfExportOptions {
  /** Element whose contents become the PDF. */
  element: HTMLElement;
  settings: PrintSettings;
  title: string;
  fileName: string;
}

const PX_PER_MM_AT_96DPI = 96 / 25.4;

/** Whether every sampled pixel on a canvas row matches the first one (an empty gap between blocks). */
function isBlankRow(ctx: CanvasRenderingContext2D, y: number, width: number): boolean {
  const row = ctx.getImageData(0, y, width, 1).data;
  const r = row[0];
  const g = row[1];
  const b = row[2];
  for (let x = 4 * 4; x < row.length; x += 4 * 6) {
    if (Math.abs(row[x] - r) > 6 || Math.abs(row[x + 1] - g) > 6 || Math.abs(row[x + 2] - b) > 6) return false;
  }
  return true;
}

/**
 * Renders the page content to a multi-page PDF using the chosen paper size, orientation, margins and
 * scale. The content is rasterised (text in the PDF is not selectable); use the browser's Print ->
 * "Save as PDF" for vector, selectable text. Page breaks prefer blank gaps so lines are not sliced.
 */
export async function exportElementToPdf({ element, settings, title, fileName }: PdfExportOptions): Promise<void> {
  const s = sanitize(settings);
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);

  const [pageW, pageH] = pageSizeMm(s);
  const margin = marginMm(s);
  const headerH = s.headerFooter && margin >= 8 ? 6 : 0;
  const footerH = s.pageNumbers && margin >= 8 ? 6 : 0;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    windowWidth: Math.max(element.scrollWidth, element.clientWidth),
    onclone: (doc) => {
      // Render the clone with the same rules as @media print, always in the light theme.
      doc.documentElement.classList.remove('dark');
      doc.documentElement.classList.add('pdf-capture');
    },
  });

  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2;
  // mm of paper per canvas pixel, after the user's scale setting.
  const mmPerPx = (contentW / canvas.width) * (100 / s.scale);
  const sliceH = Math.floor(contentH / mmPerPx);
  const usableH = sliceH; // canvas rows per page

  const pdf = new jsPDF({
    unit: 'mm',
    format: [pageW, pageH],
    orientation: pageW > pageH ? 'landscape' : 'portrait',
    compress: true,
  });

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is not available');

  // Decide the page break rows first so the page count is known for "n / N".
  const breaks: number[] = [0];
  let y = 0;
  while (y + usableH < canvas.height) {
    let cut = y + usableH;
    const searchLimit = Math.max(y + Math.floor(usableH * 0.7), cut - Math.floor(PX_PER_MM_AT_96DPI * 2 * 40));
    for (let probe = cut; probe > searchLimit; probe--) {
      if (isBlankRow(ctx, probe, canvas.width)) {
        cut = probe;
        break;
      }
    }
    breaks.push(cut);
    y = cut;
  }
  breaks.push(canvas.height);
  const pages = breaks.length - 1;

  const dateText = new Intl.DateTimeFormat(document.documentElement.lang || undefined, { dateStyle: 'medium' }).format(new Date());

  for (let i = 0; i < pages; i++) {
    const top = breaks[i];
    const height = breaks[i + 1] - top;
    if (height <= 0) continue;

    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = height;
    const sctx = slice.getContext('2d');
    if (!sctx) continue;
    sctx.fillStyle = '#ffffff';
    sctx.fillRect(0, 0, slice.width, slice.height);
    sctx.drawImage(canvas, 0, top, canvas.width, height, 0, 0, canvas.width, height);

    if (i > 0) pdf.addPage([pageW, pageH], pageW > pageH ? 'landscape' : 'portrait');
    pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, slice.width * mmPerPx, height * mmPerPx);

    pdf.setFontSize(8);
    pdf.setTextColor(120);
    if (headerH) {
      pdf.text(title.slice(0, 90), margin, Math.max(4, margin - 3));
      pdf.text(dateText, pageW - margin, Math.max(4, margin - 3), { align: 'right' });
    }
    if (footerH) {
      pdf.text(`${i + 1} / ${pages}`, pageW / 2, pageH - Math.max(3, margin - 3), { align: 'center' });
    }
  }

  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}
