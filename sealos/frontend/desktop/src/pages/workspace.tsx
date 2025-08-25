import WorkspaceComponent from '@/components/v2/Workspace';
import SignLayout from '@/components/v2/SignLayout';
import { compareFirstLanguages } from '@/utils/tools';
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
  const local =
    req?.cookies?.NEXT_LOCALE || compareFirstLanguages(req?.headers?.['accept-language'] || 'en');
  res.setHeader('Set-Cookie', `NEXT_LOCALE=${local}; Max-Age=2592000; Secure; SameSite=None`);

  const queryClient = new QueryClient();
  const props = {
    ...(await serverSideTranslations(local, undefined, null, locales || [])),
    dehydratedState: dehydrate(queryClient)
  };
  return {
    props
  };
}
