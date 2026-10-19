import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from 'docx';

interface NoteExportData {
  title: string;
  courseName?: string | null;
  semesterName?: string | null;
  updatedAt?: Date;
  content: string;
}

/**
 * Parses inline HTML tags (strong, b, em, i, u, s, code, a) into docx TextRuns.
 */
function parseInlineHtml(text: string, forceBold = false): TextRun[] {
  // Decode common HTML entities
  const decoded = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Simple token regex for inline formatting tags
  const tagRegex = /(<\/?(?:strong|b|em|i|u|s|strike|code|span|a)[^>]*>)/gi;
  const parts = decoded.split(tagRegex);

  const runs: TextRun[] = [];
  let isBold = false;
  let isItalic = false;
  let isUnderline = false;
  let isStrike = false;
  let isCode = false;

  for (const part of parts) {
    if (!part) continue;

    const lower = part.toLowerCase();
    if (lower === '<strong>' || lower === '<b>') {
      isBold = true;
    } else if (lower === '</strong>' || lower === '</b>') {
      isBold = false;
    } else if (lower === '<em>' || lower === '<i>') {
      isItalic = true;
    } else if (lower === '</em>' || lower === '</i>') {
      isItalic = false;
    } else if (lower === '<u>') {
      isUnderline = true;
    } else if (lower === '</u>') {
      isUnderline = false;
    } else if (lower === '<s>' || lower === '<strike>') {
      isStrike = true;
    } else if (lower === '</s>' || lower === '</strike>') {
      isStrike = false;
    } else if (lower === '<code>') {
      isCode = true;
    } else if (lower === '</code>') {
      isCode = false;
    } else if (lower.startsWith('<a ') || lower === '</a>' || lower.startsWith('<span') || lower === '</span>') {
      // Anchors / spans - keep formatting
    } else if (!part.startsWith('<')) {
      runs.push(
        new TextRun({
          text: part,
          bold: isBold || forceBold,
          italics: isItalic,
          underline: isUnderline ? {} : undefined,
          strike: isStrike,
          font: isCode ? 'Consolas' : undefined,
          size: 24, // 12pt (docx sizes in half-points)
        })
      );
    }
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text: decoded.replace(/<[^>]*>/g, ''), size: 24 }));
  }

  return runs;
}

/**
 * Converts Note HTML content into Word Docx elements (Paragraphs, Tables, Headings).
 */
export function buildNoteDocxDocument(note: NoteExportData): Document {
  const children: (Paragraph | Table)[] = [];

  // Document Title
  children.push(
    new Paragraph({
      text: note.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
    })
  );

  // Subtitle / Academic Context Bar
  const contextParts: string[] = [];
  if (note.semesterName) contextParts.push(`Semester: ${note.semesterName}`);
  if (note.courseName) contextParts.push(`Course: ${note.courseName}`);
  if (note.updatedAt) contextParts.push(`Last modified: ${new Date(note.updatedAt).toLocaleDateString()}`);

  if (contextParts.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: contextParts.join('  |  '),
            italics: true,
            color: '666666',
            size: 20, // 10pt
          }),
        ],
        spacing: { after: 240 },
      })
    );
  }

  // Parse HTML content blocks
  const html = note.content || '';

  // Match top-level blocks or sequential items
  const blockRegex = /<(h1|h2|h3|h4|p|ul|ol|blockquote|pre|table|hr)[^>]*>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(html)) !== null) {
    const tag = (match[1] || 'hr').toLowerCase();
    const inner = match[2] || '';

    if (tag === 'h1') {
      children.push(
        new Paragraph({
          text: inner.replace(/<[^>]*>/g, '').trim(),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        })
      );
    } else if (tag === 'h2') {
      children.push(
        new Paragraph({
          text: inner.replace(/<[^>]*>/g, '').trim(),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (tag === 'h3') {
      children.push(
        new Paragraph({
          text: inner.replace(/<[^>]*>/g, '').trim(),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
        })
      );
    } else if (tag === 'p') {
      const runs = parseInlineHtml(inner);
      children.push(
        new Paragraph({
          children: runs,
          spacing: { after: 120 },
        })
      );
    } else if (tag === 'ul' || tag === 'ol') {
      const liMatches = inner.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
      if (liMatches) {
        liMatches.forEach((li, idx) => {
          const liInner = li.replace(/<\/?li[^>]*>/gi, '');
          const runs = parseInlineHtml(liInner);
          children.push(
            new Paragraph({
              children: runs,
              bullet: tag === 'ul' ? { level: 0 } : undefined,
              spacing: { after: 60 },
            })
          );
        });
      }
    } else if (tag === 'blockquote') {
      const clean = inner.replace(/<[^>]*>/g, '').trim();
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: clean,
              italics: true,
              color: '555555',
              size: 22,
            }),
          ],
          indent: { left: 720 }, // 0.5 inch indent
          spacing: { before: 120, after: 120 },
        })
      );
    } else if (tag === 'pre') {
      const clean = inner.replace(/<[^>]*>/g, '');
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: clean,
              font: 'Consolas',
              size: 20,
            }),
          ],
          spacing: { before: 120, after: 120 },
        })
      );
    } else if (tag === 'table') {
      // Parse Table Rows and Cells
      const trMatches = inner.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      if (trMatches) {
        const rows: TableRow[] = [];
        for (const tr of trMatches) {
          const cellMatches = tr.match(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi);
          if (cellMatches) {
            const cells: TableCell[] = [];
            for (const cell of cellMatches) {
              const isHeader = cell.toLowerCase().startsWith('<th');
              const cellInner = cell.replace(/<\/?(?:td|th)[^>]*>/gi, '');
              const cellRuns = parseInlineHtml(cellInner, isHeader);
              cells.push(
                new TableCell({
                  children: [
                    new Paragraph({
                      children: cellRuns,
                    }),
                  ],
                })
              );
            }
            if (cells.length > 0) {
              rows.push(new TableRow({ children: cells }));
            }
          }
        }
        if (rows.length > 0) {
          children.push(
            new Table({
              rows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            })
          );
        }
      }
    } else if (tag === 'hr') {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '______________________________________________________________________',
              color: 'CCCCCC',
              size: 16,
            }),
          ],
          spacing: { before: 120, after: 120 },
        })
      );
    }
  }

  // If no blocks matched (plain text content or raw string)
  if (children.length <= 2 && html.length > 0) {
    const cleanText = html.replace(/<[^>]*>/g, '\n').split('\n').filter((l) => l.trim().length > 0);
    for (const line of cleanText) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 24 })],
          spacing: { after: 120 },
        })
      );
    }
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  });
}
