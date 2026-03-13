import type { Editor } from '@tiptap/core';

// Provider interfaces
export interface ImageUploadProvider {
  upload: (file: File) => Promise<string>; // returns URL
}

export interface LLMProvider {
  generateText: (prompt: string, options?: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  }) => Promise<string>;
}

export interface DocumentSearchResult {
  id: string;
  title: string;
  path?: string;
}

export interface EditorProviders {
  imageUpload?: ImageUploadProvider;
  llm?: LLMProvider;
  searchDocuments?: (query: string) => Promise<DocumentSearchResult[]>;
  onNotify?: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  importContent?: (url: string) => Promise<{ blocks: any[]; title?: string }>;
  importFile?: (file: File) => Promise<{ blocks: any[]; title?: string }>;
  cleanupContent?: (content: any, options: CleanupOptions) => Promise<{ blocks: any[]; changes: string[] }>;
  translateContent?: (content: any, sourceLang: string, targetLang: string) => Promise<{ blocks: any[]; title?: string }>;
}

export interface CleanupOptions {
  restructure?: boolean;
  format?: boolean;
  addSummary?: boolean;
  addCallouts?: boolean;
}

export interface EditorLocale {
  code: string;
  label: string;
}

export interface EditorMessages {
  [key: string]: string;
}

export interface ContentKitEditorProps {
  content?: any; // Tiptap JSON
  onChange?: (content: any) => void;
  editable?: boolean;
  placeholder?: string;
  locale?: string;
  className?: string;
}

export interface ContentKitProviderConfig {
  locale?: string; // default: 'en'
  providers?: EditorProviders;
  messages?: Record<string, EditorMessages>; // { ja: { 'toolbar.bold': '太字', ... } }
  supportedLocales?: EditorLocale[];
}
