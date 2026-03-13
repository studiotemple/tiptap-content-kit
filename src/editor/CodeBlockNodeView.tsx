'use client';

import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useState, useRef, useEffect } from 'react';

const LANGUAGES = [
  { value: '', label: 'Auto' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'csharp', label: 'C#' },
  { value: 'cpp', label: 'C++' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'bash', label: 'Bash' },
  { value: 'shell', label: 'Shell' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'xml', label: 'XML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'dockerfile', label: 'Dockerfile' },
  { value: 'graphql', label: 'GraphQL' },
  { value: 'tsx', label: 'TSX' },
  { value: 'jsx', label: 'JSX' },
  { value: 'scss', label: 'SCSS' },
];

export default function CodeBlockNodeView({ node, updateAttributes }: NodeViewProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const language = node.attrs.language || '';
  const displayLabel = LANGUAGES.find((l) => l.value === language)?.label || language || 'Auto';

  useEffect(() => {
    if (!showPicker) return;
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

  return (
    <NodeViewWrapper as="pre" className="code-block-with-lang">
      <div
        ref={pickerRef}
        className="code-block-lang-badge"
        contentEditable={false}
      >
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="code-block-lang-btn"
        >
          {displayLabel}
        </button>
        {showPicker && (
          <div className="code-block-lang-dropdown">
            {LANGUAGES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  updateAttributes({ language: value || null });
                  setShowPicker(false);
                }}
                className={`code-block-lang-option ${language === value ? 'active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <NodeViewContent as="code" />
    </NodeViewWrapper>
  );
}
