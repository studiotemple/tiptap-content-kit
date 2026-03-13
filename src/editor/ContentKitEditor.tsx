'use client';

import './styles/editor.css';

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  type DragEvent,
  type ClipboardEvent,
} from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

import { useContentKit } from './ContentKitProvider';
import { useEditorI18n } from './i18n';
import EditorToolbar from './EditorToolbar';
import TableControls from './TableControls';
import { SmartLinkModal } from './SmartLinkModal';
import { AnchorModal } from './AnchorModal';
import { DiagramEditModal } from './DiagramEditModal';
import { AIImportModal } from './AIImportModal';
import { SpecialBlockExtension, getBlockTemplate } from './SpecialBlockExtension';
import { CalloutExtension } from '../extensions/callout';
import { CodeBlockTabsExtension } from '../extensions/code-block-tabs';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { ReactNodeViewRenderer } from '@tiptap/react';
import CodeBlockNodeView from './CodeBlockNodeView';
import type { ContentKitEditorProps } from './types';

const lowlight = createLowlight(common);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentKitEditorComponentProps extends ContentKitEditorProps {
  /** Upload handler for images. Falls back to `providers.imageUpload.upload()`. */
  onImageUpload?: (file: File) => Promise<string>;
  /** Additional Tiptap extensions to merge into the editor. */
  extensions?: any[];
  /** Extra class names for the toolbar wrapper. */
  toolbarClassName?: string;
  /** Extra class names for the EditorContent wrapper. */
  editorClassName?: string;
  /** Callback for cross-tab translation mode (used by MultiLocaleEditor) */
  onTranslateCrossTab?: (result: { blocks: any[]; title?: string }, targetLang: string) => void;
}

// ---------------------------------------------------------------------------
// Modal state helpers
// ---------------------------------------------------------------------------

interface LinkModalState {
  isOpen: boolean;
  selectedText: string;
  existingUrl: string;
}

