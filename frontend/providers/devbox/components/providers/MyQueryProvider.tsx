'use client';

import { isServer, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClientConfigProvider, setupClientAppConfigDefaults } from '@sealos/shared';
const makeQueryClient = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
        cacheTime: 0
      }
    }
  });
  setupClientAppConfigDefaults(client, ['client-app-config']);
  return client;
};
let browserQueryClient: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (isServer) return makeQueryClient();
  else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
};
const QueryProvider = ({
  children,
  dehydratedState
}: {
  children: React.ReactNode;
  dehydratedState?: unknown;
}) => {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <ClientConfigProvider dehydratedState={dehydratedState}>{children}</ClientConfigProvider>
    </QueryClientProvider>
  );
};

export default QueryProvider;
