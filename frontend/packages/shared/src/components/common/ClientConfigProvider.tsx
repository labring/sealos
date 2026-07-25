'use client';

import { Hydrate } from '@tanstack/react-query';
import { type ReactNode, Suspense } from 'react';

export interface ClientConfigProviderProps {
  children: ReactNode;
  dehydratedState?: unknown;
  fallback?: ReactNode;
}

export function ClientConfigProvider({
  children,
  dehydratedState,
  fallback
}: ClientConfigProviderProps) {
  return (
    <Hydrate state={dehydratedState}>
      <Suspense fallback={fallback ?? null}>{children}</Suspense>
    </Hydrate>
  );
}
