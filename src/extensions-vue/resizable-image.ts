import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { defineComponent, h, ref, onMounted, onUnmounted } from 'vue';

/**
 * Simple inline Lightbox for the editor.
 */
const InlineLightbox = defineComponent({
  name: 'InlineLightbox',
  props: {
    src: { type: String, required: true },
    alt: { type: String, required: true },
    onClose: { type: Function, required: true },
  },
  setup(props) {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose!();
    };

    onMounted(() => {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    });

    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    });

    return () =>
      h(
        'div',
        {
          class: 'fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center',
          onClick: () => props.onClose!(),
        },
        [
          h(
            'button',
            {
              class: 'absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10',
              onClick: () => props.onClose!(),
              'aria-label': 'Close',
            },
            [
              h('svg', { class: 'w-8 h-8', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
                h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M6 18L18 6M6 6l12 12' }),
              ]),
            ],
          ),
          h(
            'div',
            {
              class: 'max-w-[90vw] max-h-[90vh] relative',
              onClick: (e: MouseEvent) => e.stopPropagation(),
            },
            [
              h('img', {
                src: props.src,
                alt: props.alt,
                class: 'max-w-full max-h-[90vh] object-contain',
              }),
            ],
          ),
        ],
      );
  },
});

const ResizableImageComponent = defineComponent({
  name: 'ResizableImageComponent',
  props: nodeViewProps,
  setup(props) {
    const isResizing = ref(false);
    const showControls = ref(false);
    const lightboxOpen = ref(false);
    const imageRef = ref<HTMLImageElement | null>(null);
    const startPosRef = ref({ x: 0, y: 0, width: 0 });

    const handleMouseDown = (e: MouseEvent, corner: string) => {
      e.preventDefault();
      e.stopPropagation();

      if (!imageRef.value) return;

      const img = imageRef.value;
      const rect = img.getBoundingClientRect();

      startPosRef.value = {
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
      };

      isResizing.value = true;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startPosRef.value.x;
        let newWidth = startPosRef.value.width;

        if (corner.includes('right')) {
          newWidth = startPosRef.value.width + deltaX;
        } else if (corner.includes('left')) {
          newWidth = startPosRef.value.width - deltaX;
        }

        newWidth = Math.max(100, Math.min(newWidth, 1200));
        props.updateAttributes({ width: Math.round(newWidth) });
      };

      const handleMouseUp = () => {
        isResizing.value = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    const handleDelete = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      props.deleteNode();
    };

    const handleZoom = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      lightboxOpen.value = true;
    };

    return () => {
      const { src, alt, width, title } = props.node.attrs;
      const isEditable = props.editor?.isEditable;

      return h(NodeViewWrapper, { class: 'relative inline-block my-4' }, () => [
        h(
          'div',
          {
            class: `relative inline-block ${props.selected ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg' : ''}`,
            onMouseenter: () => { showControls.value = true; },
            onMouseleave: () => { if (!isResizing.value) showControls.value = false; },
            onDblclick: handleZoom,
          },
          [
            h('img', {
              ref: imageRef,
              src,
              alt: alt || '',
              title: title || '',
              style: { width: width ? `${width}px` : 'auto', maxWidth: '100%' },
              class: `h-auto rounded-lg block ${isEditable ? '' : 'cursor-zoom-in'}`,
              draggable: false,
            }),

            // Control overlay
            (showControls.value || props.selected)
              ? [
                  // Zoom button
                  h(
                    'button',
                    {
                      onClick: handleZoom,
                      class: 'absolute top-2 left-2 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center shadow-lg transition-colors z-10',
                      title: 'Zoom in',
                    },
                    [
                      h('svg', { class: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
                        h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7' }),
                      ]),
                    ],
                  ),

                  ...(isEditable
                    ? [
                        // Delete button
                        h(
                          'button',
                          {
                            onClick: handleDelete,
                            class: 'absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors z-10',
                            title: 'Delete image',
                          },
                          [
                            h('svg', { class: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
                              h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M6 18L18 6M6 6l12 12' }),
                            ]),
                          ],
                        ),

                        // Hint text
                        h(
                          'div',
                          { class: 'absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded' },
                          [props.selected ? 'Backspace to delete / Double-click to zoom' : 'Click to select / Double-click to zoom'],
                        ),

                        // Resize handle right
                        h(
                          'div',
                          {
                            class: 'absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-12 bg-blue-500 hover:bg-blue-600 rounded cursor-ew-resize flex items-center justify-center',
                            onMousedown: (e: MouseEvent) => handleMouseDown(e, 'right'),
                          },
                          [
                            h('svg', { class: 'w-2 h-6 text-white', fill: 'currentColor', viewBox: '0 0 8 24' }, [
                              h('circle', { cx: '4', cy: '6', r: '1.5' }),
                              h('circle', { cx: '4', cy: '12', r: '1.5' }),
                              h('circle', { cx: '4', cy: '18', r: '1.5' }),
                            ]),
                          ],
                        ),

                        // Resize handle left
                        h(
                          'div',
                          {
                            class: 'absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-12 bg-blue-500 hover:bg-blue-600 rounded cursor-ew-resize flex items-center justify-center',
                            onMousedown: (e: MouseEvent) => handleMouseDown(e, 'left'),
                          },
                          [
                            h('svg', { class: 'w-2 h-6 text-white', fill: 'currentColor', viewBox: '0 0 8 24' }, [
                              h('circle', { cx: '4', cy: '6', r: '1.5' }),
                              h('circle', { cx: '4', cy: '12', r: '1.5' }),
                              h('circle', { cx: '4', cy: '18', r: '1.5' }),
                            ]),
                          ],
                        ),

                        // Corner handles
                        h('div', {
                          class: 'absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 hover:bg-blue-600 rounded cursor-se-resize',
                          onMousedown: (e: MouseEvent) => handleMouseDown(e, 'bottom-right'),
                        }),
                        h('div', {
                          class: 'absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 hover:bg-blue-600 rounded cursor-sw-resize',
                          onMousedown: (e: MouseEvent) => handleMouseDown(e, 'bottom-left'),
                        }),
                      ]
                    : []),
                ]
              : null,
          ],
        ),

        // Lightbox
        lightboxOpen.value && src
          ? h(InlineLightbox, {
              src,
              alt: alt || '',
              onClose: () => { lightboxOpen.value = false; },
            })
          : null,
      ]);
    };
  },
});

export const ResizableImage = Node.create({
  name: 'image',

  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? 'inline' : 'block';
  },

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    const { width, ...attrs } = HTMLAttributes;
    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, attrs, {
        style: width ? `width: ${width}px; max-width: 100%;` : undefined,
      }),
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(ResizableImageComponent as any);
  },

  addCommands() {
    return {
      setImage:
        (options: { src: string; alt?: string; title?: string; width?: number }) =>
        ({ commands }: { commands: any }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    } as any;
  },
});
