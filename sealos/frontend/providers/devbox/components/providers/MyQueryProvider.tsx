'use client';

import { isServer, QueryClient, QueryClientProvider } from '@tanstack/react-query';
const makeQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
        cacheTime: 0
      }
    }
  });
};
let browserQueryClient: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (isServer) return makeQueryClient();
  else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
};
const QueryProvider = ({ children }: { children: React.ReactNode }) => {
  // const [queryClient] = useState(
  //   () =>
  //     new QueryClient({
  //       defaultOptions: {
  //         queries: {
  //           refetchOnWindowFocus: false,
  //           retry: false,
  //           cacheTime: 0
  //         }
  //       }
  //     })
  // )
  const queryClient = getQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

export default QueryProvider;
