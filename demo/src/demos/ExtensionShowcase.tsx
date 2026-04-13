import { useState } from 'react';
import { ContentKitEditor } from 'tiptap-content-kit/editor';

// ──────────────────────────────────────────────────────────────────────────────
// Sample content for each extension demo
// ──────────────────────────────────────────────────────────────────────────────

const CALLOUT_CONTENT = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Callout Blocks' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Callouts are attention-grabbing blocks that highlight important information. Use the toolbar menu to insert callouts with different variants.',
        },
      ],
    },
    {
      type: 'callout',
      attrs: { variant: 'info' },
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'This is an info callout. Great for general tips and notes.' }],
        },
      ],
    },
    {
      type: 'callout',
      attrs: { variant: 'warning' },
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Warning: This callout highlights things the reader should be careful about.' }],
        },
      ],
    },
    {
      type: 'callout',
      attrs: { variant: 'tip' },
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Tip: Use callouts to make important information stand out in your documentation.' }],
        },
      ],
    },
    {
      type: 'callout',
      attrs: { variant: 'danger' },
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Danger: This is a critical warning that requires immediate attention.' }],
        },
      ],
    },
  ],
};

const TABLE_CONTENT = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Tables' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Resizable tables with header support. Click inside a table to see the table controls bar for adding/removing rows and columns.',
        },
      ],
    },
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Feature' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Status' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Notes' }] }] },
          ],
        },
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Rich Text Formatting' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Stable' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bold, italic, underline, strikethrough, code' }] }] },
          ],
        },
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tables' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Stable' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Resizable columns, header row support' }] }] },
          ],
        },
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'AI Integration' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Beta' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Requires LLM provider configuration' }] }] },
          ],
        },
      ],
    },
  ],
};

const CODE_BLOCK_CONTENT = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Code Blocks' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Syntax-highlighted code blocks powered by Lowlight. Supports language selection and copy-to-clipboard.',
        },
      ],
    },
    {
      type: 'codeBlock',
      attrs: { language: 'javascript' },
      content: [
        {
          type: 'text',
          text: `// React example
import { ContentKitProvider, ContentKitEditor } from 'tiptap-content-kit/editor';

function MyEditor({ initialContent }) {
  const [content, setContent] = useState(initialContent);

  return (
    <ContentKitProvider locale="en" providers={{ onNotify: console.log }}>
      <ContentKitEditor
        content={content}
        onChange={setContent}
        placeholder="Start typing..."
      />
    </ContentKitProvider>
  );
}`,
        },
      ],
    },
    {
      type: 'codeBlock',
      attrs: { language: 'python' },
      content: [
        {
          type: 'text',
          text: `# Python example
def fibonacci(n: int) -> list[int]:
    """Generate Fibonacci sequence up to n numbers."""
    if n <= 0:
        return []

    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])

    return sequence[:n]

print(fibonacci(10))`,
        },
      ],
    },
  ],
};

const TASK_LIST_CONTENT = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Task Lists' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Interactive task lists with nested items support. Click on checkboxes to toggle completion.',
        },
      ],
    },
    {
      type: 'taskList',
      content: [
        {
          type: 'taskItem',
          attrs: { checked: true },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Install tiptap-content-kit' }] }],
        },
        {
          type: 'taskItem',
          attrs: { checked: true },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Set up ContentKitProvider' }] }],
        },
        {
          type: 'taskItem',
          attrs: { checked: false },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Configure AI providers' }] }],
        },
        {
          type: 'taskItem',
          attrs: { checked: false },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Add i18n support' }] }],
        },
        {
          type: 'taskItem',
          attrs: { checked: false },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Deploy to production' }] }],
        },
      ],
    },
  ],
};

const TEXT_ALIGN_CONTENT = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Text Alignment' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Use the alignment buttons in the toolbar to align text.' }],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'left' },
      content: [{ type: 'text', text: 'This paragraph is left-aligned (default).' }],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'center' },
      content: [{ type: 'text', text: 'This paragraph is center-aligned.' }],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'right' },
      content: [{ type: 'text', text: 'This paragraph is right-aligned.' }],
    },
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// Extension showcase tabs
// ──────────────────────────────────────────────────────────────────────────────

const EXTENSIONS = [
  { id: 'callout', label: 'Callout', content: CALLOUT_CONTENT },
  { id: 'table', label: 'Table', content: TABLE_CONTENT },
  { id: 'codeblock', label: 'Code Block', content: CODE_BLOCK_CONTENT },
  { id: 'tasklist', label: 'Task List', content: TASK_LIST_CONTENT },
  { id: 'textalign', label: 'Text Align', content: TEXT_ALIGN_CONTENT },
] as const;

type ExtId = (typeof EXTENSIONS)[number]['id'];

function ExtensionShowcase() {
  const [activeExt, setActiveExt] = useState<ExtId>('callout');

  const current = EXTENSIONS.find((e) => e.id === activeExt)!;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Extension Showcase</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
          Explore individual extensions with pre-populated examples. Each demo is fully interactive.
        </p>
      </div>

      {/* Extension tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        {EXTENSIONS.map((ext) => (
          <button
            key={ext.id}
            onClick={() => setActiveExt(ext.id)}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: activeExt === ext.id ? 600 : 400,
              color: activeExt === ext.id ? '#fff' : 'var(--color-text-secondary)',
              background: activeExt === ext.id ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
              border: '1px solid',
              borderColor: activeExt === ext.id ? 'var(--color-primary)' : 'var(--color-border)',
              borderRadius: 20,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {ext.label}
          </button>
        ))}
      </div>

      {/* Demo area */}
      <ContentKitEditor
        key={activeExt}
        content={current.content}
        onChange={() => {}}
        placeholder="Try editing this content..."
      />
    </div>
  );
}

export default ExtensionShowcase;
