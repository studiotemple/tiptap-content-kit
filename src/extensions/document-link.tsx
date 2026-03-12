'use client';

import { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

interface DocumentSuggestion {
  id: string;
  title: string;
  slug: string;
  path: string | null;
  locale: string;
  serviceName: string;
  serviceSlug: string;
}

interface DocumentLinkListProps {
  items: DocumentSuggestion[];
  command: (item: DocumentSuggestion) => void;
}

export interface DocumentLinkListRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

/**
 * Document link suggestion list component.
 * Used with Tiptap's suggestion plugin for cross-document linking.
 */
export const DocumentLinkList = forwardRef<DocumentLinkListRef, DocumentLinkListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index];
        if (item) {
          command(item);
        }
      },
      [items, command]
    );

    const upHandler = useCallback(() => {
      setSelectedIndex((selectedIndex + items.length - 1) % items.length);
    }, [items.length, selectedIndex]);

    const downHandler = useCallback(() => {
      setSelectedIndex((selectedIndex + 1) % items.length);
    }, [items.length, selectedIndex]);

    const enterHandler = useCallback(() => {
      selectItem(selectedIndex);
    }, [selectItem, selectedIndex]);

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === 'ArrowUp') {
          upHandler();
          return true;
        }
        if (event.key === 'ArrowDown') {
          downHandler();
          return true;
        }
        if (event.key === 'Enter') {
          enterHandler();
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-sm text-gray-500">
          No results found
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden max-h-64 overflow-y-auto">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => selectItem(index)}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${
              index === selectedIndex ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
            }`}
          >
            <div className="font-medium">{item.title}</div>
            <div className="text-xs text-gray-400">
              {item.serviceName} / {item.slug}
            </div>
          </button>
        ))}
      </div>
    );
  }
);

DocumentLinkList.displayName = 'DocumentLinkList';

/**
 * Search documents via API.
 * Override `searchEndpoint` to point to your own API.
 */
export async function searchDocuments(
  query: string,
  locale: string = 'ko',
  searchEndpoint: string = '/api/docs/search'
): Promise<DocumentSuggestion[]> {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    const response = await fetch(`${searchEndpoint}?q=${encodeURIComponent(query)}&locale=${locale}&limit=10`);
    const data = await response.json();

    if (data.success) {
      return data.data;
    }
    return [];
  } catch (error) {
    console.error('Document search error:', error);
    return [];
  }
}

/**
 * Create a document link URL from a suggestion.
 */
export function createDocumentLink(doc: DocumentSuggestion, locale: string = 'ko'): string {
  return `/${locale}/docs/${doc.serviceSlug}/${doc.slug}`;
}
