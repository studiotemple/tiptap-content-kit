import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { defineComponent, h, ref, watch } from 'vue';

const DiagramNodeView = defineComponent({
  name: 'DiagramNodeView',
  props: nodeViewProps,
  setup(props) {
    const svgHtml = ref('');
    const error = ref('');
    const loading = ref(true);
    const containerRef = ref<HTMLDivElement | null>(null);

    const isEditable = () => props.editor?.isEditable;

    const renderMermaid = async (source: string) => {
      if (!source.trim()) {
        svgHtml.value = '';
        error.value = '';
        loading.value = false;
        return;
      }

      try {
        loading.value = true;
        const mermaid = (await import('mermaid')).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'strict',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        });

        const uniqueId = `mermaid-editor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const { svg } = await mermaid.render(uniqueId, source.trim());
        svgHtml.value = svg;
        error.value = '';
      } catch (err) {
        console.error('[DiagramExtension] Mermaid render error:', err);
        error.value = (err as Error).message || 'Mermaid render failed';
        svgHtml.value = '';
      } finally {
        loading.value = false;
      }
    };

    watch(
      () => [props.node.attrs.code, props.node.attrs.diagramType],
      ([code, diagramType]) => {
        if (diagramType === 'mermaid') {
          renderMermaid(code as string);
        } else {
          loading.value = false;
        }
      },
      { immediate: true },
    );

    const handleEdit = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const editor = props.editor;
      if (!editor) return;

      editor.storage.diagramEdit = {
        pos: props.getPos(),
        attrs: props.node.attrs,
      };
      editor.commands.focus();
    };

    const handleDelete = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      props.deleteNode();
    };

    const handleDoubleClick = () => {
      if (!isEditable() || !props.editor) return;
      props.editor.storage.diagramEdit = {
        pos: props.getPos(),
        attrs: props.node.attrs,
      };
      props.editor.commands.focus();
    };

    const renderPreview = () => {
      const { diagramType = 'mermaid', code = '' } = props.node.attrs;

      // PlantUML placeholder
      if (diagramType === 'plantuml') {
        return h('div', { class: 'flex items-center justify-center p-8 bg-gray-50 text-gray-400 text-sm' }, [
          'PlantUML preview is not yet supported.',
        ]);
      }

      // Empty code
      if (!code.trim()) {
        return h('div', { class: 'flex items-center justify-center p-8 bg-gray-50 text-gray-400 text-sm' }, [
          'Enter diagram code',
        ]);
      }

      // Loading
      if (loading.value) {
        return h('div', { class: 'p-4 bg-gray-50 animate-pulse' }, [
          h('div', { class: 'h-32 bg-gray-200 rounded' }),
        ]);
      }

      // Error fallback
      if (error.value) {
        return h('div', { class: 'p-4' }, [
          h('div', { class: 'text-sm text-red-600 mb-2' }, [`Mermaid render error: ${error.value}`]),
          h('pre', { class: 'p-3 bg-gray-900 text-gray-100 rounded text-sm font-mono overflow-x-auto' }, [
            h('code', {}, [code]),
          ]),
        ]);
      }

      // SVG preview
      return h('div', {
        ref: containerRef,
        class: 'p-4 flex justify-center bg-white overflow-x-auto',
        innerHTML: svgHtml.value,
      });
    };

    return () => {
      const { diagramType = 'mermaid' } = props.node.attrs;

      return h(NodeViewWrapper, { class: 'relative my-4' }, () => [
        h(
          'div',
          {
            class: `relative border border-gray-200 rounded-lg overflow-hidden ${
              props.selected ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg' : ''
            }`,
            onDblclick: handleDoubleClick,
            style: isEditable() ? { pointerEvents: 'auto' } : undefined,
          },
          [
            // Diagram type label
            h('div', { class: 'flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-xs text-gray-500' }, [
              h(
                'svg',
                { class: 'w-3.5 h-3.5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                [
                  h('path', {
                    'stroke-linecap': 'round',
                    'stroke-linejoin': 'round',
                    'stroke-width': '2',
                    d: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
                  }),
                ],
              ),
              diagramType === 'mermaid' ? 'Mermaid Diagram' : 'PlantUML Diagram',
            ]),

            // Preview area
            renderPreview(),

            // Control buttons
            isEditable()
              ? h('div', { class: 'absolute top-2 right-2 flex items-center gap-1 z-10' }, [
                  // Edit button
                  h(
                    'button',
                    {
                      onClick: handleEdit,
                      class: 'w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors',
                      title: 'Edit diagram',
                    },
                    [
                      h('svg', { class: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
                        h('path', {
                          'stroke-linecap': 'round',
                          'stroke-linejoin': 'round',
                          'stroke-width': '2',
                          d: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
                        }),
                      ]),
                    ],
                  ),
                  // Delete button
                  h(
                    'button',
                    {
                      onClick: handleDelete,
                      class: 'w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors',
                      title: 'Delete diagram',
                    },
                    [
                      h('svg', { class: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
                        h('path', {
                          'stroke-linecap': 'round',
                          'stroke-linejoin': 'round',
                          'stroke-width': '2',
                          d: 'M6 18L18 6M6 6l12 12',
                        }),
                      ]),
                    ],
                  ),
                ])
              : null,
          ],
        ),
      ]);
    };
  },
});

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
    return VueNodeViewRenderer(DiagramNodeView as any);
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
