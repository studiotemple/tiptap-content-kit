'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useCallback } from 'react';

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
// EmbedBlock Node View
// ---------------------------------------------------------------------------

interface EmbedBlockProps {
  node: any;
  updateAttributes: (attrs: any) => void;
  deleteNode: () => void;
  selected: boolean;
  editor: any;
}

function EmbedBlockComponent({
  node,
  deleteNode,
  selected,
  editor,
}: EmbedBlockProps) {
  const { url, provider } = node.attrs;

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteNode();
  }, [deleteNode]);

  const isEditable = editor?.isEditable;

  if (!url) {
    return (
      <NodeViewWrapper className="my-4">
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-500 text-sm">[Empty embed]</p>
        </div>
      </NodeViewWrapper>
    );
  }

  // Figma embed: 16:9 iframe (Embed Kit 2.0)
  if (provider === 'figma' || url.includes('figma.com')) {
    const embedUrl = buildFigmaEmbedUrl(url);
    return (
      <NodeViewWrapper className="relative my-4">
        <div className={`relative ${selected ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg' : ''}`}>
          <div
            className="relative overflow-hidden rounded-lg border border-gray-200"
            style={{ paddingBottom: '56.25%' }}
          >
            <iframe
              src={embedUrl}
              title="Figma embed"
              sandbox="allow-scripts allow-same-origin allow-popups"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
              style={{ pointerEvents: 'none' }}
            />
          </div>

          {isEditable && (
            <button
              onClick={handleDelete}
              className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
              title="Delete embed"
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

  // Generic embed: linked card
  return (
    <NodeViewWrapper className="relative my-4">
      <div className={`relative ${selected ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg' : ''}`}>
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline break-all"
            style={{ pointerEvents: isEditable ? 'none' : 'auto' }}
          >
            {url}
          </a>
        </div>

        {isEditable && (
          <button
            onClick={handleDelete}
            className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
            title="Delete embed"
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
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          return {
            url: element.getAttribute('data-embed-url') || '',
            provider: element.getAttribute('data-embed-provider') || 'generic',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
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
    return ReactNodeViewRenderer(EmbedBlockComponent);
  },
});
