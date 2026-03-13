'use client';

import { useCallback, useState, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { useEditorI18n } from './i18n';
import { Tooltip } from './Tooltip';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  CodeIcon,
  HeadingIcon,
  BulletListIcon,
  OrderedListIcon,
  CodeBlockIcon,
  QuoteIcon,
  LinkIcon,
  DocumentLinkIcon,
  ImageIcon,
  ChevronDownIcon,
  UndoIcon,
  RedoIcon,
  BlocksIcon,
  RocketIcon,
  PackageIcon,
  LayoutGridIcon,
  FileListIcon,
  SparklesIcon,
  DividerIcon,
  TableIcon,
  AnchorIcon,
  DiagramIcon,
} from './EditorIcons';

export interface EditorToolbarProps {
  editor: Editor | null;
  onOpenSmartLinkModal?: () => void;
  onOpenDocLinkModal?: () => void;
  onImageUploadClick?: () => void;
  onInsertSpecialBlock?: (blockType: string) => void;
  onInsertDiagram?: () => void;
  onOpenAnchorModal?: () => void;
  onOpenAIModal?: () => void;
  isUploading?: boolean;
}

// Toolbar button component
interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <Tooltip content={title}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`
          p-2 rounded-md transition-colors duration-150
          ${isActive
            ? 'bg-gray-200 dark:bg-gray-700 text-blue-600 dark:text-blue-400'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }
          ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
        `}
      >
        {children}
      </button>
    </Tooltip>
  );
}

// Toolbar divider
function ToolbarDivider() {
  return <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />;
}

// Dropdown component
interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  alignRight?: boolean;
}

function Dropdown({ trigger, children, isOpen, onToggle, alignRight }: DropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 px-2 py-1.5 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {trigger}
        <ChevronDownIcon className="w-3 h-3" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onToggle} />
          <div className={`absolute top-full ${alignRight ? 'right-0' : 'left-0'} mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1 min-w-[160px] max-h-[70vh] overflow-y-auto`}>
            {children}
          </div>
        </>
      )}
    </div>
  );
}

// Dropdown item
interface DropdownItemProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

