'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useCallback } from 'react';

interface YoutubeEmbedProps {
  node: any;
  updateAttributes: (attrs: any) => void;
  deleteNode: () => void;
  selected: boolean;
  editor: any;
}

function YoutubeEmbedComponent({
  node,
  deleteNode,
  selected,
  editor,
}: YoutubeEmbedProps) {
  const { videoId, width = 640, height = 360 } = node.attrs;

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteNode();
  }, [deleteNode]);

  const isEditable = editor?.isEditable;

  return (
    <NodeViewWrapper className="relative my-4">
      <div
        className={`relative ${selected ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg' : ''}`}
      >
        <div
          className="relative overflow-hidden rounded-lg bg-black"
          style={{
            paddingBottom: `${(height / width) * 100}%`,
            maxWidth: `${width}px`,
          }}
        >
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>

        {isEditable && (
          <button
            onClick={handleDelete}
            className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
            title="Delete video"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </NodeViewWrapper>
  );
}

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
    return ReactNodeViewRenderer(YoutubeEmbedComponent);
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
