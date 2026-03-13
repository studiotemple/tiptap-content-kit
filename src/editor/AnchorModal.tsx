'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useEditorI18n } from './i18n';

interface AnchorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (anchorId: string) => void;
  existingAnchors?: string[];
}

function sanitizeAnchorId(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u3131-\uD79D-]/g, '');
}

export function AnchorModal({
  isOpen,
  onClose,
  onInsert,
  existingAnchors = [],
}: AnchorModalProps) {
  const { t } = useEditorI18n();
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sanitized = sanitizeAnchorId(name);
  const isDuplicate = sanitized !== '' && existingAnchors.includes(sanitized);

  useEffect(() => {
    if (!isOpen) {
      setName('');
    } else {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleInsert = useCallback(() => {
    if (!sanitized || isDuplicate) return;
    onInsert(sanitized);
    onClose();
  }, [sanitized, isDuplicate, onInsert, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && sanitized && !isDuplicate) {
        e.preventDefault();
        handleInsert();
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [sanitized, isDuplicate, handleInsert, onClose],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('anchor.title')}
          </h2>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('anchor.id')}
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('anchor.placeholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm outline-none"
            />
            {sanitized && sanitized !== name && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                &rarr;{' '}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                  #{sanitized}
                </code>
              </p>
            )}
            {isDuplicate && (
              <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                {t('anchor.duplicateWarning')}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {t('anchor.hint')}
            </p>
          </div>

          {existingAnchors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('anchor.existingAnchors')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {existingAnchors.map((anchor) => (
                  <span
                    key={anchor}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                  >
                    #{anchor}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleInsert}
            disabled={!sanitized || isDuplicate}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {t('anchor.insert')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnchorModal;
