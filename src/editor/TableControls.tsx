'use client';

import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useEditorState } from '@tiptap/react';
import { useEditorI18n } from './i18n';
import {
  RowPlusIcon,
  ColPlusIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  MergeCellsIcon,
  SplitCellIcon,
  PaletteIcon,
  TrashIcon,
} from './EditorIcons';

export interface TableControlsProps {
  editor: Editor;
}

const CELL_COLORS = [
  { value: '', label: 'None' },
  { value: '#f3f4f6', label: 'Gray' },
  { value: '#dbeafe', label: 'Blue' },
  { value: '#dcfce7', label: 'Green' },
  { value: '#fef9c3', label: 'Yellow' },
  { value: '#fee2e2', label: 'Red' },
  { value: '#f3e8ff', label: 'Purple' },
  { value: '#ffedd5', label: 'Orange' },
];

/**
 * Inline table controls -- floating toolbar that appears when
 * the cursor is inside a table cell.
 */
export default function TableControls({ editor }: TableControlsProps) {
  const { t } = useEditorI18n();
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Track merge/split disabled state + table presence via editor state
  const { canMerge, canSplit, isInTable } = useEditorState({
    editor,
    selector: ({ editor: e }: { editor: Editor }) => ({
      canMerge: e.can().mergeCells(),
      canSplit: e.can().splitCell(),
      isInTable: e.isActive('table'),
    }),
  });

  const applyBgColor = (color: string) => {
    if (editor.isActive('tableHeader')) {
      editor.chain().focus().updateAttributes('tableHeader', { backgroundColor: color || null }).run();
    } else {
      editor.chain().focus().updateAttributes('tableCell', { backgroundColor: color || null }).run();
    }
    setShowColorPicker(false);
  };

  if (!isInTable) return null;

  return (
    <div className="relative flex items-center gap-0.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 whitespace-nowrap">
        {/* ---- Row / Column ---- */}
        <Btn
          onClick={() => editor.chain().focus().addRowAfter().run()}
          title={t('table.addRowBelow')}
        >
          <RowPlusIcon />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          title={t('table.addColumnRight')}
        >
          <ColPlusIcon />
        </Btn>

        <Sep />

        {/* ---- Alignment ---- */}
        <Btn
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title={t('table.alignLeft')}
          active={editor.isActive({ textAlign: 'left' })}
        >
          <AlignLeftIcon />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title={t('table.alignCenter')}
          active={editor.isActive({ textAlign: 'center' })}
        >
          <AlignCenterIcon />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title={t('table.alignRight')}
          active={editor.isActive({ textAlign: 'right' })}
        >
          <AlignRightIcon />
        </Btn>

        <Sep />

        {/* ---- Merge / Split ---- */}
        <Btn
          onClick={() => editor.chain().focus().mergeCells().run()}
          disabled={!canMerge}
          title={t('table.mergeCells')}
        >
          <MergeCellsIcon />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().splitCell().run()}
          disabled={!canSplit}
          title={t('table.splitCell')}
        >
          <SplitCellIcon />
        </Btn>

        <Sep />

        {/* ---- Cell Background Color ---- */}
        <Btn
          onClick={() => setShowColorPicker(!showColorPicker)}
          title={t('table.cellColor')}
          active={showColorPicker}
        >
          <PaletteIcon />
        </Btn>

        {/* Color Picker Dropdown */}
        {showColorPicker && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 flex gap-1">
            {CELL_COLORS.map(({ value, label }) => (
              <button
                key={label}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyBgColor(value)}
                title={label}
                className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 hover:ring-2 hover:ring-blue-400 transition-all"
                style={{ backgroundColor: value || 'transparent' }}
              >
                {!value && (
                  <svg className="w-full h-full p-0.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M18 6L6 18" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}

        <Sep />

        {/* ---- Delete Controls ---- */}
        <Btn
          onClick={() => editor.chain().focus().deleteRow().run()}
          title={t('table.deleteRow')}
          danger
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.5} />
            <path d="M3 9h18" strokeWidth={1.5} />
            <path d="M8 6h8" strokeLinecap="round" strokeWidth={1.5} />
          </svg>
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().deleteColumn().run()}
          title={t('table.deleteColumn')}
          danger
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.5} />
            <path d="M9 3v18" strokeWidth={1.5} />
            <path d="M6 8v8" strokeLinecap="round" strokeWidth={1.5} />
          </svg>
        </Btn>

        <Sep />

        <Btn
          onClick={() => editor.chain().focus().deleteTable().run()}
          title={t('table.deleteTable')}
          danger
        >
          <TrashIcon className="w-4 h-4" />
        </Btn>
    </div>
  );
}

/* ---- Primitives ---- */

function Btn({
  onClick,
  disabled,
  title,
  danger,
  active,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  danger?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center gap-1 px-1.5 py-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        danger
          ? 'text-gray-400 dark:text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/30'
          : active
            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
            : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />;
}
