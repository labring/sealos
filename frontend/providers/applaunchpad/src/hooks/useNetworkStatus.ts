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
  const publicUrls = networks
    .map((network) => network.public)
    .filter((url) => url.startsWith('http'));

  return useQueries({
    queries: publicUrls.map((url) => ({
      queryKey: ['networkStatus', url],
      queryFn: async (): Promise<NetworkStatus> => {
        const response = await fetch(`/api/check-ready?url=${encodeURIComponent(url)}`);
        const data: ApiResponse = await response.json();
        console.log(data, 123123);
        if (data.code !== 200) {
          throw new Error(data.message || data.error || 'Service not ready');
        }

        return {
          url,
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
