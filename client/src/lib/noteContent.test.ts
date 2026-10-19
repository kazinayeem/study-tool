import { describe, it, expect } from 'vitest';
import {
  encodeNoteContent,
  decodeNoteContent,
  isProbablyHtml,
  htmlToPlainText,
  isSerializedEditorState,
  NOTE_CONTENT_FORMAT,
  NOTE_CONTENT_VERSION,
} from './noteContent';

const sampleState = {
  root: {
    children: [
      {
        children: [{ detail: 0, format: 0, mode: 'normal', style: '', text: 'Hello', type: 'text', version: 1 }],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
};

describe('noteContent envelope', () => {
  it('wraps and round-trips a serialized editor state', () => {
    const encoded = encodeNoteContent(sampleState);
    const parsed = JSON.parse(encoded);
    expect(parsed.format).toBe(NOTE_CONTENT_FORMAT);
    expect(parsed.version).toBe(NOTE_CONTENT_VERSION);
    expect(parsed.state).toEqual(sampleState);

    const decoded = decodeNoteContent(encoded);
    expect(decoded.isLexical).toBe(true);
    expect(decoded.state).toEqual(sampleState);
  });

  it('accepts a bare serialized editor state for forward/backward compatibility', () => {
    const decoded = decodeNoteContent(JSON.stringify(sampleState));
    expect(decoded.isLexical).toBe(true);
    expect(decoded.state).toEqual(sampleState);
  });

  it('reports non-Lexical or malformed values as absent', () => {
    expect(decodeNoteContent(null).isLexical).toBe(false);
    expect(decodeNoteContent('').isLexical).toBe(false);
    expect(decodeNoteContent('<p>legacy html</p>').isLexical).toBe(false);
    expect(decodeNoteContent('{"foo":1}').isLexical).toBe(false);
    expect(decodeNoteContent('{ not json').isLexical).toBe(false);
  });

  it('detects serialized editor state shape', () => {
    expect(isSerializedEditorState(sampleState)).toBe(true);
    expect(isSerializedEditorState({ root: { children: [] } })).toBe(true);
    expect(isSerializedEditorState({ root: {} })).toBe(false);
    expect(isSerializedEditorState(null)).toBe(false);
  });
});

describe('legacy HTML helpers', () => {
  it('detects HTML reliably without false-positiveing plain text', () => {
    expect(isProbablyHtml('<p>hi</p>')).toBe(true);
    expect(isProbablyHtml('<h1>Title</h1>')).toBe(true);
    expect(isProbablyHtml('just some words')).toBe(false);
    expect(isProbablyHtml('')).toBe(false);
    expect(isProbablyHtml(null)).toBe(false);
  });

  it('converts HTML into readable plain text', () => {
    expect(htmlToPlainText('<h1>Title</h1><p>Some <strong>bold</strong> text</p>')).toBe(
      'Title\nSome bold text'
    );
    expect(htmlToPlainText('a<br>b')).toBe('a\nb');
    expect(htmlToPlainText(null)).toBe('');
  });
});
