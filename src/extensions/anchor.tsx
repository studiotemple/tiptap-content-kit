'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';

function AnchorNodeView({ node, deleteNode, selected }: NodeViewProps) {
  const anchorId = node.attrs.anchorId || '';

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        contentEditable={false}
        className={`
          inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono
          bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300
          border border-amber-300 dark:border-amber-700
          ${selected ? 'ring-2 ring-blue-500' : ''}
          group cursor-default select-none
        `}
        title={`Anchor: #${anchorId}`}
      >
        <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="3" />
          <line x1="12" y1="8" x2="12" y2="22" />
          <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
        </svg>
        <span>#{anchorId}</span>
        <button
          type="button"
          onClick={deleteNode}
          contentEditable={false}
          className="opacity-0 group-hover:opacity-100 ml-0.5 text-amber-500 hover:text-red-500 transition-opacity"
          title="Remove anchor"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </span>
    </NodeViewWrapper>
  );
}

export const AnchorExtension = Node.create({
  name: 'anchorPoint',

  group: 'inline',

  inline: true,

  atom: true,

  selectable: true,

  draggable: true,

  addAttributes() {
    return {
      anchorId: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-anchor-id') || '',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-anchor-id': attributes.anchorId,
          id: attributes.anchorId,
        }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'span[data-anchor-point]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-anchor-point': '' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AnchorNodeView);
  },
});
