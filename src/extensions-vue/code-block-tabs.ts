import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { defineComponent, h, ref, watch, nextTick } from 'vue';

interface CodeTab {
  label: string;
  language: string;
  content: string;
}

const LANGUAGES = [
  'plaintext', 'javascript', 'typescript', 'python', 'java', 'go',
  'rust', 'csharp', 'cpp', 'ruby', 'php', 'swift', 'kotlin',
  'bash', 'shell', 'sql', 'html', 'css', 'json', 'yaml', 'xml',
  'markdown', 'dockerfile', 'graphql', 'proto',
];

const CodeBlockTabsNodeView = defineComponent({
  name: 'CodeBlockTabsNodeView',
  props: nodeViewProps,
  setup(props) {
    const isEditing = ref(false);
    const activeTabIndex = ref(0);
    const textareaRef = ref<HTMLTextAreaElement | null>(null);

    const autoResizeTextarea = () => {
      const el = textareaRef.value;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.max(240, el.scrollHeight)}px`;
    };

    watch([isEditing, activeTabIndex], () => {
      if (isEditing.value) {
        nextTick(() => autoResizeTextarea());
      }
    });

    const handleUpdateTabs = (newTabs: CodeTab[]) => {
      props.updateAttributes({ tabs: newTabs });
    };

    const addTab = () => {
      const tabs: CodeTab[] = props.node.attrs.tabs || [];
      const newTabs = [...tabs, { label: 'New Tab', language: 'plaintext', content: '' }];
      handleUpdateTabs(newTabs);
      activeTabIndex.value = newTabs.length - 1;
      isEditing.value = true;
    };

    const removeTab = (index: number) => {
      const tabs: CodeTab[] = props.node.attrs.tabs || [];
      if (tabs.length <= 1) return;
      const newTabs = tabs.filter((_: CodeTab, i: number) => i !== index);
      handleUpdateTabs(newTabs);
      if (activeTabIndex.value >= newTabs.length) {
        activeTabIndex.value = newTabs.length - 1;
      }
    };

    const updateTab = (index: number, updates: Partial<CodeTab>) => {
      const tabs: CodeTab[] = props.node.attrs.tabs || [];
      const newTabs = [...tabs];
      newTabs[index] = { ...newTabs[index], ...updates };
      handleUpdateTabs(newTabs);
    };

    return () => {
      const tabs: CodeTab[] = props.node.attrs.tabs || [];
      const groupId: string = props.node.attrs.groupId || 'default';

      if (tabs.length === 0) {
        return h(NodeViewWrapper, { class: 'my-4' }, () => [
          h('div', { class: 'bg-gray-100 p-4 rounded-lg text-gray-500 text-sm' }, [
            'Empty tabbed code block',
          ]),
        ]);
      }

      const activeTab = tabs[activeTabIndex.value] || tabs[0];

      return h(NodeViewWrapper, { class: 'my-4' }, () => [
        h(
          'div',
          {
            class: `relative group rounded-lg overflow-hidden border transition-all ${
              props.selected
                ? 'ring-2 ring-blue-500 border-gray-300'
                : 'border-gray-300 hover:ring-1 hover:ring-gray-300'
            }`,
          },
          [
            // Tab header
            h(
              'div',
              { class: 'flex items-center bg-gray-50 dark:bg-gray-800/80 border-b border-gray-300' },
              [
                ...tabs.map((tab: CodeTab, index: number) =>
                  h(
                    'button',
                    {
                      key: index,
                      onClick: () => {
                        activeTabIndex.value = index;
                        isEditing.value = true;
                      },
                      class: `px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                        index === activeTabIndex.value
                          ? 'bg-white dark:bg-gray-900 text-blue-600 border-b-2 border-blue-600 -mb-px'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                      }`,
                    },
                    [tab.label],
                  ),
                ),
                h(
                  'button',
                  {
                    onClick: addTab,
                    class: 'px-3 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors',
                    title: 'Add tab',
                  },
                  [
                    h(
                      'svg',
                      { class: 'w-4 h-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', 'stroke-width': '2' },
                      [h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M12 4v16m8-8H4' })],
                    ),
                  ],
                ),
              ],
            ),

            // Code preview
            h(
              'div',
              {
                class: 'bg-gray-900 text-gray-100 p-4 font-mono text-sm cursor-pointer min-h-[80px] max-h-[240px] overflow-auto',
                onClick: () => { isEditing.value = true; },
              },
              [
                h(
                  'pre',
                  { class: 'm-0 whitespace-pre-wrap' },
                  activeTab.content
                    ? [activeTab.content]
                    : [h('span', { class: 'text-gray-500' }, ['// Enter code...'])],
                ),
              ],
            ),

            // Edit panel
            isEditing.value
              ? h('div', { class: 'p-4 bg-white dark:bg-gray-900 border-t border-gray-300' }, [
                  h('div', { class: 'flex items-center justify-between mb-3' }, [
                    h('span', { class: 'text-sm font-medium text-gray-900 dark:text-gray-100' }, [
                      `Edit tab: ${activeTab.label}`,
                    ]),
                    h(
                      'button',
                      {
                        onClick: () => { isEditing.value = false; },
                        class: 'text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors',
                      },
                      ['Close'],
                    ),
                  ]),
                  h('div', { class: 'space-y-3' }, [
                    h('div', { class: 'grid grid-cols-1 sm:grid-cols-3 gap-2' }, [
                      // Tab name
                      h('div', {}, [
                        h('label', { class: 'block text-xs font-medium text-gray-600 mb-1' }, ['Tab name']),
                        h('input', {
                          type: 'text',
                          value: activeTab.label,
                          onInput: (e: Event) => updateTab(activeTabIndex.value, { label: (e.target as HTMLInputElement).value }),
                          class: 'w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
                          placeholder: 'e.g. JavaScript',
                        }),
                      ]),
                      // Language
                      h('div', {}, [
                        h('label', { class: 'block text-xs font-medium text-gray-600 mb-1' }, ['Language']),
                        h(
                          'select',
                          {
                            value: activeTab.language,
                            onChange: (e: Event) => updateTab(activeTabIndex.value, { language: (e.target as HTMLSelectElement).value }),
                            class: 'w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
                          },
                          LANGUAGES.map((lang) =>
                            h('option', { key: lang, value: lang }, [lang]),
                          ),
                        ),
                      ]),
                      // Group ID
                      h('div', {}, [
                        h('label', { class: 'block text-xs font-medium text-gray-600 mb-1' }, ['Group ID']),
                        h('input', {
                          type: 'text',
                          value: groupId,
                          onInput: (e: Event) => props.updateAttributes({ groupId: (e.target as HTMLInputElement).value }),
                          class: 'w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
                          placeholder: 'default',
                        }),
                      ]),
                    ]),
                    // Code textarea
                    h('div', {}, [
                      h('label', { class: 'block text-xs font-medium text-gray-600 mb-1' }, ['Code']),
                      h('textarea', {
                        ref: textareaRef,
                        value: activeTab.content,
                        onInput: (e: Event) => {
                          updateTab(activeTabIndex.value, { content: (e.target as HTMLTextAreaElement).value });
                          autoResizeTextarea();
                        },
                        class: 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-[240px] max-h-[70vh] resize-y focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
                        placeholder: 'Enter code...',
                        spellcheck: false,
                      }),
                    ]),
                    // Delete tab button
                    tabs.length > 1
                      ? h(
                          'button',
                          {
                            onClick: () => removeTab(activeTabIndex.value),
                            class: 'text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors',
                          },
                          ['Delete this tab'],
                        )
                      : null,
                  ]),
                ])
              : null,

            // Delete button
            !isEditing.value
              ? h(
                  'button',
                  {
                    onClick: () => props.deleteNode(),
                    class: 'absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center',
                    title: 'Delete',
                  },
                  [
                    h(
                      'svg',
                      { class: 'w-3.5 h-3.5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                      [h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M6 18L18 6M6 6l12 12' })],
                    ),
                  ],
                )
              : null,
          ],
        ),
      ]);
    };
  },
});

export const CodeBlockTabsExtension = Node.create({
  name: 'codeBlockTabs',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      tabs: {
        default: [
          { label: 'JavaScript', language: 'javascript', content: '' },
          { label: 'Python', language: 'python', content: '' },
        ],
      },
      groupId: {
        default: 'default',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-code-block-tabs]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-code-block-tabs': '' })];
  },

  addNodeView() {
    return VueNodeViewRenderer(CodeBlockTabsNodeView as any);
  },
});

export default CodeBlockTabsExtension;
