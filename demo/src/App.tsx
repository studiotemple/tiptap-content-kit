import { useState, useCallback } from 'react';
import { ContentKitProvider } from 'tiptap-content-kit/editor';
import 'tiptap-content-kit/editor/style.css';

import FullEditorDemo from './demos/FullEditorDemo';
import MultiLocaleDemo from './demos/MultiLocaleDemo';
import ExtensionShowcase from './demos/ExtensionShowcase';
import JsonPreview from './demos/JsonPreview';

type Tab = 'editor' | 'multilocale' | 'extensions' | 'json';

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: 'editor', label: 'Full Editor', description: 'Complete editor with all features' },
  { id: 'multilocale', label: 'Multi-Locale', description: 'Editor with language tabs' },
  { id: 'extensions', label: 'Extensions', description: 'Individual extension demos' },
  { id: 'json', label: 'JSON Output', description: 'Live Tiptap JSON preview' },
];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('editor');
  const [isDark, setIsDark] = useState(false);

  const toggleDark = useCallback(() => {
    setIsDark((v) => {
      const next = !v;
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  }, []);

  return (
    <ContentKitProvider
      locale="en"
      providers={{
        onNotify: (message, type) => {
          console.log(`[${type}] ${message}`);
        },
      }}
    >
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header
          style={{
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
            position: 'sticky',
            top: 0,
            zIndex: 50,
          }}
        >
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
                  tiptap-content-kit
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
                  Full-featured Tiptap editor with rich toolbar, AI assistant, special blocks, i18n &amp; content parsers
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <a
                  href="https://www.npmjs.com/package/tiptap-content-kit"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--color-text-secondary)',
                    textDecoration: 'none',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    transition: 'border-color 0.15s',
                  }}
                >
                  npm
                </a>
                <a
                  href="https://github.com/studiotemple/tiptap-content-kit"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--color-text-secondary)',
                    textDecoration: 'none',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    transition: 'border-color 0.15s',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                  GitHub
                </a>
                <button
                  onClick={toggleDark}
                  style={{
                    padding: '6px 10px',
                    fontSize: 16,
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: 'var(--color-text)',
                    lineHeight: 1,
                  }}
                  title="Toggle dark mode"
                >
                  {isDark ? '☀️' : '🌙'}
                </button>
              </div>
            </div>

            {/* Tab navigation */}
            <nav style={{ display: 'flex', gap: 4 }}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '8px 16px',
                    fontSize: 14,
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    background: activeTab === tab.id ? 'var(--color-bg-secondary)' : 'transparent',
                    border: '1px solid',
                    borderColor: activeTab === tab.id ? 'var(--color-border)' : 'transparent',
                    borderBottom: activeTab === tab.id ? '1px solid var(--color-bg)' : '1px solid transparent',
                    borderRadius: '8px 8px 0 0',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    marginBottom: -1,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, maxWidth: 1200, margin: '0 auto', padding: '24px 24px 48px', width: '100%' }}>
          {activeTab === 'editor' && <FullEditorDemo />}
          {activeTab === 'multilocale' && <MultiLocaleDemo />}
          {activeTab === 'extensions' && <ExtensionShowcase />}
          {activeTab === 'json' && <JsonPreview />}
        </main>

        {/* Footer */}
        <footer
          style={{
            borderTop: '1px solid var(--color-border)',
            padding: '16px 24px',
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--color-text-secondary)',
          }}
        >
          MIT License &middot; Built with{' '}
          <a
            href="https://tiptap.dev"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
          >
            Tiptap
          </a>{' '}
          &amp; React &middot;{' '}
          <a
            href="https://github.com/studiotemple/tiptap-content-kit"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
          >
            studiotemple/tiptap-content-kit
          </a>
        </footer>
      </div>
    </ContentKitProvider>
  );
}

export default App;
