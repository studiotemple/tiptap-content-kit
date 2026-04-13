import { useState } from 'react';
import { ContentKitEditor } from 'tiptap-content-kit/editor';

const INITIAL_CONTENT = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Welcome to tiptap-content-kit' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'This is a full-featured rich text editor built on top of ',
        },
        {
          type: 'text',
          marks: [{ type: 'link', attrs: { href: 'https://tiptap.dev', target: '_blank' } }],
          text: 'Tiptap',
        },
        {
          type: 'text',
          text: '. Try out the toolbar above to explore all available features.',
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Rich Text Formatting' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'You can use ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'bold' },
        { type: 'text', text: ', ' },
        { type: 'text', marks: [{ type: 'italic' }], text: 'italic' },
        { type: 'text', text: ', ' },
        { type: 'text', marks: [{ type: 'underline' }], text: 'underline' },
        { type: 'text', text: ', ' },
        { type: 'text', marks: [{ type: 'strike' }], text: 'strikethrough' },
        { type: 'text', text: ', and ' },
        { type: 'text', marks: [{ type: 'code' }], text: 'inline code' },
        { type: 'text', text: ' formatting.' },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Lists & Task Lists' }],
    },
    {
      type: 'bulletList',
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bullet list item one' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bullet list item two' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bullet list item three' }] }] },
      ],
    },
    {
      type: 'taskList',
      content: [
        { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Set up the editor' }] }] },
        { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Explore the toolbar' }] }] },
        { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Try inserting a table' }] }] },
        { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test code blocks with syntax highlighting' }] }] },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Code Block' }],
    },
    {
      type: 'codeBlock',
      attrs: { language: 'typescript' },
      content: [
        {
          type: 'text',
          text: `import { ContentKitProvider, ContentKitEditor } from 'tiptap-content-kit/editor';
import 'tiptap-content-kit/editor/style.css';

function App() {
  return (
    <ContentKitProvider locale="en">
      <ContentKitEditor
        content={initialContent}
        onChange={(json) => console.log(json)}
      />
    </ContentKitProvider>
  );
}`,
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Blockquote' }],
    },
    {
      type: 'blockquote',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'tiptap-content-kit provides a batteries-included rich text editing experience with support for tables, diagrams, callouts, AI tools, and much more.',
            },
          ],
        },
      ],
    },
  ],
};

function FullEditorDemo() {
  const [content, setContent] = useState<any>(INITIAL_CONTENT);
  const [editable, setEditable] = useState(true);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Full Editor Demo</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Complete ContentKitEditor with all built-in features enabled.
          </p>
        </div>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={editable}
            onChange={(e) => setEditable(e.target.checked)}
            style={{ accentColor: 'var(--color-primary)' }}
          />
          Editable
        </label>
      </div>

      <ContentKitEditor
        content={content}
        onChange={setContent}
        editable={editable}
        placeholder="Start typing here..."
      />

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
        <strong>Tip:</strong> Try using keyboard shortcuts like{' '}
        <kbd style={{ padding: '2px 6px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 12 }}>
          Cmd+B
        </kbd>{' '}
        for bold,{' '}
        <kbd style={{ padding: '2px 6px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 12 }}>
          Cmd+I
        </kbd>{' '}
        for italic, or type{' '}
        <kbd style={{ padding: '2px 6px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 12 }}>
          ##
        </kbd>{' '}
        at the start of a line for a heading.
      </div>
    </div>
  );
}

export default FullEditorDemo;
