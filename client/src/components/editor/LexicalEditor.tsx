import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';

import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  type ElementFormatType,
  type LexicalEditor as LexicalEditorInstance,
} from 'lexical';
import { $setBlocksType, $patchStyleText } from '@lexical/selection';
import { $findMatchingParent, $getNearestNodeOfType, mergeRegister } from '@lexical/utils';
import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
} from '@lexical/list';
import { CodeNode, $createCodeNode } from '@lexical/code';
import { LinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import {
  INSERT_TABLE_COMMAND,
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $findTableNode,
  TableNode,
  TableRowNode,
  TableCellNode,
} from '@lexical/table';
import {
  INSERT_HORIZONTAL_RULE_COMMAND,
  HorizontalRuleNode,
} from '@lexical/react/LexicalHorizontalRuleNode';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold as BoldIcon,
  ChevronDown,
  Code as CodeIcon,
  Download,
  Highlighter,
  Image as ImageIcon,
  Indent as IndentIcon,
  Italic as ItalicIcon,
  Link as LinkIcon,
  List as ListIcon,
  ListChecks,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  Outdent as OutdentIcon,
  Palette,
  Printer,
  Quote,
  Redo as RedoIcon,
  RemoveFormatting,
  Strikethrough as StrikeIcon,
  Subscript as SubIcon,
  Superscript as SuperIcon,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo as UndoIcon,
} from 'lucide-react';

import { api } from '../../lib/api';
import { decodeNoteContent, encodeNoteContent } from '../../lib/noteContent';
import { editorTheme } from './lexical/theme';
import { $createImageNode, ImageNode } from './lexical/ImageNode';

export type SaveStatus = 'saved' | 'saving' | 'error' | 'unsaved';

export interface LexicalEditorProps {
  noteId?: string;
  initialTitle: string;
  /** Legacy/compat HTML content (used by export, search and share). */
  initialContent?: string;
  /** Canonical versioned Lexical editor state (JSON string). */
  initialContentState?: string | null;
  academicSubtitle?: string;
  onTitleChange: (newTitle: string) => void;
  /** Emits the derived HTML plus the canonical versioned Lexical state JSON. */
  onContentChange: (html: string, json: string) => void;
  /** Optional extra listener for the canonical versioned Lexical state JSON. */
  onSerializedStateChange?: (json: string) => void;
  onSave?: () => void;
  saveStatus?: SaveStatus;
  isReadOnly?: boolean;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  /** Test seam / override; defaults to the secure notes image upload endpoint. */
  onRequestImageUpload?: (file: File) => Promise<{ url: string }>;
}

const TEXT_COLORS = [
  { label: 'Default', value: null },
  { label: 'Charcoal', value: '#37352f' },
  { label: 'Purple', value: '#5645d4' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Green', value: '#059669' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Violet', value: '#7c3aed' },
  { label: 'Gray', value: '#6b7280' },
];

const HIGHLIGHT_COLORS = [
  { label: 'None', value: null },
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Orange', value: '#fed7aa' },
  { label: 'Blue', value: '#bfdbfe' },
  { label: 'Pink', value: '#fbcfe8' },
  { label: 'Purple', value: '#ddd6fe' },
];

type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'quote' | 'code';
type ListType = 'bullet' | 'number' | 'check' | null;

interface ToolbarSnapshot {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  subscript: boolean;
  superscript: boolean;
  code: boolean;
  blockType: BlockType;
  listType: ListType;
  align: ElementFormatType;
  isInTable: boolean;
  isLink: boolean;
}

const DEFAULT_TOOLBAR: ToolbarSnapshot = {
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  subscript: false,
  superscript: false,
  code: false,
  blockType: 'paragraph',
  listType: null,
  align: 'left',
  isInTable: false,
  isLink: false,
};

const BLOCK_OPTIONS: { label: string; value: BlockType }[] = [
  { label: 'Normal text', value: 'paragraph' },
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
  { label: 'Quote', value: 'quote' },
  { label: 'Code block', value: 'code' },
];

/* ------------------------------------------------------------------ */
/* Small UI primitives                                                */
/* ------------------------------------------------------------------ */

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ onClick, active, disabled, label, children }) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    aria-pressed={active}
    className={`lex-toolbar-btn ${active ? 'lex-toolbar-btn-active' : ''}`}
  >
    {children}
  </button>
);

