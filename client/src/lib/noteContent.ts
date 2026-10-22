/**
 * Canonical, versioned content-format helpers for Knowledge Base notes.
 *
 * Notes are stored with two representations:
 *  - `content`     legacy/compatibility HTML (used by search, Markdown export,
 *                  Word (.docx) export and the public share viewer).
 *  - `contentJson` the canonical Lexical editor state, wrapped in a small
 *                  versioned envelope so the format can evolve safely.
 *
 * Existing HTML notes are NOT migrated destructively: they are converted to
 * Lexical in the editor on first load and only persisted once the user edits,
 * so the original HTML is always retained until a verified save happens.
 */

export const NOTE_CONTENT_FORMAT = 'lexical';
export const NOTE_CONTENT_VERSION = 1;

export interface NoteContentEnvelope {
  format: typeof NOTE_CONTENT_FORMAT;
  version: number;
  state: unknown;
}

export function isSerializedEditorState(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const root = (value as { root?: unknown }).root;
  return !!root && typeof root === 'object' && Array.isArray((root as { children?: unknown }).children);
}

/**
 * Wrap a serialized Lexical editor state in the versioned envelope string that
 * is persisted in `Note.contentJson`.
 */
export function encodeNoteContent(state: unknown): string {
  const envelope: NoteContentEnvelope = {
    format: NOTE_CONTENT_FORMAT,
    version: NOTE_CONTENT_VERSION,
    state,
  };
  return JSON.stringify(envelope);
}

/**
 * Parse a stored `contentJson` value. Returns the serialized editor state when
 * the value is a valid envelope (or a bare Lexical state for robustness).
 */
export function decodeNoteContent(
  raw?: string | null
): { state: unknown | null; isLexical: boolean } {
  if (!raw || typeof raw !== 'string') return { state: null, isLexical: false };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.format === NOTE_CONTENT_FORMAT && isSerializedEditorState(parsed.state)) {
      return { state: parsed.state, isLexical: true };
    }
    if (isSerializedEditorState(parsed)) {
      return { state: parsed, isLexical: true };
    }
  } catch {
    // Not JSON — treat as absent and fall back to legacy HTML.
  }
  return { state: null, isLexical: false };
}

const HTML_TAG_RE =
  /<(p|h[1-6]|ul|ol|li|blockquote|div|br|strong|b|em|i|u|s|span|table|thead|tbody|tr|td|th|pre|code|hr|img|a)\b/i;

/** Heuristic: does this string contain HTML markup we should parse? */
export function isProbablyHtml(value?: string | null): boolean {
  return !!value && HTML_TAG_RE.test(value);
}

/** Convert legacy HTML (or plain text) into readable plain text for previews. */
export function htmlToPlainText(value?: string | null): string {
  if (!value) return '';
  const withBreaks = value
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, '\n');
  return withBreaks
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Serialized editor state returned from the Lexical editor. */
export type SerializedEditorState = Record<string, unknown>;
