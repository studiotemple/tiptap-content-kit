'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import ContentKitEditor from './ContentKitEditor';
import type { ContentKitEditorComponentProps } from './ContentKitEditor';
import type { EditorLocale } from './types';

export interface MultiLocaleEditorProps
  extends Omit<ContentKitEditorComponentProps, 'content' | 'onChange' | 'locale'> {
  /** Locale tabs to display. If only 1, no tabs shown. */
  locales: EditorLocale[];
  /** Initial active locale code */
  defaultLocale?: string;
  /** Content per locale: { ko: tiptapJSON, en: tiptapJSON } */
  contents?: Record<string, any>;
  /** Called when any locale's content changes */
  onChange?: (contents: Record<string, any>) => void;
}

function hasContent(content: any): boolean {
  if (!content?.content?.length) return false;
  if (content.content.length > 1) return true;
  const first = content.content[0];
  // Empty doc: { type: "doc", content: [{ type: "paragraph" }] }
  if (first.type === 'paragraph' && (!first.content || first.content.length === 0)) {
    return false;
  }
  return true;
}

function MultiLocaleEditor({
  locales,
  defaultLocale,
  contents: contentsProp,
  onChange,
  ...editorProps
}: MultiLocaleEditorProps) {
  const [activeLocale, setActiveLocale] = useState(
    defaultLocale || locales[0]?.code || 'en',
  );
  const [contents, setContents] = useState<Record<string, any>>(
    contentsProp ?? {},
  );

  // Track whether we're switching tabs to avoid saving stale content
  const isSwitchingRef = useRef(false);

  // Sync external contents prop (controlled mode)
  useEffect(() => {
    if (contentsProp) {
      setContents(contentsProp);
    }
  }, [contentsProp]);

  const handleEditorChange = useCallback(
    (content: any) => {
      if (isSwitchingRef.current) return;
      setContents((prev) => {
        const next = { ...prev, [activeLocale]: content };
        onChange?.(next);
        return next;
      });
    },
    [activeLocale, onChange],
  );

  const switchLocale = useCallback((code: string) => {
    isSwitchingRef.current = true;
    setActiveLocale(code);
    // Allow one tick for the editor to receive new content before re-enabling onChange
    requestAnimationFrame(() => {
      isSwitchingRef.current = false;
    });
  }, []);

  const handleTranslateCrossTab = useCallback(
    (result: { blocks: any[]; title?: string }, targetLang: string) => {
      const doc = { type: 'doc' as const, content: result.blocks };
      setContents((prev) => {
        const next = { ...prev, [targetLang]: doc };
        onChange?.(next);
        return next;
      });
      // Switch to target locale tab
      switchLocale(targetLang);
    },
    [onChange, switchLocale],
  );

  const showTabs = locales.length > 1;

  return (
    <div>
      {showTabs && (
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--ck-border, #e5e7eb)',
            padding: '0 8px',
            background: 'var(--ck-bg-secondary, #f9fafb)',
          }}
        >
          {locales.map((locale) => (
            <button
              key={locale.code}
              type="button"
              onClick={() => switchLocale(locale.code)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: activeLocale === locale.code ? 600 : 400,
                color:
                  activeLocale === locale.code
                    ? 'var(--ck-primary, #437dfc)'
                    : 'var(--ck-text-secondary, #6b7280)',
                background: 'transparent',
                border: 'none',
                borderBottom:
                  activeLocale === locale.code
                    ? '2px solid var(--ck-primary, #437dfc)'
                    : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s',
                marginBottom: '-1px',
              }}
            >
              {locale.label}
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: hasContent(contents[locale.code])
                    ? '#22c55e'
                    : 'var(--ck-text-muted, #ccc)',
                  display: 'inline-block',
                }}
              />
            </button>
          ))}
        </div>
      )}

      <ContentKitEditor
        {...editorProps}
        content={contents[activeLocale] ?? null}
        onChange={handleEditorChange}
        locale={activeLocale}
        onTranslateCrossTab={handleTranslateCrossTab}
      />
    </div>
  );
}

export { MultiLocaleEditor };
export default MultiLocaleEditor;
