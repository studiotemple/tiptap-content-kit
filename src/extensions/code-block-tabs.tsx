'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useState, useCallback, useRef, useEffect } from 'react';

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

function CodeBlockTabsNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const tabs: CodeTab[] = node.attrs.tabs || [];
  const groupId: string = node.attrs.groupId || 'default';

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(240, el.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    if (isEditing) autoResizeTextarea();
  }, [isEditing, activeTabIndex, autoResizeTextarea]);

  const handleUpdateTabs = useCallback((newTabs: CodeTab[]) => {
    updateAttributes({ tabs: newTabs });
  }, [updateAttributes]);

  const addTab = useCallback(() => {
    const newTabs = [...tabs, { label: 'New Tab', language: 'plaintext', content: '' }];
    handleUpdateTabs(newTabs);
    setActiveTabIndex(newTabs.length - 1);
    setIsEditing(true);
  }, [tabs, handleUpdateTabs]);

  const removeTab = useCallback((index: number) => {
    if (tabs.length <= 1) return;
    const newTabs = tabs.filter((_, i) => i !== index);
    handleUpdateTabs(newTabs);
    if (activeTabIndex >= newTabs.length) {
      setActiveTabIndex(newTabs.length - 1);
    }
  }, [tabs, activeTabIndex, handleUpdateTabs]);

  const updateTab = useCallback((index: number, updates: Partial<CodeTab>) => {
    const newTabs = [...tabs];
    newTabs[index] = { ...newTabs[index], ...updates };
    handleUpdateTabs(newTabs);
  }, [tabs, handleUpdateTabs]);

  if (tabs.length === 0) {
    return (
      <NodeViewWrapper className="my-4">
        <div className="bg-gray-100 p-4 rounded-lg text-gray-500 text-sm">
          Empty tabbed code block
        </div>
      </NodeViewWrapper>
    );
  }

  const activeTab = tabs[activeTabIndex] || tabs[0];

  return (
    <NodeViewWrapper className="my-4">
      <div className={`relative group rounded-lg overflow-hidden border transition-all ${
        selected ? 'ring-2 ring-blue-500 border-gray-300' : 'border-gray-300 hover:ring-1 hover:ring-gray-300'
      }`}>
        {/* Tab header */}
        <div className="flex items-center bg-gray-50 dark:bg-gray-800/80 border-b border-gray-300">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => { setActiveTabIndex(index); setIsEditing(true); }}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                index === activeTabIndex
                  ? 'bg-white dark:bg-gray-900 text-blue-600 border-b-2 border-blue-600 -mb-px'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={addTab}
            className="px-3 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            title="Add tab"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Code preview */}
        <div
          className="bg-gray-900 text-gray-100 p-4 font-mono text-sm cursor-pointer min-h-[80px] max-h-[240px] overflow-auto"
          onClick={() => setIsEditing(true)}
        >
          <pre className="m-0 whitespace-pre-wrap">{activeTab.content || <span className="text-gray-500">// Enter code...</span>}</pre>
        </div>

        {/* Edit panel */}
        {isEditing && (
          <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Edit tab: {activeTab.label}
              </span>
              <button
                onClick={() => setIsEditing(false)}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tab name</label>
                  <input
                    type="text"
                    value={activeTab.label}
                    onChange={(e) => updateTab(activeTabIndex, { label: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. JavaScript"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Language</label>
                  <select
                    value={activeTab.language}
                    onChange={(e) => updateTab(activeTabIndex, { language: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Group ID</label>
                  <input
                    type="text"
                    value={groupId}
                    onChange={(e) => updateAttributes({ groupId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="default"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
                <textarea
                  ref={textareaRef}
                  value={activeTab.content}
                  onChange={(e) => {
                    updateTab(activeTabIndex, { content: e.target.value });
                    autoResizeTextarea();
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-[240px] max-h-[70vh] resize-y focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter code..."
                  spellCheck={false}
                />
              </div>

              {tabs.length > 1 && (
                <button
                  onClick={() => removeTab(activeTabIndex)}
                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Delete this tab
                </button>
              )}
            </div>
          </div>
        )}

        {/* Delete button */}
        {!isEditing && (
          <button
            onClick={deleteNode}
            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            title="Delete"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </NodeViewWrapper>
  );
}

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

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-code-block-tabs': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockTabsNodeView);
  },
});

export default CodeBlockTabsExtension;
