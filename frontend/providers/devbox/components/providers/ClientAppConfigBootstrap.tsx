import { dehydrate, QueryClient } from '@tanstack/react-query';
import QueryProvider from '@/components/providers/MyQueryProvider';
import { getClientAppConfigServer } from '@/server/getClientAppConfig';

export default async function ClientAppConfigBootstrap({
  children
}: {
  children: React.ReactNode;
}) {
  const queryClient = new QueryClient();
  queryClient.setQueryDefaults(['client-app-config'], {
    cacheTime: Infinity,
    staleTime: Infinity
  });

  await queryClient.prefetchQuery({
    queryKey: ['client-app-config'],
    queryFn: getClientAppConfigServer
  });
  const dehydratedState = dehydrate(queryClient);

  return <QueryProvider dehydratedState={dehydratedState}>{children}</QueryProvider>;
}
