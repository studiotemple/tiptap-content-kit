'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useState, useRef, useEffect, useCallback } from 'react';

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

interface HtmlEmbedNodeProps {
  node: any;
  updateAttributes: (attrs: any) => void;
  deleteNode: () => void;
  selected: boolean;
  editor: any;
}

function HtmlEmbedNodeComponent({
  node,
  deleteNode,
  selected,
  editor,
}: HtmlEmbedNodeProps) {
  const { htmlContent, fallbackText } = node.attrs;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(500);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'content-kit-embed-resize' && typeof event.data.height === 'number') {
        if (iframeRef.current && event.source === iframeRef.current.contentWindow) {
          setIframeHeight(Math.min(Math.max(100, event.data.height + 32), 2000));
        }
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const srcdocHtml = htmlContent ? injectHeightReporter(htmlContent) : '';

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteNode();
  }, [deleteNode]);

  const isEditable = editor?.isEditable;

  if (!htmlContent) {
    return (
      <NodeViewWrapper className="my-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {fallbackText || '[HTML content is empty]'}
          </p>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="my-4">
      <div
        className={`relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${
          selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            HTML EMBED
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-xs px-2 py-0.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {isCollapsed ? 'Expand' : 'Collapse'}
            </button>
            {isEditable && (
              <button
                onClick={handleDelete}
                className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-sm transition-colors"
                title="Delete HTML block"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* iframe preview */}
        {!isCollapsed && (
          <div style={{ pointerEvents: 'none' }}>
            <iframe
              ref={iframeRef}
              srcDoc={srcdocHtml}
              sandbox="allow-scripts"
              title="Embedded HTML content"
              className="w-full border-0"
              style={{ height: `${iframeHeight}px` }}
            />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

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
    return ReactNodeViewRenderer(HtmlEmbedNodeComponent);
  },
});
