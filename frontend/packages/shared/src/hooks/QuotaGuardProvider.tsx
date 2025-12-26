'use client';

import React, { createContext, useContext, useMemo } from 'react';
import type { SessionV1 } from 'sealos-desktop-sdk';
import { sealosApp as defaultSealosApp } from 'sealos-desktop-sdk/app';

export type UseQuotaGuardedConfig = {
  getSession: () => SessionV1 | null;
  /**
   * @todo - Move to a individual context. And REMOVE the `?` at that time. (Suspense)
   */
  sealosApp?: typeof defaultSealosApp;
};

const QuotaGuardContext = createContext<UseQuotaGuardedConfig | null>(null);

export function QuotaGuardProvider({
  getSession,
  sealosApp,
  children
}: React.PropsWithChildren<{
  getSession: () => SessionV1 | null;
  sealosApp?: typeof defaultSealosApp;
}>) {
  // Prevent re-renders
  const value = useMemo(() => ({ getSession, sealosApp }), [getSession, sealosApp]);
  return <QuotaGuardContext.Provider value={value}>{children}</QuotaGuardContext.Provider>;
}

export function useQuotaGuardConfig() {
  const cfg = useContext(QuotaGuardContext);
  if (!cfg) {
    throw new Error('useQuotaGuarded must be used within <QuotaGuardProvider />');
  }
  return cfg;
}
