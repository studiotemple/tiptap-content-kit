'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useEffect, useState, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// DiagramNodeView Component
// ---------------------------------------------------------------------------

interface DiagramNodeViewProps {
  node: any;
  updateAttributes: (attrs: any) => void;
  deleteNode: () => void;
  selected: boolean;
  editor: any;
  getPos: () => number | undefined;
}

function DiagramNodeView({
  node,
  deleteNode,
  selected,
  editor,
  getPos,
}: DiagramNodeViewProps) {
  const { diagramType = 'mermaid', code = '' } = node.attrs;
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const isEditable = editor?.isEditable;

  // ---- Mermaid rendering ---------------------------------------------------

  const renderMermaid = useCallback(async (source: string) => {
    if (!source.trim()) {
      setSvgHtml('');
      setError('');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const mermaid = (await import('mermaid')).default;

      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'strict',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      });

      const uniqueId = `mermaid-editor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const { svg } = await mermaid.render(uniqueId, source.trim());
      setSvgHtml(svg);
      setError('');
    } catch (err) {
      console.error('[DiagramExtension] Mermaid render error:', err);
      setError((err as Error).message || 'Mermaid render failed');
      setSvgHtml('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (diagramType === 'mermaid') {
      renderMermaid(code);
    } else {
      setLoading(false);
    }
  }, [code, diagramType, renderMermaid]);

  // ---- Event handlers ------------------------------------------------------

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!editor) return;

      // Store edit intent — parent editor watches this to open the modal
      editor.storage.diagramEdit = {
        pos: getPos(),
        attrs: node.attrs,
      };
      editor.commands.focus();
    },
    [editor, getPos, node.attrs],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      deleteNode();
    },
    [deleteNode],
  );

  const handleDoubleClick = useCallback(() => {
    if (!isEditable || !editor) return;
    editor.storage.diagramEdit = {
      pos: getPos(),
      attrs: node.attrs,
    };
    editor.commands.focus();
  }, [isEditable, editor, getPos, node.attrs]);

  // ---- Render --------------------------------------------------------------

  const renderPreview = () => {
    // PlantUML placeholder
    if (diagramType === 'plantuml') {
      return (
        <div className="flex items-center justify-center p-8 bg-gray-50 text-gray-400 text-sm">
          PlantUML preview is not yet supported.
        </div>
      );
    }

    // Empty code
    if (!code.trim()) {
      return (
        <div className="flex items-center justify-center p-8 bg-gray-50 text-gray-400 text-sm">
          Enter diagram code
        </div>
      );
    }

    // Loading
    if (loading) {
      return (
        <div className="p-4 bg-gray-50 animate-pulse">
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      );
    }

    // Error fallback
    if (error) {
      return (
        <div className="p-4">
          <div className="text-sm text-red-600 mb-2">
            Mermaid render error: {error}
          </div>
          <pre className="p-3 bg-gray-900 text-gray-100 rounded text-sm font-mono overflow-x-auto">
            <code>{code}</code>
          </pre>
        </div>
      );
    }

    // SVG preview
    return (
      <div
        ref={containerRef}
        className="p-4 flex justify-center bg-white overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: svgHtml }}
      />
    );
  };

  return (
    <NodeViewWrapper className="relative my-4">
      <div
        className={`relative border border-gray-200 rounded-lg overflow-hidden ${
          selected ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg' : ''
        }`}
        onDoubleClick={handleDoubleClick}
        style={{ pointerEvents: isEditable ? 'auto' : undefined }}
      >
        {/* Diagram type label */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
            />
          </svg>
          {diagramType === 'mermaid' ? 'Mermaid Diagram' : 'PlantUML Diagram'}
        </div>

        {/* Preview area */}
        {renderPreview()}

        {/* Control buttons — edit & delete (editable mode only) */}
        {isEditable && (
          <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
            {/* Edit button */}
            <button
              onClick={handleEdit}
              className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
              title="Edit diagram"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>

            {/* Delete button */}
            <button
              onClick={handleDelete}
              className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
              title="Delete diagram"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// ---------------------------------------------------------------------------
// DiagramExtension — Tiptap Node Extension
// ---------------------------------------------------------------------------

export const DiagramExtension = Node.create({
  name: 'diagramBlock',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      diagramType: {
        default: 'mermaid',
      },
      code: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-diagram-block]',
        getAttrs: (element: HTMLElement | string) => {
          if (typeof element === 'string') return false;
          const diagramType =
            element.getAttribute('data-diagram-type') || 'mermaid';
          // Code may be stored in a nested <pre><code> or as a data attribute
          const codeEl = element.querySelector('pre > code');
          const code = codeEl
            ? codeEl.textContent || ''
            : element.getAttribute('data-diagram-code') || '';
          return { diagramType, code };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { diagramType, code } = HTMLAttributes;
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-diagram-block': '',
        'data-diagram-type': diagramType,
      }),
      ['pre', {}, ['code', {}, code]],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DiagramNodeView);
  },

  addCommands() {
    return {
      insertDiagram:
        (attrs: { diagramType?: string; code: string }) =>
        ({ commands }: { commands: any }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              diagramType: attrs.diagramType || 'mermaid',
              code: attrs.code,
            },
          });
        },
    } as any;
  },
});
