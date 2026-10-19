import sanitizeHtml from 'sanitize-html';

/**
 * Canonical, versioned note content helpers.
 *
 * A note is stored with two representations:
 *  - `contentJson` — the canonical Lexical editor state, wrapped in a versioned
 *    envelope. This is validated before persistence.
 *  - `content`     — derived HTML used by search, Markdown export, Word export
 *    and the public share viewer. It is sanitized before persistence because it
 *    arrives from the client and must never be trusted.
 */

export const NOTE_CONTENT_FORMAT = 'lexical';
export const NOTE_CONTENT_VERSION = 1;

/** Hard cap to protect the database from pathological payloads (~5 MB). */
const MAX_CONTENT_JSON_LENGTH = 5_000_000;

export interface LexicalValidationResult {
  ok: boolean;
  /** Normalized envelope JSON string when valid. */
  value?: string;
  error?: string;
}

function isSerializedEditorState(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const root = (value as { root?: unknown }).root;
  if (!root || typeof root !== 'object') return false;
  const children = (root as { children?: unknown }).children;
  return Array.isArray(children);
}

/**
 * Validate an untrusted Lexical editor state sent by the client.
 * Accepts either the versioned envelope or a bare serialized editor state and
 * returns a normalized envelope string.
 */
export function validateNoteContentJson(raw: unknown): LexicalValidationResult {
  if (raw == null || raw === '') return { ok: true, value: undefined };

  let parsed: any;
  if (typeof raw === 'string') {
    if (raw.length > MAX_CONTENT_JSON_LENGTH) {
      return { ok: false, error: 'Note content is too large' };
    }
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'Note content is not valid JSON' };
    }
  } else if (typeof raw === 'object') {
    parsed = raw;
  } else {
    return { ok: false, error: 'Note content must be a JSON string' };
  }

  const state =
    parsed && parsed.format === NOTE_CONTENT_FORMAT && 'state' in parsed
      ? parsed.state
      : parsed;

  if (!isSerializedEditorState(state)) {
    return { ok: false, error: 'Note content is not a valid editor state' };
  }

  const normalized = JSON.stringify({
    format: NOTE_CONTENT_FORMAT,
    version: NOTE_CONTENT_VERSION,
    state,
  });

  return { ok: true, value: normalized };
}

const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup', 'code', 'pre',
  'span', 'mark',
  'ul', 'ol', 'li',
  'blockquote',
  'a',
  'img',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
];

/**
 * Sanitize derived HTML content. Removes scripts, event handlers, iframes and
 * unsafe URL schemes while preserving the tags produced by the Lexical editor.
 */
export function sanitizeNoteHtml(dirty: string): string {
  if (!dirty) return '';
  return sanitizeHtml(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      td: ['colspan', 'rowspan', 'style'],
      th: ['colspan', 'rowspan', 'style'],
      p: ['style'],
      span: ['style'],
      h1: ['style'], h2: ['style'], h3: ['style'], h4: ['style'], h5: ['style'], h6: ['style'],
      li: ['class'],
      ul: ['class'],
      ol: ['class'],
      div: ['style'],
      blockquote: ['style'],
      code: ['class'],
      pre: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    allowedStyles: {
      '*': {
        'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/i, /^rgba\(/i, /^[a-z]+$/i],
        'background-color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/i, /^rgba\(/i, /^[a-z]+$/i],
        'text-align': [/^left$|^right$|^center$|^justify$/i],
      },
    },
    transformTags: {
      // Ensure external links opened from stored HTML are safe.
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: 'noopener noreferrer',
        },
      }),
    },
  });
}
