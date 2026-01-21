'use client';

import { useQuery } from '@tanstack/react-query';

/**
 * Create a typed hook for a "prefetch-first" query.
 * If you want "prefetch-only", pass a queryFn that throws from your app.
 */
export function createClientAppConfigHook<T = unknown>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>
) {
  return function useClientAppConfig(): T {
    const query = useQuery({
      queryFn,
      queryKey,
      suspense: true,
      staleTime: Infinity,
      cacheTime: Infinity
    });

    if (!query.data) {
      throw new Error('No query data, client app config not correctly populated.');
    }

    return query.data as unknown as T;
  };
}
