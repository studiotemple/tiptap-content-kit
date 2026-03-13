// Editor components
export { default as ContentKitEditor, ContentKitEditor as Editor } from './ContentKitEditor';
export { MultiLocaleEditor } from './MultiLocaleEditor';
export type { MultiLocaleEditorProps } from './MultiLocaleEditor';
export { default as EditorToolbar } from './EditorToolbar';
export { default as TableControls } from './TableControls';

// Provider
export { ContentKitProvider, useContentKit, ContentKitContext } from './ContentKitProvider';
export type { ContentKitContextValue } from './ContentKitProvider';

// i18n
export { useEditorI18n, createI18n, I18nContext } from './i18n';
export { en as enMessages } from './i18n/en';
export { ko as koMessages } from './i18n/ko';

// Modals
export { default as SmartLinkModal } from './SmartLinkModal';
export { default as AnchorModal } from './AnchorModal';
export { default as DiagramEditModal } from './DiagramEditModal';
export { default as AIImportModal } from './AIImportModal';

// Extensions
export { SpecialBlockExtension, getBlockTemplate } from './SpecialBlockExtension';
export type { SpecialBlockData, SpecialBlockItem } from './SpecialBlockExtension';

// UI primitives
export { Tooltip } from './Tooltip';
export { IconPicker } from './IconPicker';

// Icons
export * from './EditorIcons';

// Types
export type {
  ContentKitEditorProps,
  ContentKitProviderConfig,
  EditorProviders,
  ImageUploadProvider,
  LLMProvider,
  DocumentSearchResult,
  CleanupOptions,
  EditorLocale,
  EditorMessages,
} from './types';

// CSS (consumers should import this)
// import 'tiptap-content-kit/editor/style.css'