const LINK_MODAL_CLOSED: LinkModalState = {
  isOpen: false,
  selectedText: '',
  existingUrl: '',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ContentKitEditor({
  content,
  onChange,
  editable = true,
  placeholder: placeholderText,
  locale,
  className,
  onImageUpload,
  extensions: extraExtensions = [],
  toolbarClassName,
  editorClassName,
  onTranslateCrossTab,
}: ContentKitEditorComponentProps) {
  const { providers } = useContentKit();
  const { t } = useEditorI18n();

  // ---- Modal states -------------------------------------------------------
  const [linkModal, setLinkModal] = useState<LinkModalState>(LINK_MODAL_CLOSED);
  const [anchorModalOpen, setAnchorModalOpen] = useState(false);
  const [diagramModalOpen, setDiagramModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // ---- Image upload state -------------------------------------------------
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Suppress circular onChange during setContent -----------------------
  const suppressOnChangeRef = useRef(false);

  // ---- Resolve upload function --------------------------------------------
  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      const uploader = onImageUpload ?? providers.imageUpload?.upload;
      if (!uploader) {
        providers.onNotify?.(t('image.noUploader'), 'warning');
        return null;
      }
      try {
        setIsUploading(true);
        const url = await uploader(file);
        return url;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        providers.onNotify?.(message, 'error');
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [onImageUpload, providers, t],
  );

  // ---- Extensions ---------------------------------------------------------
  const editorExtensions = useMemo(
    () => [
      StarterKit.configure({
        codeBlock: false,
        history: {},
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({ placeholder: placeholderText ?? t('editor.placeholder') }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }).extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockNodeView);
        },
      }),
      SpecialBlockExtension,
      CalloutExtension,
      CodeBlockTabsExtension,
      ...extraExtensions,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placeholderText, t],
  );

  // ---- Editor instance ----------------------------------------------------
  const editor = useEditor({
    extensions: editorExtensions,
    editable,
    content: content ?? undefined,
    onUpdate: ({ editor: e }) => {
      if (suppressOnChangeRef.current) return;
      onChange?.(e.getJSON());
    },
    // Immediately apply editable changes
    editorProps: {
      attributes: {
        class: 'content-kit-editor-content prose dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3',
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false; // internal drag, let Tiptap handle
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const imageFile = Array.from(files).find((f) => f.type.startsWith('image/'));
        if (!imageFile) return false;
        event.preventDefault();
        handleImageFile(imageFile);
        return true;
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              handleImageFile(file);
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  // ---- Sync external content prop into editor -----------------------------
  useEffect(() => {
    if (!editor) return;
    if (!content) {
      // Clear editor when content is null/undefined (e.g. switching to empty locale tab)
      const currentContent = editor.getJSON();
      const isEmpty = currentContent.content?.length === 1
        && currentContent.content[0].type === 'paragraph'
        && !currentContent.content[0].content;
      if (!isEmpty) {
        suppressOnChangeRef.current = true;
        editor.commands.clearContent(false);
        suppressOnChangeRef.current = false;
      }
      return;
    }
    // Only update if the JSON differs to avoid cursor jumps
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(content);
    if (current === incoming) return;

    suppressOnChangeRef.current = true;
    editor.commands.setContent(content, false);
    suppressOnChangeRef.current = false;
  }, [editor, content]);

  // ---- Sync editable prop -------------------------------------------------
  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // ---- Image upload helpers -----------------------------------------------
  const handleImageFile = useCallback(
    async (file: File) => {
      const url = await uploadImage(file);
      if (url && editor) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
    [editor, uploadImage],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImageFile(file);
      // Reset so the same file can be selected again
      e.target.value = '';
    },
    [handleImageFile],
  );

  const handleImageUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // ---- Link modal handlers ------------------------------------------------
  const openLinkModal = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    const existingUrl = editor.getAttributes('link').href ?? '';
    setLinkModal({ isOpen: true, selectedText, existingUrl });
  }, [editor]);

  const handleInsertLink = useCallback(
    (url: string, text?: string, target?: string) => {
      if (!editor) return;

      const linkAttrs = { href: url, target: target || null };

      if (text) {
        // Replace selection or insert new text with link
        editor
          .chain()
          .focus()
          .deleteSelection()
          .insertContent({
            type: 'text',
            text,
            marks: [{ type: 'link', attrs: linkAttrs }],
          })
          .run();
      } else {
        editor.chain().focus().setLink(linkAttrs).run();
      }
    },
    [editor],
  );

  const handleRemoveLink = useCallback(() => {
    editor?.chain().focus().unsetLink().run();
  }, [editor]);

  // ---- Anchor modal handlers ----------------------------------------------
  const existingAnchors = useMemo(() => {
    if (!editor) return [];
    const anchors: string[] = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'anchor' && node.attrs.id) {
        anchors.push(node.attrs.id);
      }
      // Also check heading ids
      if (node.type.name === 'heading' && node.attrs.id) {
        anchors.push(node.attrs.id);
      }
    });
    return anchors;
  }, [editor, anchorModalOpen]); // recalculate when modal opens

  const handleInsertAnchor = useCallback(
    (anchorId: string) => {
      if (!editor) return;
      // Try using anchor extension command, otherwise insert as inline node
      try {
        editor.chain().focus().insertContent({
          type: 'anchor',
          attrs: { id: anchorId },
        }).run();
      } catch {
        // Fallback: set an id on current block
        editor.chain().focus().updateAttributes(editor.state.selection.$head.parent.type.name, { id: anchorId }).run();
      }
    },
    [editor],
  );

  // ---- Diagram modal handlers ---------------------------------------------
  const handleInsertDiagram = useCallback(
    (diagramType: string, code: string) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'diagram',
          attrs: { diagramType, code },
        })
        .run();
      setDiagramModalOpen(false);
    },
    [editor],
  );

  // ---- Special block insertion --------------------------------------------
  const handleInsertSpecialBlock = useCallback(
    (blockType: string) => {
      if (!editor) return;
      const template = getBlockTemplate(blockType, locale);
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'specialBlock',
          attrs: template,
        })
        .run();
    },
    [editor, locale],
  );

  // ---- AI modal handlers ---------------------------------------------------
  const handleOpenAIModal = useCallback(() => {
    if (!providers.llm) {
      providers.onNotify?.(t('ai.noProvider'), 'warning');
      return;
    }
    setAiModalOpen(true);
  }, [providers, t]);

  const handleApplyImport = useCallback(
    (blocks: any[], title?: string) => {
      if (!editor) return;
      editor.chain().focus().insertContent(blocks).run();
    },
    [editor],
  );

  const handleApplyCleanup = useCallback(
    (result: { blocks: any[]; changes: string[] }) => {
      if (!editor) return;
      const doc = Array.isArray(result.blocks)
        ? { type: 'doc' as const, content: result.blocks }
        : result.blocks;
      suppressOnChangeRef.current = true;
      editor.commands.setContent(doc, false);
      suppressOnChangeRef.current = false;
      onChange?.(editor.getJSON());
    },
    [editor, onChange],
  );

  const handleApplyTranslate = useCallback(
    (result: { blocks: any[]; title?: string }, mode: string, targetLang: string) => {
      if (!editor) return;
      if (mode === 'inPlace') {
        const doc = Array.isArray(result.blocks)
          ? { type: 'doc' as const, content: result.blocks }
          : result.blocks;
        suppressOnChangeRef.current = true;
        editor.commands.setContent(doc, false);
        suppressOnChangeRef.current = false;
        onChange?.(editor.getJSON());
      } else if (mode === 'crossTab' && onTranslateCrossTab) {
        onTranslateCrossTab(result, targetLang);
      }
    },
    [editor, onChange, onTranslateCrossTab],
  );

  // ---- Render -------------------------------------------------------------
  return (
    <div
      className={[
        'ck-editor content-kit-editor border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible bg-white dark:bg-gray-900',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
        tabIndex={-1}
      />

      {/* Toolbar */}
      {editable && (
        <div className={['sticky top-0 z-30', toolbarClassName].filter(Boolean).join(' ')}>
          <EditorToolbar
            editor={editor}
            onOpenSmartLinkModal={openLinkModal}
            onImageUploadClick={
              (onImageUpload || providers.imageUpload) ? handleImageUploadClick : undefined
            }
            onInsertSpecialBlock={handleInsertSpecialBlock}
            onInsertDiagram={() => setDiagramModalOpen(true)}
            onOpenAnchorModal={() => setAnchorModalOpen(true)}
            onOpenAIModal={providers.llm ? handleOpenAIModal : undefined}
            isUploading={isUploading}
          />
        </div>
      )}

      {/* Table controls -- inline bar below toolbar when cursor is in a table */}
      {editor && <TableControls editor={editor} />}

      {/* Editor content area */}
      <EditorContent editor={editor} className={editorClassName} />

      {/* ---- Modals ---- */}

      {/* Smart Link Modal */}
      <SmartLinkModal
        isOpen={linkModal.isOpen}
        onClose={() => setLinkModal(LINK_MODAL_CLOSED)}
        onInsertLink={handleInsertLink}
        onRemoveLink={linkModal.existingUrl ? handleRemoveLink : undefined}
        selectedText={linkModal.selectedText}
        existingUrl={linkModal.existingUrl}
        existingAnchors={existingAnchors}
      />

      {/* Anchor Modal */}
      <AnchorModal
        isOpen={anchorModalOpen}
        onClose={() => setAnchorModalOpen(false)}
        onInsert={handleInsertAnchor}
        existingAnchors={existingAnchors}
      />

      {/* Diagram Edit Modal */}
      <DiagramEditModal
        isOpen={diagramModalOpen}
        onClose={() => setDiagramModalOpen(false)}
        onSubmit={handleInsertDiagram}
      />

      {/* AI Import Modal */}
      <AIImportModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onApplyImport={handleApplyImport}
        onApplyCleanup={handleApplyCleanup}
        onApplyTranslate={handleApplyTranslate}
        content={editor?.getJSON() ?? null}
        locale={locale}
      />
    </div>
  );
}

export { ContentKitEditor };
export default ContentKitEditor;
