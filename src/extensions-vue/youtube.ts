import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { defineComponent, h, computed } from 'vue';

const YoutubeEmbedComponent = defineComponent({
  name: 'YoutubeEmbedComponent',
  props: nodeViewProps,
  setup(props) {
    const videoId = computed(() => props.node.attrs.videoId);
    const width = computed(() => props.node.attrs.width || 640);
    const height = computed(() => props.node.attrs.height || 360);
    const isEditable = computed(() => props.editor?.isEditable);

    function handleDelete(e: Event) {
      e.preventDefault();
      e.stopPropagation();
      props.deleteNode();
    }

    return () =>
      h(NodeViewWrapper, { class: 'relative my-4' }, () =>
        h(
          'div',
          {
            class: [
              'relative',
              props.selected ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg' : '',
            ].join(' '),
          },
          [
            h(
              'div',
              {
                class: 'relative overflow-hidden rounded-lg bg-black',
                style: {
                  paddingBottom: `${(height.value / width.value) * 100}%`,
                  maxWidth: `${width.value}px`,
                },
              },
              [
                h('iframe', {
                  src: `https://www.youtube.com/embed/${videoId.value}`,
                  title: 'YouTube video',
                  allow:
                    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
                  allowfullscreen: true,
                  class: 'absolute inset-0 w-full h-full',
                }),
              ],
            ),
            isEditable.value
              ? h(
                  'button',
                  {
                    onClick: handleDelete,
                    class:
                      'absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors z-10',
                    title: 'Delete video',
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
                )
              : null,
          ],
        ),
      );
  },
});

export const YoutubeEmbed = Node.create({
  name: 'youtube',

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
      videoId: {
        default: null,
      },
      width: {
        default: 640,
      },
      height: {
        default: 360,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-youtube-video]',
        getAttrs: (element: HTMLElement | string) => {
          if (typeof element === 'string') return false;
          const videoId = element.getAttribute('data-video-id');
          return videoId ? { videoId } : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    const { videoId, width, height } = HTMLAttributes;
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-youtube-video': '',
        'data-video-id': videoId,
        style: `max-width: ${width}px;`,
      }),
      [
        'iframe',
        {
          src: `https://www.youtube.com/embed/${videoId}`,
          width: '100%',
          height: height,
          frameborder: '0',
          allowfullscreen: 'true',
        },
      ],
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(YoutubeEmbedComponent as any);
  },

  addCommands() {
    return {
      setYoutubeVideo:
        (options: { videoId: string }) =>
        ({ commands }: { commands: any }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    } as any;
  },
});
