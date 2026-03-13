import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { defineComponent, h, ref, onMounted, onUnmounted } from 'vue';

/**
 * Inject a height-reporting script into HTML content for sandboxed iframes.
 * Uses postMessage since contentDocument is inaccessible in sandbox="allow-scripts".
 */
function injectHeightReporter(html: string): string {
  const script = `<script>
(function() {
  function reportHeight() {
    var body = document.body;
    var docEl = document.documentElement;
    var h = Math.max(
      body ? body.scrollHeight : 0,
      docEl ? docEl.scrollHeight : 0
    );
    if (body) {
      var children = body.children;
      for (var i = 0; i < children.length; i++) {
        var ch = children[i].scrollHeight || children[i].offsetHeight || 0;
        if (ch > h) h = ch;
      }
    }
    if (h > 0) {
      parent.postMessage({ type: 'content-kit-embed-resize', height: h }, '*');
    }
  }
  if (document.readyState === 'complete') {
    reportHeight();
  } else {
    window.addEventListener('load', reportHeight);
  }
  window.addEventListener('resize', reportHeight);
  if (typeof MutationObserver !== 'undefined' && document.body) {
    new MutationObserver(reportHeight).observe(document.body, {
      childList: true, subtree: true, attributes: true
    });
  }
  setTimeout(reportHeight, 300);
  setTimeout(reportHeight, 1000);
  setTimeout(reportHeight, 3000);
})();
</script>`;

  if (html.includes('</body>')) {
    return html.replace('</body>', script + '</body>');
  }
  return html + script;
}

const HtmlEmbedNodeComponent = defineComponent({
  name: 'HtmlEmbedNodeComponent',
  props: nodeViewProps,
  setup(props) {
    const iframeRef = ref<HTMLIFrameElement | null>(null);
    const iframeHeight = ref(500);
    const isCollapsed = ref(false);

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'content-kit-embed-resize' && typeof event.data.height === 'number') {
        if (iframeRef.value && event.source === iframeRef.value.contentWindow) {
          iframeHeight.value = Math.min(Math.max(100, event.data.height + 32), 2000);
        }
      }
    };

    onMounted(() => {
      window.addEventListener('message', handleMessage);
    });

    onUnmounted(() => {
      window.removeEventListener('message', handleMessage);
    });

    const handleDelete = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      props.deleteNode();
    };

    return () => {
      const { htmlContent, fallbackText } = props.node.attrs;
      const isEditable = props.editor?.isEditable;
      const srcdocHtml = htmlContent ? injectHeightReporter(htmlContent) : '';

      if (!htmlContent) {
        return h(NodeViewWrapper, { class: 'my-4' }, () => [
          h('div', { class: 'p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg' }, [
            h('p', { class: 'text-gray-500 dark:text-gray-400 text-sm' }, [
              fallbackText || '[HTML content is empty]',
            ]),
          ]),
        ]);
      }

      return h(NodeViewWrapper, { class: 'my-4' }, () => [
        h(
          'div',
          {
            class: `relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${
              props.selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
            }`,
          },
          [
            // Header
            h('div', { class: 'flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700' }, [
              h('span', { class: 'flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400' }, [
                h(
                  'svg',
                  { class: 'w-3.5 h-3.5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', 'stroke-width': '2' },
                  [h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' })],
                ),
                'HTML EMBED',
              ]),
              h('div', { class: 'flex items-center gap-1' }, [
                h(
                  'button',
                  {
                    onClick: () => { isCollapsed.value = !isCollapsed.value; },
                    class: 'text-xs px-2 py-0.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors',
                  },
                  [isCollapsed.value ? 'Expand' : 'Collapse'],
                ),
                isEditable
                  ? h(
                      'button',
                      {
                        onClick: handleDelete,
                        class: 'w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-sm transition-colors',
                        title: 'Delete HTML block',
                      },
                      [
                        h('svg', { class: 'w-3 h-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
                          h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M6 18L18 6M6 6l12 12' }),
                        ]),
                      ],
                    )
                  : null,
              ]),
            ]),

            // iframe preview
            !isCollapsed.value
              ? h('div', { style: { pointerEvents: 'none' } }, [
                  h('iframe', {
                    ref: iframeRef,
                    srcdoc: srcdocHtml,
                    sandbox: 'allow-scripts',
                    title: 'Embedded HTML content',
                    class: 'w-full border-0',
                    style: { height: `${iframeHeight.value}px` },
                  }),
                ])
              : null,
          ],
        ),
      ]);
    };
  },
});

export const HtmlEmbedExtension = Node.create({
  name: 'htmlEmbed',

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
      htmlContent: {
        default: '',
      },
      fallbackText: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-html-embed]',
        getAttrs: (element: HTMLElement | string) => {
          if (typeof element === 'string') return false;
          return {
            htmlContent: element.getAttribute('data-html-content') || '',
            fallbackText: element.getAttribute('data-fallback-text') || '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-html-embed': '',
        'data-html-content': HTMLAttributes.htmlContent || '',
        'data-fallback-text': HTMLAttributes.fallbackText || '',
      }),
      HTMLAttributes.fallbackText || '[HTML Embed]',
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(HtmlEmbedNodeComponent as any);
  },
});