function DropdownItem({ onClick, isActive, disabled, children }: DropdownItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full px-3 py-1.5 text-left text-sm transition-colors
        ${isActive
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
      `}
    >
      {children}
    </button>
  );
}

export default function EditorToolbar({
  editor,
  onOpenSmartLinkModal,
  onOpenDocLinkModal,
  onImageUploadClick,
  onInsertSpecialBlock,
  onInsertDiagram,
  onOpenAnchorModal,
  onOpenAIModal,
  isUploading,
}: EditorToolbarProps) {
  const { t } = useEditorI18n();
  const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
  const [showBlocksDropdown, setShowBlocksDropdown] = useState(false);

  const toggleHeading = useCallback((level: 1 | 2 | 3 | 4) => {
    editor?.chain().focus().toggleHeading({ level }).run();
    setShowHeadingDropdown(false);
  }, [editor]);

  const getHeadingLabel = () => {
    if (editor?.isActive('heading', { level: 1 })) return 'H1';
    if (editor?.isActive('heading', { level: 2 })) return 'H2';
    if (editor?.isActive('heading', { level: 3 })) return 'H3';
    if (editor?.isActive('heading', { level: 4 })) return 'H4';
    return <HeadingIcon className="w-4 h-4" />;
  };

  if (!editor) return null;

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-wrap">
      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title={`${t('toolbar.undo')} (Ctrl+Z)`}
      >
        <UndoIcon />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title={`${t('toolbar.redo')} (Ctrl+Y)`}
      >
        <RedoIcon />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Heading Dropdown */}
      <Dropdown
        trigger={<span className="text-sm font-medium min-w-[24px] text-center">{getHeadingLabel()}</span>}
        isOpen={showHeadingDropdown}
        onToggle={() => setShowHeadingDropdown(!showHeadingDropdown)}
      >
        <DropdownItem
          onClick={() => { editor.chain().focus().setParagraph().run(); setShowHeadingDropdown(false); }}
          isActive={editor.isActive('paragraph') && !editor.isActive('heading')}
        >
          {t('toolbar.paragraph')}
        </DropdownItem>
        <DropdownItem
          onClick={() => toggleHeading(1)}
          isActive={editor.isActive('heading', { level: 1 })}
        >
          <span className="text-lg font-bold">{t('toolbar.heading1')}</span>
        </DropdownItem>
        <DropdownItem
          onClick={() => toggleHeading(2)}
          isActive={editor.isActive('heading', { level: 2 })}
        >
          <span className="text-base font-bold">{t('toolbar.heading2')}</span>
        </DropdownItem>
        <DropdownItem
          onClick={() => toggleHeading(3)}
          isActive={editor.isActive('heading', { level: 3 })}
        >
          <span className="text-sm font-bold">{t('toolbar.heading3')}</span>
        </DropdownItem>
        <DropdownItem
          onClick={() => toggleHeading(4)}
          isActive={editor.isActive('heading', { level: 4 })}
        >
          <span className="text-xs font-semibold">{t('toolbar.heading4')}</span>
        </DropdownItem>
      </Dropdown>

      <ToolbarDivider />

      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title={`${t('toolbar.bold')} (Ctrl+B)`}
      >
        <BoldIcon />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title={`${t('toolbar.italic')} (Ctrl+I)`}
      >
        <ItalicIcon />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title={t('toolbar.strikethrough')}
      >
        <StrikethroughIcon />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title={`${t('toolbar.underline')} (Ctrl+U)`}
      >
        <UnderlineIcon />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title={t('toolbar.code')}
      >
        <CodeIcon />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Text Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        title={t('toolbar.alignLeft')}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M3 6h18M3 12h12M3 18h18" /></svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        title={t('toolbar.alignCenter')}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M3 6h18M6 12h12M3 18h18" /></svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        title={t('toolbar.alignRight')}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M3 6h18M9 12h12M3 18h18" /></svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title={t('toolbar.bulletList')}
      >
        <BulletListIcon />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title={t('toolbar.orderedList')}
      >
        <OrderedListIcon />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Blocks */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        title={t('toolbar.codeBlock')}
      >
        <CodeBlockIcon />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title={t('toolbar.blockquote')}
      >
        <QuoteIcon />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title={t('toolbar.divider')}
      >
        <DividerIcon />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Links */}
      {onOpenSmartLinkModal && (
        <ToolbarButton
          onClick={onOpenSmartLinkModal}
          isActive={editor.isActive('link')}
          title={t('toolbar.link')}
        >
          <LinkIcon />
        </ToolbarButton>
      )}
      {onOpenDocLinkModal && (
        <ToolbarButton
          onClick={onOpenDocLinkModal}
          title={t('toolbar.documentLink')}
        >
          <DocumentLinkIcon />
        </ToolbarButton>
      )}
      {onOpenAnchorModal && (
        <ToolbarButton
          onClick={onOpenAnchorModal}
          title={t('toolbar.anchor')}
        >
          <AnchorIcon />
        </ToolbarButton>
      )}

      {(onOpenSmartLinkModal || onOpenDocLinkModal || onOpenAnchorModal) && <ToolbarDivider />}

      {/* Image */}
      {onImageUploadClick && (
        <>
          <ToolbarButton
            onClick={onImageUploadClick}
            disabled={isUploading}
            title={t('toolbar.image')}
          >
            {isUploading ? (
              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ImageIcon />
            )}
          </ToolbarButton>
          <ToolbarDivider />
        </>
      )}

      {/* Special Blocks Dropdown */}
      {onInsertSpecialBlock && (
        <Dropdown
          trigger={
            <span className="flex items-center gap-1 text-sm font-medium">
              <BlocksIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{t('toolbar.blocks')}</span>
            </span>
          }
          isOpen={showBlocksDropdown}
          onToggle={() => setShowBlocksDropdown(!showBlocksDropdown)}
        >
          <DropdownItem onClick={() => { onInsertSpecialBlock('quick-start-card'); setShowBlocksDropdown(false); }}>
            <span className="flex items-center gap-2">
              <RocketIcon className="w-4 h-4" />
              <span>{t('blocks.quickStartCard')}</span>
            </span>
          </DropdownItem>
          <DropdownItem onClick={() => { onInsertSpecialBlock('feature-card'); setShowBlocksDropdown(false); }}>
            <span className="flex items-center gap-2">
              <PackageIcon className="w-4 h-4" />
              <span>{t('blocks.featureCard')}</span>
            </span>
          </DropdownItem>
          <DropdownItem onClick={() => { onInsertSpecialBlock('feature-grid'); setShowBlocksDropdown(false); }}>
            <span className="flex items-center gap-2">
              <LayoutGridIcon className="w-4 h-4" />
              <span>{t('blocks.featureGrid')}</span>
            </span>
          </DropdownItem>
          <DropdownItem onClick={() => { onInsertSpecialBlock('doc-list'); setShowBlocksDropdown(false); }}>
            <span className="flex items-center gap-2">
              <FileListIcon className="w-4 h-4" />
              <span>{t('blocks.docList')}</span>
            </span>
          </DropdownItem>
          {onInsertDiagram && (
            <DropdownItem onClick={() => { onInsertDiagram(); setShowBlocksDropdown(false); }}>
              <span className="flex items-center gap-2">
                <DiagramIcon className="w-4 h-4" />
                <span>{t('blocks.diagram')}</span>
              </span>
            </DropdownItem>
          )}
          <DropdownItem onClick={() => {
            editor.chain().focus().insertContent({
              type: 'codeBlockTabs',
              attrs: {
                tabs: [
                  { label: 'JavaScript', language: 'javascript', content: '' },
                  { label: 'Python', language: 'python', content: '' },
                ],
                groupId: 'default',
              },
            }).run();
            setShowBlocksDropdown(false);
          }}>
            <span className="flex items-center gap-2">
              <CodeBlockIcon className="w-4 h-4" />
              <span>{t('blocks.tabbedCode')}</span>
            </span>
          </DropdownItem>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          <DropdownItem onClick={() => { editor.chain().focus().insertContent({ type: 'callout', attrs: { variant: 'info' }, content: [{ type: 'paragraph' }] }).run(); setShowBlocksDropdown(false); }}>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 flex items-center justify-center text-xs">{'\u2139\uFE0F'}</span>
              <span>{`${t('toolbar.blocks')} (${t('callout.info')})`}</span>
            </span>
          </DropdownItem>
          <DropdownItem onClick={() => { editor.chain().focus().insertContent({ type: 'callout', attrs: { variant: 'warning' }, content: [{ type: 'paragraph' }] }).run(); setShowBlocksDropdown(false); }}>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 flex items-center justify-center text-xs">{'\u26A0\uFE0F'}</span>
              <span>{`${t('toolbar.blocks')} (${t('callout.warning')})`}</span>
            </span>
          </DropdownItem>
          <DropdownItem onClick={() => { editor.chain().focus().insertContent({ type: 'callout', attrs: { variant: 'tip' }, content: [{ type: 'paragraph' }] }).run(); setShowBlocksDropdown(false); }}>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 flex items-center justify-center text-xs">{'\uD83D\uDCA1'}</span>
              <span>{`${t('toolbar.blocks')} (${t('callout.tip')})`}</span>
            </span>
          </DropdownItem>
          <DropdownItem onClick={() => { editor.chain().focus().insertContent({ type: 'callout', attrs: { variant: 'error' }, content: [{ type: 'paragraph' }] }).run(); setShowBlocksDropdown(false); }}>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 flex items-center justify-center text-xs">{'\uD83D\uDEAB'}</span>
              <span>{`${t('toolbar.blocks')} (${t('callout.error')})`}</span>
            </span>
          </DropdownItem>
        </Dropdown>
      )}

      {/* Table */}
      <ToolbarButton
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        isActive={editor.isActive('table')}
        title={t('table.insertTable')}
      >
        <TableIcon className="w-4 h-4" />
      </ToolbarButton>

      {/* AI Button */}
      {onOpenAIModal && (
        <>
          <ToolbarDivider />
          <ToolbarButton
            onClick={onOpenAIModal}
            title={t('toolbar.ai')}
          >
            <span className="flex items-center gap-1">
              <SparklesIcon className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-medium">AI</span>
            </span>
          </ToolbarButton>
        </>
      )}
    </div>
  );
}
