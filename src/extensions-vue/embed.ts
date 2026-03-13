import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { defineComponent, h, computed } from 'vue';

// ---------------------------------------------------------------------------
// Figma URL utilities (inlined to avoid KPP-specific dependency)
// ---------------------------------------------------------------------------

type FigmaFileType = 'design' | 'board' | 'proto' | 'slides' | 'deck';

interface FigmaUrlInfo {
  fileKey: string;
  type: FigmaFileType;
  nodeId?: string;
  fileName?: string;
}

const PATH_TYPE_MAP: Record<string, FigmaFileType> = {
  design: 'design',
  file: 'design',
  board: 'board',
  proto: 'proto',
  slides: 'slides',
  deck: 'deck',
};

function parseFigmaUrl(url: string): FigmaUrlInfo | null {
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes('figma.com')) return null;
    const segments = urlObj.pathname.split('/').filter(Boolean);
    if (segments.length < 2) return null;
    const pathType = segments[0];
    const figmaType = PATH_TYPE_MAP[pathType];
    if (!figmaType) return null;
    const fileKey = segments[1];
    if (!fileKey) return null;
    const fileName = segments[2] || undefined;
    const nodeId = urlObj.searchParams.get('node-id') || undefined;
    return { fileKey, type: figmaType, nodeId, fileName };
  } catch {
    return null;
  }
}

function buildFigmaEmbedUrl(url: string): string {
  const info = parseFigmaUrl(url);
  if (!info) {
    return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
  }
  const params = new URLSearchParams();
  params.set('embed-host', 'content-kit');
  if (info.nodeId) params.set('node-id', info.nodeId);
  return `https://embed.figma.com/${info.type}/${info.fileKey}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Delete button helper
// ---------------------------------------------------------------------------

function renderDeleteButton(onClick: (e: Event) => void, title: string) {
  return h(
    'button',
    {
      onClick,
      class:
        'absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors z-10',
      title,
    },
    [
      h(
        'svg',
        {
          class: 'w-4 h-4',
          fill: 'none',
          stroke: 'currentColor',
          viewBox: '0 0 24 24',
        },
        [
          h('path', {
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            'stroke-width': '2',
            d: 'M6 18L18 6M6 6l12 12',
          }),
        ],
      ),
    ],
  );
}

// ---------------------------------------------------------------------------
// EmbedBlock Node View
// ---------------------------------------------------------------------------

const EmbedBlockComponent = defineComponent({
  name: 'EmbedBlockComponent',
  props: nodeViewProps,
  setup(props) {
    const url = computed(() => props.node.attrs.url as string);
    const provider = computed(() => props.node.attrs.provider as string);
    const isEditable = computed(() => props.editor?.isEditable);

    function handleDelete(e: Event) {
      e.preventDefault();
      e.stopPropagation();
      props.deleteNode();
    }

    const selectedClass = computed(() =>
      props.selected ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg' : '',
    );

    return () => {
      // Empty state
      if (!url.value) {
        return h(NodeViewWrapper, { class: 'my-4' }, () =>
          h(
            'div',
            { class: 'p-4 bg-gray-50 border border-gray-200 rounded-lg' },
            [h('p', { class: 'text-gray-500 text-sm' }, '[Empty embed]')],
          ),
        );
      }

      // Figma embed: 16:9 iframe
      if (provider.value === 'figma' || url.value.includes('figma.com')) {
        const embedUrl = buildFigmaEmbedUrl(url.value);
        return h(NodeViewWrapper, { class: 'relative my-4' }, () =>
          h('div', { class: `relative ${selectedClass.value}` }, [
            h(
              'div',
              {
                class: 'relative overflow-hidden rounded-lg border border-gray-200',
                style: { paddingBottom: '56.25%' },
              },
              [
                h('iframe', {
                  src: embedUrl,
                  title: 'Figma embed',
                  sandbox: 'allow-scripts allow-same-origin allow-popups',
                  allowfullscreen: true,
                  class: 'absolute inset-0 w-full h-full',
                  style: { pointerEvents: 'none' },
                }),
              ],
            ),
            isEditable.value ? renderDeleteButton(handleDelete, 'Delete embed') : null,
          ]),
        );
      }

      // Generic embed: linked card
      return h(NodeViewWrapper, { class: 'relative my-4' }, () =>
        h('div', { class: `relative ${selectedClass.value}` }, [
          h(
            'div',
            { class: 'p-4 border border-gray-200 rounded-lg bg-gray-50' },
            [
              h(
                'a',
                {
                  href: url.value,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  class: 'text-blue-600 hover:underline break-all',
                  style: { pointerEvents: isEditable.value ? 'none' : 'auto' },
                },
                url.value,
              ),
            ],
          ),
          isEditable.value ? renderDeleteButton(handleDelete, 'Delete embed') : null,
        ]),
      );
    };
  },
});

export const EmbedExtension = Node.create({
  name: 'embedBlock',

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
      url: {
        default: '',
      },
      provider: {
        default: 'generic',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-embed-block]',
        getAttrs: (element: HTMLElement | string) => {
          if (typeof element === 'string') return false;
          return {
            url: element.getAttribute('data-embed-url') || '',
            provider: element.getAttribute('data-embed-provider') || 'generic',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-embed-block': '',
        'data-embed-url': HTMLAttributes.url || '',
        'data-embed-provider': HTMLAttributes.provider || 'generic',
      }),
      `[Embed: ${HTMLAttributes.url || ''}]`,
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(EmbedBlockComponent as any);
  },
});
