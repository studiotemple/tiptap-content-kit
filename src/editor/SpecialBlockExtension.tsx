'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useState, useCallback } from 'react';
import { IconPicker } from './IconPicker';
import { useEditorI18n } from './i18n';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpecialBlockItem {
  icon: string;
  title: string;
  description: string;
  link: string;
}

export interface SpecialBlockData {
  blockType: string;
  title: string;
  description: string;
  buttonText: string;
  link: string;
  icon: string;
  columns: number;
  items: SpecialBlockItem[];
  layout: string;
}

// ---------------------------------------------------------------------------
// Block templates
// ---------------------------------------------------------------------------

const defaultTemplates: Record<string, Record<string, Partial<SpecialBlockData>>> = {
  en: {
    'quick-start-card': {
      title: 'Quick Start',
      description: 'Get started in minutes with our simple setup guide.',
      buttonText: 'Get Started',
      icon: '🚀',
    },
    'feature-card': {
      title: 'Feature',
      description: 'Describe your feature here.',
      icon: '⚡',
    },
    'feature-grid': {
      title: 'Features',
      columns: 3,
      layout: 'grid',
      items: [
        { icon: '🚀', title: 'Fast', description: 'Lightning fast performance', link: '' },
        { icon: '🔧', title: 'Flexible', description: 'Easily customizable', link: '' },
        { icon: '🛡️', title: 'Secure', description: 'Enterprise-grade security', link: '' },
      ],
    },
    'doc-list': {
      title: 'Related Documents',
      layout: 'list',
      items: [
        { icon: '📝', title: 'Getting Started', description: '', link: '' },
        { icon: '📝', title: 'API Reference', description: '', link: '' },
      ],
    },
  },
  ko: {
    'quick-start-card': {
      title: '빠른 시작',
      description: '간단한 설정 가이드로 몇 분 만에 시작하세요.',
      buttonText: '시작하기',
      icon: '🚀',
    },
    'feature-card': {
      title: '기능',
      description: '기능을 설명하세요.',
      icon: '⚡',
    },
    'feature-grid': {
      title: '주요 기능',
      columns: 3,
      layout: 'grid',
      items: [
        { icon: '🚀', title: '빠름', description: '뛰어난 성능', link: '' },
        { icon: '🔧', title: '유연함', description: '쉬운 커스터마이징', link: '' },
        { icon: '🛡️', title: '안전함', description: '엔터프라이즈급 보안', link: '' },
      ],
    },
    'doc-list': {
      title: '관련 문서',
      layout: 'list',
      items: [
        { icon: '📝', title: '시작하기', description: '', link: '' },
        { icon: '📝', title: 'API 레퍼런스', description: '', link: '' },
      ],
    },
  },
};

export function getBlockTemplate(blockType: string, locale?: string): SpecialBlockData {
  const lang = locale && defaultTemplates[locale] ? locale : 'en';
  const template = defaultTemplates[lang][blockType] || defaultTemplates.en[blockType] || {};

  return {
    blockType,
    title: template.title || '',
    description: template.description || '',
    buttonText: template.buttonText || '',
    link: template.link || '',
    icon: template.icon || '📦',
    columns: template.columns || 2,
    items: template.items || [],
    layout: template.layout || 'grid',
  };
}

// ---------------------------------------------------------------------------
// Shared UI components
// ---------------------------------------------------------------------------

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  );
}

