'use client';
import { createContext, useContext } from 'react';

const I18nContext = createContext<{ lng: string }>({ lng: 'en' });

export const useI18n = (): { lng: string } => useContext(I18nContext);

export function I18nProvider({
  children,
  lng
}: {
  children: React.ReactNode;
  lng: string;
}): JSX.Element {
  return <I18nContext.Provider value={{ lng }}>{children}</I18nContext.Provider>;
}
