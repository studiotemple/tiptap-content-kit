'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useState, useRef, useCallback, useEffect } from 'react';

interface ResizableImageProps {
  node: any;
  updateAttributes: (attrs: any) => void;
  deleteNode: () => void;
  selected: boolean;
  editor: any;
}

/**
 * Simple inline Lightbox for the editor.
 */
function InlineLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10"
        onClick={onClose}
        aria-label="Close"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="max-w-[90vw] max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[90vh] object-contain"
        />
      </div>
    </div>
  );
}

function ResizableImageComponent({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: ResizableImageProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const startPosRef = useRef({ x: 0, y: 0, width: 0 });

  const { src, alt, width, title } = node.attrs;

  const handleMouseDown = useCallback((e: React.MouseEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!imageRef.current) return;

    const img = imageRef.current;
    const rect = img.getBoundingClientRect();

    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
    };

    setIsResizing(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startPosRef.current.x;
      let newWidth = startPosRef.current.width;

      if (corner.includes('right')) {
        newWidth = startPosRef.current.width + deltaX;
      } else if (corner.includes('left')) {
        newWidth = startPosRef.current.width - deltaX;
      }

      newWidth = Math.max(100, Math.min(newWidth, 1200));
      updateAttributes({ width: Math.round(newWidth) });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [updateAttributes]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteNode();
  }, [deleteNode]);

  const handleZoom = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLightboxOpen(true);
  }, []);

  const isEditable = editor?.isEditable;

  return (
    <NodeViewWrapper className="relative inline-block my-4">
      <div
        className={`relative inline-block ${selected ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg' : ''}`}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => !isResizing && setShowControls(false)}
        onDoubleClick={handleZoom}
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt || ''}
          title={title || ''}
          style={{ width: width ? `${width}px` : 'auto', maxWidth: '100%' }}
          className={`h-auto rounded-lg block ${isEditable ? '' : 'cursor-zoom-in'}`}
          draggable={false}
        />

        {/* Control overlay */}
        {(showControls || selected) && (
          <>
            {/* Zoom button */}
            <button
              onClick={handleZoom}
              className="absolute top-2 left-2 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
              title="Zoom in"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>

            {isEditable && (
              <>
                {/* Delete button */}
                <button
                  onClick={handleDelete}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
                  title="Delete image"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Hint text */}
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                  {selected ? 'Backspace to delete / Double-click to zoom' : 'Click to select / Double-click to zoom'}
                </div>

                {/* Resize handles */}
                <div
                  className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-12 bg-blue-500 hover:bg-blue-600 rounded cursor-ew-resize flex items-center justify-center"
                  onMouseDown={(e) => handleMouseDown(e, 'right')}
                >
                  <svg className="w-2 h-6 text-white" fill="currentColor" viewBox="0 0 8 24">
                    <circle cx="4" cy="6" r="1.5" />
                    <circle cx="4" cy="12" r="1.5" />
                    <circle cx="4" cy="18" r="1.5" />
                  </svg>
                </div>

                <div
                  className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-12 bg-blue-500 hover:bg-blue-600 rounded cursor-ew-resize flex items-center justify-center"
                  onMouseDown={(e) => handleMouseDown(e, 'left')}
                >
                  <svg className="w-2 h-6 text-white" fill="currentColor" viewBox="0 0 8 24">
                    <circle cx="4" cy="6" r="1.5" />
                    <circle cx="4" cy="12" r="1.5" />
                    <circle cx="4" cy="18" r="1.5" />
                  </svg>
                </div>

                {/* Corner handles */}
                <div
                  className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 hover:bg-blue-600 rounded cursor-se-resize"
                  onMouseDown={(e) => handleMouseDown(e, 'bottom-right')}
                />
                <div
                  className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 hover:bg-blue-600 rounded cursor-sw-resize"
                  onMouseDown={(e) => handleMouseDown(e, 'bottom-left')}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && src && (
        <InlineLightbox src={src} alt={alt || ''} onClose={() => setLightboxOpen(false)} />
      )}
    </NodeViewWrapper>
  );
}

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

  renderHTML({ HTMLAttributes }) {
    const { width, ...attrs } = HTMLAttributes;
    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, attrs, {
        style: width ? `width: ${width}px; max-width: 100%;` : undefined,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
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
