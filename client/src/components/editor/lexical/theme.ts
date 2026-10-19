import type { EditorThemeClasses } from 'lexical';

/**
 * Lexical theme -> class names. All visual styling lives in `index.css`
 * (`.lexical-doc …`) so the document typography, paragraph rhythm and page
 * layout are controlled in one place and behave consistently in light/dark.
 */
export const editorTheme: EditorThemeClasses = {
  paragraph: 'lex-paragraph',
  heading: {
    h1: 'lex-h1',
    h2: 'lex-h2',
    h3: 'lex-h3',
    h4: 'lex-h4',
    h5: 'lex-h5',
    h6: 'lex-h6',
  },
  quote: 'lex-quote',
  list: {
    ul: 'lex-ul',
    ol: 'lex-ol',
    listitem: 'lex-li',
    listitemChecked: 'lex-li-checked',
    listitemUnchecked: 'lex-li-unchecked',
    nested: {
      listitem: 'lex-li-nested',
    },
    olDepth: ['lex-ol-1', 'lex-ol-2', 'lex-ol-3'],
    ulDepth: ['lex-ul-1', 'lex-ul-2', 'lex-ul-3'],
  },
  link: 'lex-link',
  text: {
    bold: 'lex-bold',
    italic: 'lex-italic',
    underline: 'lex-underline',
    strikethrough: 'lex-strike',
    subscript: 'lex-subscript',
    superscript: 'lex-superscript',
    code: 'lex-inline-code',
    highlight: 'lex-highlight',
  },
  code: 'lex-code-block',
  table: 'lex-table',
  tableCell: 'lex-table-cell',
  tableCellHeader: 'lex-table-cell-header',
  tableRow: 'lex-table-row',
  tableSelection: 'lex-table-selection',
  hr: 'lex-hr',
  indent: 'lex-indent',
  image: 'lex-image',
};
