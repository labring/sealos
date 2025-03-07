import { useQueries } from '@tanstack/react-query';

interface NetworkStatus {
  url: string;
  isReady: boolean;
  error?: string;
}

interface ApiResponse {
  code: number;
  data?: { ready: boolean };
  message?: string;
  error?: string;
}

export const useNetworkStatus = (networks: { inline: string; public: string }[]) => {
  const urlPairs = networks
    .map((network) => network.public)
    .filter(Boolean)
    .map((originalUrl) => ({
      originalUrl,
      fetchUrl: originalUrl.replace(/^(wss|grpcs):\/\//, 'https://')
    }));

  return useQueries({
    queries: urlPairs.map(({ originalUrl, fetchUrl }) => ({
      queryKey: ['networkStatus', originalUrl],
      queryFn: async (): Promise<NetworkStatus> => {
        const response = await fetch(`/api/check-ready?url=${encodeURIComponent(fetchUrl)}`);
        const data: ApiResponse = await response.json();
        if (data.code !== 200) {
          throw new Error(data.message || data.error || 'Service not ready');
        }

        return {
          url: originalUrl,
          isReady: data.data?.ready ?? false
        };
      },
      retry: 5,
      retryDelay: (attemptIndex: number) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
      refetchIntervalInBackground: false,
      staleTime: 1000 * 60 * 5
    }))
  } as const);
};
