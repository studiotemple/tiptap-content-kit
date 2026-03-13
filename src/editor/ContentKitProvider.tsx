'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { I18nContext, createI18n } from './i18n';
import type { ContentKitProviderConfig, EditorProviders } from './types';

export interface ContentKitContextValue {
  providers: EditorProviders;
  locale: string;
}

export const ContentKitContext = createContext<ContentKitContextValue>({
  providers: {},
  locale: 'en',
});

export function useContentKit(): ContentKitContextValue {
  return useContext(ContentKitContext);
}

export function ContentKitProvider({
  locale = 'en',
  providers = {},
  messages,
  children,
}: ContentKitProviderConfig & { children: ReactNode }) {
  const i18n = useMemo(() => createI18n(locale, messages), [locale, messages]);
  const contextValue = useMemo(() => ({ providers, locale }), [providers, locale]);

  return (
    <ContentKitContext.Provider value={contextValue}>
      <I18nContext.Provider value={i18n}>
        {children}
      </I18nContext.Provider>
    </ContentKitContext.Provider>
  );
}
