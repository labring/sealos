import WorkspaceComponent from '@/components/v2/Workspace';
import SignLayout from '@/components/v2/SignLayout';
import { ensureLocaleCookie } from '@/utils/ssrLocale';
import { dehydrate, QueryClient } from '@tanstack/react-query';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function WorkspacePage() {
  return (
    <SignLayout>
      <WorkspaceComponent />
    </SignLayout>
  );
}

export async function getServerSideProps({ req, res, locales }: any) {
  const local = ensureLocaleCookie({ req, res, defaultLocale: 'en' });

  const queryClient = new QueryClient();
  const props = {
    ...(await serverSideTranslations(local, undefined, null, locales || [])),
    dehydratedState: dehydrate(queryClient)
  };
  return {
    props
  };
}
