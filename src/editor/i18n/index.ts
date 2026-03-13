'use client';

import { createContext, useContext } from 'react';
import { en } from './en';
import { ko } from './ko';
import type { EditorMessages } from '../types';

const builtinMessages: Record<string, EditorMessages> = { en, ko };

export interface I18nContextValue {
  locale: string;
  t: (key: string) => string;
}

export const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  t: (key: string) => builtinMessages.en[key] || key,
});

export function useEditorI18n(): I18nContextValue {
  return useContext(I18nContext);
}

export function createI18n(locale: string, customMessages?: Record<string, EditorMessages>): I18nContextValue {
  const allMessages = { ...builtinMessages, ...customMessages };
  const messages = allMessages[locale] || allMessages.en || {};
  const fallback = allMessages.en || {};

  return {
    locale,
    t: (key: string) => messages[key] || fallback[key] || key,
  };
}

export { en, ko };
