import { useState } from 'react';
import { ContentKitEditor } from 'tiptap-content-kit/editor';

function JsonPreview() {
  const [content, setContent] = useState<any>({
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Live JSON Preview' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Edit content in the editor above and see the Tiptap JSON output update in real time below. This is useful for understanding the document structure.',
          },
        ],
      },
    ],
  });

  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(content, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>JSON Output Preview</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
          See the live Tiptap JSON structure as you edit. Useful for debugging and understanding the data model.
        </p>
      </div>

      <ContentKitEditor
        content={content}
        onChange={setContent}
        placeholder="Type something to see the JSON output..."
      />

      <div style={{ marginTop: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            Tiptap JSON
          </span>
          <button
            onClick={handleCopy}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 500,
              color: copied ? '#22c55e' : 'var(--color-text-secondary)',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
        </div>
        <pre
          style={{
            background: 'var(--color-code-bg)',
            padding: 16,
            borderRadius: 8,
            fontSize: 12,
            lineHeight: 1.6,
            overflow: 'auto',
            maxHeight: 500,
            border: '1px solid var(--color-border)',
            fontFamily: 'var(--font-mono)',
            margin: 0,
          }}
        >
          {jsonString}
        </pre>
      </div>
    </div>
  );
}

export default JsonPreview;
