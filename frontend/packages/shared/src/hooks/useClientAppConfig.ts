'use client';

import { useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

const CLIENT_APP_CONFIG_STALE_TIME = 60 * 1000;
const CLIENT_APP_CONFIG_CACHE_TIME = 10 * 60 * 1000;
const CLIENT_APP_CONFIG_REFETCH_INTERVAL = 60 * 1000;

type ClientAppConfigResponse<T> = {
  code?: number;
  data?: T;
  message?: string;
};

async function fetchClientAppConfig<T>() {
  const response = await fetch('/api/platform/getClientAppConfig', {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`[Client App Config] Request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as ClientAppConfigResponse<T>;

  if (payload.code !== 200 || payload.data === undefined) {
    throw new Error(payload.message || '[Client App Config] Failed to load client app config.');
  }

  return payload.data;
}

/**
 * Create a hook for client app config.
 * Uses server-side prefetch as initial data, then refreshes from the platform API.
 */
export function createClientAppConfigHook<T = unknown>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T> | T = () => fetchClientAppConfig<T>()
) {
  return function useClientAppConfig(): T {
    const query = useQuery({
      queryFn,
      queryKey,
      suspense: true,
      staleTime: CLIENT_APP_CONFIG_STALE_TIME,
      cacheTime: CLIENT_APP_CONFIG_CACHE_TIME,
      refetchInterval: CLIENT_APP_CONFIG_REFETCH_INTERVAL,
      refetchIntervalInBackground: false
    });

    if (!query.data) {
      throw new Error('[Client App Config] Not found in cache');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (query as any).data as T;
  };
}

/**
 * Prefetch client app config on server side as initial data.
 * Use in getInitialProps or getServerSideProps.
 */
export async function prefetchClientAppConfig<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  getData: () => T | Promise<T>
): Promise<void> {
  queryClient.setQueryDefaults(queryKey, {
    cacheTime: CLIENT_APP_CONFIG_CACHE_TIME,
    staleTime: CLIENT_APP_CONFIG_STALE_TIME
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
    cacheTime: CLIENT_APP_CONFIG_CACHE_TIME,
    staleTime: CLIENT_APP_CONFIG_STALE_TIME
  });
}
