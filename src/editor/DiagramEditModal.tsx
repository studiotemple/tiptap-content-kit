'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useEditorI18n } from './i18n';

interface DiagramEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (diagramType: string, code: string) => void;
  initialDiagramType?: string;
  initialCode?: string;
}

export function DiagramEditModal({
  isOpen,
  onClose,
  onSubmit,
  initialDiagramType = 'mermaid',
  initialCode = '',
}: DiagramEditModalProps) {
  const { t } = useEditorI18n();
  const [diagramType, setDiagramType] = useState(initialDiagramType);
  const [code, setCode] = useState(initialCode);
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEditing = !!initialCode;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setDiagramType(initialDiagramType || 'mermaid');
      setCode(initialCode || '');
      setSvgHtml('');
      setError('');
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, initialDiagramType, initialCode]);

  // Debounced mermaid rendering
  useEffect(() => {
    if (!isOpen) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!code.trim()) {
      setSvgHtml('');
      setError('');
      setLoading(false);
      return;
    }

    if (diagramType !== 'mermaid') {
      setSvgHtml('');
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const mermaid = (await import('mermaid')).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'strict',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        });

        const id = `mermaid-modal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const { svg } = await mermaid.render(id, code.trim());
        setSvgHtml(svg);
        setError('');
      } catch (err) {
        const message = (err as Error).message || 'Mermaid render failed';
        setError(message.split('\n')[0]);
        setSvgHtml('');
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [isOpen, code, diagramType]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && code.trim()) {
        e.preventDefault();
        onSubmit(diagramType, code);
      }
    },
    [onClose, onSubmit, diagramType, code],
  );

  // Tab key in textarea: insert 2 spaces
  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = code.substring(0, start) + '  ' + code.substring(end);
        setCode(newValue);
        requestAnimationFrame(() => {
          textarea.selectionStart = start + 2;
          textarea.selectionEnd = start + 2;
        });
      }
    },
    [code],
  );

  const handleSubmit = useCallback(() => {
    if (!code.trim()) return;
    onSubmit(diagramType, code);
  }, [onSubmit, diagramType, code]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div className="fixed inset-0 bg-black/50" />
      <div
        className="relative z-50 bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl mx-4 max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? t('diagram.titleEdit') : t('diagram.titleInsert')}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={t('common.close')}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Split pane body */}
        <div className="flex flex-1 min-h-0 divide-x divide-gray-200 dark:divide-gray-700">
          {/* Left: code editor */}
          <div className="w-1/2 flex flex-col">
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder={t('diagram.placeholder')}
              spellCheck={false}
              className="flex-1 bg-gray-950 text-gray-100 p-4 text-sm leading-relaxed font-mono resize-none focus:outline-none min-h-[400px] placeholder:text-gray-600"
            />
          </div>

          {/* Right: preview */}
          <div className="w-1/2 flex flex-col overflow-auto bg-white dark:bg-gray-900">
            {/* Empty state */}
            {!code.trim() && (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
                  {t('diagram.emptyPreview')}
                </p>
              </div>
            )}

            {/* Loading state */}
            {code.trim() && loading && (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-xs">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3 w-3/4" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
                </div>
              </div>
            )}

            {/* Error state */}
            {code.trim() && !loading && error && (
              <div className="flex-1 flex items-start p-4">
                <div className="w-full p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 font-mono break-all">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* SVG preview */}
            {code.trim() && !loading && !error && svgHtml && (
              <div
                className="flex-1 flex items-center justify-center p-4 overflow-auto"
                dangerouslySetInnerHTML={{ __html: svgHtml }}
              />
            )}

            {/* PlantUML placeholder */}
            {code.trim() && !loading && diagramType === 'plantuml' && (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
                  {t('diagram.plantumlPreviewPlaceholder')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-200 dark:border-gray-700 shrink-0">
          {/* Left: diagram type selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 dark:text-gray-400">
              {t('diagram.type')}:
            </label>
            <select
              value={diagramType}
              onChange={(e) => setDiagramType(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="mermaid">{t('diagram.mermaid')}</option>
              <option value="plantuml">{t('diagram.plantuml')}</option>
            </select>
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!code.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isEditing ? t('diagram.update') : t('diagram.insert')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DiagramEditModal;
