'use client';

import { useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

/**
 * Create prefetch-only hook for client app config.
 * Must be pre-fetched on server side (getInitialProps/getServerSideProps).
 */
export function createClientAppConfigHook<T = unknown>(queryKey: readonly unknown[]) {
  return function useClientAppConfig(): T {
    const query = useQuery({
      queryFn: () => {
        throw new Error('[Client App Config] Not pre-fetched on server side');
      },
      queryKey,
      suspense: true,
      staleTime: Infinity,
      cacheTime: Infinity
    });

    if (!query.data) {
      throw new Error('[Client App Config] Not found in cache');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (query as any).data as T;
  };
}

/**
 * Prefetch client app config on server side.
 * Use in getInitialProps or getServerSideProps.
 */
export async function prefetchClientAppConfig<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  getData: () => T | Promise<T>
): Promise<void> {
  queryClient.setQueryDefaults(queryKey, {
    cacheTime: Infinity,
    staleTime: Infinity
  });

  await queryClient.prefetchQuery({
    queryKey,
    queryFn: getData
  });
}

/**
 * Setup client-side query defaults for client app config.
 * Call once when creating the QueryClient.
 */
export function setupClientAppConfigDefaults(
  queryClient: QueryClient,
  queryKey: readonly unknown[]
): void {
  queryClient.setQueryDefaults(queryKey, {
    cacheTime: Infinity,
    staleTime: Infinity
  });
}
