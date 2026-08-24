"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import DOMPurify from "dompurify";
import { useI18n } from "@/lib/i18n";
import { EMPTY_RICH_TEXT_DOCUMENT, getRichTextEditorCopy } from "@/lib/i18n/richTextEditor";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  FileCode2,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  ListPlus,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Rows3,
  SpellCheck2,
  Strikethrough,
  Table2,
  TableCellsMerge,
  TableColumnsSplit,
  TableProperties,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import "./styles.css";

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  placeholder?: string;
  minHeight?: number;
  disabled?: boolean;
}

const SANITIZE_OPTIONS = {
  ALLOWED_TAGS: [
    "a", "b", "blockquote", "br", "code", "del", "div", "em", "h1", "h2", "h3", "hr",
    "i", "img", "li", "mark", "ol", "p", "pre", "s", "span", "strong", "sub", "sup",
    "table", "tbody", "td", "th", "thead", "tr", "u", "ul",
  ],
  ALLOWED_ATTR: ["align", "alt", "class", "colspan", "href", "rel", "rowspan", "src", "style", "target", "title"],
  ALLOW_DATA_ATTR: false,
};

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`rte-toolbar-button${active ? " is-active" : ""}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  label,
  placeholder,
  minHeight = 330,
  disabled = false,
}: RichTextEditorProps) {
  const { locale } = useI18n();
  const copy = getRichTextEditorCopy(locale);
  const resolvedLabel = label ?? copy.content;
  const resolvedPlaceholder = placeholder ?? copy.placeholder;
  const textColors = [
    { value: "#111827", label: copy.black },
    { value: "#556681", label: copy.slateBlue },
    { value: "#2563eb", label: copy.blue },
    { value: "#059669", label: copy.green },
    { value: "#dc2626", label: copy.red },
    { value: "#7c3aed", label: copy.purple },
    { value: "#d97706", label: copy.orange },
  ];
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceValue, setSourceValue] = useState(value);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: "rte-code-block" } },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
        defaultProtocol: "https",
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        isAllowedUri: (url, context) => context.defaultValidate(url) && /^(https?:|mailto:)/i.test(url),
      }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: { class: "rte-image", loading: "lazy" },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: "rte-table" },
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: resolvedPlaceholder }),
    ],
    content: value || EMPTY_RICH_TEXT_DOCUMENT,
    editorProps: {
      attributes: {
        class: "rte-prosemirror",
        dir: "auto",
      },
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
  });

  useEffect(() => {
    if (!editor || sourceMode) return;
    const currentValue = editor.getHTML();
    if (value !== currentValue) {
      editor.commands.setContent(value || EMPTY_RICH_TEXT_DOCUMENT, { emitUpdate: false });
    }
  }, [editor, sourceMode, value]);

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) return null;

  const invoke = (command: () => boolean) => () => {
    if (disabled) return;
    command();
    editor.commands.focus();
  };

  const addLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt(copy.linkPrompt, previousUrl || "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    if (!/^(https?:|mailto:)/i.test(url.trim())) {
      window.alert(copy.invalidLink);
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const addImage = () => {
    const url = window.prompt(copy.imagePrompt, "https://");
    if (!url) return;
    if (!/^https?:\/\//i.test(url.trim())) {
      window.alert(copy.invalidImage);
      return;
    }
    editor.chain().focus().setImage({ src: url.trim() }).run();
  };

  const toggleSourceMode = () => {
    if (sourceMode) {
      const cleanHtml = DOMPurify.sanitize(sourceValue, SANITIZE_OPTIONS);
      editor.commands.setContent(cleanHtml || EMPTY_RICH_TEXT_DOCUMENT, { emitUpdate: false });
      onChange(editor.getHTML());
      setSourceMode(false);
      return;
    }
    setSourceValue(editor.getHTML());
    setSourceMode(true);
  };

  return (
    <section className={`rich-text-editor${disabled ? " is-disabled" : ""}`}>
      <div className="rte-label-row">
        <label className="rte-label">{resolvedLabel}</label>
        <span className="rte-hint">{copy.safeHtmlHint}</span>
      </div>

      <div className="rte-toolbar" role="toolbar" aria-label={copy.formattingTools}>
        <div className="rte-toolbar-group">
          <ToolbarButton label={copy.undo} disabled={!editor.can().undo() || disabled} onClick={invoke(() => editor.chain().focus().undo().run())}><Undo2 size={17} /></ToolbarButton>
          <ToolbarButton label={copy.redo} disabled={!editor.can().redo() || disabled} onClick={invoke(() => editor.chain().focus().redo().run())}><Redo2 size={17} /></ToolbarButton>
        </div>

        <div className="rte-toolbar-group">
          <select
            className="rte-select"
            aria-label={copy.headingLevel}
            disabled={disabled || sourceMode}
            value={editor.isActive("heading", { level: 1 }) ? "h1" : editor.isActive("heading", { level: 2 }) ? "h2" : editor.isActive("heading", { level: 3 }) ? "h3" : "paragraph"}
            onChange={(event) => {
              const level = event.target.value;
              if (level === "paragraph") editor.chain().focus().setParagraph().run();
              else editor.chain().focus().toggleHeading({ level: Number(level.slice(1)) as 1 | 2 | 3 }).run();
            }}
          >
            <option value="paragraph">{copy.normalText}</option>
            <option value="h1">{copy.heading1}</option>
            <option value="h2">{copy.heading2}</option>
            <option value="h3">{copy.heading3}</option>
          </select>
          <ToolbarButton label={copy.heading1} active={editor.isActive("heading", { level: 1 })} disabled={disabled || sourceMode} onClick={invoke(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}><Heading1 size={17} /></ToolbarButton>
          <ToolbarButton label={copy.heading2} active={editor.isActive("heading", { level: 2 })} disabled={disabled || sourceMode} onClick={invoke(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}><Heading2 size={17} /></ToolbarButton>
          <ToolbarButton label={copy.heading3} active={editor.isActive("heading", { level: 3 })} disabled={disabled || sourceMode} onClick={invoke(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}><Heading3 size={17} /></ToolbarButton>
        </div>

        <div className="rte-toolbar-group">
          <ToolbarButton label={copy.bold} active={editor.isActive("bold")} disabled={disabled || sourceMode} onClick={invoke(() => editor.chain().focus().toggleBold().run())}><Bold size={17} /></ToolbarButton>
          <ToolbarButton label={copy.italic} active={editor.isActive("italic")} disabled={disabled || sourceMode} onClick={invoke(() => editor.chain().focus().toggleItalic().run())}><Italic size={17} /></ToolbarButton>
          <ToolbarButton label={copy.underline} active={editor.isActive("underline")} disabled={disabled || sourceMode} onClick={invoke(() => editor.chain().focus().toggleUnderline().run())}><UnderlineIcon size={17} /></ToolbarButton>
          <ToolbarButton label={copy.strike} active={editor.isActive("strike")} disabled={disabled || sourceMode} onClick={invoke(() => editor.chain().focus().toggleStrike().run())}><Strikethrough size={17} /></ToolbarButton>
          <ToolbarButton label={copy.highlight} active={editor.isActive("highlight")} disabled={disabled || sourceMode} onClick={invoke(() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run())}><Highlighter size={17} /></ToolbarButton>
          <ToolbarButton label={copy.removeFormatting} disabled={disabled || sourceMode} onClick={invoke(() => editor.chain().focus().unsetAllMarks().clearNodes().run())}><RemoveFormatting size={17} /></ToolbarButton>
        </div>

        <div className="rte-toolbar-group">
          <label className="rte-color-control" title={copy.textColor}>
            <span className="sr-only">{copy.textColor}</span>
            <SpellCheck2 size={17} />
            <select
              aria-label={copy.textColor}
              disabled={disabled || sourceMode}
              value={editor.getAttributes("textStyle").color || "#111827"}
              onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
            >
              {textColors.map((color) => <option key={color.value} value={color.value}>{color.label}</option>)}
            </select>
          </label>
          <ToolbarButton label={copy.alignRight} active={editor.isActive({ textAlign: "right" })} disabled={disabled || sourceMode} onClick={invoke(() => editor.chain().focus().setTextAlign("right").run())}><AlignRight size={17} /></ToolbarButton>
          <ToolbarButton label={copy.alignCenter} active={editor.isActive({ textAlign: "center" })} disabled={disabled || sourceMode} onClick={invoke(() => editor.chain().focus().setTextAlign("center").run())}><AlignCenter size={17} /></ToolbarButton>
          <ToolbarButton label={copy.alignLeft} active={editor.isActive({ textAlign: "left" })} disabled={disabled || sourceMode} onClick={invoke(() => editor.chain().focus().setTextAlign("left").run())}><AlignLeft size={17} /></ToolbarButton>
          <ToolbarButton label={copy.justify} active={editor.isActive({ textAlign: "justify" })} disabled={disabled || sourceMode} onClick={invoke(() => editor.chain().focus().setTextAlign("justify").run())}><AlignJustify size={17} /></ToolbarButton>
        </div>

        <div className="rte-toolbar-group">
          <ToolbarButton label={copy.bulletList} active={editor.isActive("bulletList")} disabled={disabled || sourceMode} onClick={invoke(() => editor.chain().focus().toggleBulletList().run())}><List size={17} /></ToolbarButton>
          <ToolbarButton label={copy.orderedList} active={editor.isActive("orderedList")} disabled={disabled || sourceMode} onClick={invoke(() => editor.chain().focus().toggleOrderedList().run())}><ListOrdered size={17} /></ToolbarButton>
          <ToolbarButton label={copy.taskList} active={editor.isActive("taskList")} disabled={disabled || sourceMode} onClick={invoke(() => editor.chain().focus().toggleTaskList().run())}><ListChecks size={17} /></ToolbarButton>
          <ToolbarButton label={copy.quote} active={editor.isActive("blockquote")} disabled={disabled || sourceMode} onClick={invoke(() => editor.chain().focus().toggleBlockquote().run())}><Quote size={17} /></ToolbarButton>
          <ToolbarButton label={copy.codeBlock} active={editor.isActive("codeBlock")} disabled={disabled || sourceMode} onClick={invoke(() => editor.chain().focus().toggleCodeBlock().run())}><Code2 size={17} /></ToolbarButton>
          <ToolbarButton label={copy.divider} disabled={disabled || sourceMode} onClick={invoke(() => editor.chain().focus().setHorizontalRule().run())}><Minus size={17} /></ToolbarButton>
        </div>

        <div className="rte-toolbar-group">
          <ToolbarButton label={copy.addLink} active={editor.isActive("link")} disabled={disabled || sourceMode} onClick={addLink}><Link2 size={17} /></ToolbarButton>
          <ToolbarButton label={copy.removeLink} disabled={disabled || sourceMode || !editor.isActive("link")} onClick={invoke(() => editor.chain().focus().unsetLink().run())}><Unlink size={17} /></ToolbarButton>
          <ToolbarButton label={copy.insertImage} disabled={disabled || sourceMode} onClick={addImage}><ImagePlus size={17} /></ToolbarButton>
        </div>

        <div className="rte-toolbar-group rte-table-actions">
          <details>
            <summary className="rte-table-summary" title={copy.tableTools}><Table2 size={17} /><span>{copy.table}</span></summary>
            <div className="rte-table-menu">
              <button type="button" disabled={disabled || sourceMode} onClick={invoke(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}><ListPlus size={15} /> {copy.insertTable}</button>
              <button type="button" disabled={disabled || sourceMode || !editor.isActive("table")} onClick={invoke(() => editor.chain().focus().addRowAfter().run())}><Rows3 size={15} /> {copy.addRow}</button>
              <button type="button" disabled={disabled || sourceMode || !editor.isActive("table")} onClick={invoke(() => editor.chain().focus().addColumnAfter().run())}><TableColumnsSplit size={15} /> {copy.addColumn}</button>
              <button type="button" disabled={disabled || sourceMode || !editor.isActive("table")} onClick={invoke(() => editor.chain().focus().deleteRow().run())}><Trash2 size={15} /> {copy.deleteRow}</button>
              <button type="button" disabled={disabled || sourceMode || !editor.isActive("table")} onClick={invoke(() => editor.chain().focus().deleteColumn().run())}><Trash2 size={15} /> {copy.deleteColumn}</button>
              <button type="button" disabled={disabled || sourceMode || !editor.isActive("table")} onClick={invoke(() => editor.chain().focus().mergeOrSplit().run())}><TableCellsMerge size={15} /> {copy.mergeOrSplitCell}</button>
              <button type="button" disabled={disabled || sourceMode || !editor.isActive("table")} onClick={invoke(() => editor.chain().focus().toggleHeaderRow().run())}><TableProperties size={15} /> {copy.headerRow}</button>
              <button type="button" className="rte-danger-action" disabled={disabled || sourceMode || !editor.isActive("table")} onClick={invoke(() => editor.chain().focus().deleteTable().run())}><Trash2 size={15} /> {copy.deleteTable}</button>
            </div>
          </details>
        </div>

        <div className="rte-toolbar-group rte-toolbar-end">
          <ToolbarButton label={sourceMode ? copy.returnToEditor : copy.editHtml} active={sourceMode} disabled={disabled} onClick={toggleSourceMode}><FileCode2 size={17} /></ToolbarButton>
        </div>
      </div>

      {sourceMode ? (
        <textarea
          className="rte-source-editor"
          value={sourceValue}
          disabled={disabled}
          style={{ minHeight }}
          spellCheck={false}
          onChange={(event) => setSourceValue(event.target.value)}
          aria-label={copy.htmlEditor}
        />
      ) : (
        <EditorContent editor={editor} className="rte-content-editor" style={{ minHeight }} />
      )}

      <div className="rte-footer">
        <span>{copy.keyboardShortcuts}</span>
        <span>{editor.getText().length} {copy.characters}</span>
      </div>
    </section>
  );
}

export function RichTextContent({ html, className = "" }: { html?: string; className?: string }) {
  const { locale } = useI18n();
  const copy = getRichTextEditorCopy(locale);
  const sanitizedHtml = DOMPurify.sanitize(html || "", SANITIZE_OPTIONS);
  if (!sanitizedHtml || sanitizedHtml === EMPTY_RICH_TEXT_DOCUMENT) {
    return <p className="rte-empty-content">{copy.emptyContent}</p>;
  }

  return <div className={`rte-rendered-content ${className}`.trim()} dir="auto" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}
