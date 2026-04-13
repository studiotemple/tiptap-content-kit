import { useState } from 'react';
import { MultiLocaleEditor } from 'tiptap-content-kit/editor';

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
];

const INITIAL_CONTENTS: Record<string, any> = {
  en: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Multi-Locale Editor' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'This demonstrates the MultiLocaleEditor component, which allows editing content in multiple languages using tabs. Each locale tab maintains its own independent content.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Click on the language tabs above the editor to switch between locales. The green dot indicates which locales have content.',
          },
        ],
      },
    ],
  },
  ko: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: '다국어 에디터' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'MultiLocaleEditor 컴포넌트를 사용하면 탭을 통해 여러 언어로 콘텐츠를 편집할 수 있습니다. 각 로케일 탭은 독립적인 콘텐츠를 유지합니다.',
          },
        ],
      },
    ],
  },
};

function MultiLocaleDemo() {
  const [contents, setContents] = useState<Record<string, any>>(INITIAL_CONTENTS);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Multi-Locale Editor</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
          Edit content in multiple languages. Each tab maintains independent content with translation support.
        </p>
      </div>

      <div
        style={{
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <MultiLocaleEditor
          locales={LOCALES}
          defaultLocale="en"
          contents={contents}
          onChange={setContents}
          placeholder="Start writing in this locale..."
        />
      </div>

      <div
        style={{
          marginTop: 16,
          padding: '12px 16px',
          background: 'var(--color-bg-secondary)',
          borderRadius: 8,
          border: '1px solid var(--color-border)',
          fontSize: 13,
          color: 'var(--color-text-secondary)',
        }}
      >
        <strong>How it works:</strong> The MultiLocaleEditor wraps ContentKitEditor with locale tabs.
        A green dot next to each locale indicates whether content has been entered.
        With an LLM provider configured, you can use the AI translation feature to automatically translate between tabs.
      </div>

      <details style={{ marginTop: 16 }}>
        <summary
          style={{
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            padding: '8px 0',
          }}
        >
          View current contents (JSON)
        </summary>
        <pre
          style={{
            background: 'var(--color-code-bg)',
            padding: 16,
            borderRadius: 8,
            fontSize: 12,
            overflow: 'auto',
            maxHeight: 400,
            border: '1px solid var(--color-border)',
          }}
        >
          {JSON.stringify(contents, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export default MultiLocaleDemo;