function DeleteButton({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${className}`}
      title="Delete"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Preview components (read-only appearance)
// ---------------------------------------------------------------------------

function QuickStartPreview({ attrs }: { attrs: SpecialBlockData }) {
  return (
    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 text-white rounded-lg p-6">
      <div className="flex items-start gap-3">
        <span className="text-3xl flex-shrink-0">{attrs.icon || '🚀'}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold mb-1">{attrs.title || 'Quick Start'}</h3>
          {attrs.description && (
            <p className="text-blue-100 text-sm mb-3">{attrs.description}</p>
          )}
          {attrs.buttonText && (
            <span className="inline-block px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-md text-sm font-medium">
              {attrs.buttonText}
              {attrs.link && ' →'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function FeatureCardPreview({ attrs }: { attrs: SpecialBlockData }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-white dark:bg-gray-800">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{attrs.icon || '⚡'}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {attrs.title || 'Feature'}
          </h3>
          {attrs.description && (
            <p className="text-gray-500 dark:text-gray-400 text-sm">{attrs.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function FeatureGridPreview({ attrs }: { attrs: SpecialBlockData }) {
  const cols = attrs.columns || 2;
  const gridCls =
    cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-2' : cols === 3 ? 'grid-cols-3' : 'grid-cols-4';

  return (
    <div>
      {attrs.title && (
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {attrs.title}
        </h3>
      )}
      <div className={`grid ${gridCls} gap-3`}>
        {(attrs.items || []).map((item, i) => (
          <div
            key={i}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
          >
            <span className="text-xl mb-2 block">{item.icon || '📦'}</span>
            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{item.title}</div>
            {item.description && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.description}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DocListPreview({ attrs }: { attrs: SpecialBlockData }) {
  return (
    <div>
      {attrs.title && (
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {attrs.title}
        </h3>
      )}
      <div className="space-y-2">
        {(attrs.items || []).map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm"
          >
            <span>{item.icon || '📝'}</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium">{item.title}</span>
            {item.link && (
              <span className="ml-auto text-gray-400 text-xs truncate max-w-[200px]">{item.link}</span>
            )}
          </div>
        ))}
        {(!attrs.items || attrs.items.length === 0) && (
          <div className="text-sm text-gray-400 dark:text-gray-500 italic px-3 py-2">
            No documents added
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit panel
// ---------------------------------------------------------------------------

function EditPanel({
  attrs,
  onUpdate,
  onDelete,
  onClose,
}: {
  attrs: SpecialBlockData;
  onUpdate: (patch: Partial<SpecialBlockData>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { t } = useEditorI18n();
  const { blockType } = attrs;
  const hasItems = blockType === 'feature-grid' || blockType === 'doc-list';

  const updateItem = (index: number, patch: Partial<SpecialBlockItem>) => {
    const items = [...(attrs.items || [])];
    items[index] = { ...items[index], ...patch };
    onUpdate({ items });
  };

  const removeItem = (index: number) => {
    const items = [...(attrs.items || [])];
    items.splice(index, 1);
    onUpdate({ items });
  };

  const addItem = () => {
    const items = [...(attrs.items || [])];
    items.push({ icon: '📦', title: '', description: '', link: '' });
    onUpdate({ items });
  };

  return (
    <div
      className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 p-4 space-y-3"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {blockType === 'quick-start-card' && t('blocks.quickStartCard')}
          {blockType === 'feature-card' && t('blocks.featureCard')}
          {blockType === 'feature-grid' && t('blocks.featureGrid')}
          {blockType === 'doc-list' && t('blocks.docList')}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {t('specialBlock.close')}
        </button>
      </div>

      {/* Icon + Title row */}
      <div className="flex items-end gap-2">
        <div>
          <FieldLabel>{t('specialBlock.icon')}</FieldLabel>
          <IconPicker value={attrs.icon} onChange={(icon) => onUpdate({ icon })} />
        </div>
        <div className="flex-1">
          <FieldLabel>{t('specialBlock.title')}</FieldLabel>
          <TextInput value={attrs.title} onChange={(title) => onUpdate({ title })} />
        </div>
      </div>

      {/* Description */}
      {(blockType === 'quick-start-card' || blockType === 'feature-card') && (
        <div>
          <FieldLabel>{t('specialBlock.description')}</FieldLabel>
          <TextInput value={attrs.description} onChange={(description) => onUpdate({ description })} />
        </div>
      )}

      {/* Button text (quick-start only) */}
      {blockType === 'quick-start-card' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>{t('specialBlock.buttonText')}</FieldLabel>
            <TextInput value={attrs.buttonText} onChange={(buttonText) => onUpdate({ buttonText })} />
          </div>
          <div>
            <FieldLabel>{t('specialBlock.link')}</FieldLabel>
            <TextInput
              value={attrs.link}
              onChange={(link) => onUpdate({ link })}
              placeholder="https://..."
            />
          </div>
        </div>
      )}

      {/* Link (feature-card) */}
      {blockType === 'feature-card' && (
        <div>
          <FieldLabel>{t('specialBlock.link')}</FieldLabel>
          <TextInput
            value={attrs.link}
            onChange={(link) => onUpdate({ link })}
            placeholder="https://..."
          />
        </div>
      )}

      {/* Columns + Layout (feature-grid) */}
      {blockType === 'feature-grid' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>{t('specialBlock.columns')}</FieldLabel>
            <select
              value={attrs.columns}
              onChange={(e) => onUpdate({ columns: Number(e.target.value) })}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>
          <div>
            <FieldLabel>{t('specialBlock.layout')}</FieldLabel>
            <select
              value={attrs.layout}
              onChange={(e) => onUpdate({ layout: e.target.value })}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="grid">{t('specialBlock.grid')}</option>
              <option value="list">{t('specialBlock.list')}</option>
            </select>
          </div>
        </div>
      )}

      {/* Items list */}
      {hasItems && (
        <div className="space-y-2">
          {(attrs.items || []).map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md"
            >
              <IconPicker value={item.icon} onChange={(icon) => updateItem(i, { icon })} />
              <div className="flex-1 space-y-1.5">
                <TextInput
                  value={item.title}
                  onChange={(title) => updateItem(i, { title })}
                  placeholder={t('specialBlock.title')}
                />
                {blockType === 'feature-grid' && (
                  <TextInput
                    value={item.description}
                    onChange={(description) => updateItem(i, { description })}
                    placeholder={t('specialBlock.description')}
                  />
                )}
                <TextInput
                  value={item.link}
                  onChange={(link) => updateItem(i, { link })}
                  placeholder={t('specialBlock.link')}
                />
              </div>
              <DeleteButton onClick={() => removeItem(i)} className="mt-1" />
            </div>
          ))}
          <button
            type="button"
            onClick={addItem}
            className="w-full py-1.5 text-sm text-blue-600 dark:text-blue-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            + {t('specialBlock.addItem')}
          </button>
        </div>
      )}

      {/* Delete block */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onDelete}
          className="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
        >
          {t('specialBlock.delete')}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NodeView component
// ---------------------------------------------------------------------------

interface SpecialBlockNodeViewProps {
  node: any;
  updateAttributes: (attrs: any) => void;
  deleteNode: () => void;
  selected: boolean;
  editor: any;
}

function SpecialBlockNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: SpecialBlockNodeViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const isEditable = editor?.isEditable;

  const attrs: SpecialBlockData = {
    blockType: node.attrs.blockType || 'quick-start-card',
    title: node.attrs.title || '',
    description: node.attrs.description || '',
    buttonText: node.attrs.buttonText || '',
    link: node.attrs.link || '',
    icon: node.attrs.icon || '',
    columns: node.attrs.columns || 2,
    items: parseItems(node.attrs.items),
    layout: node.attrs.layout || 'grid',
  };

  const handleClick = useCallback(() => {
    if (isEditable) setIsEditing((prev) => !prev);
  }, [isEditable]);

  const handleUpdate = useCallback(
    (patch: Partial<SpecialBlockData>) => {
      const updates: Record<string, any> = { ...patch };
      if (patch.items) {
        updates.items = JSON.stringify(patch.items);
      }
      updateAttributes(updates);
    },
    [updateAttributes],
  );

  const handleDelete = useCallback(() => {
    deleteNode();
  }, [deleteNode]);

  const handleClose = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Render preview based on block type
  const renderPreview = () => {
    switch (attrs.blockType) {
      case 'quick-start-card':
        return <QuickStartPreview attrs={attrs} />;
      case 'feature-card':
        return <FeatureCardPreview attrs={attrs} />;
      case 'feature-grid':
        return attrs.layout === 'list' ? (
          <DocListPreview attrs={attrs} />
        ) : (
          <FeatureGridPreview attrs={attrs} />
        );
      case 'doc-list':
        return <DocListPreview attrs={attrs} />;
      default:
        return <FeatureCardPreview attrs={attrs} />;
    }
  };

  return (
    <NodeViewWrapper className="relative my-4">
      <div
        className={`relative group ${selected ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg' : ''}`}
      >
        {/* Preview */}
        <div
          onClick={handleClick}
          className={isEditable ? 'cursor-pointer' : ''}
          contentEditable={false}
        >
          {renderPreview()}
        </div>

        {/* Hover delete button */}
        {isEditable && !isEditing && (
          <DeleteButton
            onClick={() => handleDelete()}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 shadow-sm"
          />
        )}

        {/* Edit panel */}
        {isEditable && isEditing && (
          <div contentEditable={false}>
            <EditPanel
              attrs={attrs}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onClose={handleClose}
            />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseItems(raw: any): SpecialBlockItem[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* ignore */
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// Tiptap Extension
// ---------------------------------------------------------------------------

export const SpecialBlockExtension = Node.create({
  name: 'specialBlock',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      blockType: {
        default: 'quick-start-card',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-block-type') || 'quick-start-card',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-block-type': attributes.blockType,
        }),
      },
      title: {
        default: '',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-title') || '',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-title': attributes.title,
        }),
      },
      description: {
        default: '',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-description') || '',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-description': attributes.description,
        }),
      },
      buttonText: {
        default: '',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-button-text') || '',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-button-text': attributes.buttonText,
        }),
      },
      link: {
        default: '',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-link') || '',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-link': attributes.link,
        }),
      },
      icon: {
        default: '',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-icon') || '',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-icon': attributes.icon,
        }),
      },
      columns: {
        default: 2,
        parseHTML: (el: HTMLElement) => Number(el.getAttribute('data-columns')) || 2,
        renderHTML: (attributes: Record<string, any>) => ({
          'data-columns': String(attributes.columns),
        }),
      },
      items: {
        default: '[]',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-items') || '[]',
        renderHTML: (attributes: Record<string, any>) => {
          const val = typeof attributes.items === 'string' ? attributes.items : JSON.stringify(attributes.items || []);
          return { 'data-items': val };
        },
      },
      layout: {
        default: 'grid',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-layout') || 'grid',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-layout': attributes.layout,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-special-block]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-special-block': '' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SpecialBlockNodeView);
  },

  addCommands() {
    return {
      insertSpecialBlock:
        (attrs: Partial<SpecialBlockData>) =>
        ({ commands }: { commands: any }) => {
          const template = getBlockTemplate(attrs.blockType || 'quick-start-card');
          const merged = { ...template, ...attrs };
          return commands.insertContent({
            type: this.name,
            attrs: {
              ...merged,
              items: typeof merged.items === 'string' ? merged.items : JSON.stringify(merged.items),
            },
          });
        },
    } as any;
  },
});
