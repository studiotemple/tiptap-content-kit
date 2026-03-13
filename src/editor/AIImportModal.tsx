'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useEditorI18n } from './i18n';
import { useContentKit } from './ContentKitProvider';
import type { CleanupOptions } from './types';

type TabId = 'import' | 'cleanup' | 'translate';
type ImportMode = 'url' | 'file';
type TranslateMode = 'inPlace' | 'crossTab';

interface AIImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyImport: (blocks: any[], title?: string) => void;
  onApplyCleanup: (result: { blocks: any[]; changes: string[] }) => void;
  onApplyTranslate?: (
    result: { blocks: any[]; title?: string },
    mode: TranslateMode,
    targetLang: string,
  ) => void;
  content: any;
  locale?: string;
  supportedLocales?: Array<{ code: string; label: string }>;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED_TYPES = ['.pdf', '.docx', '.md', '.txt'];
const ACCEPTED_MIME: Record<string, boolean> = {
  'application/pdf': true,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
  'text/markdown': true,
  'text/plain': true,
};

function detectSourceType(url: string): string {
  try {
    const host = new URL(url).hostname;
    if (host.includes('confluence') || host.includes('atlassian')) return 'confluence';
    if (host.includes('github')) return 'github';
  } catch {
    // ignore
  }
  return 'web';
}

