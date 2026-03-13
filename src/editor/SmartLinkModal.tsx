'use client';

import { useState, useCallback, useEffect } from 'react';
import { useEditorI18n } from './i18n';

interface SmartLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertLink: (url: string, text?: string, target?: string) => void;
  onRemoveLink?: () => void;
  selectedText?: string;
  existingUrl?: string;
  existingAnchors?: string[];
}

function detectUrlType(url: string): 'web' | 'anchor' | 'invalid' {
  if (url.startsWith('#')) return 'anchor';
  try {
    new URL(url);
    return 'web';
  } catch {
    return 'invalid';
  }
}

export function SmartLinkModal({
  isOpen,
  onClose,
  onInsertLink,
  onRemoveLink,
  selectedText = '',
  existingUrl = '',
  existingAnchors = [],
}: SmartLinkModalProps) {
  const { t } = useEditorI18n();
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [openInNewTab, setOpenInNewTab] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUrl(existingUrl || '');
      setText(selectedText || '');
      setOpenInNewTab(false);
    }
  }, [isOpen, existingUrl, selectedText]);

  if (!isOpen) return null;

  const urlType = url.trim() ? detectUrlType(url) : null;
  const anchorQuery = urlType === 'anchor' ? url.slice(1).toLowerCase() : '';
  const filteredAnchors = anchorQuery
    ? existingAnchors.filter((a) => a.toLowerCase().includes(anchorQuery))
    : existingAnchors;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || urlType === 'invalid') return;
    onInsertLink(
      url.trim(),
      text.trim() || undefined,
      openInNewTab ? '_blank' : undefined,
    );
    onClose();
  };

  const handleSelectAnchor = (anchorId: string) => {
    setUrl(`#${anchorId}`);
    if (!text) setText(`#${anchorId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('link.title')}
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-4">
            {/* URL input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('link.url')}
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://... or #anchor-id"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                autoFocus
              />
              {urlType === 'invalid' && (
                <p className="mt-1 text-sm text-red-500">{t('link.invalidUrl')}</p>
              )}
              {!url.trim() && existingAnchors.length > 0 && (
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {t('link.anchorHint')}
                </p>
              )}
            </div>

            {/* Anchor link mode */}
            {urlType === 'anchor' && existingAnchors.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                  {t('link.anchorLink')}
                </p>
                {filteredAnchors.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {filteredAnchors.map((anchor) => (
                      <button
                        key={anchor}
                        type="button"
                        onClick={() => handleSelectAnchor(anchor)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-colors ${
                          url === `#${anchor}`
                            ? 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 border border-amber-400 dark:border-amber-600'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-800'
                        }`}
                      >
                        #{anchor}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {t('link.noMatchingAnchors')}
                  </p>
                )}
              </div>
            )}

            {/* Display text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('link.text')}
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('link.text')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Open in new tab */}
            {urlType === 'web' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={openInNewTab}
                  onChange={(e) => setOpenInNewTab(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('link.openInNewTab')}
                </span>
              </label>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between p-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              {onRemoveLink && existingUrl && (
                <button
                  type="button"
                  onClick={() => {
                    onRemoveLink();
                    onClose();
                  }}
                  className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  {t('link.remove')}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={!url.trim() || urlType === 'invalid'}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {t('link.insert')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SmartLinkModal;
