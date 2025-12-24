'use client';

import React, { createContext, useContext, useMemo } from 'react';
import type { SessionV1 } from 'sealos-desktop-sdk';

export type UseQuotaGuardedConfig = {
  getSession: () => SessionV1 | null;
};

const QuotaGuardContext = createContext<UseQuotaGuardedConfig | null>(null);

export function QuotaGuardProvider({
  getSession,
  children
}: React.PropsWithChildren<{ getSession: () => SessionV1 | null }>) {
  // Prevent re-renders
  const value = useMemo(() => ({ getSession }), [getSession]);
  return <QuotaGuardContext.Provider value={value}>{children}</QuotaGuardContext.Provider>;
}

export function useQuotaGuardConfig() {
  const cfg = useContext(QuotaGuardContext);
  if (!cfg) {
    throw new Error('useQuotaGuarded must be used within <QuotaGuardProvider />');
  }
  return cfg;
}