interface PopoverProps {
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  icon: React.ReactNode;
}

const Popover: React.FC<PopoverProps> = ({ label, open, onOpenChange, children, icon }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div className="lex-popover-anchor" ref={ref}>
      <ToolbarButton label={label} active={open} onClick={() => onOpenChange(!open)}>
        {icon}
        <ChevronDown className="lex-toolbar-caret" />
      </ToolbarButton>
      {open && <div className="lex-popover">{children}</div>}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Snapshot reader                                                    */
/* ------------------------------------------------------------------ */

function readToolbarSnapshot(): ToolbarSnapshot {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return { ...DEFAULT_TOOLBAR };

  const anchor = selection.anchor.getNode();
  let blockType: BlockType = 'paragraph';
  let listType: ListType = null;
  let align: ElementFormatType = 'left';
  let isInTable = false;

  const codeNode = $getNearestNodeOfType(anchor, CodeNode);
  const heading = $getNearestNodeOfType(anchor, HeadingNode);
  const quote = $getNearestNodeOfType(anchor, QuoteNode);
  const list = $getNearestNodeOfType(anchor, ListNode);

  if (codeNode) blockType = 'code';
  else if (heading) blockType = heading.getTag() as BlockType;
  else if (quote) blockType = 'quote';

  if (list) {
    const t = list.getListType();
    listType = t === 'number' ? 'number' : t === 'check' ? 'check' : 'bullet';
  }

  const table = $getNearestNodeOfType(anchor, TableNode);
  isInTable = !!table;

  const block = $findMatchingParent(anchor, (node) => $isElementNode(node) && !node.isInline());
  const blockFormat = (block as any)?.getFormat?.();
  if (blockFormat) align = blockFormat as ElementFormatType;

  return {
    bold: selection.hasFormat('bold'),
    italic: selection.hasFormat('italic'),
    underline: selection.hasFormat('underline'),
    strikethrough: selection.hasFormat('strikethrough'),
    subscript: selection.hasFormat('subscript'),
    superscript: selection.hasFormat('superscript'),
    code: selection.hasFormat('code'),
    blockType,
    listType,
    align,
    isInTable,
    isLink: !!$getNearestNodeOfType(anchor, LinkNode),
  };
}

/* ------------------------------------------------------------------ */
/* Surface (all logic that needs composer context)                    */
/* ------------------------------------------------------------------ */

interface SurfaceProps extends LexicalEditorProps {
  initialEditorStateJson?: string;
}

const LexicalEditorSurface: React.FC<SurfaceProps> = ({
  noteId,
  initialTitle,
  initialContent,
  initialContentState,
  academicSubtitle,
  onTitleChange,
  onContentChange,
  onSerializedStateChange,
  saveStatus = 'saved',
  isReadOnly = false,
  isFullScreen,
  onToggleFullScreen,
  onRequestImageUpload,
}) => {
  const [editor] = useLexicalComposerContext();

  const [toolbar, setToolbar] = useState<ToolbarSnapshot>(DEFAULT_TOOLBAR);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [tableOpen, setTableOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState({ words: 0, chars: 0 });

  const imageInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const suppressChangeRef = useRef(false);
  const suppressTimerRef = useRef<number | undefined>(undefined);
  const lastSignatureRef = useRef<string | null>(null);
  const activeRef = useRef(false);

  const isFullScreenControlled = onToggleFullScreen !== undefined;
  const fullScreenActive = isFullScreenControlled ? !!isFullScreen : isFocusMode;
  activeRef.current = fullScreenActive;

  const handleToggleFullScreen = useCallback(() => {
    const next = !fullScreenActive;
    try {
      if (next) {
        if (!document.fullscreenElement && rootRef.current?.requestFullscreen) {
          rootRef.current.requestFullscreen().catch(() => {});
        }
      } else if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    } catch {
      /* CSS fallback always applies */
    }
    if (isFullScreenControlled) onToggleFullScreen?.();
    else setIsFocusMode(next);
  }, [fullScreenActive, isFullScreenControlled, onToggleFullScreen]);

  /* ---------------- external content synchronization ---------------- */

  const applyExternalContent = useCallback(
    (html?: string, versionedJson?: string | null) => {
      const decoded = decodeNoteContent(versionedJson);
      suppressChangeRef.current = true;
      window.clearTimeout(suppressTimerRef.current);
      suppressTimerRef.current = window.setTimeout(() => {
        suppressChangeRef.current = false;
      }, 200);

      if (decoded.isLexical && decoded.state) {
        try {
          editor.setEditorState(editor.parseEditorState(JSON.stringify(decoded.state)));
          return;
        } catch {
          /* fall through to HTML */
        }
      }

      editor.update(() => {
        const root = $getRoot();
        root.clear();
        const source = html && html.trim() ? html : '<p></p>';
        const dom = new DOMParser().parseFromString(source, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        root.select();
        const selection = $getSelection();
        if ($isRangeSelection(selection) && nodes.length > 0) {
          selection.insertNodes(nodes);
        }
      });
    },
    [editor]
  );

  useEffect(() => {
    const signature = `${noteId ?? 'new'}|${initialContentState ?? ''}|${initialContent ?? ''}`;
    if (lastSignatureRef.current === signature) return;
    lastSignatureRef.current = signature;
    applyExternalContent(initialContent, initialContentState);
  }, [noteId, initialContent, initialContentState, applyExternalContent]);

  /* ---------------- readonly toggle ---------------- */
  useEffect(() => {
    editor.setEditable(!isReadOnly);
  }, [editor, isReadOnly]);

  /* ---------------- keyboard / scroll lock for focus mode ---------------- */
  useEffect(() => {
    if (isFullScreenControlled || !isFocusMode) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFocusMode(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [isFocusMode, isFullScreenControlled]);

  /* ---------------- toolbar state ---------------- */
  useEffect(() => {
    const refreshStats = () => {
      const text = editor.getRootElement()?.innerText ?? '';
      const words = text.split(/\s+/).filter(Boolean).length;
      setStats({ words, chars: text.length });
    };

    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => setToolbar(readToolbarSnapshot()));
        refreshStats();
      }),
      editor.registerCommand(CAN_UNDO_COMMAND, (p) => { setCanUndo(p); return false; }, COMMAND_PRIORITY_LOW),
      editor.registerCommand(CAN_REDO_COMMAND, (p) => { setCanRedo(p); return false; }, COMMAND_PRIORITY_LOW)
    );
  }, [editor]);

  /* ---------------- content emission ---------------- */
  const handleChange = useCallback(
    (editorState: any, ed: LexicalEditorInstance) => {
      const html = editorState.read(() => $generateHtmlFromNodes(ed, null));
      const json = encodeNoteContent(editorState.toJSON());

      if (suppressChangeRef.current) {
        suppressChangeRef.current = false;
        window.clearTimeout(suppressTimerRef.current);
        return;
      }

      onContentChange(html, json);
      onSerializedStateChange?.(json);
    },
    [onContentChange, onSerializedStateChange]
  );

  /* ---------------- commands ---------------- */
  const applyBlockType = useCallback(
    (type: BlockType) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        if (type === 'paragraph') $setBlocksType(selection, () => $createParagraphNode());
        else if (type === 'quote') $setBlocksType(selection, () => $createQuoteNode());
        else if (type === 'code') $setBlocksType(selection, () => $createCodeNode());
        else $setBlocksType(selection, () => $createHeadingNode(type as 'h1' | 'h2' | 'h3'));
      });
    },
    [editor]
  );

  const toggleList = useCallback(
    (listType: 'bullet' | 'number' | 'check') => {
      if (toolbar.listType === listType) {
        // Active again -> convert back to a normal paragraph.
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) $setBlocksType(selection, () => $createParagraphNode());
        });
        return;
      }
      if (listType === 'number') editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
      else if (listType === 'check') editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
      else editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    },
    [editor, toolbar.listType]
  );

  const toggleInline = useCallback(
    (format: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'subscript' | 'superscript' | 'code') => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    },
    [editor]
  );

  const applyTextColor = useCallback(
    (color: string | null) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        $patchStyleText(selection, { color: color ?? null });
      });
      setColorOpen(false);
    },
    [editor]
  );

  const applyHighlight = useCallback(
    (color: string | null) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        $patchStyleText(selection, { 'background-color': color ?? null });
      });
      setHighlightOpen(false);
    },
    [editor]
  );

  const clearFormatting = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      $patchStyleText(selection, { color: null, 'background-color': null });
      selection.getNodes().forEach((node) => {
        if ($isTextNode(node)) node.setFormat(0);
        else if ($isElementNode(node)) {
          node.getChildren().forEach((child) => {
            if ($isTextNode(child)) child.setFormat(0);
          });
        }
      });
    });
  }, [editor]);

  const applyAlign = useCallback(
    (align: ElementFormatType) => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, align),
    [editor]
  );

  const applyLink = useCallback(() => {
    const url = linkUrl.trim();
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url.length > 0 ? url : null);
    setLinkOpen(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  const insertTable = useCallback(() => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, {
      rows: String(tableRows),
      columns: String(tableCols),
      includeHeaders: true,
    });
    setTableOpen(false);
  }, [editor, tableRows, tableCols]);

  const insertImage = useCallback(
    async (file: File) => {
      try {
        setUploading(true);
        const res = onRequestImageUpload
          ? await onRequestImageUpload(file)
          : await api.uploadNoteImage(fileToFormData(file));
        if (res?.url) {
          editor.update(() => {
            const node = $createImageNode({ src: res.url, altText: file.name });
            const selection = $getSelection();
            if ($isRangeSelection(selection)) selection.insertNodes([node]);
            else $getRoot().append(node);
          });
        }
      } catch (err: any) {
        // eslint-disable-next-line no-alert
        alert(err?.message || 'Failed to upload image');
      } finally {
        setUploading(false);
        if (imageInputRef.current) imageInputRef.current.value = '';
      }
    },
    [editor, onRequestImageUpload]
  );

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void insertImage(file);
  };

  const tableAction = useCallback(
    (action: 'row-after' | 'row-before' | 'col-after' | 'col-before' | 'del-row' | 'del-col' | 'del-table') => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        const table = $findTableNode(selection.anchor.getNode());
        if (!table) return;
        if (action === 'row-after') $insertTableRowAtSelection(true);
        else if (action === 'row-before') $insertTableRowAtSelection(false);
        else if (action === 'col-after') $insertTableColumnAtSelection(true);
        else if (action === 'col-before') $insertTableColumnAtSelection(false);
        else if (action === 'del-row') $deleteTableRowAtSelection();
        else if (action === 'del-col') $deleteTableColumnAtSelection();
        else if (action === 'del-table') table.remove();
      });
    },
    [editor]
  );

  const rootIsOverlay = !isFullScreenControlled && isFocusMode;

  const statusLabel =
    saveStatus === 'saving'
      ? 'Saving…'
      : saveStatus === 'error'
        ? 'Save failed'
        : saveStatus === 'unsaved'
          ? 'Unsaved changes'
          : 'Saved';

  return (
    <div
      ref={rootRef}
      className={`lex-editor-root ${rootIsOverlay ? 'lex-editor-overlay' : ''}`}
      data-fullscreen={fullScreenActive ? 'true' : 'false'}
    >
      {/* ---------------- Toolbar ---------------- */}
      <header className="lex-toolbar print:hidden" role="toolbar" aria-label="Formatting">
        <div className="lex-toolbar-inner">
          <ToolbarButton label="Undo (Ctrl+Z)" disabled={!canUndo} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}>
            <UndoIcon className="lex-icon" />
          </ToolbarButton>
          <ToolbarButton label="Redo (Ctrl+Y)" disabled={!canRedo} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}>
            <RedoIcon className="lex-icon" />
          </ToolbarButton>

          <span className="lex-divider" />

          <select
            aria-label="Paragraph style"
            className="lex-select"
            value={toolbar.blockType}
            onChange={(e) => applyBlockType(e.target.value as BlockType)}
          >
            {BLOCK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <span className="lex-divider" />

          <ToolbarButton label="Bold (Ctrl+B)" active={toolbar.bold} onClick={() => toggleInline('bold')}>
            <BoldIcon className="lex-icon" />
          </ToolbarButton>
          <ToolbarButton label="Italic (Ctrl+I)" active={toolbar.italic} onClick={() => toggleInline('italic')}>
            <ItalicIcon className="lex-icon" />
          </ToolbarButton>
          <ToolbarButton label="Underline (Ctrl+U)" active={toolbar.underline} onClick={() => toggleInline('underline')}>
            <UnderlineIcon className="lex-icon" />
          </ToolbarButton>
          <ToolbarButton label="Strikethrough" active={toolbar.strikethrough} onClick={() => toggleInline('strikethrough')}>
            <StrikeIcon className="lex-icon" />
          </ToolbarButton>
          <ToolbarButton label="Subscript" active={toolbar.subscript} onClick={() => toggleInline('subscript')}>
            <SubIcon className="lex-icon" />
          </ToolbarButton>
          <ToolbarButton label="Superscript" active={toolbar.superscript} onClick={() => toggleInline('superscript')}>
            <SuperIcon className="lex-icon" />
          </ToolbarButton>
          <ToolbarButton label="Inline code" active={toolbar.code} onClick={() => toggleInline('code')}>
            <CodeIcon className="lex-icon" />
          </ToolbarButton>

          <span className="lex-divider" />

          <Popover label="Text color" open={colorOpen} onOpenChange={setColorOpen} icon={<Palette className="lex-icon" />}>
            <div className="lex-swatches" role="group" aria-label="Text colors">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  title={c.label}
                  aria-label={`Text color ${c.label}`}
                  className="lex-swatch"
                  style={{ backgroundColor: c.value ?? '#ffffff', borderStyle: c.value ? 'solid' : 'dashed' }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyTextColor(c.value)}
                />
              ))}
            </div>
          </Popover>

          <Popover label="Highlight color" open={highlightOpen} onOpenChange={setHighlightOpen} icon={<Highlighter className="lex-icon" />}>
            <div className="lex-swatches" role="group" aria-label="Highlight colors">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  title={c.label}
                  aria-label={`Highlight ${c.label}`}
                  className="lex-swatch"
                  style={{ backgroundColor: c.value ?? '#ffffff', borderStyle: c.value ? 'solid' : 'dashed' }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyHighlight(c.value)}
                />
              ))}
            </div>
          </Popover>

          <ToolbarButton label="Clear formatting" onClick={clearFormatting}>
            <RemoveFormatting className="lex-icon" />
          </ToolbarButton>

          <span className="lex-divider" />

          <ToolbarButton label="Bulleted list" active={toolbar.listType === 'bullet'} onClick={() => toggleList('bullet')}>
            <ListIcon className="lex-icon" />
          </ToolbarButton>
          <ToolbarButton label="Numbered list" active={toolbar.listType === 'number'} onClick={() => toggleList('number')}>
            <ListOrdered className="lex-icon" />
          </ToolbarButton>
          <ToolbarButton label="Checklist" active={toolbar.listType === 'check'} onClick={() => toggleList('check')}>
            <ListChecks className="lex-icon" />
          </ToolbarButton>

          <ToolbarButton label="Decrease indent" onClick={() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)}>
            <OutdentIcon className="lex-icon" />
          </ToolbarButton>
          <ToolbarButton label="Increase indent" onClick={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)}>
            <IndentIcon className="lex-icon" />
          </ToolbarButton>

          <span className="lex-divider" />

          <ToolbarButton label="Align left" active={toolbar.align === 'left'} onClick={() => applyAlign('left')}>
            <AlignLeft className="lex-icon" />
          </ToolbarButton>
          <ToolbarButton label="Align center" active={toolbar.align === 'center'} onClick={() => applyAlign('center')}>
            <AlignCenter className="lex-icon" />
          </ToolbarButton>
          <ToolbarButton label="Align right" active={toolbar.align === 'right'} onClick={() => applyAlign('right')}>
            <AlignRight className="lex-icon" />
          </ToolbarButton>
          <ToolbarButton label="Justify" active={toolbar.align === 'justify'} onClick={() => applyAlign('justify')}>
            <AlignJustify className="lex-icon" />
          </ToolbarButton>

          <span className="lex-divider" />

          <Popover label="Insert link" open={linkOpen} onOpenChange={setLinkOpen} icon={<LinkIcon className="lex-icon" />}>
            <div className="lex-link-form">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://…"
                aria-label="Link URL"
                className="lex-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyLink();
                  }
                }}
              />
              <button type="button" className="lex-primary-btn" onClick={applyLink}>
                Apply
              </button>
            </div>
          </Popover>

          <ToolbarButton label="Insert image" onClick={() => imageInputRef.current?.click()}>
            <ImageIcon className="lex-icon" />
          </ToolbarButton>

          <Popover label="Insert table" open={tableOpen} onOpenChange={setTableOpen} icon={<TableIcon className="lex-icon" />}>
            <div className="lex-table-form">
              <label className="lex-field">
                <span>Rows</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  className="lex-input"
                />
              </label>
              <label className="lex-field">
                <span>Columns</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={tableCols}
                  onChange={(e) => setTableCols(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                  className="lex-input"
                />
              </label>
              <button type="button" className="lex-primary-btn" onClick={insertTable}>
                Insert table
              </button>
            </div>
          </Popover>

          <ToolbarButton
            label="Horizontal divider"
            onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}
          >
            <Minus className="lex-icon" />
          </ToolbarButton>
        </div>

        {toolbar.isInTable && (
          <div className="lex-toolbar-inner lex-toolbar-context" aria-label="Table tools">
            <span className="lex-context-label">Table</span>
            <button type="button" className="lex-chip" onMouseDown={(e) => e.preventDefault()} onClick={() => tableAction('row-before')}>+ Row above</button>
            <button type="button" className="lex-chip" onMouseDown={(e) => e.preventDefault()} onClick={() => tableAction('row-after')}>+ Row below</button>
            <button type="button" className="lex-chip" onMouseDown={(e) => e.preventDefault()} onClick={() => tableAction('col-before')}>+ Column left</button>
            <button type="button" className="lex-chip" onMouseDown={(e) => e.preventDefault()} onClick={() => tableAction('col-after')}>+ Column right</button>
            <button type="button" className="lex-chip" onMouseDown={(e) => e.preventDefault()} onClick={() => tableAction('del-row')}>Delete row</button>
            <button type="button" className="lex-chip" onMouseDown={(e) => e.preventDefault()} onClick={() => tableAction('del-col')}>Delete column</button>
            <button type="button" className="lex-chip lex-chip-danger" onMouseDown={(e) => e.preventDefault()} onClick={() => tableAction('del-table')}>Delete table</button>
          </div>
        )}
      </header>

      {/* ---------------- Document canvas ---------------- */}
      <div className="lex-workspace">
        <div className="lex-page">
          <div className="lex-page-inner">
            <input
              type="text"
              value={initialTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Document title…"
              aria-label="Note title"
              disabled={isReadOnly}
              className="lex-title"
            />
            {academicSubtitle && <p className="lex-subtitle">{academicSubtitle}</p>}

            <div className="lexical-doc" aria-label="Note content">
              <RichTextPlugin
                contentEditable={
                  <ContentEditable
                    className="lex-content-editable"
                    aria-label="Note document"
                    spellCheck
                  />
                }
                placeholder={<div className="lex-placeholder">Start drafting your academic notes…</div>}
                ErrorBoundary={LexicalErrorBoundary}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- Status bar ---------------- */}
      <footer className="lex-statusbar print:hidden">
        <div className="lex-status-left">
          <span className={`lex-save-dot lex-save-${saveStatus}`} aria-hidden="true" />
          <span>{statusLabel}</span>
          <span className="lex-divider" />
          <span>{stats.words} words</span>
          <span className="hidden sm:inline lex-divider" />
          <span className="hidden sm:inline">{stats.chars} characters</span>
        </div>
        <div className="lex-status-right">
          {noteId && (
            <a
              href={api.getNoteDocxExportUrl(noteId)}
              download
              className="lex-chip"
              title="Download as Microsoft Word (.docx)"
            >
              <Download className="lex-icon-sm" /> Export Word
            </a>
          )}
          <button type="button" className="lex-chip" onClick={() => window.print()} title="Print or save as PDF">
            <Printer className="lex-icon-sm" /> Print / PDF
          </button>
          <button
            type="button"
            className="lex-chip"
            onClick={handleToggleFullScreen}
            aria-label={fullScreenActive ? 'Exit full screen editor' : 'Enter full screen editor'}
            aria-pressed={fullScreenActive}
            title={fullScreenActive ? 'Exit Full Screen (Esc)' : 'Full Screen'}
          >
            {fullScreenActive ? <Minimize2 className="lex-icon-sm" /> : <Maximize2 className="lex-icon-sm" />}
            {fullScreenActive ? 'Exit Full Screen' : 'Full Screen'}
          </button>
        </div>
      </footer>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Upload image"
        onChange={handleImageInput}
      />
      {uploading && <div className="lex-uploading" role="status">Uploading image…</div>}
      <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Error boundary                                                     */
/* ------------------------------------------------------------------ */

interface LexicalErrorBoundaryProps {
  children: React.ReactElement;
  onError: (error: Error) => void;
}

class LexicalErrorBoundary extends React.Component<
  LexicalErrorBoundaryProps,
  { hasError: boolean }
> {
  constructor(props: LexicalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return <p className="lex-error">The editor encountered a problem loading this note.</p>;
    }
    return this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/* Composer wrapper                                                   */
/* ------------------------------------------------------------------ */

function fileToFormData(file: File): FormData {
  const fd = new FormData();
  fd.append('image', file);
  return fd;
}

const EDITOR_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  LinkNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  HorizontalRuleNode,
  ImageNode,
];

export const LexicalEditor: React.FC<LexicalEditorProps> = (props) => {
  const decoded = useMemo(
    () => decodeNoteContent(props.initialContentState),
    [props.initialContentState]
  );
  const initialEditorStateJson = decoded.isLexical && decoded.state
    ? JSON.stringify(decoded.state)
    : undefined;

  const initialConfig = useMemo(
    () => ({
      namespace: 'ScholarFlow Knowledge Base',
      theme: editorTheme,
      editable: !props.isReadOnly,
      editorState: initialEditorStateJson,
      nodes: EDITOR_NODES,
      onError: (error: Error) => {
        // Surface the error without crashing the whole app shell.
        // eslint-disable-next-line no-console
        console.error('[LexicalEditor]', error);
      },
    }),
    // Remount (and re-read initial state) whenever a different note is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.noteId]
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <LexicalEditorSurface {...props} initialEditorStateJson={initialEditorStateJson} />
      <HistoryPlugin />
      <ListPlugin />
      <CheckListPlugin />
      <TablePlugin hasHorizontalScroll />
      <LinkPlugin />
      <MarkdownShortcutPlugin />
      <HorizontalRulePlugin />
    </LexicalComposer>
  );
};

export default LexicalEditor;
