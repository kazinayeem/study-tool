/**
 * Backwards-compatible entry point for the Knowledge Base document editor.
 *
 * The editing engine is Lexical (see `LexicalEditor.tsx`). `WordEditor` is
 * kept as an alias so existing routes/imports continue to work unchanged.
 */
export {
  LexicalEditor,
  LexicalEditor as WordEditor,
  default,
} from './LexicalEditor';
export type { LexicalEditorProps, SaveStatus } from './LexicalEditor';
