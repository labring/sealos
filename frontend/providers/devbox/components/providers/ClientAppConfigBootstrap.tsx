import { dehydrate, QueryClient } from '@tanstack/react-query';
import { prefetchClientAppConfig } from '@sealos/shared';
import QueryProvider from '@/components/providers/MyQueryProvider';
import { getClientAppConfigServer } from '@/src/server/getClientAppConfig';

export default async function ClientAppConfigBootstrap({
  children
}: {
  children: React.ReactNode;
}) {
  const queryClient = new QueryClient();
  await prefetchClientAppConfig(queryClient, ['client-app-config'], getClientAppConfigServer);
  const dehydratedState = dehydrate(queryClient);

  return <QueryProvider dehydratedState={dehydratedState}>{children}</QueryProvider>;
}
