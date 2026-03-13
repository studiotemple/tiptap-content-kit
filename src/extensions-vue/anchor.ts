import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { defineComponent, h, computed } from 'vue';

const AnchorNodeView = defineComponent({
  name: 'AnchorNodeView',
  props: nodeViewProps,
  setup(props) {
    const anchorId = computed(() => props.node.attrs.anchorId || '');

    return () =>
      h(
        NodeViewWrapper,
        { as: 'span', class: 'inline' },
        () =>
          h(
            'span',
            {
              contenteditable: false,
              class: [
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono',
                'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
                'border border-amber-300 dark:border-amber-700',
                props.selected ? 'ring-2 ring-blue-500' : '',
                'group cursor-default select-none',
              ].join(' '),
              title: `Anchor: #${anchorId.value}`,
            },
            [
              h(
                'svg',
                {
                  class: 'w-3 h-3 flex-shrink-0',
                  viewBox: '0 0 24 24',
                  fill: 'none',
                  stroke: 'currentColor',
                  'stroke-width': '2',
                  'stroke-linecap': 'round',
                  'stroke-linejoin': 'round',
                },
                [
                  h('circle', { cx: '12', cy: '5', r: '3' }),
                  h('line', { x1: '12', y1: '8', x2: '12', y2: '22' }),
                  h('path', { d: 'M5 12H2a10 10 0 0 0 20 0h-3' }),
                ],
              ),
              h('span', {}, `#${anchorId.value}`),
              h(
                'button',
                {
                  type: 'button',
                  onClick: () => props.deleteNode(),
                  contenteditable: false,
                  class:
                    'opacity-0 group-hover:opacity-100 ml-0.5 text-amber-500 hover:text-red-500 transition-opacity',
                  title: 'Remove anchor',
                },
                [
                  h(
                    'svg',
                    {
                      class: 'w-3 h-3',
                      fill: 'none',
                      stroke: 'currentColor',
                      viewBox: '0 0 24 24',
                      'stroke-width': '2',
                      'stroke-linecap': 'round',
                      'stroke-linejoin': 'round',
                    },
                    [h('path', { d: 'M6 18L18 6M6 6l12 12' })],
                  ),
                ],
              ),
            ],
          ),
      );
  },
});

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
    return [{ tag: 'span[data-anchor-point]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-anchor-point': '' }), 0];
  },

  addNodeView() {
    return VueNodeViewRenderer(AnchorNodeView as any);
  },
});