const SOURCE_ICONS: Record<string, string> = {
  web: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3.6 9h16.8M3.6 15h16.8M12 3c2.5 2.8 3.9 6.3 3.9 9s-1.4 6.2-3.9 9c-2.5-2.8-3.9-6.3-3.9-9s1.4-6.2 3.9-9Z',
  confluence:
    'M3 17.5c.6-1 1.8-3 3.2-3.5 2-.7 3.2.5 5.3.2 2.1-.3 3.2-2.2 3.8-3.2.2-.4.7-.4.9 0l2.5 4.5c.2.4 0 .8-.4.9-1 .3-3.3.8-5.8.8-3.8 0-5.5-1.2-7.2-1.2-1.2 0-1.9.7-2.3 1.2-.2.3-.7.3-.9 0L3 17.5Zm18-11c-.6 1-1.8 3-3.2 3.5-2 .7-3.2-.5-5.3-.2-2.1.3-3.2 2.2-3.8 3.2-.2.4-.7.4-.9 0L5.3 8.5c-.2-.4 0-.8.4-.9 1-.3 3.3-.8 5.8-.8 3.8 0 5.5 1.2 7.2 1.2 1.2 0 1.9-.7 2.3-1.2.2-.3.7-.3.9 0L21 6.5Z',
  github:
    'M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10Z',
};

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function AIImportModal({
  isOpen,
  onClose,
  onApplyImport,
  onApplyCleanup,
  onApplyTranslate,
  content,
  locale = 'en',
  supportedLocales,
}: AIImportModalProps) {
  const { t } = useEditorI18n();
  const { providers } = useContentKit();

  const [activeTab, setActiveTab] = useState<TabId>('import');

  // Import state
  const [importMode, setImportMode] = useState<ImportMode>('url');
  const [url, setUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ blocks: any[]; title?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup state
  const [cleanupOptions, setCleanupOptions] = useState<CleanupOptions>({
    restructure: true,
    format: true,
    addSummary: false,
    addCallouts: false,
  });
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{ blocks: any[]; changes: string[] } | null>(null);

  // Translate state
  const [sourceLang, setSourceLang] = useState(locale);
  const [targetLang, setTargetLang] = useState('');
  const [translateMode, setTranslateMode] = useState<TranslateMode>('inPlace');
  const [translateLoading, setTranslateLoading] = useState(false);

  const defaultLocales = [
    { code: 'en', label: 'English' },
    { code: 'ko', label: '한국어' },
    { code: 'ja', label: '日本語' },
    { code: 'zh', label: '中文' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
  ];
  const locales = supportedLocales && supportedLocales.length > 0 ? supportedLocales : defaultLocales;

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab('import');
      setUrl('');
      setSelectedFile(null);
      setImportLoading(false);
      setImportResult(null);
      setCleanupLoading(false);
      setCleanupResult(null);
      setTranslateLoading(false);
      setSourceLang(locale);
      setTargetLang(locales.find((l) => l.code !== locale)?.code || '');
    }
  }, [isOpen, locale]);

  // Keyboard
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // --- Import handlers ---
  const sourceType = url.trim() ? detectSourceType(url) : 'web';

  const handleImport = async () => {
    if (importMode === 'url') {
      if (!providers.importContent) return;
      setImportLoading(true);
      try {
        const result = await providers.importContent(url.trim());
        setImportResult(result);
      } catch (err) {
        providers.onNotify?.((err as Error).message || 'Import failed', 'error');
      } finally {
        setImportLoading(false);
      }
    } else {
      if (!selectedFile || !providers.importFile) return;
      setImportLoading(true);
      try {
        const result = await providers.importFile(selectedFile);
        setImportResult(result);
      } catch (err) {
        providers.onNotify?.((err as Error).message || 'Import failed', 'error');
      } finally {
        setImportLoading(false);
      }
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSetFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      providers.onNotify?.('File exceeds 20MB limit', 'error');
      return;
    }
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext) && !ACCEPTED_MIME[file.type]) {
      providers.onNotify?.('Unsupported file type', 'error');
      return;
    }
    setSelectedFile(file);
    setImportResult(null);
  };

  // --- Cleanup handlers ---
  const handleCleanup = async () => {
    if (!providers.cleanupContent) return;
    setCleanupLoading(true);
    try {
      const result = await providers.cleanupContent(content, cleanupOptions);
      setCleanupResult(result);
    } catch (err) {
      providers.onNotify?.((err as Error).message || 'Cleanup failed', 'error');
    } finally {
      setCleanupLoading(false);
    }
  };

  const toggleCleanupOption = (key: keyof CleanupOptions) => {
    setCleanupOptions((prev) => ({ ...prev, [key]: !prev[key] }));
    setCleanupResult(null);
  };

  // --- Translate handlers ---
  const handleTranslate = async () => {
    if (!providers.translateContent) return;
    setTranslateLoading(true);
    try {
      const result = await providers.translateContent(content, sourceLang, targetLang);
      onApplyTranslate?.(result, translateMode, targetLang);
      onClose();
    } catch (err) {
      providers.onNotify?.((err as Error).message || 'Translation failed', 'error');
    } finally {
      setTranslateLoading(false);
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'import', label: t('ai.importTab') },
    { id: 'cleanup', label: t('ai.cleanupTab') },
    { id: 'translate', label: t('ai.translateTab') },
  ];

  const hasAnyCleanupOption = Object.values(cleanupOptions).some(Boolean);
  const canImport =
    importMode === 'url' ? !!url.trim() && !!providers.importContent : !!selectedFile && !!providers.importFile;
  const canTranslate = !!targetLang && targetLang !== sourceLang && !!providers.translateContent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative z-50 bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('ai.title')}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={t('common.close')}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ===== IMPORT TAB ===== */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* Mode toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setImportMode('url'); setImportResult(null); }}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    importMode === 'url'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {t('ai.importUrl')}
                </button>
                <button
                  onClick={() => { setImportMode('file'); setImportResult(null); }}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    importMode === 'file'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {t('ai.importFile')}
                </button>
              </div>

              {importMode === 'url' ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('ai.urlLabel')}</p>
                  <div className="relative">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => { setUrl(e.target.value); setImportResult(null); }}
                      placeholder={t('ai.urlPlaceholder')}
                      className="w-full px-3 py-2.5 pr-24 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      autoFocus
                    />
                    {url.trim() && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={SOURCE_ICONS[sourceType]} />
                        </svg>
                        {t(`ai.source${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)}` as any)}
                      </span>
                    )}
                  </div>
                  {!providers.importContent && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">{t('ai.providerRequired')}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                      dragOver
                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : selectedFile
                          ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_TYPES.join(',')}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {selectedFile ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                        </svg>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('ai.fileDropHint')}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('ai.fileSupportedTypes')}</p>
                      </div>
                    )}
                  </div>
                  {!providers.importFile && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">{t('ai.providerRequired')}</p>
                  )}
                </div>
              )}

              {/* Loading */}
              {importLoading && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Spinner className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">{t('ai.importing')}</span>
                </div>
              )}

              {/* Preview */}
              {importResult && !importLoading && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('ai.preview')}</span>
                    {importResult.title && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        — {importResult.title}
                      </span>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {importResult.blocks.length} block(s) imported
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== CLEANUP TAB ===== */}
          {activeTab === 'cleanup' && (
            <div className="space-y-4">
              {!providers.cleanupContent ? (
                <p className="text-sm text-amber-600 dark:text-amber-400">{t('ai.providerRequired')}</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {([
                      { key: 'restructure', label: t('ai.cleanupRestructure'), desc: t('ai.cleanupRestructureDesc') },
                      { key: 'format', label: t('ai.cleanupFormat'), desc: t('ai.cleanupFormatDesc') },
                      { key: 'addSummary', label: t('ai.cleanupAddSummary'), desc: t('ai.cleanupAddSummaryDesc') },
                      { key: 'addCallouts', label: t('ai.cleanupAddCallouts'), desc: t('ai.cleanupAddCalloutsDesc') },
                    ] as const).map((opt) => (
                      <label
                        key={opt.key}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={!!cleanupOptions[opt.key]}
                          onChange={() => toggleCleanupOption(opt.key)}
                          className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {cleanupLoading && (
                    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Spinner className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm text-blue-700 dark:text-blue-300">{t('ai.cleaning')}</span>
                    </div>
                  )}

                  {cleanupResult && !cleanupLoading && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('ai.preview')}</p>
                      <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50 space-y-1">
                        {cleanupResult.changes.map((change, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-green-500 mt-px shrink-0">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                            <span className="text-xs text-gray-600 dark:text-gray-400">{change}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ===== TRANSLATE TAB ===== */}
          {activeTab === 'translate' && (
            <div className="space-y-4">
              {!providers.translateContent ? (
                <p className="text-sm text-amber-600 dark:text-amber-400">{t('ai.providerRequired')}</p>
              ) : (
                <>
                  {/* Language selectors */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {t('ai.translateSourceLang')}
                      </label>
                      <select
                        value={sourceLang}
                        onChange={(e) => setSourceLang(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {locales.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {t('ai.translateTargetLang')}
                      </label>
                      <select
                        value={targetLang}
                        onChange={(e) => setTargetLang(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="" disabled>
                          —
                        </option>
                        {locales
                          .filter((l) => l.code !== sourceLang)
                          .map((l) => (
                            <option key={l.code} value={l.code}>
                              {l.label}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Mode toggle */}
                  <div className="space-y-2">
                    {([
                      { mode: 'inPlace' as TranslateMode, label: t('ai.translateInPlace'), desc: t('ai.translateInPlaceDesc') },
                      { mode: 'crossTab' as TranslateMode, label: t('ai.translateCrossTab'), desc: t('ai.translateCrossTabDesc') },
                    ]).map((opt) => (
                      <label
                        key={opt.mode}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          translateMode === opt.mode
                            ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="translateMode"
                          checked={translateMode === opt.mode}
                          onChange={() => setTranslateMode(opt.mode)}
                          className="mt-0.5 w-4 h-4 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {translateLoading && (
                    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Spinner className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm text-blue-700 dark:text-blue-300">{t('ai.translating')}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {t('ai.cancel')}
          </button>

          {activeTab === 'import' && (
            <>
              {importResult ? (
                <button
                  onClick={() => {
                    onApplyImport(importResult.blocks, importResult.title);
                    onClose();
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  {t('ai.apply')}
                </button>
              ) : (
                <button
                  onClick={handleImport}
                  disabled={!canImport || importLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {importLoading ? t('ai.importing') : t('ai.importButton')}
                </button>
              )}
            </>
          )}

          {activeTab === 'cleanup' && (
            <>
              {cleanupResult ? (
                <button
                  onClick={() => {
                    onApplyCleanup(cleanupResult);
                    onClose();
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  {t('ai.apply')}
                </button>
              ) : (
                <button
                  onClick={handleCleanup}
                  disabled={!hasAnyCleanupOption || cleanupLoading || !providers.cleanupContent}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {cleanupLoading ? t('ai.cleaning') : t('ai.cleanupTab')}
                </button>
              )}
            </>
          )}

          {activeTab === 'translate' && (
            <button
              onClick={handleTranslate}
              disabled={!canTranslate || translateLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {translateLoading ? t('ai.translating') : t('ai.translateButton')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIImportModal;
