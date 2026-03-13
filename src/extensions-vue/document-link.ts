import { defineComponent, h, ref, watch, PropType } from 'vue';

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
export const DocumentLinkList = defineComponent({
  name: 'DocumentLinkList',
  props: {
    items: {
      type: Array as PropType<DocumentSuggestion[]>,
      required: true,
    },
    command: {
      type: Function as PropType<(item: DocumentSuggestion) => void>,
      required: true,
    },
  },
  setup(props, { expose }) {
    const selectedIndex = ref(0);

    watch(
      () => props.items,
      () => {
        selectedIndex.value = 0;
      }
    );

    function selectItem(index: number) {
      const item = props.items[index];
      if (item) {
        props.command(item);
      }
    }

    function upHandler() {
      selectedIndex.value = (selectedIndex.value + props.items.length - 1) % props.items.length;
    }

    function downHandler() {
      selectedIndex.value = (selectedIndex.value + 1) % props.items.length;
    }

    function enterHandler() {
      selectItem(selectedIndex.value);
    }

    expose({
      onKeyDown: (event: KeyboardEvent): boolean => {
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
    } satisfies DocumentLinkListRef);

    return () => {
      if (props.items.length === 0) {
        return h(
          'div',
          { class: 'bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-sm text-gray-500' },
          'No results found'
        );
      }

      return h(
        'div',
        { class: 'bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden max-h-64 overflow-y-auto' },
        props.items.map((item, index) =>
          h(
            'button',
            {
              key: item.id,
              onClick: () => selectItem(index),
              class: `w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${
                index === selectedIndex.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              }`,
            },
            [
              h('div', { class: 'font-medium' }, item.title),
              h('div', { class: 'text-xs text-gray-400' }, `${item.serviceName} / ${item.slug}`),
            ]
          )
        )
      );
    };
  },
});

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
