import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3';
import { defineComponent, h, computed } from 'vue';
import { CALLOUT_VARIANTS, type CalloutVariant } from '../schema/block-schema';

const calloutConfig: Record<CalloutVariant, { label: string; icon: string; bg: string; border: string; text: string }> = {
  info: {
    label: 'Info',
    icon: 'ℹ️',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
  },
  warning: {
    label: 'Warning',
    icon: '⚠️',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-800 dark:text-yellow-200',
  },
  error: {
    label: 'Danger',
    icon: '🚫',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
  },
  success: {
    label: 'Success',
    icon: '✅',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-800 dark:text-green-200',
  },
  tip: {
    label: 'Tip',
    icon: '💡',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-800 dark:text-purple-200',
  },
};

const variants: CalloutVariant[] = [...CALLOUT_VARIANTS];

const CalloutNodeView = defineComponent({
  name: 'CalloutNodeView',
  props: {
    node: { type: Object, required: true },
    updateAttributes: { type: Function, required: true },
    deleteNode: { type: Function, required: true },
  },
  setup(props) {
    const variant = computed<CalloutVariant>(() => {
      const raw = props.node.attrs.variant || 'info';
      return raw in calloutConfig ? raw : 'info';
    });

    const config = computed(() => calloutConfig[variant.value]);

    function cycleVariant() {
      const currentIndex = variants.indexOf(variant.value);
      const nextIndex = (currentIndex + 1) % variants.length;
      props.updateAttributes({ variant: variants[nextIndex] });
    }

    return () =>
      h(NodeViewWrapper, null, () =>
        h(
          'div',
          {
            class: `${config.value.bg} ${config.value.border} ${config.value.text} border rounded-lg p-4 my-3 relative group`,
          },
          [
            h('div', { class: 'flex items-start gap-3' }, [
              h(
                'button',
                {
                  type: 'button',
                  onClick: cycleVariant,
                  class: 'flex-shrink-0 text-lg cursor-pointer hover:scale-110 transition-transform select-none',
                  contenteditable: false,
                  title: `${config.value.label} (click to change)`,
                },
                config.value.icon
              ),
              h('div', { class: 'flex-1 min-w-0' }, [
                h(NodeViewContent, { class: 'callout-content' }),
              ]),
            ]),
            h(
              'button',
              {
                type: 'button',
                onClick: () => props.deleteNode(),
                contenteditable: false,
                class: 'absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1 rounded',
                title: 'Remove callout',
              },
              [
                h(
                  'svg',
                  { class: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                  [
                    h('path', {
                      'stroke-linecap': 'round',
                      'stroke-linejoin': 'round',
                      'stroke-width': 2,
                      d: 'M6 18L18 6M6 6l12 12',
                    }),
                  ]
                ),
              ]
            ),
          ]
        )
      );
  },
});

export const CalloutExtension = Node.create({
  name: 'callout',

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      variant: {
        default: 'info',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-variant') || 'info',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-variant': attributes.variant,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-callout]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '' }), 0];
  },

  extendNodeSchema() {
    return { allowGapCursor: true };
  },

  addNodeView() {
    return VueNodeViewRenderer(CalloutNodeView as any);
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }: { editor: any }) => {
        const { $from } = editor.state.selection;
        if ($from.parentOffset !== 0) return false;
        const calloutNode = $from.node(-1);
        if (calloutNode?.type.name !== this.name) return false;
        const calloutPos = $from.before(-1);
        const resolvedCalloutStart = editor.state.doc.resolve(calloutPos + 1);
        if ($from.pos === resolvedCalloutStart.pos) {
          return editor.commands.lift(this.name);
        }
        return false;
      },
    };
  },
});
